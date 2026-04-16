/**
 * Per-module JSON bundles (MySQL htql_module_bundle or JSON file fallback).
 * Replaces client KV poll for migrated modules.
 */
import fs from 'fs'
import path from 'path'

import {
  appendSyncLogMysqlConn,
  bumpAfterBundleWriteFile,
  bumpSystemVersionMysqlConn,
  getSystemVersionValue,
  pruneSyncLogIfNeededMysql,
} from './htqlSyncBump.js'

const MODULE_ID_RE = /^[a-zA-Z][a-zA-Z0-9_-]{0,63}$/

/** When bundle row missing: copy legacy keys from htql_kv_store */
const KV_MIGRATION_KEYS = {
  baoGia: ['htql_bao_gia_list', 'htql_bao_gia_chi_tiet', 'htql_bao_gia_draft'],
  donHangBanChungTu: [
    'htql_don_hang_ban_chung_tu_list',
    'htql_don_hang_ban_chung_tu_chi_tiet',
    'htql_don_hang_ban_chung_tu_draft',
  ],
}

function bundleFilePath(dataDir) {
  return path.join(dataDir, 'htql_module_bundles.json')
}

function loadFileAll(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8')
    const j = JSON.parse(raw)
    return j && typeof j === 'object' && !Array.isArray(j) ? j : {}
  } catch {
    return {}
  }
}

function saveFileAll(filePath, obj) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, JSON.stringify(obj, null, 2), 'utf8')
}

/** ETag ổn định theo (moduleId, version) — client gửi If-None-Match, khớp → 304. */
function bundleEtag(moduleId, version) {
  return `W/"${moduleId}:${version}"`
}

function ifNoneMatchHasEtag(req, etag) {
  const raw = req.headers['if-none-match']
  if (!raw || typeof raw !== 'string') return false
  const parts = raw.split(',').map((s) => s.trim())
  return parts.includes(etag)
}

async function migrateFromKv(pool, moduleId) {
  const keys = KV_MIGRATION_KEYS[moduleId]
  if (!keys?.length) return null
  const slot = {}
  for (const k of keys) {
    const [rows] = await pool.query(
      `SELECT value_str FROM htql_kv_store WHERE store_key = ? LIMIT 1`,
      [k],
    )
    if (rows.length && rows[0].value_str != null) slot[k] = rows[0].value_str
  }
  if (!Object.keys(slot).length) return null
  if (moduleId === 'baoGia') {
    let baoGia = []
    let chiTiet = []
    let draft = null
    try {
      if (slot['htql_bao_gia_list']) baoGia = JSON.parse(slot['htql_bao_gia_list'])
    } catch {
      /* ignore */
    }
    try {
      if (slot['htql_bao_gia_chi_tiet']) chiTiet = JSON.parse(slot['htql_bao_gia_chi_tiet'])
    } catch {
      /* ignore */
    }
    try {
      if (slot['htql_bao_gia_draft']) draft = JSON.parse(slot['htql_bao_gia_draft'])
    } catch {
      /* ignore */
    }
    if (!Array.isArray(baoGia) || !Array.isArray(chiTiet)) return null
    return { _v: 2, baoGia, chiTiet, draft }
  }
  if (moduleId === 'donHangBanChungTu') {
    let donHangBan = []
    let chiTiet = []
    let draft = null
    try {
      if (slot['htql_don_hang_ban_chung_tu_list']) donHangBan = JSON.parse(slot['htql_don_hang_ban_chung_tu_list'])
    } catch {
      /* ignore */
    }
    try {
      if (slot['htql_don_hang_ban_chung_tu_chi_tiet']) chiTiet = JSON.parse(slot['htql_don_hang_ban_chung_tu_chi_tiet'])
    } catch {
      /* ignore */
    }
    try {
      if (slot['htql_don_hang_ban_chung_tu_draft']) draft = JSON.parse(slot['htql_don_hang_ban_chung_tu_draft'])
    } catch {
      /* ignore */
    }
    if (!Array.isArray(donHangBan) || !Array.isArray(chiTiet)) return null
    return { _v: 2, donHangBan, chiTiet, draft }
  }
  return null
}

/**
 * @param {import('express').Express} app
 * @param {{ mysqlPool: import('mysql2/promise').Pool | null, dataDir: string }} ctx
 */
export function mountHtqlModuleBundleRoutes(app, ctx) {
  const { mysqlPool, dataDir } = ctx
  const filePath = bundleFilePath(dataDir)

  /** Chỉ phiên bản — máy trạm poll nhẹ để biết khi nào bundle đổi (dữ liệu không còn trong htql_kv_store). */
  app.get('/api/htql-module-bundle-versions', async (req, res) => {
    try {
      if (mysqlPool) {
        const [rows] = await mysqlPool.query(`SELECT module_id, version FROM htql_module_bundle`)
        const out = {}
        for (const r of rows) {
          const id = r.module_id != null ? String(r.module_id) : ''
          if (id) out[id] = Number(r.version) || 0
        }
        return res.json({ versions: out })
      }
      const all = loadFileAll(filePath)
      const out = {}
      for (const [mid, row] of Object.entries(all)) {
        if (!row || typeof row !== 'object') continue
        out[mid] = typeof row.version === 'number' ? row.version : 0
      }
      return res.json({ versions: out })
    } catch (e) {
      res.status(500).json({ error: String(e.message || e) })
    }
  })

  app.get('/api/htql-module-bundle/:moduleId', async (req, res) => {
    const moduleId = String(req.params.moduleId || '').trim()
    if (!MODULE_ID_RE.test(moduleId)) {
      return res.status(400).json({ error: 'moduleId invalid' })
    }
    try {
      if (mysqlPool) {
        const [rows] = await mysqlPool.query(
          `SELECT bundle_json, version FROM htql_module_bundle WHERE module_id = ? LIMIT 1`,
          [moduleId],
        )
        if (rows.length) {
          const ver = Number(rows[0].version) || 0
          const etag = bundleEtag(moduleId, ver)
          res.setHeader('ETag', etag)
          if (ifNoneMatchHasEtag(req, etag)) {
            return res.status(304).end()
          }
          const raw = rows[0].bundle_json
          const bundle = typeof raw === 'string' ? JSON.parse(raw) : raw
          return res.json({
            bundle,
            version: ver,
          })
        }
        const migrated = await migrateFromKv(mysqlPool, moduleId)
        if (migrated) {
          await mysqlPool.query(
            `INSERT INTO htql_module_bundle (module_id, bundle_json, version) VALUES (?, CAST(? AS JSON), 1)`,
            [moduleId, JSON.stringify(migrated)],
          )
          const conn = await mysqlPool.getConnection()
          try {
            await conn.beginTransaction()
            await bumpSystemVersionMysqlConn(conn)
            await appendSyncLogMysqlConn(conn, 'bundle', null, moduleId)
            await conn.commit()
          } finally {
            conn.release()
          }
          void pruneSyncLogIfNeededMysql(mysqlPool)
          const etag = bundleEtag(moduleId, 1)
          res.setHeader('ETag', etag)
          if (ifNoneMatchHasEtag(req, etag)) {
            return res.status(304).end()
          }
          return res.json({ bundle: migrated, version: 1 })
        }
        const etag0 = bundleEtag(moduleId, 0)
        res.setHeader('ETag', etag0)
        if (ifNoneMatchHasEtag(req, etag0)) {
          return res.status(304).end()
        }
        return res.json({ bundle: null, version: 0 })
      }
      const all = loadFileAll(filePath)
      const row = all[moduleId]
      const ver = row ? (typeof row.version === 'number' ? row.version : 0) : 0
      const etag = bundleEtag(moduleId, ver)
      res.setHeader('ETag', etag)
      if (ifNoneMatchHasEtag(req, etag)) {
        return res.status(304).end()
      }
      if (row) return res.json({ bundle: row.bundle ?? null, version: ver })
      return res.json({ bundle: null, version: 0 })
    } catch (e) {
      res.status(500).json({ error: String(e.message || e) })
    }
  })

  app.put('/api/htql-module-bundle/:moduleId', async (req, res) => {
    const moduleId = String(req.params.moduleId || '').trim()
    if (!MODULE_ID_RE.test(moduleId)) {
      return res.status(400).json({ error: 'moduleId invalid' })
    }
    const body = req.body
    if (body == null || typeof body !== 'object' || !('bundle' in body)) {
      return res.status(400).json({ error: 'Missing bundle' })
    }
    const bundle = body.bundle
    try {
      const payload = JSON.stringify(bundle)
      if (mysqlPool) {
        const conn = await mysqlPool.getConnection()
        try {
          await conn.beginTransaction()
          const [cur] = await conn.query(`SELECT version FROM htql_module_bundle WHERE module_id = ? FOR UPDATE`, [
            moduleId,
          ])
          if (cur.length) {
            await conn.query(
              `UPDATE htql_module_bundle SET bundle_json = CAST(? AS JSON), version = version + 1, updated_at = CURRENT_TIMESTAMP(3) WHERE module_id = ?`,
              [payload, moduleId],
            )
          } else {
            await conn.query(
              `INSERT INTO htql_module_bundle (module_id, bundle_json, version) VALUES (?, CAST(? AS JSON), 1)`,
              [moduleId, payload],
            )
          }
          await bumpSystemVersionMysqlConn(conn)
          await appendSyncLogMysqlConn(conn, 'bundle', null, moduleId)
          await conn.commit()
        } catch (e) {
          await conn.rollback()
          throw e
        } finally {
          conn.release()
        }
        void pruneSyncLogIfNeededMysql(mysqlPool)
        const [after] = await mysqlPool.query(`SELECT version FROM htql_module_bundle WHERE module_id = ?`, [
          moduleId,
        ])
        const modVer = Number(after[0]?.version) || 0
        const systemVersion = await getSystemVersionValue(mysqlPool, dataDir)
        return res.json({ ok: true, version: modVer, systemVersion })
      }
      const all = loadFileAll(filePath)
      const prev = all[moduleId]
      const nextV = prev && typeof prev.version === 'number' ? prev.version + 1 : 1
      all[moduleId] = { bundle, version: nextV }
      saveFileAll(filePath, all)
      const systemVersion = bumpAfterBundleWriteFile(dataDir, moduleId)
      return res.json({ ok: true, version: nextV, systemVersion })
    } catch (e) {
      res.status(500).json({ error: String(e.message || e) })
    }
  })
}
