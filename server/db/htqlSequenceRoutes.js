/**
 * Cấp phát mã hệ thống {năm}/{prefix}/{số} — tránh trùng khi nhiều máy trạm ghi đồng thời.
 */
import fs from 'fs'
import path from 'path'

const FILE_SEQ = 'htql_sequence_ma.json'

function filePath(dataDir) {
  return path.join(dataDir, FILE_SEQ)
}

function readFileMap(dataDir) {
  try {
    const raw = fs.readFileSync(filePath(dataDir), 'utf8')
    const j = JSON.parse(raw)
    return j && typeof j === 'object' && !Array.isArray(j) ? j : {}
  } catch {
    return {}
  }
}

function writeFileMap(dataDir, obj) {
  fs.mkdirSync(path.dirname(filePath(dataDir)), { recursive: true })
  fs.writeFileSync(filePath(dataDir), JSON.stringify(obj, null, 2), 'utf8')
}

function formatMa(modulePrefix, year, num) {
  return `${year}/${modulePrefix}/${num}`
}

/**
 * @param {import('express').Express} app
 * @param {{ mysqlPool: import('mysql2/promise').Pool | null, dataDir: string }} ctx
 */
export function mountHtqlSequenceRoutes(app, ctx) {
  const { mysqlPool, dataDir } = ctx

  /**
   * POST /api/htql-sequence/ma-he-thong
   * body: { seqKey: string, modulePrefix: string, year: number, hintMaxSerial?: number }
   * seqKey: ví dụ "BG" (một phần/ năm tách ở server: `${seqKey}:${year}`)
   */
  app.post('/api/htql-sequence/ma-he-thong', async (req, res) => {
    const body = req.body || {}
    const seqKey = String(body.seqKey ?? '')
      .trim()
      .slice(0, 32)
    const modulePrefix = String(body.modulePrefix ?? '')
      .trim()
      .slice(0, 16)
    const year = Math.max(2000, Math.min(2100, Number(body.year) || new Date().getFullYear()))
    const hint = Math.max(0, Math.floor(Number(body.hintMaxSerial) || 0))
    if (!seqKey || !modulePrefix) {
      return res.status(400).json({ error: 'Thiếu seqKey hoặc modulePrefix' })
    }
    const rowKey = `${seqKey}:${year}`
    try {
      if (mysqlPool) {
        const conn = await mysqlPool.getConnection()
        try {
          await conn.beginTransaction()
          const [rows] = await conn.query(
            `SELECT last_num FROM htql_sequence_ma WHERE seq_key = ? FOR UPDATE`,
            [rowKey],
          )
          let last = 0
          if (rows.length) last = Number(rows[0].last_num) || 0
          const nextNum = Math.max(last, hint) + 1
          if (rows.length) {
            await conn.query(`UPDATE htql_sequence_ma SET last_num = ? WHERE seq_key = ?`, [nextNum, rowKey])
          } else {
            await conn.query(`INSERT INTO htql_sequence_ma (seq_key, last_num) VALUES (?, ?)`, [rowKey, nextNum])
          }
          await conn.commit()
          return res.json({ ma: formatMa(modulePrefix, year, nextNum), lastNum: nextNum })
        } catch (e) {
          await conn.rollback()
          throw e
        } finally {
          conn.release()
        }
      }
      const all = readFileMap(dataDir)
      const last = Number(all[rowKey]) || 0
      const nextNum = Math.max(last, hint) + 1
      all[rowKey] = nextNum
      writeFileMap(dataDir, all)
      return res.json({ ma: formatMa(modulePrefix, year, nextNum), lastNum: nextNum })
    } catch (e) {
      res.status(500).json({ error: String(e.message || e) })
    }
  })
}
