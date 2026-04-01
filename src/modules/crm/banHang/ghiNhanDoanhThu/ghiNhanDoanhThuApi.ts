/**
 * API và types cho Nhận vật tư hàng hóa — NVTHH (header + chi tiết dòng).
 * Module độc lập; mã: {Năm}/NVTHH/{Số} — rule ma-he-thong.mdc
 * Đồng bộ «Đã nhận hàng» sang ĐHM khi phiếu ở tình trạng đã nhập kho: phát CustomEvent (shell Mua hàng gọi donHangMuaSetTinhTrang).
 */

import { maFormatHeThong, getCurrentYear } from '../../../../utils/maFormat'
import type { GhiNhanDoanhThuAttachmentItem } from './ghiNhanDoanhThuAttachmentTypes'
import { TINH_TRANG_DON_HANG_MUA_DA_NHAN_HANG } from '../../muaHang/donHangMua/donHangMuaApi'
import { HTQL_NVTHH_SYNC_DHM_TINH_TRANG_EVENT } from '../../muaHang/muaHangTabEvent'

export type { GhiNhanDoanhThuAttachmentItem } from './ghiNhanDoanhThuAttachmentTypes'

/** Tình trạng phiếu NVTHH sau nhập kho (form/danh sách); ĐHM vẫn dùng «Đã nhận hàng» khi đồng bộ. */
export const TINH_TRANG_NVTHH_DA_NHAP_KHO = 'Đã nhập kho'

function tinhTrangPhieuNvthhTuStorage(raw: string): string {
  if (raw === TINH_TRANG_DON_HANG_MUA_DA_NHAN_HANG) return TINH_TRANG_NVTHH_DA_NHAP_KHO
  return raw
}

function shouldEmitDongBoDhmTuPhieuNvthh(tinhTrang: string): boolean {
  const t = (tinhTrang ?? '').trim()
  return t === TINH_TRANG_NVTHH_DA_NHAP_KHO || t === TINH_TRANG_DON_HANG_MUA_DA_NHAN_HANG
}

function emitYeuCauDongBoDaNhanHangDonMua(doiChieuDonMuaId: string | undefined): void {
  const id = doiChieuDonMuaId?.trim()
  if (!id || typeof window === 'undefined') return
  window.dispatchEvent(
    new CustomEvent(HTQL_NVTHH_SYNC_DHM_TINH_TRANG_EVENT, { detail: { doi_chieu_don_mua_id: id } })
  )
}

export interface GhiNhanDoanhThuRecord {
  id: string
  tinh_trang: string
  ngay_don_hang: string
  so_don_hang: string
  ngay_giao_hang: string | null
  nha_cung_cap: string
  dia_chi: string
  nguoi_giao_hang?: string
  ma_so_thue: string
  dien_giai: string
  nv_mua_hang: string
  dieu_khoan_tt: string
  so_ngay_duoc_no: string
  dia_diem_giao_hang: string
  dieu_khoan_khac: string
  gia_tri_don_hang: number
  so_chung_tu_cukcuk: string
  doi_chieu_don_mua_id?: string
  attachments?: GhiNhanDoanhThuAttachmentItem[]
  hinh_thuc?: 'nhap_kho' | 'khong_nhap_kho' | 'ca_hai' | string
  kho_nhap_id?: string
  ten_cong_trinh?: string
  dia_chi_cong_trinh?: string
  chung_tu_mua_loai_chung_tu?: string
  chung_tu_mua_chua_thanh_toan?: boolean
  chung_tu_mua_thanh_toan_ngay?: boolean
  chung_tu_mua_pttt?: string
  chung_tu_mua_ck?: 'tien_mat' | 'chuyen_khoan'
  chung_tu_mua_loai_hd?: 'gtgt' | 'hd_le' | 'khong_co'
  chung_tu_mua_so_hoa_don?: string
  hoa_don_ngay?: string
  hoa_don_ky_hieu?: string
  mau_hoa_don_ma?: string
  mau_hoa_don_ten?: string
  phieu_chi_nha_cung_cap?: string
  phieu_chi_dia_chi?: string
  phieu_chi_nguoi_nhan_tien?: string
  phieu_chi_ly_do?: string
  phieu_chi_ngay?: string
  phieu_chi_tai_khoan_chi?: string
  phieu_chi_ngan_hang_chi?: string
  phieu_chi_ten_nguoi_gui?: string
  phieu_chi_tai_khoan_nhan?: string
  phieu_chi_ngan_hang_nhan?: string
  phieu_chi_ten_chu_tk_nhan?: string
  phieu_chi_ngan_hang?: string
  phieu_chi_ten_nguoi_nhan_ck?: string
  phieu_chi_attachments?: GhiNhanDoanhThuAttachmentItem[]
}

export interface GhiNhanDoanhThuChiTiet {
  id: string
  don_hang_mua_id: string
  ma_hang: string
  ten_hang: string
  ma_quy_cach: string
  dvt: string
  chieu_dai: number
  chieu_rong: number
  chieu_cao: number
  ban_kinh: number
  luong: number
  so_luong: number
  so_luong_nhan: number
  don_gia: number
  thanh_tien: number
  pt_thue_gtgt: number | null
  tien_thue_gtgt: number | null
  lenh_san_xuat: string
  ghi_chu?: string
  dd_gh_index?: number | null
}

export interface GhiNhanDoanhThuCreatePayload {
  tinh_trang: string
  ngay_don_hang: string
  so_don_hang: string
  ngay_giao_hang: string | null
  nha_cung_cap: string
  dia_chi: string
  nguoi_giao_hang?: string
  ma_so_thue: string
  dien_giai: string
  nv_mua_hang: string
  dieu_khoan_tt: string
  so_ngay_duoc_no: string
  dia_diem_giao_hang: string
  dieu_khoan_khac: string
  gia_tri_don_hang: number
  so_chung_tu_cukcuk: string
  doi_chieu_don_mua_id?: string
  attachments?: GhiNhanDoanhThuAttachmentItem[]
  hinh_thuc?: 'nhap_kho' | 'khong_nhap_kho' | 'ca_hai' | string
  kho_nhap_id?: string
  ten_cong_trinh?: string
  dia_chi_cong_trinh?: string
  chung_tu_mua_loai_chung_tu?: string
  chung_tu_mua_chua_thanh_toan?: boolean
  chung_tu_mua_thanh_toan_ngay?: boolean
  chung_tu_mua_pttt?: string
  chung_tu_mua_ck?: 'tien_mat' | 'chuyen_khoan'
  chung_tu_mua_loai_hd?: 'gtgt' | 'hd_le' | 'khong_co'
  chung_tu_mua_so_hoa_don?: string
  hoa_don_ngay?: string
  hoa_don_ky_hieu?: string
  mau_hoa_don_ma?: string
  mau_hoa_don_ten?: string
  phieu_chi_nha_cung_cap?: string
  phieu_chi_dia_chi?: string
  phieu_chi_nguoi_nhan_tien?: string
  phieu_chi_ly_do?: string
  phieu_chi_ngay?: string
  phieu_chi_tai_khoan_chi?: string
  phieu_chi_ngan_hang_chi?: string
  phieu_chi_ten_nguoi_gui?: string
  phieu_chi_tai_khoan_nhan?: string
  phieu_chi_ngan_hang_nhan?: string
  phieu_chi_ten_chu_tk_nhan?: string
  phieu_chi_ngan_hang?: string
  phieu_chi_ten_nguoi_nhan_ck?: string
  phieu_chi_attachments?: GhiNhanDoanhThuAttachmentItem[]
  chiTiet: Array<{
    ma_hang: string
    ten_hang: string
    dvt: string
    so_luong: number
    don_gia: number
    thanh_tien: number
    pt_thue_gtgt: number | null
    tien_thue_gtgt: number | null
    dd_gh_index?: number | null
    ghi_chu?: string
  }>
}

/** Dữ liệu mẫu phiếu nhận hàng */
const MOCK_DON: GhiNhanDoanhThuRecord[] = [
  {
    id: 'nvthh1',
    tinh_trang: 'Chưa thực hiện',
    ngay_don_hang: '2026-03-10',
    so_don_hang: '2026/NVTHH/1',
    ngay_giao_hang: null,
    nha_cung_cap: 'CÔNG TY TNHH QUẢNG CÁO VAX',
    dia_chi: '',
    ma_so_thue: '',
    dien_giai: '',
    nv_mua_hang: '',
    dieu_khoan_tt: '',
    so_ngay_duoc_no: '0',
    dia_diem_giao_hang: '',
    dieu_khoan_khac: '',
    gia_tri_don_hang: 4000000,
    so_chung_tu_cukcuk: '',
  },
  {
    id: 'nvthh2',
    tinh_trang: 'Đang thực hiện',
    ngay_don_hang: '2026-03-12',
    so_don_hang: '2026/NVTHH/2',
    ngay_giao_hang: '2026-03-20',
    nha_cung_cap: 'CÔNG TY CP NGUYÊN VẬT LIỆU ABC',
    dia_chi: '',
    ma_so_thue: '',
    dien_giai: 'Phiếu nhận vật tư quý 1',
    nv_mua_hang: '',
    dieu_khoan_tt: '',
    so_ngay_duoc_no: '0',
    dia_diem_giao_hang: '',
    dieu_khoan_khac: '',
    gia_tri_don_hang: 15000000,
    so_chung_tu_cukcuk: '',
  },
]

/** Chi tiết theo phiếu */
const MOCK_CHI_TIET: GhiNhanDoanhThuChiTiet[] = [
  {
    id: 'ctnvthh1-0',
    don_hang_mua_id: 'nvthh1',
    ma_hang: 'VT00001',
    ten_hang: 'decal trang sus',
    ma_quy_cach: '',
    dvt: 'Cây',
    chieu_dai: 0,
    chieu_rong: 0,
    chieu_cao: 0,
    ban_kinh: 0,
    luong: 0,
    so_luong: 5,
    so_luong_nhan: 0,
    don_gia: 800000,
    thanh_tien: 4000000,
    pt_thue_gtgt: null,
    tien_thue_gtgt: null,
    lenh_san_xuat: '',
    dd_gh_index: 0,
  },
]

const STORAGE_KEY_DON = 'htql_ghi_nhan_doanh_thu_list'
const STORAGE_KEY_CHI_TIET = 'htql_ghi_nhan_doanh_thu_chi_tiet'
const STORAGE_KEY_DRAFT = 'htql_ghi_nhan_doanh_thu_draft'

const LEGACY_STORAGE_KEY_DON = 'htql_nhan_hang_list'
const LEGACY_STORAGE_KEY_CHI_TIET = 'htql_nhan_hang_chi_tiet'
const LEGACY_STORAGE_KEY_DRAFT = 'htql_nhan_hang_draft'

const MODULE_PREFIX = 'NVTHH'

function normalizeDon(d: Partial<GhiNhanDoanhThuRecord> & { id: string; de_xuat_id?: string }): GhiNhanDoanhThuRecord {
  const legacyDx = (d as { de_xuat_id?: string }).de_xuat_id
  const doiChieu = d.doi_chieu_don_mua_id ?? legacyDx
  const rawTt = d.tinh_trang ?? 'Chưa thực hiện'
  return {
    id: d.id,
    tinh_trang: tinhTrangPhieuNvthhTuStorage(rawTt),
    ngay_don_hang: d.ngay_don_hang ?? '',
    so_don_hang: String(d.so_don_hang ?? '').replace(/NHHDV/gi, 'NVTHH'),
    ngay_giao_hang: d.ngay_giao_hang ?? null,
    nha_cung_cap: d.nha_cung_cap ?? '',
    dia_chi: d.dia_chi ?? '',
    nguoi_giao_hang: d.nguoi_giao_hang ?? undefined,
    ma_so_thue: d.ma_so_thue ?? '',
    dien_giai: d.dien_giai ?? '',
    nv_mua_hang: d.nv_mua_hang ?? '',
    dieu_khoan_tt: d.dieu_khoan_tt ?? '',
    so_ngay_duoc_no: d.so_ngay_duoc_no ?? '0',
    dia_diem_giao_hang: d.dia_diem_giao_hang ?? '',
    dieu_khoan_khac: d.dieu_khoan_khac ?? '',
    gia_tri_don_hang: typeof d.gia_tri_don_hang === 'number' ? d.gia_tri_don_hang : 0,
    so_chung_tu_cukcuk: d.so_chung_tu_cukcuk ?? '',
    doi_chieu_don_mua_id: doiChieu ?? undefined,
    attachments: Array.isArray((d as { attachments?: GhiNhanDoanhThuAttachmentItem[] }).attachments)
      ? (d as { attachments: GhiNhanDoanhThuAttachmentItem[] }).attachments
      : undefined,
    hinh_thuc: d.hinh_thuc,
    kho_nhap_id: d.kho_nhap_id,
    ten_cong_trinh: d.ten_cong_trinh,
    dia_chi_cong_trinh: d.dia_chi_cong_trinh,
    chung_tu_mua_loai_chung_tu: d.chung_tu_mua_loai_chung_tu,
    chung_tu_mua_chua_thanh_toan: d.chung_tu_mua_chua_thanh_toan,
    chung_tu_mua_thanh_toan_ngay: d.chung_tu_mua_thanh_toan_ngay,
    chung_tu_mua_pttt: d.chung_tu_mua_pttt,
    chung_tu_mua_ck: d.chung_tu_mua_ck,
    chung_tu_mua_loai_hd: d.chung_tu_mua_loai_hd,
    chung_tu_mua_so_hoa_don: d.chung_tu_mua_so_hoa_don,
    hoa_don_ngay: d.hoa_don_ngay,
    hoa_don_ky_hieu: d.hoa_don_ky_hieu,
    mau_hoa_don_ma: d.mau_hoa_don_ma,
    mau_hoa_don_ten: d.mau_hoa_don_ten,
    phieu_chi_nha_cung_cap: d.phieu_chi_nha_cung_cap,
    phieu_chi_dia_chi: d.phieu_chi_dia_chi,
    phieu_chi_nguoi_nhan_tien: d.phieu_chi_nguoi_nhan_tien,
    phieu_chi_ly_do: d.phieu_chi_ly_do,
    phieu_chi_ngay: d.phieu_chi_ngay,
    phieu_chi_tai_khoan_chi: d.phieu_chi_tai_khoan_chi,
    phieu_chi_ngan_hang_chi: d.phieu_chi_ngan_hang_chi,
    phieu_chi_ten_nguoi_gui: d.phieu_chi_ten_nguoi_gui,
    phieu_chi_tai_khoan_nhan: d.phieu_chi_tai_khoan_nhan,
    phieu_chi_ngan_hang_nhan: d.phieu_chi_ngan_hang_nhan,
    phieu_chi_ten_chu_tk_nhan: d.phieu_chi_ten_chu_tk_nhan,
    phieu_chi_ngan_hang: d.phieu_chi_ngan_hang,
    phieu_chi_ten_nguoi_nhan_ck: d.phieu_chi_ten_nguoi_nhan_ck,
    phieu_chi_attachments: Array.isArray(d.phieu_chi_attachments) ? d.phieu_chi_attachments : undefined,
  }
}

/** Đổi prefix id/mã cũ (nhhvt*, NHHDV) sang nvthh* / NVTHH khi đọc storage. */
function migrateParsedDonChi(
  donRaw: unknown[],
  chiRaw: unknown[]
): { don: GhiNhanDoanhThuRecord[]; chiTiet: GhiNhanDoanhThuChiTiet[] } {
  const idMap = new Map<string, string>()
  for (const x of donRaw) {
    const id = String((x as { id?: string }).id ?? '')
    if (id.startsWith('nhhvt')) idMap.set(id, `nvthh${id.slice(5)}`)
  }
  const newDon = donRaw.map((x) => {
    const d = x as Partial<GhiNhanDoanhThuRecord> & { id: string }
    const newId = idMap.get(d.id) ?? d.id
    return normalizeDon({ ...d, id: newId })
  })
  const newChi = chiRaw.map((x) => {
    const c = x as GhiNhanDoanhThuChiTiet
    const oldDonId = String(c.don_hang_mua_id ?? '')
    let newDonId = idMap.get(oldDonId) ?? oldDonId
    if (newDonId === oldDonId && oldDonId.startsWith('nhhvt')) newDonId = `nvthh${oldDonId.slice(5)}`
    let newId = c.id
    const m = /^ct(.+)-(\d+)$/.exec(c.id)
    if (m) {
      const oldDhm = m[1]
      const idx = m[2]
      const mapped = idMap.get(oldDhm) ?? (oldDhm.startsWith('nhhvt') ? `nvthh${oldDhm.slice(5)}` : oldDhm)
      newId = `ct${mapped}-${idx}`
    }
    return { ...c, id: newId, don_hang_mua_id: newDonId }
  })
  return { don: newDon, chiTiet: newChi }
}

function loadFromStorage(): { don: GhiNhanDoanhThuRecord[]; chiTiet: GhiNhanDoanhThuChiTiet[] } {
  try {
    const ls = typeof localStorage !== 'undefined' ? localStorage : null
    if (!ls) throw new Error('no storage')
    const parsePair = (rawDon: string | null, rawCt: string | null) => {
      if (!rawDon || !rawCt) return null
      const don = JSON.parse(rawDon) as unknown
      const chiTiet = JSON.parse(rawCt) as unknown
      if (!Array.isArray(don) || !Array.isArray(chiTiet)) return null
      return migrateParsedDonChi(don, chiTiet)
    }
    const fromNew = parsePair(ls.getItem(STORAGE_KEY_DON), ls.getItem(STORAGE_KEY_CHI_TIET))
    if (fromNew) return fromNew
    const fromLeg = parsePair(ls.getItem(LEGACY_STORAGE_KEY_DON), ls.getItem(LEGACY_STORAGE_KEY_CHI_TIET))
    if (fromLeg) {
      try {
        ls.setItem(STORAGE_KEY_DON, JSON.stringify(fromLeg.don))
        ls.setItem(STORAGE_KEY_CHI_TIET, JSON.stringify(fromLeg.chiTiet))
        ls.removeItem(LEGACY_STORAGE_KEY_DON)
        ls.removeItem(LEGACY_STORAGE_KEY_CHI_TIET)
      } catch {
        /* ignore */
      }
      return fromLeg
    }
  } catch {
    /* ignore */
  }
  return { don: [...MOCK_DON], chiTiet: [...MOCK_CHI_TIET] }
}

function saveToStorage(): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_DON, JSON.stringify(_donList))
      localStorage.setItem(STORAGE_KEY_CHI_TIET, JSON.stringify(_chiTietList))
    }
  } catch {
    /* ignore */
  }
}

export type GhiNhanDoanhThuDraftLine = Record<string, string> & { _dvtOptions?: string[] }

export function getGhiNhanDoanhThuDraft(): GhiNhanDoanhThuDraftLine[] | null {
  try {
    const ls = typeof localStorage !== 'undefined' ? localStorage : null
    if (!ls) return null
    const raw = ls.getItem(STORAGE_KEY_DRAFT) ?? ls.getItem(LEGACY_STORAGE_KEY_DRAFT)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function setGhiNhanDoanhThuDraft(lines: Array<Record<string, string> & { _dvtOptions?: string[]; _vthh?: unknown }>): void {
  try {
    if (typeof localStorage !== 'undefined') {
      const toSave = lines.map((l) => {
        const { _vthh, ...rest } = l
        return rest
      })
      localStorage.setItem(STORAGE_KEY_DRAFT, JSON.stringify(toSave))
      localStorage.removeItem(LEGACY_STORAGE_KEY_DRAFT)
      localStorage.removeItem(LEGACY_STORAGE_KEY_DRAFT)
      localStorage.removeItem(LEGACY_STORAGE_KEY_DRAFT)
    }
  } catch {
    /* ignore */
  }
}

export function clearGhiNhanDoanhThuDraft(): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY_DRAFT)
      localStorage.removeItem(LEGACY_STORAGE_KEY_DRAFT)
    }
  } catch {
    /* ignore */
  }
}

const _initial = loadFromStorage()
let _donList: GhiNhanDoanhThuRecord[] = _initial.don
let _chiTietList: GhiNhanDoanhThuChiTiet[] = _initial.chiTiet

function formatLocalDate(d: Date): string {
  const y = d.getFullYear()
  const m = d.getMonth() + 1
  const day = d.getDate()
  return `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function getDateRangeForKy(ky: string): { tu: string; den: string } {
  if (ky === 'tat-ca') return { tu: '', den: '' }
  const now = new Date()
  const den = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  let tu: Date
  switch (ky) {
    case 'tuan-nay': {
      const day = now.getDay()
      const diff = day === 0 ? 6 : day - 1
      tu = new Date(den)
      tu.setDate(tu.getDate() - diff)
      break
    }
    case 'thang-nay':
      tu = new Date(now.getFullYear(), now.getMonth(), 1)
      break
    case 'quy-nay': {
      const q = Math.floor(now.getMonth() / 3) + 1
      tu = new Date(now.getFullYear(), (q - 1) * 3, 1)
      break
    }
    case 'nam-nay':
      tu = new Date(now.getFullYear(), 0, 1)
      break
    default:
      tu = new Date(now.getFullYear(), now.getMonth(), 1)
  }
  return {
    tu: formatLocalDate(tu),
    den: formatLocalDate(den),
  }
}

export const KY_OPTIONS = [
  { value: 'tat-ca', label: 'Tất cả' },
  { value: 'tuan-nay', label: 'Tuần này' },
  { value: 'thang-nay', label: 'Tháng này' },
  { value: 'quy-nay', label: 'Quý này' },
  { value: 'nam-nay', label: 'Năm nay' },
] as const

export type KyValue = (typeof KY_OPTIONS)[number]['value']

export interface GhiNhanDoanhThuFilter {
  ky: KyValue
  tu: string
  den: string
}

export function ghiNhanDoanhThuGetAll(filter: GhiNhanDoanhThuFilter): GhiNhanDoanhThuRecord[] {
  const { tu, den } = filter
  if (!tu || !den) return [..._donList]
  return _donList.filter((d) => {
    const ngay = d.ngay_don_hang
    return ngay >= tu && ngay <= den
  })
}

export function ghiNhanDoanhThuGetChiTiet(donId: string): GhiNhanDoanhThuChiTiet[] {
  return _chiTietList.filter((c) => c.don_hang_mua_id === donId)
}

/** Ghép payload PUT từ bản ghi + chi tiết (hủy bỏ / phục hồi tình trạng). */
export function ghiNhanDoanhThuBuildCreatePayloadFromRecord(
  row: GhiNhanDoanhThuRecord,
  ct: GhiNhanDoanhThuChiTiet[]
): GhiNhanDoanhThuCreatePayload {
  return {
    tinh_trang: row.tinh_trang,
    ngay_don_hang: row.ngay_don_hang,
    so_don_hang: row.so_don_hang,
    ngay_giao_hang: row.ngay_giao_hang,
    nha_cung_cap: row.nha_cung_cap,
    dia_chi: row.dia_chi ?? '',
    nguoi_giao_hang: row.nguoi_giao_hang,
    ma_so_thue: row.ma_so_thue ?? '',
    dien_giai: row.dien_giai ?? '',
    nv_mua_hang: row.nv_mua_hang ?? '',
    dieu_khoan_tt: row.dieu_khoan_tt ?? '',
    so_ngay_duoc_no: row.so_ngay_duoc_no ?? '0',
    dia_diem_giao_hang: row.dia_diem_giao_hang ?? '',
    dieu_khoan_khac: row.dieu_khoan_khac ?? '',
    gia_tri_don_hang: row.gia_tri_don_hang,
    so_chung_tu_cukcuk: row.so_chung_tu_cukcuk ?? '',
    doi_chieu_don_mua_id: row.doi_chieu_don_mua_id,
    attachments: row.attachments?.length ? row.attachments.map((a) => ({ ...a })) : undefined,
    hinh_thuc: row.hinh_thuc,
    kho_nhap_id: row.kho_nhap_id,
    ten_cong_trinh: row.ten_cong_trinh,
    dia_chi_cong_trinh: row.dia_chi_cong_trinh,
    chung_tu_mua_loai_chung_tu: row.chung_tu_mua_loai_chung_tu,
    chung_tu_mua_chua_thanh_toan: row.chung_tu_mua_chua_thanh_toan,
    chung_tu_mua_thanh_toan_ngay: row.chung_tu_mua_thanh_toan_ngay,
    chung_tu_mua_pttt: row.chung_tu_mua_pttt,
    chung_tu_mua_ck: row.chung_tu_mua_ck,
    chung_tu_mua_loai_hd: row.chung_tu_mua_loai_hd,
    chung_tu_mua_so_hoa_don: row.chung_tu_mua_so_hoa_don,
    hoa_don_ngay: row.hoa_don_ngay,
    hoa_don_ky_hieu: row.hoa_don_ky_hieu,
    mau_hoa_don_ma: row.mau_hoa_don_ma,
    mau_hoa_don_ten: row.mau_hoa_don_ten,
    phieu_chi_nha_cung_cap: row.phieu_chi_nha_cung_cap,
    phieu_chi_dia_chi: row.phieu_chi_dia_chi,
    phieu_chi_nguoi_nhan_tien: row.phieu_chi_nguoi_nhan_tien,
    phieu_chi_ly_do: row.phieu_chi_ly_do,
    phieu_chi_ngay: row.phieu_chi_ngay,
    phieu_chi_tai_khoan_chi: row.phieu_chi_tai_khoan_chi,
    phieu_chi_ngan_hang_chi: row.phieu_chi_ngan_hang_chi,
    phieu_chi_ten_nguoi_gui: row.phieu_chi_ten_nguoi_gui,
    phieu_chi_tai_khoan_nhan: row.phieu_chi_tai_khoan_nhan,
    phieu_chi_ngan_hang_nhan: row.phieu_chi_ngan_hang_nhan,
    phieu_chi_ten_chu_tk_nhan: row.phieu_chi_ten_chu_tk_nhan,
    phieu_chi_ngan_hang: row.phieu_chi_ngan_hang,
    phieu_chi_ten_nguoi_nhan_ck: row.phieu_chi_ten_nguoi_nhan_ck,
    phieu_chi_attachments: row.phieu_chi_attachments?.length ? row.phieu_chi_attachments.map((a) => ({ ...a })) : undefined,
    chiTiet: ct.map((c) => ({
      ma_hang: c.ma_hang,
      ten_hang: c.ten_hang,
      dvt: c.dvt,
      so_luong: c.so_luong,
      don_gia: c.don_gia,
      thanh_tien: c.thanh_tien,
      pt_thue_gtgt: c.pt_thue_gtgt,
      tien_thue_gtgt: c.tien_thue_gtgt,
      dd_gh_index: c.dd_gh_index ?? null,
      ghi_chu: c.ghi_chu ?? '',
    })),
  }
}

export function ghiNhanDoanhThuDelete(donId: string): void {
  _donList = _donList.filter((d) => d.id !== donId)
  _chiTietList = _chiTietList.filter((c) => c.don_hang_mua_id !== donId)
  saveToStorage()
}

export function ghiNhanDoanhThuPost(payload: GhiNhanDoanhThuCreatePayload): GhiNhanDoanhThuRecord {
  const id = `nvthh${Date.now()}`
  const don: GhiNhanDoanhThuRecord = {
    id,
    tinh_trang: payload.tinh_trang,
    ngay_don_hang: payload.ngay_don_hang,
    so_don_hang: payload.so_don_hang,
    ngay_giao_hang: payload.ngay_giao_hang,
    nha_cung_cap: payload.nha_cung_cap,
    dia_chi: payload.dia_chi ?? '',
    nguoi_giao_hang: payload.nguoi_giao_hang ?? undefined,
    ma_so_thue: payload.ma_so_thue ?? '',
    dien_giai: payload.dien_giai ?? '',
    nv_mua_hang: payload.nv_mua_hang ?? '',
    dieu_khoan_tt: payload.dieu_khoan_tt ?? '',
    so_ngay_duoc_no: payload.so_ngay_duoc_no ?? '0',
    dia_diem_giao_hang: payload.dia_diem_giao_hang ?? '',
    dieu_khoan_khac: payload.dieu_khoan_khac ?? '',
    gia_tri_don_hang: payload.gia_tri_don_hang,
    so_chung_tu_cukcuk: payload.so_chung_tu_cukcuk ?? '',
    doi_chieu_don_mua_id: payload.doi_chieu_don_mua_id ?? undefined,
    attachments: payload.attachments ? [...payload.attachments] : undefined,
    hinh_thuc: payload.hinh_thuc,
    kho_nhap_id: payload.kho_nhap_id,
    ten_cong_trinh: payload.ten_cong_trinh,
    dia_chi_cong_trinh: payload.dia_chi_cong_trinh,
    chung_tu_mua_loai_chung_tu: payload.chung_tu_mua_loai_chung_tu,
    chung_tu_mua_chua_thanh_toan: payload.chung_tu_mua_chua_thanh_toan,
    chung_tu_mua_thanh_toan_ngay: payload.chung_tu_mua_thanh_toan_ngay,
    chung_tu_mua_pttt: payload.chung_tu_mua_pttt,
    chung_tu_mua_ck: payload.chung_tu_mua_ck,
    chung_tu_mua_loai_hd: payload.chung_tu_mua_loai_hd,
    chung_tu_mua_so_hoa_don: payload.chung_tu_mua_so_hoa_don,
    hoa_don_ngay: payload.hoa_don_ngay,
    hoa_don_ky_hieu: payload.hoa_don_ky_hieu,
    mau_hoa_don_ma: payload.mau_hoa_don_ma,
    mau_hoa_don_ten: payload.mau_hoa_don_ten,
    phieu_chi_nha_cung_cap: payload.phieu_chi_nha_cung_cap,
    phieu_chi_dia_chi: payload.phieu_chi_dia_chi,
    phieu_chi_nguoi_nhan_tien: payload.phieu_chi_nguoi_nhan_tien,
    phieu_chi_ly_do: payload.phieu_chi_ly_do,
    phieu_chi_ngay: payload.phieu_chi_ngay,
    phieu_chi_tai_khoan_chi: payload.phieu_chi_tai_khoan_chi,
    phieu_chi_ngan_hang_chi: payload.phieu_chi_ngan_hang_chi,
    phieu_chi_ten_nguoi_gui: payload.phieu_chi_ten_nguoi_gui,
    phieu_chi_tai_khoan_nhan: payload.phieu_chi_tai_khoan_nhan,
    phieu_chi_ngan_hang_nhan: payload.phieu_chi_ngan_hang_nhan,
    phieu_chi_ten_chu_tk_nhan: payload.phieu_chi_ten_chu_tk_nhan,
    phieu_chi_ngan_hang: payload.phieu_chi_ngan_hang,
    phieu_chi_ten_nguoi_nhan_ck: payload.phieu_chi_ten_nguoi_nhan_ck,
    phieu_chi_attachments: payload.phieu_chi_attachments ? [...payload.phieu_chi_attachments] : undefined,
  }
  _donList.push(don)
  payload.chiTiet.forEach((c, i) => {
    _chiTietList.push({
      id: `ct${id}-${i}`,
      don_hang_mua_id: id,
      ma_hang: c.ma_hang,
      ten_hang: c.ten_hang,
      ma_quy_cach: '',
      dvt: c.dvt,
      chieu_dai: 0,
      chieu_rong: 0,
      chieu_cao: 0,
      ban_kinh: 0,
      luong: 0,
      so_luong: c.so_luong,
      so_luong_nhan: 0,
      don_gia: c.don_gia,
      thanh_tien: c.thanh_tien,
      pt_thue_gtgt: c.pt_thue_gtgt,
      tien_thue_gtgt: c.tien_thue_gtgt,
      lenh_san_xuat: '',
      dd_gh_index: c.dd_gh_index ?? null,
      ghi_chu: c.ghi_chu ?? '',
    })
  })
  if (shouldEmitDongBoDhmTuPhieuNvthh(payload.tinh_trang)) {
    emitYeuCauDongBoDaNhanHangDonMua(payload.doi_chieu_don_mua_id)
  }
  return don
}

export function ghiNhanDoanhThuPut(donId: string, payload: GhiNhanDoanhThuCreatePayload): void {
  const idx = _donList.findIndex((d) => d.id === donId)
  if (idx < 0) return
  _donList[idx] = {
    id: donId,
    tinh_trang: payload.tinh_trang,
    ngay_don_hang: payload.ngay_don_hang,
    so_don_hang: payload.so_don_hang,
    ngay_giao_hang: payload.ngay_giao_hang,
    nha_cung_cap: payload.nha_cung_cap,
    dia_chi: payload.dia_chi ?? '',
    nguoi_giao_hang: payload.nguoi_giao_hang ?? undefined,
    ma_so_thue: payload.ma_so_thue ?? '',
    dien_giai: payload.dien_giai ?? '',
    nv_mua_hang: payload.nv_mua_hang ?? '',
    dieu_khoan_tt: payload.dieu_khoan_tt ?? '',
    so_ngay_duoc_no: payload.so_ngay_duoc_no ?? '0',
    dia_diem_giao_hang: payload.dia_diem_giao_hang ?? '',
    dieu_khoan_khac: payload.dieu_khoan_khac ?? '',
    gia_tri_don_hang: payload.gia_tri_don_hang,
    so_chung_tu_cukcuk: payload.so_chung_tu_cukcuk ?? '',
    doi_chieu_don_mua_id: payload.doi_chieu_don_mua_id ?? undefined,
    attachments: payload.attachments ? [...payload.attachments] : undefined,
    hinh_thuc: payload.hinh_thuc,
    kho_nhap_id: payload.kho_nhap_id,
    ten_cong_trinh: payload.ten_cong_trinh,
    dia_chi_cong_trinh: payload.dia_chi_cong_trinh,
    chung_tu_mua_loai_chung_tu: payload.chung_tu_mua_loai_chung_tu,
    chung_tu_mua_chua_thanh_toan: payload.chung_tu_mua_chua_thanh_toan,
    chung_tu_mua_thanh_toan_ngay: payload.chung_tu_mua_thanh_toan_ngay,
    chung_tu_mua_pttt: payload.chung_tu_mua_pttt,
    chung_tu_mua_ck: payload.chung_tu_mua_ck,
    chung_tu_mua_loai_hd: payload.chung_tu_mua_loai_hd,
    chung_tu_mua_so_hoa_don: payload.chung_tu_mua_so_hoa_don,
    hoa_don_ngay: payload.hoa_don_ngay,
    hoa_don_ky_hieu: payload.hoa_don_ky_hieu,
    mau_hoa_don_ma: payload.mau_hoa_don_ma,
    mau_hoa_don_ten: payload.mau_hoa_don_ten,
    phieu_chi_nha_cung_cap: payload.phieu_chi_nha_cung_cap,
    phieu_chi_dia_chi: payload.phieu_chi_dia_chi,
    phieu_chi_nguoi_nhan_tien: payload.phieu_chi_nguoi_nhan_tien,
    phieu_chi_ly_do: payload.phieu_chi_ly_do,
    phieu_chi_ngay: payload.phieu_chi_ngay,
    phieu_chi_tai_khoan_chi: payload.phieu_chi_tai_khoan_chi,
    phieu_chi_ngan_hang_chi: payload.phieu_chi_ngan_hang_chi,
    phieu_chi_ten_nguoi_gui: payload.phieu_chi_ten_nguoi_gui,
    phieu_chi_tai_khoan_nhan: payload.phieu_chi_tai_khoan_nhan,
    phieu_chi_ngan_hang_nhan: payload.phieu_chi_ngan_hang_nhan,
    phieu_chi_ten_chu_tk_nhan: payload.phieu_chi_ten_chu_tk_nhan,
    phieu_chi_ngan_hang: payload.phieu_chi_ngan_hang,
    phieu_chi_ten_nguoi_nhan_ck: payload.phieu_chi_ten_nguoi_nhan_ck,
    phieu_chi_attachments: payload.phieu_chi_attachments ? [...payload.phieu_chi_attachments] : undefined,
  }
  _chiTietList = _chiTietList.filter((c) => c.don_hang_mua_id !== donId)
  payload.chiTiet.forEach((c, i) => {
    _chiTietList.push({
      id: `ct${donId}-${i}`,
      don_hang_mua_id: donId,
      ma_hang: c.ma_hang,
      ten_hang: c.ten_hang,
      ma_quy_cach: '',
      dvt: c.dvt,
      chieu_dai: 0,
      chieu_rong: 0,
      chieu_cao: 0,
      ban_kinh: 0,
      luong: 0,
      so_luong: c.so_luong,
      so_luong_nhan: 0,
      don_gia: c.don_gia,
      thanh_tien: c.thanh_tien,
      pt_thue_gtgt: c.pt_thue_gtgt,
      tien_thue_gtgt: c.tien_thue_gtgt,
      lenh_san_xuat: '',
      dd_gh_index: c.dd_gh_index ?? null,
      ghi_chu: c.ghi_chu ?? '',
    })
  })
  if (shouldEmitDongBoDhmTuPhieuNvthh(payload.tinh_trang)) {
    emitYeuCauDongBoDaNhanHangDonMua(payload.doi_chieu_don_mua_id)
  }
}

export function getDefaultGhiNhanDoanhThuFilter(): GhiNhanDoanhThuFilter {
  const ky = 'thang-nay' as KyValue
  const { tu, den } = getDateRangeForKy(ky)
  return { ky, tu, den }
}

export function ghiNhanDoanhThuSoDonHangTiepTheo(): string {
  const year = getCurrentYear()
  let maxSo = 0
  for (const d of _donList) {
    const s = (d.so_don_hang || '').trim()
    const match = s.match(new RegExp(`^${year}/${MODULE_PREFIX}/(\\d+)$`))
    if (!match) continue
    const n = parseInt(match[1], 10)
    if (n > maxSo) maxSo = n
  }
  return maFormatHeThong(MODULE_PREFIX, maxSo + 1)
}
