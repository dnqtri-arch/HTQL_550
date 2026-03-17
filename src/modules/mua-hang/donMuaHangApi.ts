/**
 * API và types cho Đơn mua hàng (header + chi tiết dòng).
 * Dữ liệu mẫu; sau có thể nối backend.
 */

export interface DonMuaHangRecord {
  id: string
  tinh_trang: string
  ngay_don_hang: string // ISO date
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
  de_xuat_id?: string
}

export interface DonMuaHangChiTiet {
  id: string
  don_mua_hang_id: string
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
}

/** Payload tạo đơn mua hàng (header + chi tiết), API sẽ gán id và don_mua_hang_id. Lưu toàn bộ dữ liệu đang hiển thị tại các trường. */
export interface DonMuaHangCreatePayload {
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
  de_xuat_id?: string
  chiTiet: Array<{
    ma_hang: string
    ten_hang: string
    dvt: string
    so_luong: number
    don_gia: number
    thanh_tien: number
    pt_thue_gtgt: number | null
    tien_thue_gtgt: number | null
  }>
}

/** Dữ liệu mẫu đơn mua hàng */
const MOCK_DON: DonMuaHangRecord[] = [
  {
    id: 'dmh1',
    tinh_trang: 'Chưa thực hiện',
    ngay_don_hang: '2026-03-10',
    so_don_hang: 'DMH00001',
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
    id: 'dmh2',
    tinh_trang: 'Đang thực hiện',
    ngay_don_hang: '2026-03-12',
    so_don_hang: 'DMH00002',
    ngay_giao_hang: '2026-03-20',
    nha_cung_cap: 'CÔNG TY CP NGUYÊN VẬT LIỆU ABC',
    dia_chi: '',
    ma_so_thue: '',
    dien_giai: 'Đơn hàng vật tư quý 1',
    nv_mua_hang: '',
    dieu_khoan_tt: '',
    so_ngay_duoc_no: '0',
    dia_diem_giao_hang: '',
    dieu_khoan_khac: '',
    gia_tri_don_hang: 15000000,
    so_chung_tu_cukcuk: 'CUKCUK-2026-001',
  },
  {
    id: 'dmh3',
    tinh_trang: 'Chưa thực hiện',
    ngay_don_hang: '2026-03-15',
    so_don_hang: 'DMH00003',
    ngay_giao_hang: null,
    nha_cung_cap: 'CÔNG TY TNHH DỊCH VỤ XYZ',
    dia_chi: '',
    ma_so_thue: '',
    dien_giai: '',
    nv_mua_hang: '',
    dieu_khoan_tt: '',
    so_ngay_duoc_no: '0',
    dia_diem_giao_hang: '',
    dieu_khoan_khac: '',
    gia_tri_don_hang: 8500000,
    so_chung_tu_cukcuk: '',
  },
]

/** Chi tiết theo đơn */
const MOCK_CHI_TIET: DonMuaHangChiTiet[] = [
  {
    id: 'ct1',
    don_mua_hang_id: 'dmh1',
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
  },
]

const STORAGE_KEY_DON = 'htql_don_mua_hang_list'
const STORAGE_KEY_CHI_TIET = 'htql_don_mua_hang_chi_tiet'

function normalizeDon(d: Partial<DonMuaHangRecord> & { id: string }): DonMuaHangRecord {
  return {
    id: d.id,
    tinh_trang: d.tinh_trang ?? 'Chưa thực hiện',
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
    de_xuat_id: d.de_xuat_id ?? undefined,
  }
}

function loadFromStorage(): { don: DonMuaHangRecord[]; chiTiet: DonMuaHangChiTiet[] } {
  try {
    const rawDon = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY_DON) : null
    const rawCt = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY_CHI_TIET) : null
    const don = rawDon ? JSON.parse(rawDon) : null
    const chiTiet = rawCt ? JSON.parse(rawCt) : null
    if (Array.isArray(don) && Array.isArray(chiTiet)) {
      return { don: don.map((d: Partial<DonMuaHangRecord> & { id: string }) => normalizeDon(d)), chiTiet }
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

/** Draft các dòng đang nhập trong form (chỉ lưu cột hiển thị, bỏ _vthh để tránh object lớn). */
const STORAGE_KEY_DRAFT = 'htql_don_mua_hang_draft'

export type DonMuaHangDraftLine = Record<string, string> & { _dvtOptions?: string[] }

export function getDonMuaHangDraft(): DonMuaHangDraftLine[] | null {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY_DRAFT) : null
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function setDonMuaHangDraft(lines: Array<Record<string, string> & { _dvtOptions?: string[]; _vthh?: unknown }>): void {
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

export function clearDonMuaHangDraft(): void {
  try {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(STORAGE_KEY_DRAFT)
  } catch {
    /* ignore */
  }
}

/** Bản sao có thể xóa; khởi tạo từ localStorage (nếu có) hoặc dữ liệu mẫu */
const _initial = loadFromStorage()
let _donList: DonMuaHangRecord[] = _initial.don
let _chiTietList: DonMuaHangChiTiet[] = _initial.chiTiet

/** Lấy từ/đến theo kỳ: "dau-thang-hien-tai" | "tuan-nay" | "thang-nay" | "quy-nay" | "nam-nay" */
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
      // Đầu tháng đến hiện tại
      tu = new Date(now.getFullYear(), now.getMonth(), 1)
  }
  return {
    tu: formatLocalDate(tu),
    den: formatLocalDate(den),
  }
}

function formatLocalDate(d: Date): string {
  const y = d.getFullYear()
  const m = d.getMonth() + 1
  const day = d.getDate()
  return `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export const KY_OPTIONS = [
  { value: 'dau-thang-hien-tai', label: 'Đầu tháng đơn hiện tại' },
  { value: 'tuan-nay', label: 'Tuần này' },
  { value: 'thang-nay', label: 'Tháng này' },
  { value: 'quy-nay', label: 'Quý này' },
  { value: 'nam-nay', label: 'Năm nay' },
] as const

export type KyValue = (typeof KY_OPTIONS)[number]['value']

export interface DonMuaHangFilter {
  ky: KyValue
  tu: string // yyyy-mm-dd
  den: string
}

export function donMuaHangGetAll(filter: DonMuaHangFilter): DonMuaHangRecord[] {
  const { tu, den } = filter
  return _donList.filter((d) => {
    const ngay = d.ngay_don_hang
    return ngay >= tu && ngay <= den
  })
}

export function donMuaHangGetChiTiet(donId: string): DonMuaHangChiTiet[] {
  return _chiTietList.filter((c) => c.don_mua_hang_id === donId)
}

/** Xóa đơn mua hàng và toàn bộ chi tiết của đơn. */
export function donMuaHangDelete(donId: string): void {
  _donList = _donList.filter((d) => d.id !== donId)
  _chiTietList = _chiTietList.filter((c) => c.don_mua_hang_id !== donId)
  saveToStorage()
}

/** Tạo đơn mua hàng mới (thêm vào danh sách nội bộ). Trả về bản ghi đơn vừa tạo. */
export function donMuaHangPost(payload: DonMuaHangCreatePayload): DonMuaHangRecord {
  const id = `dmh${Date.now()}`
  const don: DonMuaHangRecord = {
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
    de_xuat_id: payload.de_xuat_id ?? undefined,
  }
  _donList.push(don)
  payload.chiTiet.forEach((c, i) => {
    _chiTietList.push({
      id: `ct${id}-${i}`,
      don_mua_hang_id: id,
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
    })
  })
  saveToStorage()
  return don
}

/** Cập nhật đơn mua hàng (xóa chi tiết cũ, ghi lại theo payload). */
export function donMuaHangPut(donId: string, payload: DonMuaHangCreatePayload): void {
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
    de_xuat_id: payload.de_xuat_id ?? undefined,
  }
  _chiTietList = _chiTietList.filter((c) => c.don_mua_hang_id !== donId)
  payload.chiTiet.forEach((c, i) => {
    _chiTietList.push({
      id: `ct${donId}-${i}`,
      don_mua_hang_id: donId,
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
    })
  })
  saveToStorage()
}

export function getDefaultDonMuaHangFilter(): DonMuaHangFilter {
  const { tu, den } = getDateRangeForKy('dau-thang-hien-tai')
  return { ky: 'dau-thang-hien-tai', tu, den }
}

/** Trả về số đơn hàng tiếp theo (DMH00001, DMH00002, ...) để dùng khi thêm đơn mới. */
export function donMuaHangSoDonHangTiepTheo(): string {
  const prefix = 'DMH'
  let maxNum = 0
  for (const d of _donList) {
    const s = (d.so_don_hang || '').trim()
    const m = s.replace(/^DMH0*/, '')
    const n = parseInt(m, 10)
    if (!Number.isNaN(n) && n > maxNum) maxNum = n
  }
  return `${prefix}${String(maxNum + 1).padStart(5, '0')}`
}
