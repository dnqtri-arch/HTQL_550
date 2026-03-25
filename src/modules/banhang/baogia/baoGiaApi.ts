/**
 * API Báo giá — localStorage mock, prefix BG.
 * Trạng thái: Chờ duyệt | Đã gửi khách | Đã chốt | Hủy bỏ
 */

import type {
  BaoGiaRecord,
  BaoGiaChiTiet,
  BaoGiaCreatePayload,
  BanHangFilter,
  BanHangKyValue,
} from '../../../types/banHang'
import { maFormatHeThong, getCurrentYear } from '../../../utils/maFormat'

export type { BaoGiaRecord, BaoGiaChiTiet, BaoGiaCreatePayload, BanHangKyValue }

const STORAGE_KEY_DON = 'htql_bao_gia_list'
const STORAGE_KEY_CHI_TIET = 'htql_bao_gia_chi_tiet'

const MOCK_BG: BaoGiaRecord[] = [
  {
    id: 'bg1',
    so_bao_gia: '2026/BG/1',
    ngay_bao_gia: '2026-03-10',
    ngay_het_han: '2026-04-10',
    khach_hang: 'Công ty TNHH Thương mại ABC',
    dien_giai: 'Báo giá thiết bị văn phòng Q1',
    tong_tien_hang: 20000000,
    tong_thue_gtgt: 2000000,
    tong_thanh_toan: 22000000,
    tinh_trang: 'Đã gửi khách',
    nv_ban_hang: 'Nguyễn Văn A',
  },
  {
    id: 'bg2',
    so_bao_gia: '2026/BG/2',
    ngay_bao_gia: '2026-03-14',
    ngay_het_han: '2026-04-14',
    khach_hang: 'Công ty CP Xây dựng XYZ',
    dien_giai: 'Báo giá vật liệu xây dựng',
    tong_tien_hang: 85000000,
    tong_thue_gtgt: 8500000,
    tong_thanh_toan: 93500000,
    tinh_trang: 'Đã chốt',
    nv_ban_hang: 'Trần Thị B',
  },
]

const MOCK_CT: BaoGiaChiTiet[] = [
  {
    id: 'bgct1',
    bao_gia_id: 'bg1',
    ma_hang: 'VT00001',
    ten_hang: 'Màn hình LCD 24"',
    dvt: 'Cái',
    so_luong: 5,
    don_gia: 4000000,
    thanh_tien: 20000000,
    pt_thue_gtgt: 10,
    tien_thue_gtgt: 2000000,
  },
  {
    id: 'bgct2',
    bao_gia_id: 'bg2',
    ma_hang: 'VT00002',
    ten_hang: 'Xi măng Hoàng Thạch',
    dvt: 'Tấn',
    so_luong: 100,
    don_gia: 850000,
    thanh_tien: 85000000,
    pt_thue_gtgt: 10,
    tien_thue_gtgt: 8500000,
  },
]

function loadFromStorage(): { don: BaoGiaRecord[]; chiTiet: BaoGiaChiTiet[] } {
  try {
    const rawDon = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY_DON) : null
    const rawCt = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY_CHI_TIET) : null
    const don = rawDon ? JSON.parse(rawDon) : null
    const chiTiet = rawCt ? JSON.parse(rawCt) : null
    if (Array.isArray(don) && Array.isArray(chiTiet)) return { don, chiTiet }
  } catch { /* ignore */ }
  return { don: [...MOCK_BG], chiTiet: [...MOCK_CT] }
}

let _list: BaoGiaRecord[] = []
let _chiTietList: BaoGiaChiTiet[] = []

function init() {
  if (_list.length === 0 && _chiTietList.length === 0) {
    const loaded = loadFromStorage()
    _list = loaded.don
    _chiTietList = loaded.chiTiet
  }
}
init()

function save() {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_DON, JSON.stringify(_list))
      localStorage.setItem(STORAGE_KEY_CHI_TIET, JSON.stringify(_chiTietList))
    }
  } catch { /* ignore */ }
}

// ─── Kỳ ──────────────────────────────────────────────────────────────────

export const KY_OPTIONS: { value: BanHangKyValue; label: string }[] = [
  { value: 'thang_nay', label: 'Tháng này' },
  { value: 'thang_truoc', label: 'Tháng trước' },
  { value: 'quy_nay', label: 'Quý này' },
  { value: 'quy_truoc', label: 'Quý trước' },
  { value: 'nam_nay', label: 'Năm nay' },
  { value: 'tat_ca', label: 'Tất cả' },
]

export function getDateRangeForKy(ky: BanHangKyValue): { tu: string; den: string } {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()
  const pad = (n: number) => String(n).padStart(2, '0')
  const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

  if (ky === 'thang_nay') {
    return { tu: `${y}-${pad(m + 1)}-01`, den: iso(new Date(y, m + 1, 0)) }
  }
  if (ky === 'thang_truoc') {
    const pm = m === 0 ? 11 : m - 1
    const py = m === 0 ? y - 1 : y
    return { tu: `${py}-${pad(pm + 1)}-01`, den: iso(new Date(py, pm + 1, 0)) }
  }
  if (ky === 'quy_nay') {
    const q = Math.floor(m / 3)
    return { tu: `${y}-${pad(q * 3 + 1)}-01`, den: iso(new Date(y, q * 3 + 3, 0)) }
  }
  if (ky === 'quy_truoc') {
    const q = Math.floor(m / 3)
    const pq = q === 0 ? 3 : q - 1
    const py = q === 0 ? y - 1 : y
    return { tu: `${py}-${pad(pq * 3 + 1)}-01`, den: iso(new Date(py, pq * 3 + 3, 0)) }
  }
  if (ky === 'nam_nay') return { tu: `${y}-01-01`, den: `${y}-12-31` }
  return { tu: '', den: '' }
}

export function getDefaultBaoGiaFilter(): BanHangFilter {
  const { tu, den } = getDateRangeForKy('tat_ca')
  return { ky: 'tat_ca', tu, den, tim_kiem: '' }
}

// ─── CRUD ─────────────────────────────────────────────────────────────────

export function baoGiaGetAll(filter: BanHangFilter): BaoGiaRecord[] {
  init()
  const { tu, den, tim_kiem } = filter
  return _list.filter((r) => {
    if (tu && r.ngay_bao_gia < tu) return false
    if (den && r.ngay_bao_gia > den) return false
    if (tim_kiem) {
      const kw = tim_kiem.toLowerCase()
      const hay = `${r.so_bao_gia} ${r.khach_hang} ${r.dien_giai ?? ''} ${r.tinh_trang}`.toLowerCase()
      if (!hay.includes(kw)) return false
    }
    return true
  })
}

export function baoGiaGetChiTiet(id: string): BaoGiaChiTiet[] {
  init()
  return _chiTietList.filter((c) => c.bao_gia_id === id)
}

export function baoGiaDelete(id: string): void {
  init()
  _list = _list.filter((r) => r.id !== id)
  _chiTietList = _chiTietList.filter((c) => c.bao_gia_id !== id)
  save()
}

function genId(): string {
  return `bg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

export function baoGiaSoTiepTheo(): string {
  init()
  const year = getCurrentYear()
  const nums = _list
    .map((r) => {
      const m = r.so_bao_gia.match(/^(\d{4})\/BG\/(\d+)$/)
      return m && parseInt(m[1], 10) === year ? parseInt(m[2], 10) : 0
    })
    .filter(Boolean)
  const max = nums.length ? Math.max(...nums) : 0
  return maFormatHeThong('BG', max + 1)
}

export function baoGiaPost(payload: BaoGiaCreatePayload): BaoGiaRecord {
  init()
  const id = genId()
  const record: BaoGiaRecord = {
    id,
    so_bao_gia: payload.so_bao_gia,
    ngay_bao_gia: payload.ngay_bao_gia,
    ngay_het_han: payload.ngay_het_han,
    khach_hang: payload.khach_hang,
    nguoi_lien_he: payload.nguoi_lien_he,
    dien_giai: payload.dien_giai,
    tong_tien_hang: payload.tong_tien_hang,
    tong_thue_gtgt: payload.tong_thue_gtgt,
    tong_thanh_toan: payload.tong_thanh_toan,
    tinh_trang: payload.tinh_trang,
    ghi_chu: payload.ghi_chu,
    nv_ban_hang: payload.nv_ban_hang,
  }
  _list.unshift(record)
  const ctIds = payload.chi_tiet.map((c, i) => ({
    ...c,
    id: `bgct_${id}_${i}`,
    bao_gia_id: id,
    stt: i + 1,
  }))
  _chiTietList = [..._chiTietList, ...ctIds]
  save()
  return record
}

export function baoGiaPut(id: string, payload: BaoGiaCreatePayload): BaoGiaRecord {
  init()
  const idx = _list.findIndex((r) => r.id === id)
  if (idx < 0) throw new Error('Báo giá không tìm thấy: ' + id)
  const updated: BaoGiaRecord = {
    id,
    so_bao_gia: payload.so_bao_gia,
    ngay_bao_gia: payload.ngay_bao_gia,
    ngay_het_han: payload.ngay_het_han,
    khach_hang: payload.khach_hang,
    nguoi_lien_he: payload.nguoi_lien_he,
    dien_giai: payload.dien_giai,
    tong_tien_hang: payload.tong_tien_hang,
    tong_thue_gtgt: payload.tong_thue_gtgt,
    tong_thanh_toan: payload.tong_thanh_toan,
    tinh_trang: payload.tinh_trang,
    ghi_chu: payload.ghi_chu,
    nv_ban_hang: payload.nv_ban_hang,
  }
  _list[idx] = updated
  _chiTietList = _chiTietList.filter((c) => c.bao_gia_id !== id)
  const newCt = payload.chi_tiet.map((c, i) => ({
    ...c,
    id: `bgct_${id}_${i}_${Date.now()}`,
    bao_gia_id: id,
    stt: i + 1,
  }))
  _chiTietList = [..._chiTietList, ...newCt]
  save()
  return updated
}

/** Lấy N lịch sử giao dịch gần nhất của một khách hàng (theo tên) */
export function baoGiaGetLichSuKhachHang(
  khachHang: string,
  limit = 5
): { so_bao_gia: string; ngay_bao_gia: string; ten_hang: string; so_luong: number; don_gia: number }[] {
  init()
  const khLower = khachHang.trim().toLowerCase()
  if (!khLower) return []
  const filtered = _list
    .filter((r) => r.khach_hang.toLowerCase() === khLower)
    .sort((a, b) => b.ngay_bao_gia.localeCompare(a.ngay_bao_gia))
    .slice(0, limit * 3)
  const result: { so_bao_gia: string; ngay_bao_gia: string; ten_hang: string; so_luong: number; don_gia: number }[] = []
  for (const bg of filtered) {
    const cts = _chiTietList.filter((c) => c.bao_gia_id === bg.id)
    for (const ct of cts) {
      result.push({
        so_bao_gia: bg.so_bao_gia,
        ngay_bao_gia: bg.ngay_bao_gia,
        ten_hang: ct.ten_hang,
        so_luong: ct.so_luong,
        don_gia: ct.don_gia,
      })
      if (result.length >= limit) return result
    }
  }
  return result
}

export function baoGiaBuildPayloadFromRecord(r: BaoGiaRecord, ct: BaoGiaChiTiet[]): BaoGiaCreatePayload {
  return {
    so_bao_gia: r.so_bao_gia,
    ngay_bao_gia: r.ngay_bao_gia,
    ngay_het_han: r.ngay_het_han,
    khach_hang: r.khach_hang,
    nguoi_lien_he: r.nguoi_lien_he,
    dien_giai: r.dien_giai,
    tong_tien_hang: r.tong_tien_hang,
    tong_thue_gtgt: r.tong_thue_gtgt,
    tong_thanh_toan: r.tong_thanh_toan,
    tinh_trang: r.tinh_trang,
    ghi_chu: r.ghi_chu,
    nv_ban_hang: r.nv_ban_hang,
    chi_tiet: ct.map((c) => ({
      stt: c.stt,
      ma_hang: c.ma_hang,
      ten_hang: c.ten_hang,
      dvt: c.dvt,
      so_luong: c.so_luong,
      don_gia: c.don_gia,
      thanh_tien: c.thanh_tien,
      pt_thue_gtgt: c.pt_thue_gtgt,
      tien_thue_gtgt: c.tien_thue_gtgt,
      ghi_chu: c.ghi_chu,
    })),
  }
}
