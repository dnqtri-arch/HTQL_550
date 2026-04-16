import fs from 'fs'
import path from 'path'

/**
 * Một lần: nhập file JSON cũ vào MySQL nếu bảng đang trống.
 */
export async function migrateJsonFilesIfEmpty(pool, { dataDir }) {
  const dvtFile = path.join(dataDir, 'donViTinh.json')
  const nccFile = path.join(dataDir, 'nhaCungCap.json')
  const khFile = path.join(dataDir, 'khachHang.json')
  const regFile = path.join(dataDir, 'htqlClientRegistry.json')

  const [dvtCount] = await pool.query('SELECT COUNT(*) AS c FROM don_vi_tinh')
  if (Number(dvtCount[0]?.c) === 0 && fs.existsSync(dvtFile)) {
    const raw = JSON.parse(fs.readFileSync(dvtFile, 'utf8'))
    if (Array.isArray(raw) && raw.length) {
      for (const row of raw) {
        const copy = { ...row }
        const id = copy.id
        delete copy.id
        await pool.query('INSERT INTO don_vi_tinh (id, data) VALUES (?, ?)', [id, JSON.stringify({ ...copy, id })])
      }
      process.stdout.write(`[HTQL_550] MySQL: đã nhập donViTinh.json (${raw.length} dòng)\n`)
    }
  }

  const [nccCount] = await pool.query('SELECT COUNT(*) AS c FROM nha_cung_cap')
  if (Number(nccCount[0]?.c) === 0 && fs.existsSync(nccFile)) {
    const raw = JSON.parse(fs.readFileSync(nccFile, 'utf8'))
    if (Array.isArray(raw) && raw.length) {
      for (const row of raw) {
        const copy = { ...row }
        const id = copy.id
        delete copy.id
        await pool.query('INSERT INTO nha_cung_cap (id, data) VALUES (?, ?)', [id, JSON.stringify({ ...copy, id })])
      }
      process.stdout.write(`[HTQL_550] MySQL: đã nhập nhaCungCap.json (${raw.length} dòng)\n`)
    }
  }

  const [khCount] = await pool.query('SELECT COUNT(*) AS c FROM khach_hang')
  if (Number(khCount[0]?.c) === 0 && fs.existsSync(khFile)) {
    const raw = JSON.parse(fs.readFileSync(khFile, 'utf8'))
    if (Array.isArray(raw) && raw.length) {
      for (const row of raw) {
        const copy = { ...row }
        const id = copy.id
        delete copy.id
        await pool.query('INSERT INTO khach_hang (id, data) VALUES (?, ?)', [id, JSON.stringify({ ...copy, id })])
      }
      process.stdout.write(`[HTQL_550] MySQL: đã nhập khachHang.json (${raw.length} dòng)\n`)
    }
  }

  const [regCount] = await pool.query('SELECT COUNT(*) AS c FROM htql_client_registry')
  if (Number(regCount[0]?.c) === 0 && fs.existsSync(regFile)) {
    const raw = JSON.parse(fs.readFileSync(regFile, 'utf8'))
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      for (const [ip, v] of Object.entries(raw)) {
        await pool.query('INSERT INTO htql_client_registry (ip, data) VALUES (?, ?)', [
          String(ip).slice(0, 64),
          JSON.stringify(v),
        ])
      }
      process.stdout.write(`[HTQL_550] MySQL: đã nhập htqlClientRegistry.json\n`)
    }
  }
}
