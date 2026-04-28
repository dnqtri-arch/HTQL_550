import { PAPER_SIZE_SEED, findBestPaperSize } from './paperSizesCatalog.js'

function normalizeMeterFromDb(widthMRaw, widthMmRaw) {
  const m = Number(widthMRaw)
  if (Number.isFinite(m) && m > 0) {
    // Dữ liệu cũ có thể lưu nhầm mm vào cột *_m.
    if (m > 20) return Number((m / 1000).toFixed(4))
    return m
  }
  const mm = Number(widthMmRaw)
  if (Number.isFinite(mm) && mm > 0) return Number((mm / 1000).toFixed(4))
  return 0
}

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
      widthM: normalizeMeterFromDb(r.width_m, r.width_mm),
      heightM: normalizeMeterFromDb(r.height_m, r.height_mm),
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
