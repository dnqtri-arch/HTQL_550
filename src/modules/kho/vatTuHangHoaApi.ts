/**
 * API / Mock cho Danh mục Vật tư hàng hóa (schema vattu_hanghoa).
 * Cơ sở dữ liệu dùng chung cho cả hai module:
 * - Kho → Vật tư hàng hóa
 * - Mua hàng → Hàng hóa, dịch vụ
 * (Cùng localStorage key + cache; khi có backend thì cùng REST API.)
 * Khi có backend REST: GET/POST /api/vat-tu-hang-hoa, PUT/DELETE /api/vat-tu-hang-hoa/:id
 * Hình ảnh lưu tại: /ssd_2tb/HTQL_550/thietke/vattu/ (DB chỉ lưu tên file hoặc path tương đối).
 */

/** Một dòng chiết khấu theo số lượng (Tab Bậc giá) */
export interface ChietKhauItem {
  so_luong_tu: string
  so_luong_den: string
  ty_le_chiet_khau: string
  mo_ta?: string
}

/** Một dòng quy đổi ĐVT (Tab Đơn vị quy đổi và bậc giá) */
export interface DonViQuyDoiItem {
  dvt: string
  ti_le_quy_doi: string
  phep_tinh: 'nhan' | 'chia'
  mo_ta?: string
  gia_mua: string
  gia_ban: string
  gia_ban_1?: string
  gia_ban_2?: string
  gia_ban_3?: string
}

/** Một dòng định mức nguyên vật liệu (tab Định mức NVL khi tính chất = Sản phẩm) */
export interface DinhMucNvlItem {
  ma: string
  ten: string
  dvt: string
  so_luong: string
  hao_hut: string
}

export interface VatTuHangHoaRecord {
  id: number
  ma: string
  ten: string
  tinh_chat: string
  nhom_vthh: string
  dvt_chinh: string
  so_luong_ton: number
  gia_tri_ton: number
  kho_ngam_dinh?: string
  tai_khoan_kho?: string
  tk_doanh_thu?: string
  tk_chi_phi?: string
  thue_suat_gtgt?: string
  co_giam_thue?: string
  don_gia_mua?: number
  don_gia_ban?: number
  mo_ta?: string
  duong_dan_hinh_anh?: string
  dien_giai?: string
  thoi_han_bh?: string
  nguon_goc?: string
  dien_giai_khi_mua?: string
  dien_giai_khi_ban?: string
  so_luong_ton_toi_thieu?: number
  tk_chiet_khau?: string
  tk_giam_gia?: string
  tk_tra_lai?: string
  ty_le_ckmh?: string
  loai_hh_dac_trung?: string
  don_gia_mua_co_dinh?: number
  thue_suat_nk?: string
  thue_suat_xk?: string
  nhom_hhdv_ttdb?: string
  la_hang_khuyen_mai?: boolean
  la_bo_phan_lap_rap?: boolean
  mau_sac?: string
  kich_thuoc?: string
  /** Kích thước đơn vị mD (chỉ khi tính chất = Vật tư) */
  kich_thuoc_md?: string
  /** Kích thước đơn vị mR (chỉ khi tính chất = Vật tư) */
  kich_thuoc_mr?: string
  so_khung?: string
  so_may?: string
  thoi_gian_bao_hanh?: string
  xuat_xu?: string
  don_vi_quy_doi?: DonViQuyDoiItem[]
  thue_suat_gtgt_dau_ra?: string
  thue_suat_gtgt_dau_vao?: string
  gia_mua_gan_nhat?: number
  gia_ban_quy_dinh?: number
  chiet_khau?: boolean
  loai_chiet_khau?: string
  bang_chiet_khau?: ChietKhauItem[]
  dac_tinh?: string
  cong_thuc_tinh_so_luong?: string
  /** Định mức nguyên vật liệu (chỉ khi tính chất = Sản phẩm); ma = Mã NVL, ten = Tên nguyên vật liệu */
  dinh_muc_nvl?: DinhMucNvlItem[]
}

const STORAGE_KEY = 'htql550_vat_tu_hang_hoa'

const DU_LIEU_MAU: VatTuHangHoaRecord[] = [
  {
    id: 1,
    ma: 'CPNH',
    ten: 'Chi phí mua hàng',
    tinh_chat: 'Dịch vụ',
    nhom_vthh: '',
    dvt_chinh: 'Cái',
    so_luong_ton: 0,
    gia_tri_ton: 0,
    kho_ngam_dinh: 'Kho chính',
    tai_khoan_kho: '156',
    tk_doanh_thu: '5111',
    tk_chi_phi: '632',
    thue_suat_gtgt: '10',
  },
  {
    id: 2,
    ma: 'VT001',
    ten: 'Vật tư mẫu 1',
    tinh_chat: 'Vật tư hàng hóa',
    nhom_vthh: 'Nhóm A',
    dvt_chinh: 'Kg',
    so_luong_ton: 100,
    gia_tri_ton: 15000000,
    kho_ngam_dinh: 'Kho chính',
    tai_khoan_kho: '152',
    tk_doanh_thu: '5111',
    tk_chi_phi: '632',
    thue_suat_gtgt: '10',
  },
  {
    id: 3,
    ma: 'HH002',
    ten: 'Hàng hóa mẫu 2',
    tinh_chat: 'Hàng hóa',
    nhom_vthh: 'Nhóm B',
    dvt_chinh: 'Cái',
    so_luong_ton: 50,
    gia_tri_ton: 8500000,
    kho_ngam_dinh: 'Kho phụ',
    tai_khoan_kho: '156',
    tk_doanh_thu: '5111',
    tk_chi_phi: '632',
    thue_suat_gtgt: '5',
  },
]

function loadFromStorage(): VatTuHangHoaRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as VatTuHangHoaRecord[]
      if (Array.isArray(parsed)) return parsed
    }
  } catch {
    // ignore
  }
  return [...DU_LIEU_MAU]
}

function saveToStorage(data: VatTuHangHoaRecord[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

let cache: VatTuHangHoaRecord[] | null = null

export async function vatTuHangHoaGetAll(): Promise<VatTuHangHoaRecord[]> {
  if (cache) return [...cache]
  cache = loadFromStorage()
  return [...cache]
}

export async function vatTuHangHoaPost(
  payload: Omit<VatTuHangHoaRecord, 'id'>
): Promise<VatTuHangHoaRecord> {
  const list = loadFromStorage()
  const id = list.length > 0 ? Math.max(...list.map((r) => r.id)) + 1 : 1
  const newRow: VatTuHangHoaRecord = { ...payload, id }
  list.push(newRow)
  saveToStorage(list)
  cache = list
  return newRow
}

export async function vatTuHangHoaPut(
  id: number,
  payload: Omit<VatTuHangHoaRecord, 'id'>
): Promise<VatTuHangHoaRecord> {
  const list = loadFromStorage()
  const idx = list.findIndex((r) => r.id === id)
  if (idx === -1) throw new Error('Không tìm thấy bản ghi.')
  const updated: VatTuHangHoaRecord = { ...payload, id }
  list[idx] = updated
  saveToStorage(list)
  cache = list
  return updated
}

export async function vatTuHangHoaDelete(id: number): Promise<void> {
  const list = loadFromStorage().filter((r) => r.id !== id)
  saveToStorage(list)
  cache = list
}

export function vatTuHangHoaNapLai(): void {
  cache = null
}

export function vatTuHangHoaTrungMa(ma: string, loaiTrungId?: number): boolean {
  const list = loadFromStorage()
  return list.some((r) => r.ma === ma && r.id !== (loaiTrungId ?? -1))
}

/** Lấy prefix mã từ tính chất: chữ cái đầu mỗi từ, viết hoa. VD: "Vật tư" → "VT", "Hàng hóa" → "HH" */
function prefixMaFromTinhChat(tinhChat: string): string {
  const s = (tinhChat ?? '').trim()
  if (!s) return 'VT'
  const words = s.split(/\s+/).filter((w) => w.length > 0)
  const prefix = words
    .map((w) => {
      const first = w[0]
      return first && /[a-zA-Z\u00C0-\u024F]/.test(first) ? first.toUpperCase() : ''
    })
    .filter(Boolean)
    .join('')
  return prefix.length > 0 ? prefix : 'VT'
}

/** Mã tự động: prefix từ tính chất (chữ cái đầu mỗi từ) + 5 số tự nhiên tăng dần từ 1. Đảm bảo không trùng bất kỳ mã nào đã có. */
export function vatTuHangHoaMaTuDong(tinhChat: string): string {
  const list = loadFromStorage()
  const prefix = prefixMaFromTinhChat(tinhChat)
  const regex = new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\d{5})$`, 'i')
  const nums = list
    .map((r) => {
      const m = r.ma.match(regex)
      return m ? parseInt(m[1], 10) : 0
    })
    .filter((n) => n > 0)
  let next = nums.length > 0 ? Math.max(...nums) + 1 : 1
  const existingMas = new Set(list.map((r) => r.ma))
  let candidate: string
  do {
    candidate = `${prefix}${String(next).padStart(5, '0')}`
    if (!existingMas.has(candidate)) return candidate
    next++
  } while (true)
}

/** Base path lưu ảnh (server) */
export const VATTU_IMAGE_BASE = '/ssd_2tb/HTQL_550/thietke/vattu/'
