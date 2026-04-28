/**
 * Khóa chỉnh sửa theo bản ghi (MySQL) — một máy/tab giữ lock, máy khác chỉ xem.
 * Khi không có MySQL pool: bỏ qua (luôn cho phép sửa).
 */
const MODULE_ID_RE = /^[a-zA-Z][a-zA-Z0-9_-]{0,63}$/
const RECORD_ID_RE = /^[a-zA-Z0-9_-]{1,128}$/

/** Hết hạn lock nếu không heartbeat (giây) — máy tắt đột ngột sẽ nhả sau khoảng này. */
const LOCK_STALE_SECONDS = 120

function clientKey(req) {
  return String(req.headers['x-htql-client-id'] || '').trim().slice(0, 128) || 'unknown'
}

/**
 * @param {import('express').Express} app
 * @param {{ mysqlPool: import('mysql2/promise').Pool | null }} ctx
 */
export function mountHtqlRecordEditLockRoutes(app, ctx) {
  const { mysqlPool } = ctx

  app.post('/api/htql-record-lock/:moduleId/:recordId/acquire', async (req, res) => {
    const moduleId = String(req.params.moduleId || '').trim()
    const recordId = String(req.params.recordId || '').trim()
    if (!MODULE_ID_RE.test(moduleId) || !RECORD_ID_RE.test(recordId)) {
      return res.status(400).json({ ok: false, error: 'invalid id' })
    }
    const lockToken = String(req.body?.lockToken ?? '').trim().slice(0, 128)
    if (!lockToken) {
      return res.status(400).json({ ok: false, error: 'lockToken required' })
    }
    if (!mysqlPool) {
      return res.json({ ok: true, skipped: true })
    }
    const ck = clientKey(req)

    for (let attempt = 0; attempt < 3; attempt++) {
      const conn = await mysqlPool.getConnection()
      try {
        await conn.beginTransaction()
        const [rows] = await conn.query(
          `SELECT lock_token AS lock_token,
                  TIMESTAMPDIFF(SECOND, updated_at, NOW(3)) AS age_sec
           FROM htql_record_edit_lock WHERE module_id = ? AND record_id = ? FOR UPDATE`,
          [moduleId, recordId],
        )
        if (!rows.length) {
          try {
            await conn.query(
              `INSERT INTO htql_record_edit_lock (module_id, record_id, lock_token, client_key) VALUES (?, ?, ?, ?)`,
              [moduleId, recordId, lockToken, ck],
            )
          } catch (e) {
            if (e && e.code === 'ER_DUP_ENTRY' && attempt < 2) {
              await conn.rollback()
              continue
            }
            throw e
          }
          await conn.commit()
          return res.json({ ok: true })
        }
        const cur = String(rows[0].lock_token ?? '')
        const ageSec = Number(rows[0].age_sec) || 0
        if (cur === lockToken) {
          await conn.query(
            `UPDATE htql_record_edit_lock SET updated_at = CURRENT_TIMESTAMP(3), client_key = ? WHERE module_id = ? AND record_id = ?`,
            [ck, moduleId, recordId],
          )
          await conn.commit()
          return res.json({ ok: true })
        }
        if (ageSec >= LOCK_STALE_SECONDS) {
          await conn.query(
            `UPDATE htql_record_edit_lock SET lock_token = ?, client_key = ?, updated_at = CURRENT_TIMESTAMP(3) WHERE module_id = ? AND record_id = ?`,
            [lockToken, ck, moduleId, recordId],
          )
          await conn.commit()
          return res.json({ ok: true, stolen: true })
        }
        await conn.rollback()
        return res.status(409).json({ ok: false, reason: 'locked' })
      } catch (e) {
        try {
          await conn.rollback()
        } catch {
          /* ignore */
        }
        return res.status(500).json({ ok: false, error: String(e.message || e) })
      } finally {
        conn.release()
      }
    }
    return res.status(409).json({ ok: false, reason: 'locked' })
  })

  app.post('/api/htql-record-lock/:moduleId/:recordId/heartbeat', async (req, res) => {
    const moduleId = String(req.params.moduleId || '').trim()
    const recordId = String(req.params.recordId || '').trim()
    if (!MODULE_ID_RE.test(moduleId) || !RECORD_ID_RE.test(recordId)) {
      return res.status(400).json({ ok: false, error: 'invalid id' })
    }
    const lockToken = String(req.body?.lockToken ?? '').trim().slice(0, 128)
    if (!lockToken) {
      return res.status(400).json({ ok: false, error: 'lockToken required' })
    }
    if (!mysqlPool) {
      return res.json({ ok: true, skipped: true })
    }
    const ck = clientKey(req)
    const [r] = await mysqlPool.query(
      `UPDATE htql_record_edit_lock SET updated_at = CURRENT_TIMESTAMP(3), client_key = ? WHERE module_id = ? AND record_id = ? AND lock_token = ?`,
      [ck, moduleId, recordId, lockToken],
    )
    const n = typeof r.affectedRows === 'number' ? r.affectedRows : 0
    if (n === 0) return res.status(409).json({ ok: false, reason: 'not_holder' })
    return res.json({ ok: true })
  })

  app.post('/api/htql-record-lock/:moduleId/:recordId/release', async (req, res) => {
    const moduleId = String(req.params.moduleId || '').trim()
    const recordId = String(req.params.recordId || '').trim()
    if (!MODULE_ID_RE.test(moduleId) || !RECORD_ID_RE.test(recordId)) {
      return res.status(400).json({ ok: false, error: 'invalid id' })
    }
    const lockToken = String(req.body?.lockToken ?? '').trim().slice(0, 128)
    if (!mysqlPool) {
      return res.json({ ok: true, skipped: true })
    }
    if (!lockToken) {
      return res.status(400).json({ ok: false, error: 'lockToken required' })
    }
    await mysqlPool.query(
      `DELETE FROM htql_record_edit_lock WHERE module_id = ? AND record_id = ? AND lock_token = ?`,
      [moduleId, recordId, lockToken],
    )
    return res.json({ ok: true })
  })
}
