/**
 * GET/PUT /api/user-preferences — bộ lọc & tuỳ chọn UI theo máy trạm (client_id = X-HTQL-Client-Id).
 * MySQL khi có pool; fallback: data/user_preferences.json
 */
import fs from 'fs'
import path from 'path'

/**
 * @param {import('express').Express} app
 * @param {{ mysqlPool: import('mysql2/promise').Pool | null, dataDir: string }} ctx
 */
export function mountUserPreferencesRoutes(app, ctx) {
  const { mysqlPool, dataDir } = ctx
  const filePath = path.join(dataDir, 'user_preferences.json')

  function loadFile() {
    try {
      const raw = fs.readFileSync(filePath, 'utf8')
      const j = JSON.parse(raw)
      return j && typeof j === 'object' && !Array.isArray(j) ? j : {}
    } catch {
      return {}
    }
  }

  function saveFile(obj) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true })
    fs.writeFileSync(filePath, JSON.stringify(obj, null, 2), 'utf8')
  }

  function clientId(req) {
    return String(req.headers['x-htql-client-id'] || '').trim().slice(0, 128) || 'unknown'
  }

  app.get('/api/user-preferences', async (req, res) => {
    try {
      const cid = clientId(req)
      if (mysqlPool) {
        const [rows] = await mysqlPool.query(
          'SELECT prefs_json FROM user_preferences WHERE client_id = ?',
          [cid],
        )
        if (rows.length) {
          const d = rows[0].prefs_json
          const prefs = typeof d === 'string' ? JSON.parse(d) : d
          return res.json({ ok: true, clientId: cid, prefs })
        }
        return res.json({ ok: true, clientId: cid, prefs: {} })
      }
      const all = loadFile()
      return res.json({ ok: true, clientId: cid, prefs: all[cid] ?? {} })
    } catch (e) {
      res.status(500).json({ ok: false, error: String(e.message || e) })
    }
  })

  app.put('/api/user-preferences', async (req, res) => {
    try {
      const cid = clientId(req)
      const body = req.body && typeof req.body === 'object' ? req.body : {}
      const patch = body.prefs && typeof body.prefs === 'object' ? body.prefs : body

      let prev = {}
      if (mysqlPool) {
        const [rows] = await mysqlPool.query(
          'SELECT prefs_json FROM user_preferences WHERE client_id = ?',
          [cid],
        )
        if (rows.length) {
          const d = rows[0].prefs_json
          prev = typeof d === 'string' ? JSON.parse(d) : d
        }
      } else {
        const all = loadFile()
        prev = all[cid] && typeof all[cid] === 'object' ? all[cid] : {}
      }

      const merged = { ...prev, ...patch }
      const json = JSON.stringify(merged)

      if (mysqlPool) {
        await mysqlPool.query(
          `INSERT INTO user_preferences (client_id, prefs_json) VALUES (?, ?)
           ON DUPLICATE KEY UPDATE prefs_json = VALUES(prefs_json), updated_at = CURRENT_TIMESTAMP(3)`,
          [cid, json],
        )
      } else {
        const all = loadFile()
        all[cid] = merged
        saveFile(all)
      }
      return res.json({ ok: true, clientId: cid })
    } catch (e) {
      res.status(500).json({ ok: false, error: String(e.message || e) })
    }
  })
}
