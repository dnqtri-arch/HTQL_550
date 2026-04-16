/**
 * Đồng bộ localStorage (prefix htql*) → MySQL — đa máy trạm.
 * Fallback: file JSON khi không dùng MySQL.
 */
import fs from 'fs'
import path from 'path'

import {
  appendSyncLogMysqlConn,
  bumpAfterKvBatchFile,
  bumpSystemVersionMysqlConn,
  getSystemVersionValue,
  pruneSyncLogIfNeededMysql,
} from './htqlSyncBump.js'

/**
 * @param {import('express').Express} app
 * @param {{ mysqlPool: import('mysql2/promise').Pool | null, dataDir: string }} ctx
 */
export function mountHtqlKvRoutes(app, ctx) {
  const { mysqlPool, dataDir } = ctx
  const kvFile = path.join(dataDir, 'htql_kv_store.json')

  function loadFileKv() {
    try {
      const raw = fs.readFileSync(kvFile, 'utf8')
      const j = JSON.parse(raw)
      return j && typeof j === 'object' && !Array.isArray(j) ? j : {}
    } catch {
      return {}
    }
  }

  function saveFileKv(obj) {
    fs.mkdirSync(path.dirname(kvFile), { recursive: true })
    fs.writeFileSync(kvFile, JSON.stringify(obj, null, 2), 'utf8')
  }

  app.get('/api/htql-kv', async (req, res) => {
    const prefix = String(req.query.prefix ?? 'htql')
    try {
      if (mysqlPool) {
        const [rows] = await mysqlPool.query(
          `SELECT store_key AS k, value_str AS v, version FROM htql_kv_store WHERE store_key LIKE ? ORDER BY store_key`,
          [`${prefix}%`],
        )
        const systemVersion = await getSystemVersionValue(mysqlPool, dataDir)
        return res.json({
          entries: rows.map((r) => ({
            key: r.k,
            value: r.v,
            version: Number(r.version) || 0,
          })),
          systemVersion,
        })
      }
      const all = loadFileKv()
      const entries = Object.entries(all)
        .filter(([k]) => k.startsWith(prefix))
        .map(([key, row]) => ({
          key,
          value: row.value,
          version: row.version ?? 0,
        }))
        .sort((a, b) => a.key.localeCompare(b.key))
      const systemVersion = await getSystemVersionValue(null, dataDir)
      return res.json({ entries, systemVersion })
    } catch (e) {
      res.status(500).json({ error: String(e.message || e) })
    }
  })

  app.put('/api/htql-kv', async (req, res) => {
    const body = req.body
    const entries = Array.isArray(body?.entries) ? body.entries : []
    if (!entries.length) return res.status(400).json({ error: 'Thiếu entries' })
    try {
      if (mysqlPool) {
        const conn = await mysqlPool.getConnection()
        try {
          await conn.beginTransaction()
          let written = 0
          const writtenKeys = []
          for (const e of entries) {
            const key = String(e.key ?? '').slice(0, 512)
            if (!key.startsWith('htql')) continue
            const value = String(e.value ?? '')
            if (value === '') {
              await conn.query(`DELETE FROM htql_kv_store WHERE store_key = ?`, [key])
              written++
              writtenKeys.push(key)
              continue
            }
            const ev = e.expectedVersion != null ? Number(e.expectedVersion) : null
            const [cur] = await conn.query(
              `SELECT version FROM htql_kv_store WHERE store_key = ? FOR UPDATE`,
              [key],
            )
            if (cur.length) {
              const v = Number(cur[0].version) || 0
              if (ev != null && ev !== v) {
                await conn.rollback()
                return res.status(409).json({
                  conflict: true,
                  key,
                  serverVersion: v,
                  message: 'Phiên bản không khớp — tải lại từ máy chủ',
                })
              }
              await conn.query(
                `UPDATE htql_kv_store SET value_str = ?, version = version + 1, updated_at = CURRENT_TIMESTAMP(3) WHERE store_key = ?`,
                [value, key],
              )
            } else {
              await conn.query(
                `INSERT INTO htql_kv_store (store_key, value_str, version) VALUES (?, ?, 1)`,
                [key, value],
              )
            }
            written++
            writtenKeys.push(key)
          }
          if (writtenKeys.length) {
            await bumpSystemVersionMysqlConn(conn)
            for (const k of writtenKeys) {
              await appendSyncLogMysqlConn(conn, 'kv', k, null)
            }
          }
          await conn.commit()
          let systemVersion = 0
          try {
            systemVersion = await getSystemVersionValue(mysqlPool, dataDir)
            void pruneSyncLogIfNeededMysql(mysqlPool)
          } catch {
            systemVersion = await getSystemVersionValue(mysqlPool, dataDir)
          }
          return res.json({ ok: true, written, systemVersion })
        } catch (e) {
          await conn.rollback()
          throw e
        } finally {
          conn.release()
        }
      }
      const all = loadFileKv()
      let written = 0
      const writtenKeys = []
      for (const e of entries) {
        const key = String(e.key ?? '').slice(0, 512)
        if (!key.startsWith('htql')) continue
        const value = String(e.value ?? '')
        if (value === '') {
          delete all[key]
          written++
          writtenKeys.push(key)
          continue
        }
        const ev = e.expectedVersion != null ? Number(e.expectedVersion) : null
        const prev = all[key]
        if (prev && ev != null && ev !== (prev.version ?? 0)) {
          return res.status(409).json({
            conflict: true,
            key,
            serverVersion: prev.version ?? 0,
            message: 'Phiên bản không khớp',
          })
        }
        const nextV = prev ? (prev.version ?? 0) + 1 : 1
        all[key] = { value, version: nextV }
        written++
        writtenKeys.push(key)
      }
      saveFileKv(all)
      let systemVersion = 0
      if (writtenKeys.length) {
        systemVersion = bumpAfterKvBatchFile(dataDir, writtenKeys)
      } else {
        systemVersion = await getSystemVersionValue(null, dataDir)
      }
      return res.json({ ok: true, written, systemVersion })
    } catch (e) {
      res.status(500).json({ error: String(e.message || e) })
    }
  })
}
