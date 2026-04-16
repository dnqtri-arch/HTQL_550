/**
 * GET /api/htql-sync-state — system_version + max sync log id (vài byte).
 * GET /api/sync/delta?after_id= — changelog (MySQL hoặc file JSON fallback).
 */
import fs from 'fs'
import path from 'path'

import { getMaxSyncLogId, getSystemVersionValue } from './htqlSyncBump.js'

const LOG_FILE = 'htql_sync_log.json'

function logPath(dataDir) {
  return path.join(dataDir, LOG_FILE)
}

function readFileLog(dataDir) {
  try {
    const raw = fs.readFileSync(logPath(dataDir), 'utf8')
    const j = JSON.parse(raw)
    return j && typeof j === 'object' && !Array.isArray(j) ? j : { next_id: 1, entries: [] }
  } catch {
    return { next_id: 1, entries: [] }
  }
}

/**
 * @param {import('express').Express} app
 * @param {{ mysqlPool: import('mysql2/promise').Pool | null, dataDir: string }} ctx
 */
export function mountHtqlSyncRoutes(app, ctx) {
  const { mysqlPool, dataDir } = ctx

  app.get('/api/htql-sync-state', async (req, res) => {
    try {
      const systemVersion = await getSystemVersionValue(mysqlPool, dataDir)
      const maxSyncLogId = await getMaxSyncLogId(mysqlPool, dataDir)
      res.json({ systemVersion, maxSyncLogId })
    } catch (e) {
      res.status(500).json({ error: String(e.message || e) })
    }
  })

  app.get('/api/sync/delta', async (req, res) => {
    const afterRaw = req.query.after_id
    const afterId = afterRaw != null && afterRaw !== '' ? Math.max(0, Number(afterRaw) || 0) : 0
    try {
      if (mysqlPool) {
        const [rows] = await mysqlPool.query(
          `SELECT id, scope, ref_key AS refKey, module_id AS moduleId FROM htql_sync_log WHERE id > ? ORDER BY id ASC LIMIT 5000`,
          [afterId],
        )
        const maxSyncLogId = await getMaxSyncLogId(mysqlPool, dataDir)
        const systemVersion = await getSystemVersionValue(mysqlPool, dataDir)
        const entries = rows.map((r) => ({
          id: Number(r.id) || 0,
          scope: r.scope,
          refKey: r.refKey != null ? String(r.refKey) : null,
          moduleId: r.moduleId != null ? String(r.moduleId) : null,
        }))
        return res.json({ entries, maxSyncLogId, systemVersion, afterId })
      }
      const log = readFileLog(dataDir)
      const entriesRaw = Array.isArray(log.entries) ? log.entries : []
      const out = []
      for (const e of entriesRaw) {
        const id = Number(e.id) || 0
        if (id <= afterId) continue
        out.push({
          id,
          scope: e.scope,
          refKey: e.ref_key != null ? String(e.ref_key) : null,
          moduleId: e.module_id != null ? String(e.module_id) : null,
        })
        if (out.length >= 5000) break
      }
      const maxSyncLogId = await getMaxSyncLogId(null, dataDir)
      const systemVersion = await getSystemVersionValue(null, dataDir)
      return res.json({ entries: out, maxSyncLogId, systemVersion, afterId })
    } catch (e) {
      res.status(500).json({ error: String(e.message || e) })
    }
  })
}
