/**
 * API Hợp đồng bán (nguyên tắc) — htqlEntityStorage mock, tách biệt chứng từ `phuLucHopDongBanChungTuApi`.
 * Cấu trúc song song `donHangBan/donHangBanApi.ts` cho module `phuLucHopDongBan/`.
 */

import type {
  HopDongBanRecord,
  HopDongBanChiTiet,
  HopDongBanCreatePayload,
  BanHangFilter,
  BanHangKyValue,
} from '../../../../types/banHang'
import type { BaoGiaRecord, BaoGiaChiTiet } from '../../../../types/baoGia'
import { maFormatHeThong, getCurrentYear } from '../../../../utils/maFormat'
import { htqlEntityStorage } from '@/utils/htqlEntityStorage'

export type { HopDongBanRecord, HopDongBanChiTiet, HopDongBanCreatePayload, BanHangKyValue }

const STORAGE_KEY_HD = 'htql_phu_luc_hop_dong_ban_nguyen_tac_list'
const STORAGE_KEY_CHI_TIET = 'htql_phu_luc_hop_dong_ban_nguyen_tac_chi_tiet'

const MOCK_HD: HopDongBanRecord[] = [
  {
    id: 'plhdbnt1',
    so_hop_dong: '2026/HDBNT/1',
    ngay_ky: '2026-03-10',
    ngay_hieu_luc: '2026-03-15',
    ngay_het_han: '2026-12-31',
    khach_hang: 'Công ty CP Xây dựng XYZ',
    han_muc_gia_tri: 500_000_000,
    gia_tri_da_su_dung: 0,
    dien_giai: 'Hợp đồng nguyên tắc (mock)',
    tinh_trang: 'Đang hiệu lực',
    nv_ban_hang: 'Trần Thị B',
    bao_gia_id: 'bg2',
    so_bao_gia_goc: '2026/BG/2',
  },
]

const MOCK_CT: HopDongBanChiTiet[] = [
  {
    id: 'plhdbntct1',
    hop_dong_ban_id: 'plhdbnt1',
    stt: 1,
    ma_hang: 'VT00002',
    ten_hang: 'Xi măng Hoàng Thạch',
    dvt: 'Tấn',
    so_luong: 100,
    don_gia: 850_000,
    thanh_tien: 85_000_000,
    pt_thue_gtgt: 10,
    tien_thue_gtgt: 8_500_000,
  },
]

function loadFromStorage(): { hd: HopDongBanRecord[]; chiTiet: HopDongBanChiTiet[] } {
  try {
    const rawHd = typeof htqlEntityStorage !== 'undefined' ? htqlEntityStorage.getItem(STORAGE_KEY_HD) : null
    const rawCt = typeof htqlEntityStorage !== 'undefined' ? htqlEntityStorage.getItem(STORAGE_KEY_CHI_TIET) : null
    const hd = rawHd ? JSON.parse(rawHd) : null
    const chiTiet = rawCt ? JSON.parse(rawCt) : null
    if (Array.isArray(hd) && Array.isArray(chiTiet)) return { hd, chiTiet }
  } catch { /* ignore */ }
  return { hd: [...MOCK_HD], chiTiet: [...MOCK_CT] }
}

let _list: HopDongBanRecord[] = []
let _chiTietList: HopDongBanChiTiet[] = []

function init() {
  if (_list.length === 0 && _chiTietList.length === 0) {
    const loaded = loadFromStorage()
    _list = loaded.hd
    _chiTietList = loaded.chiTiet
  }
}
init()

function save() {
  try {
    if (typeof htqlEntityStorage !== 'undefined') {
      htqlEntityStorage.setItem(STORAGE_KEY_HD, JSON.stringify(_list))
      htqlEntityStorage.setItem(STORAGE_KEY_CHI_TIET, JSON.stringify(_chiTietList))
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

export function getDefaultHopDongBanFilter(): BanHangFilter {
  return { ky: 'tat_ca', tu: '', den: '', tim_kiem: '' }
}

export function hopDongBanGetAll(filter: BanHangFilter): HopDongBanRecord[] {
  init()
  const { tu, den, tim_kiem } = filter
  return _list.filter((r) => {
    if (tu && r.ngay_ky < tu) return false
    if (den && r.ngay_ky > den) return false
    if (tim_kiem) {
      const kw = tim_kiem.toLowerCase()
      const hay = `${r.so_hop_dong} ${r.khach_hang} ${r.dien_giai ?? ''} ${r.tinh_trang} ${r.so_bao_gia_goc ?? ''}`.toLowerCase()
      if (!hay.includes(kw)) return false
    }
    return true
  })
}

export function hopDongBanGetChiTiet(id: string): HopDongBanChiTiet[] {
  init()
  return _chiTietList.filter((c) => c.hop_dong_ban_id === id)
}

export function hopDongBanDelete(id: string): void {
  init()
  _list = _list.filter((r) => r.id !== id)
  _chiTietList = _chiTietList.filter((c) => c.hop_dong_ban_id !== id)
  save()
}

function genId(): string {
  return `hdbnt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

export function hopDongBanSoTiepTheo(): string {
  init()
  const year = getCurrentYear()
  const nums = _list
    .map((r) => {
      const m = r.so_hop_dong.match(/^(\d{4})\/HDBNT\/(\d+)$/)
      return m && parseInt(m[1], 10) === year ? parseInt(m[2], 10) : 0
    })
    .filter(Boolean)
  const max = nums.length ? Math.max(...nums) : 0
  return maFormatHeThong('HDBNT', max + 1)
}

export function hopDongBanPost(payload: HopDongBanCreatePayload): HopDongBanRecord {
  init()
  const id = genId()
  const record: HopDongBanRecord = {
    id,
    so_hop_dong: payload.so_hop_dong,
    ngay_ky: payload.ngay_ky,
    ngay_hieu_luc: payload.ngay_hieu_luc,
    ngay_het_han: payload.ngay_het_han,
    khach_hang: payload.khach_hang,
    han_muc_gia_tri: payload.han_muc_gia_tri,
    gia_tri_da_su_dung: payload.gia_tri_da_su_dung,
    dien_giai: payload.dien_giai,
    tinh_trang: payload.tinh_trang,
    ghi_chu: payload.ghi_chu,
    nv_ban_hang: payload.nv_ban_hang,
    bao_gia_id: payload.bao_gia_id,
    so_bao_gia_goc: payload.so_bao_gia_goc,
  }
  _list.unshift(record)
  const ctNew = payload.chi_tiet.map((c, i) => ({
    ...c,
    id: `hdbntct_${id}_${i}`,
    hop_dong_ban_id: id,
    stt: i + 1,
  }))
  _chiTietList = [..._chiTietList, ...ctNew]
  save()
  return record
}

export function hopDongBanPut(id: string, payload: HopDongBanCreatePayload): HopDongBanRecord {
  init()
  const idx = _list.findIndex((r) => r.id === id)
  if (idx < 0) throw new Error('Hợp đồng bán không tìm thấy: ' + id)
  const updated: HopDongBanRecord = {
    id,
    so_hop_dong: payload.so_hop_dong,
    ngay_ky: payload.ngay_ky,
    ngay_hieu_luc: payload.ngay_hieu_luc,
    ngay_het_han: payload.ngay_het_han,
    khach_hang: payload.khach_hang,
    han_muc_gia_tri: payload.han_muc_gia_tri,
    gia_tri_da_su_dung: payload.gia_tri_da_su_dung,
    dien_giai: payload.dien_giai,
    tinh_trang: payload.tinh_trang,
    ghi_chu: payload.ghi_chu,
    nv_ban_hang: payload.nv_ban_hang,
    bao_gia_id: payload.bao_gia_id,
    so_bao_gia_goc: payload.so_bao_gia_goc,
  }
  _list[idx] = updated
  _chiTietList = _chiTietList.filter((c) => c.hop_dong_ban_id !== id)
  const newCt = payload.chi_tiet.map((c, i) => ({
    ...c,
    id: `hdbntct_${id}_${i}_${Date.now()}`,
    hop_dong_ban_id: id,
    stt: i + 1,
  }))
  _chiTietList = [..._chiTietList, ...newCt]
  save()
  return updated
}

export function hopDongBanTuBaoGia(
  baoGia: BaoGiaRecord,
  chiTietBaoGia: BaoGiaChiTiet[],
  soHd: string,
  ngayKy: string,
): HopDongBanCreatePayload {
  return {
    so_hop_dong: soHd,
    ngay_ky: ngayKy,
    ngay_hieu_luc: ngayKy,
    ngay_het_han: ngayKy,
    khach_hang: baoGia.khach_hang,
    han_muc_gia_tri: baoGia.tong_thanh_toan,
    gia_tri_da_su_dung: 0,
    dien_giai: baoGia.dien_giai,
    tinh_trang: 'Chưa hiệu lực',
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

export function hopDongBanBuildPayloadFromRecord(
  r: HopDongBanRecord,
  ct: HopDongBanChiTiet[],
): HopDongBanCreatePayload {
  return {
    so_hop_dong: r.so_hop_dong,
    ngay_ky: r.ngay_ky,
    ngay_hieu_luc: r.ngay_hieu_luc,
    ngay_het_han: r.ngay_het_han,
    khach_hang: r.khach_hang,
    han_muc_gia_tri: r.han_muc_gia_tri,
    gia_tri_da_su_dung: r.gia_tri_da_su_dung,
    dien_giai: r.dien_giai,
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
