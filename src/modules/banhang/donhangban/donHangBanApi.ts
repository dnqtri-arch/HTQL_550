/**
 * API Đơn hàng bán — localStorage mock, prefix DHB.
 * Hỗ trợ "Lập từ báo giá" — copy chi tiết + khách hàng từ BaoGiaRecord.
 */

import type {
  DonHangBanRecord,
  DonHangBanChiTiet,
  DonHangBanCreatePayload,
  BanHangFilter,
  BanHangKyValue,
  BaoGiaRecord,
  BaoGiaChiTiet,
} from '../../../types/banHang'
import { maFormatHeThong, getCurrentYear } from '../../../utils/maFormat'

export type { DonHangBanRecord, DonHangBanChiTiet, DonHangBanCreatePayload, BanHangKyValue }

const STORAGE_KEY_DON = 'htql_don_hang_ban_list'
const STORAGE_KEY_CHI_TIET = 'htql_don_hang_ban_chi_tiet'

const MOCK_DHB: DonHangBanRecord[] = [
  {
    id: 'dhb1',
    so_don_hang: '2026/DHB/1',
    ngay_don_hang: '2026-03-14',
    ngay_giao_hang: '2026-03-21',
    khach_hang: 'Công ty CP Xây dựng XYZ',
    dien_giai: 'Đơn hàng vật liệu xây dựng',
    tong_tien_hang: 85000000,
    tong_thue_gtgt: 8500000,
    tong_thanh_toan: 93500000,
    tinh_trang: 'Đang thực hiện',
    nv_ban_hang: 'Trần Thị B',
    bao_gia_id: 'bg2',
    so_bao_gia_goc: '2026/BG/2',
  },
]

const MOCK_CT: DonHangBanChiTiet[] = [
  {
    id: 'dhbct1',
    don_hang_ban_id: 'dhb1',
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

function loadFromStorage(): { don: DonHangBanRecord[]; chiTiet: DonHangBanChiTiet[] } {
  try {
    const rawDon = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY_DON) : null
    const rawCt = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY_CHI_TIET) : null
    const don = rawDon ? JSON.parse(rawDon) : null
    const chiTiet = rawCt ? JSON.parse(rawCt) : null
    if (Array.isArray(don) && Array.isArray(chiTiet)) return { don, chiTiet }
  } catch { /* ignore */ }
  return { don: [...MOCK_DHB], chiTiet: [...MOCK_CT] }
}

let _list: DonHangBanRecord[] = []
let _chiTietList: DonHangBanChiTiet[] = []

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
  if (ky === 'thang_nay') return { tu: `${y}-${pad(m + 1)}-01`, den: iso(new Date(y, m + 1, 0)) }
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

export function getDefaultDonHangBanFilter(): BanHangFilter {
  return { ky: 'tat_ca', tu: '', den: '', tim_kiem: '' }
}

export function donHangBanGetAll(filter: BanHangFilter): DonHangBanRecord[] {
  init()
  const { tu, den, tim_kiem } = filter
  return _list.filter((r) => {
    if (tu && r.ngay_don_hang < tu) return false
    if (den && r.ngay_don_hang > den) return false
    if (tim_kiem) {
      const kw = tim_kiem.toLowerCase()
      const hay = `${r.so_don_hang} ${r.khach_hang} ${r.dien_giai ?? ''} ${r.tinh_trang} ${r.so_bao_gia_goc ?? ''}`.toLowerCase()
      if (!hay.includes(kw)) return false
    }
    return true
  })
}

export function donHangBanGetChiTiet(id: string): DonHangBanChiTiet[] {
  init()
  return _chiTietList.filter((c) => c.don_hang_ban_id === id)
}

export function donHangBanDelete(id: string): void {
  init()
  _list = _list.filter((r) => r.id !== id)
  _chiTietList = _chiTietList.filter((c) => c.don_hang_ban_id !== id)
  save()
}

function genId(): string {
  return `dhb_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

export function donHangBanSoTiepTheo(): string {
  init()
  const year = getCurrentYear()
  const nums = _list
    .map((r) => {
      const m = r.so_don_hang.match(/^(\d{4})\/DHB\/(\d+)$/)
      return m && parseInt(m[1], 10) === year ? parseInt(m[2], 10) : 0
    })
    .filter(Boolean)
  const max = nums.length ? Math.max(...nums) : 0
  return maFormatHeThong('DHB', max + 1)
}

export function donHangBanPost(payload: DonHangBanCreatePayload): DonHangBanRecord {
  init()
  const id = genId()
  const record: DonHangBanRecord = {
    id,
    so_don_hang: payload.so_don_hang,
    ngay_don_hang: payload.ngay_don_hang,
    ngay_giao_hang: payload.ngay_giao_hang,
    khach_hang: payload.khach_hang,
    dia_chi: payload.dia_chi,
    ma_so_thue: payload.ma_so_thue,
    dien_giai: payload.dien_giai,
    tong_tien_hang: payload.tong_tien_hang,
    tong_thue_gtgt: payload.tong_thue_gtgt,
    tong_thanh_toan: payload.tong_thanh_toan,
    tinh_trang: payload.tinh_trang,
    ghi_chu: payload.ghi_chu,
    nv_ban_hang: payload.nv_ban_hang,
    bao_gia_id: payload.bao_gia_id,
    so_bao_gia_goc: payload.so_bao_gia_goc,
  }
  _list.unshift(record)
  const ctNew = payload.chi_tiet.map((c, i) => ({
    ...c,
    id: `dhbct_${id}_${i}`,
    don_hang_ban_id: id,
    stt: i + 1,
  }))
  _chiTietList = [..._chiTietList, ...ctNew]
  save()
  return record
}

export function donHangBanPut(id: string, payload: DonHangBanCreatePayload): DonHangBanRecord {
  init()
  const idx = _list.findIndex((r) => r.id === id)
  if (idx < 0) throw new Error('Đơn hàng bán không tìm thấy: ' + id)
  const updated: DonHangBanRecord = {
    id,
    so_don_hang: payload.so_don_hang,
    ngay_don_hang: payload.ngay_don_hang,
    ngay_giao_hang: payload.ngay_giao_hang,
    khach_hang: payload.khach_hang,
    dia_chi: payload.dia_chi,
    ma_so_thue: payload.ma_so_thue,
    dien_giai: payload.dien_giai,
    tong_tien_hang: payload.tong_tien_hang,
    tong_thue_gtgt: payload.tong_thue_gtgt,
    tong_thanh_toan: payload.tong_thanh_toan,
    tinh_trang: payload.tinh_trang,
    ghi_chu: payload.ghi_chu,
    nv_ban_hang: payload.nv_ban_hang,
    bao_gia_id: payload.bao_gia_id,
    so_bao_gia_goc: payload.so_bao_gia_goc,
    phieu_xuat_kho_ids: _list[idx].phieu_xuat_kho_ids,
  }
  _list[idx] = updated
  _chiTietList = _chiTietList.filter((c) => c.don_hang_ban_id !== id)
  const newCt = payload.chi_tiet.map((c, i) => ({
    ...c,
    id: `dhbct_${id}_${i}_${Date.now()}`,
    don_hang_ban_id: id,
    stt: i + 1,
  }))
  _chiTietList = [..._chiTietList, ...newCt]
  save()
  return updated
}

/** Tạo payload đơn hàng bán từ báo giá (copy 100% chi tiết + khách hàng). */
export function donHangBanTuBaoGia(
  baoGia: BaoGiaRecord,
  chiTietBaoGia: BaoGiaChiTiet[],
  soDon: string,
  ngayDon: string,
): DonHangBanCreatePayload {
  return {
    so_don_hang: soDon,
    ngay_don_hang: ngayDon,
    ngay_giao_hang: null,
    khach_hang: baoGia.khach_hang,
    dien_giai: baoGia.dien_giai,
    tong_tien_hang: baoGia.tong_tien_hang,
    tong_thue_gtgt: baoGia.tong_thue_gtgt,
    tong_thanh_toan: baoGia.tong_thanh_toan,
    tinh_trang: 'Chưa thực hiện',
    nv_ban_hang: baoGia.nv_ban_hang,
    bao_gia_id: baoGia.id,
    so_bao_gia_goc: baoGia.so_bao_gia,
    chi_tiet: chiTietBaoGia.map((c) => ({
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

export function donHangBanBuildPayloadFromRecord(
  r: DonHangBanRecord,
  ct: DonHangBanChiTiet[],
): DonHangBanCreatePayload {
  return {
    so_don_hang: r.so_don_hang,
    ngay_don_hang: r.ngay_don_hang,
    ngay_giao_hang: r.ngay_giao_hang,
    khach_hang: r.khach_hang,
    dia_chi: r.dia_chi,
    ma_so_thue: r.ma_so_thue,
    dien_giai: r.dien_giai,
    tong_tien_hang: r.tong_tien_hang,
    tong_thue_gtgt: r.tong_thue_gtgt,
    tong_thanh_toan: r.tong_thanh_toan,
    tinh_trang: r.tinh_trang,
    ghi_chu: r.ghi_chu,
    nv_ban_hang: r.nv_ban_hang,
    bao_gia_id: r.bao_gia_id,
    so_bao_gia_goc: r.so_bao_gia_goc,
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
