/**
 * Server API cho Đơn vị tính + Nhà cung cấp — dữ liệu lưu file JSON, đồng bộ qua web, mở lại chương trình vẫn còn.
 * Chạy: npm run dev (node server/donViTinhServer.js + vite)
 */
import express from 'express'
import cors from 'cors'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.join(__dirname, '../data')
const DATA_FILE = path.join(DATA_DIR, 'donViTinh.json')
const DATA_FILE_NCC = path.join(DATA_DIR, 'nhaCungCap.json')

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

// ——— Nhà cung cấp ———
const DU_LIEU_MAU_NCC = [
  {
    id: 1,
    ma_ncc: 'NCC00001',
    ten_ncc: 'CÔNG TY TNHH QUẢNG CÁO VÀ XÂY DỰNG NAM BẮC',
    loai_ncc: 'to_chuc',
    khach_hang: false,
    dia_chi: '668/10 Khu vực Bình Trung, Phường Long Tuyên, TP Cần Thơ, Việt Nam',
    ma_so_thue: '1801659861',
    dien_thoai: '0939067007',
    ngung_theo_doi: false,
  },
]

function loadNcc() {
  try {
    const raw = fs.readFileSync(DATA_FILE_NCC, 'utf8')
    const data = JSON.parse(raw)
    return Array.isArray(data) ? data : DU_LIEU_MAU_NCC
  } catch {
    return [...DU_LIEU_MAU_NCC]
  }
}

function saveNcc(data) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
  fs.writeFileSync(DATA_FILE_NCC, JSON.stringify(data, null, 2), 'utf8')
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

// ——— API Nhà cung cấp (đồng bộ qua web) ———
app.get('/api/nha-cung-cap', (req, res) => {
  res.json(loadNcc())
})

app.post('/api/nha-cung-cap', (req, res) => {
  const list = loadNcc()
  const payload = req.body
  const id = list.length > 0 ? Math.max(...list.map((r) => r.id)) + 1 : 1
  const newRow = { ...payload, id }
  list.push(newRow)
  saveNcc(list)
  res.json(newRow)
})

app.put('/api/nha-cung-cap/:id', (req, res) => {
  const list = loadNcc()
  const id = parseInt(req.params.id, 10)
  const idx = list.findIndex((r) => r.id === id)
  if (idx === -1) return res.status(404).json({ error: 'Không tìm thấy' })
  list[idx] = { ...req.body, id }
  saveNcc(list)
  res.json(list[idx])
})

app.delete('/api/nha-cung-cap/:id', (req, res) => {
  const list = loadNcc().filter((r) => r.id !== parseInt(req.params.id, 10))
  saveNcc(list)
  res.status(204).send()
})

// ——— Tra cứu CCCD (Căn cước công dân) ———
// Trả về mã số thuế, ĐT di động, ĐT cố định, email, ngày cấp, nơi cấp.
// Hiện dùng dữ liệu mẫu; có thể thay bằng tích hợp Cổng Dịch vụ công hoặc API thật.
const CCCD_MOCK = {
  '001234567890': {
    ma_so_thue: '0123456789',
    dt_di_dong: '0901234567',
    dt_co_dinh: '02838234567',
    email: 'nguyenvana@example.com',
    ngay_cap: '2022-05-15',
    noi_cap: 'Cục Cảnh sát QLHC về TTXH',
  },
}
app.get('/api/cccd-lookup', (req, res) => {
  const cccd = (req.query.cccd || '').toString().trim().replace(/\s/g, '')
  if (!cccd) return res.json(null)
  const found = CCCD_MOCK[cccd] || null
  res.json(found)
})

const PORT = 3001
app.listen(PORT, () => {
  console.log(`[HTQL_550] API: http://localhost:${PORT}/api/don-vi-tinh`)
  console.log(`[HTQL_550] API: http://localhost:${PORT}/api/nha-cung-cap (đồng bộ qua web, mở lại chương trình vẫn còn)`)
  console.log(`[HTQL_550] API: http://localhost:${PORT}/api/cccd-lookup (tra cứu CCCD)`)
})
