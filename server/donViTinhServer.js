/**
 * Server API cho Đơn vị tính — dữ liệu lưu file JSON, Web và Cursor dùng chung.
 * Chạy: node server/donViTinhServer.js
 */
import express from 'express'
import cors from 'cors'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_FILE = path.join(__dirname, '../data/donViTinh.json')

const DU_LIEU_MAU = [
  { id: 1, ma_dvt: '01', ten_dvt: 'Cái', ky_hieu: 'Cái', dien_giai: '' },
  { id: 2, ma_dvt: '02', ten_dvt: 'Hộp', ky_hieu: 'Hộp', dien_giai: '' },
  { id: 3, ma_dvt: '03', ten_dvt: 'Mét', ky_hieu: 'm', dien_giai: 'Đơn vị đo chiều dài' },
  { id: 4, ma_dvt: '04', ten_dvt: 'Kilôgam', ky_hieu: 'Kg', dien_giai: '' },
  { id: 5, ma_dvt: '05', ten_dvt: 'Tờ', ky_hieu: 'Tờ', dien_giai: '' },
  { id: 6, ma_dvt: '06', ten_dvt: 'Ram giấy', ky_hieu: 'Ram', dien_giai: '' },
]

function load() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8')
    const data = JSON.parse(raw)
    return Array.isArray(data) ? data : DU_LIEU_MAU
  } catch {
    return [...DU_LIEU_MAU]
  }
}

function save(data) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true })
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8')
}

const app = express()
app.use(cors())
app.use(express.json())

app.get('/api/don-vi-tinh', (req, res) => {
  res.json(load())
})

app.post('/api/don-vi-tinh', (req, res) => {
  const list = load()
  const payload = req.body
  const id = list.length > 0 ? Math.max(...list.map((r) => r.id)) + 1 : 1
  const soMax = list.reduce((max, r) => {
    const n = parseInt(r.ma_dvt, 10)
    return !isNaN(n) && n > max ? n : max
  }, 0)
  const ma_dvt = payload.ma_dvt?.trim() || String(soMax + 1).padStart(2, '0')
  const newRow = { ...payload, id, ma_dvt }
  list.push(newRow)
  save(list)
  res.json(newRow)
})

app.put('/api/don-vi-tinh/:id', (req, res) => {
  const list = load()
  const id = parseInt(req.params.id, 10)
  const idx = list.findIndex((r) => r.id === id)
  if (idx === -1) return res.status(404).json({ error: 'Không tìm thấy' })
  list[idx] = { ...req.body, id }
  save(list)
  res.json(list[idx])
})

app.delete('/api/don-vi-tinh/:id', (req, res) => {
  const list = load().filter((r) => r.id !== parseInt(req.params.id, 10))
  save(list)
  res.status(204).send()
})

app.post('/api/don-vi-tinh/nap-mau', (req, res) => {
  save(DU_LIEU_MAU.map((r) => ({ ...r })))
  res.json(load())
})

const PORT = 3001
app.listen(PORT, () => {
  console.log(`[HTQL_550] API Đơn vị tính: http://localhost:${PORT}/api/don-vi-tinh`)
})
