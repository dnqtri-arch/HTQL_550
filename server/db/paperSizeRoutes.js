import { PAPER_SIZE_SEED, findBestPaperSize } from './paperSizesCatalog.js'

function toClientRow(row) {
  return {
    code: String(row.code ?? ''),
    name: String(row.name ?? ''),
    widthM: Number(row.widthM) || 0,
    heightM: Number(row.heightM) || 0,
    aliases: Array.isArray(row.aliases) ? row.aliases : [],
  }
}

async function listPaperSizesFromMysql(pool) {
  const [rows] = await pool.query(
    `SELECT code, name, width_m, height_m, width_mm, height_mm, aliases_json
     FROM htql_paper_size
     ORDER BY code`,
  )
  return (rows ?? []).map((r) => {
    let aliases = []
    try {
      const raw = r.aliases_json
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
      if (Array.isArray(parsed)) aliases = parsed.map((x) => String(x))
    } catch {
      aliases = []
    }
    return {
      code: String(r.code ?? ''),
      name: String(r.name ?? ''),
      widthM: Number(r.width_m) || (Number(r.width_mm) || 0) / 1000,
      heightM: Number(r.height_m) || (Number(r.height_mm) || 0) / 1000,
      aliases,
    }
  })
}

export function mountPaperSizeRoutes(app, { mysqlPool } = {}) {
  app.get('/api/paper-sizes', async (_req, res) => {
    try {
      const rows = mysqlPool ? await listPaperSizesFromMysql(mysqlPool) : PAPER_SIZE_SEED.map(toClientRow)
      res.json(rows)
    } catch (e) {
      res.status(500).json({ error: String(e?.message || e) })
    }
  })

  app.get('/api/paper-sizes/lookup', async (req, res) => {
    const q = String(req.query?.q ?? '').trim()
    if (!q) return res.status(400).json({ error: 'Thiếu tham số q' })
    try {
      const rows = mysqlPool ? await listPaperSizesFromMysql(mysqlPool) : PAPER_SIZE_SEED.map(toClientRow)
      const hit = findBestPaperSize(q, rows)
      if (!hit) return res.status(404).json({ error: 'Không tìm thấy khổ giấy phù hợp.' })
      res.json({
        query: q,
        score: hit.score,
        match: toClientRow(hit.row),
      })
    } catch (e) {
      res.status(500).json({ error: String(e?.message || e) })
    }
  })
}
