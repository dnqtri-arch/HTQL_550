/**
 * API và types cho Đề xuất mua hàng — module tách biệt 100% với Đơn mua hàng.
 * Cơ sở dữ liệu (storage), form, trường, nội dung riêng.
 */

export interface DeXuatMuaHangRecord {
  id: string
  tinh_trang: string
  ngay_don_hang: string
  so_don_hang: string
  ngay_giao_hang: string | null
  nha_cung_cap: string
  dia_chi: string
  ma_so_thue: string
  dien_giai: string
  /** Ghi chú (hiển thị trên danh sách); nếu chưa có riêng thì dùng dien_giai. */
  ghi_chu?: string
  nv_mua_hang: string
  dieu_khoan_tt: string
  so_ngay_duoc_no: string
  dia_diem_giao_hang: string
  dieu_khoan_khac: string
  gia_tri_don_hang: number
  so_chung_tu_cukcuk: string
  de_xuat_tu_ten: string
}

export interface DeXuatMuaHangChiTiet {
  id: string
  de_xuat_mua_hang_id: string
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
  ghi_chu: string
}

export interface DeXuatMuaHangCreatePayload {
  tinh_trang: string
  ngay_don_hang: string
  so_don_hang: string
  ngay_giao_hang: string | null
  nha_cung_cap: string
  dia_chi: string
  ma_so_thue: string
  dien_giai: string
  nv_mua_hang: string
  dieu_khoan_tt: string
  so_ngay_duoc_no: string
  dia_diem_giao_hang: string
  dieu_khoan_khac: string
  gia_tri_don_hang: number
  so_chung_tu_cukcuk: string
  de_xuat_tu_ten: string
  chiTiet: Array<{
    ma_hang: string
    ten_hang: string
    dvt: string
    so_luong: number
    don_gia: number
    thanh_tien: number
    pt_thue_gtgt: number | null
    tien_thue_gtgt: number | null
    ghi_chu: string
  }>
}

function formatLocalDate(d: Date): string {
  const y = d.getFullYear()
  const m = d.getMonth() + 1
  const day = d.getDate()
  return `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function getDateRangeForKy(ky: string): { tu: string; den: string } {
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
  return { tu: formatLocalDate(tu), den: formatLocalDate(den) }
}

export const KY_OPTIONS = [
  { value: 'tuan-nay', label: 'Tuần này' },
  { value: 'thang-nay', label: 'Tháng này' },
  { value: 'quy-nay', label: 'Quý này' },
  { value: 'nam-nay', label: 'Năm nay' },
] as const

export type KyValue = (typeof KY_OPTIONS)[number]['value']

export interface DeXuatMuaHangFilter {
  ky: KyValue
  tu: string
  den: string
}

const STORAGE_KEY_DON = 'htql_de_xuat_mua_hang_list'
const STORAGE_KEY_CHI_TIET = 'htql_de_xuat_mua_hang_chi_tiet'
const STORAGE_KEY_DRAFT = 'htql_de_xuat_mua_hang_draft'
const ID_PREFIX = 'dx'
const SO_PREFIX = 'DXMH'

function normalizeDon(d: Partial<DeXuatMuaHangRecord> & { id: string }): DeXuatMuaHangRecord {
  return {
    id: d.id,
    tinh_trang: d.tinh_trang ?? 'Đề xuất mới',
    ngay_don_hang: d.ngay_don_hang ?? '',
    so_don_hang: d.so_don_hang ?? '',
    ngay_giao_hang: d.ngay_giao_hang ?? null,
    nha_cung_cap: d.nha_cung_cap ?? '',
    dia_chi: d.dia_chi ?? '',
    ma_so_thue: d.ma_so_thue ?? '',
    dien_giai: d.dien_giai ?? '',
    nv_mua_hang: d.nv_mua_hang ?? '',
    dieu_khoan_tt: d.dieu_khoan_tt ?? '',
    so_ngay_duoc_no: d.so_ngay_duoc_no ?? '0',
    dia_diem_giao_hang: d.dia_diem_giao_hang ?? '',
    dieu_khoan_khac: d.dieu_khoan_khac ?? '',
    gia_tri_don_hang: typeof d.gia_tri_don_hang === 'number' ? d.gia_tri_don_hang : 0,
    so_chung_tu_cukcuk: d.so_chung_tu_cukcuk ?? '',
    de_xuat_tu_ten: d.de_xuat_tu_ten ?? '',
  }
}

const MOCK_DON: DeXuatMuaHangRecord[] = []
const MOCK_CHI_TIET: DeXuatMuaHangChiTiet[] = []

function loadFromStorage(): { don: DeXuatMuaHangRecord[]; chiTiet: DeXuatMuaHangChiTiet[] } {
  try {
    const rawDon = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY_DON) : null
    const rawCt = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY_CHI_TIET) : null
    const don = rawDon ? JSON.parse(rawDon) : null
    const chiTiet = rawCt ? JSON.parse(rawCt) : null
    if (Array.isArray(don) && Array.isArray(chiTiet)) {
      const ct: DeXuatMuaHangChiTiet[] = chiTiet.map((c: Record<string, unknown>) => ({
        ...c,
        de_xuat_mua_hang_id: (c.de_xuat_mua_hang_id as string) ?? (c.don_mua_hang_id as string),
      })) as DeXuatMuaHangChiTiet[]
      return { don: don.map((d: Partial<DeXuatMuaHangRecord> & { id: string }) => normalizeDon(d)), chiTiet: ct }
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

const _initial = loadFromStorage()
let _donList: DeXuatMuaHangRecord[] = _initial.don
let _chiTietList: DeXuatMuaHangChiTiet[] = _initial.chiTiet

export type DeXuatMuaHangDraftLine = Record<string, string> & { _dvtOptions?: string[] }

export function getDefaultFilter(): DeXuatMuaHangFilter {
  const { tu, den } = getDateRangeForKy('thang-nay')
  return { ky: 'thang-nay', tu, den }
}

export function deXuatMuaHangGetAll(filter: DeXuatMuaHangFilter): DeXuatMuaHangRecord[] {
  const { tu, den } = filter
  return _donList.filter((d) => {
    const ngay = d.ngay_don_hang
    return ngay >= tu && ngay <= den
  })
}

export function deXuatMuaHangGetById(id: string): DeXuatMuaHangRecord | null {
  return _donList.find((d) => d.id === id) ?? null
}

export function deXuatMuaHangGetChiTiet(donId: string): DeXuatMuaHangChiTiet[] {
  return _chiTietList.filter((c) => c.de_xuat_mua_hang_id === donId)
}

export function deXuatMuaHangDelete(donId: string): void {
  _donList = _donList.filter((d) => d.id !== donId)
  _chiTietList = _chiTietList.filter((c) => c.de_xuat_mua_hang_id !== donId)
  saveToStorage()
}

export function deXuatMuaHangPost(payload: DeXuatMuaHangCreatePayload): DeXuatMuaHangRecord {
  const id = `${ID_PREFIX}${Date.now()}`
  const don: DeXuatMuaHangRecord = {
    id,
    tinh_trang: payload.tinh_trang,
    ngay_don_hang: payload.ngay_don_hang,
    so_don_hang: payload.so_don_hang,
    ngay_giao_hang: payload.ngay_giao_hang,
    nha_cung_cap: payload.nha_cung_cap,
    dia_chi: payload.dia_chi ?? '',
    ma_so_thue: payload.ma_so_thue ?? '',
    dien_giai: payload.dien_giai ?? '',
    nv_mua_hang: payload.nv_mua_hang ?? '',
    dieu_khoan_tt: payload.dieu_khoan_tt ?? '',
    so_ngay_duoc_no: payload.so_ngay_duoc_no ?? '0',
    dia_diem_giao_hang: payload.dia_diem_giao_hang ?? '',
    dieu_khoan_khac: payload.dieu_khoan_khac ?? '',
    gia_tri_don_hang: payload.gia_tri_don_hang,
    so_chung_tu_cukcuk: payload.so_chung_tu_cukcuk ?? '',
    de_xuat_tu_ten: payload.de_xuat_tu_ten ?? '',
  }
  _donList.push(don)
  payload.chiTiet.forEach((c, i) => {
    _chiTietList.push({
      id: `ct${id}-${i}`,
      de_xuat_mua_hang_id: id,
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
      ghi_chu: c.ghi_chu ?? '',
    })
  })
  saveToStorage()
  return don
}

export function deXuatMuaHangPut(donId: string, payload: DeXuatMuaHangCreatePayload): void {
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
    ma_so_thue: payload.ma_so_thue ?? '',
    dien_giai: payload.dien_giai ?? '',
    nv_mua_hang: payload.nv_mua_hang ?? '',
    dieu_khoan_tt: payload.dieu_khoan_tt ?? '',
    so_ngay_duoc_no: payload.so_ngay_duoc_no ?? '0',
    dia_diem_giao_hang: payload.dia_diem_giao_hang ?? '',
    dieu_khoan_khac: payload.dieu_khoan_khac ?? '',
    gia_tri_don_hang: payload.gia_tri_don_hang,
    so_chung_tu_cukcuk: payload.so_chung_tu_cukcuk ?? '',
    de_xuat_tu_ten: payload.de_xuat_tu_ten ?? '',
  }
  _chiTietList = _chiTietList.filter((c) => c.de_xuat_mua_hang_id !== donId)
  payload.chiTiet.forEach((c, i) => {
    _chiTietList.push({
      id: `ct${donId}-${i}`,
      de_xuat_mua_hang_id: donId,
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
      ghi_chu: c.ghi_chu ?? '',
    })
  })
  saveToStorage()
}

export function deXuatMuaHangSoDonHangTiepTheo(): string {
  let maxNum = 0
  for (const d of _donList) {
    const s = (d.so_don_hang || '').trim()
    const m = s.replace(new RegExp(`^${SO_PREFIX}0*`), '')
    const n = parseInt(m, 10)
    if (!Number.isNaN(n) && n > maxNum) maxNum = n
  }
  return `${SO_PREFIX}${String(maxNum + 1).padStart(5, '0')}`
}

/** Kiểm tra mã ĐX đã tồn tại chưa (excludeId: bỏ qua bản ghi đang sửa). */
export function deXuatMuaHangSoDonHangExists(soDonHang: string, excludeId?: string): boolean {
  const ma = (soDonHang || '').trim()
  if (!ma) return false
  return _donList.some((d) => d.so_don_hang?.trim() === ma && d.id !== excludeId)
}

export function getDeXuatDraft(): DeXuatMuaHangDraftLine[] | null {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY_DRAFT) : null
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function setDeXuatDraft(lines: Array<Record<string, string> & { _dvtOptions?: string[]; _vthh?: unknown }>): void {
  try {
    if (typeof localStorage !== 'undefined') {
      const toSave = lines.map((l) => {
        const { _vthh, ...rest } = l
        return rest
      })
      localStorage.setItem(STORAGE_KEY_DRAFT, JSON.stringify(toSave))
    }
  } catch {
    /* ignore */
  }
}

export function clearDeXuatDraft(): void {
  try {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(STORAGE_KEY_DRAFT)
  } catch {
    /* ignore */
  }
}
