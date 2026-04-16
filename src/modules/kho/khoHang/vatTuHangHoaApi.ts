/**
 * API / Mock cho Danh mục Vật tư hàng hóa (schema vattu_hanghoa).
 * Cơ sở dữ liệu dùng chung cho cả hai module:
 * - Kho → Vật tư hàng hóa
 * - Mua hàng → Vật tư, hàng hóa
 * (Cùng htqlEntityStorage key + cache; khi có backend thì cùng REST API.)
 * Khi có backend REST: GET/POST /api/vat-tu-hang-hoa, PUT/DELETE /api/vat-tu-hang-hoa/:id
 * Ảnh VTHH: API `kind=vthh_hinh`, gốc SSD `HTQL_PATH_VTHH_HINH_ANH` (mặc định …/vthh); DB lưu `htql-vthh:` + path tương đối.
 */

import type { VatTuHangHoaRecord } from '../../../types/vatTuHangHoa'
import { htqlEntityStorage } from '@/utils/htqlEntityStorage'
import { htqlFileDownloadUrl } from '../../../utils/htqlServerFileUpload'

const HTQL_VTHH_PREFIX = 'htql-vthh:'

export type { ChietKhauItem, DinhMucNvlItem, DonViQuyDoiItem, VatTuHangHoaRecord } from '../../../types/vatTuHangHoa'

/** Khóa htqlEntityStorage + htql_kv_store — đồng bộ đa máy qua KV. */
export const VTHH_ENTITY_STORAGE_KEY = 'htql550_vat_tu_hang_hoa'

const STORAGE_KEY = VTHH_ENTITY_STORAGE_KEY

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
    const raw = htqlEntityStorage.getItem(STORAGE_KEY)
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
  htqlEntityStorage.setItem(STORAGE_KEY, JSON.stringify(data))
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

/** Xóa VTHH và mọi bản ghi con (ma_vthh_cap_cha = mã của bản ghi cha). */
export async function vatTuHangHoaDeleteWithChildren(id: number): Promise<{ deletedIds: number[] }> {
  const list = loadFromStorage()
  const target = list.find((r) => r.id === id)
  if (!target) throw new Error('Không tìm thấy bản ghi.')
  const maCha = (target.ma ?? '').trim()
  const ids = new Set<number>()
  ids.add(id)
  if (maCha) {
    for (const r of list) {
      if (r.id !== id && (r.ma_vthh_cap_cha ?? '').trim() === maCha) ids.add(r.id)
    }
  }
  const next = list.filter((r) => !ids.has(r.id))
  saveToStorage(next)
  cache = next
  return { deletedIds: [...ids] }
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

/** Gợi ý đường dẫn vật lý trên SSD (nhãn UI) — đồng bộ `HTQL_PATH_VTHH_HINH_ANH` / `deploy/env.server.example`. */
export const VATTU_IMAGE_PHYSICAL_HINT = '/ssd_2tb/htql_550/vthh/'

/** Giữ tên `VATTU_IMAGE_BASE` cho import cũ: chỉ dùng hiển thị gợi ý thư mục, không nối trực tiếp làm URL ảnh. */
export const VATTU_IMAGE_BASE = VATTU_IMAGE_PHYSICAL_HINT

/** URL xem ảnh (prefix `htql-vthh:` hoặc path tương đối server). */
export function vatTuHinhAnhUrl(stored: string | undefined | null): string {
  const s = String(stored ?? '').trim()
  if (!s) return ''
  if (s.startsWith('data:')) return s
  if (s.startsWith(HTQL_VTHH_PREFIX)) {
    return htqlFileDownloadUrl('vthh_hinh', s.slice(HTQL_VTHH_PREFIX.length))
  }
  if (/^https?:\/\//i.test(s)) return s
  return htqlFileDownloadUrl('vthh_hinh', s.replace(/^\/+/, ''))
}

/** Chuỗi gợi ý đường dẫn đầy đủ trên SSD (chỉ để hiển thị, không dùng làm URL fetch). */
export function vatTuHinhAnhPathLabel(stored: string | undefined | null): string {
  const s = String(stored ?? '').trim()
  if (!s) return '—'
  if (s.startsWith('data:')) return 'Base64'
  if (s.startsWith(HTQL_VTHH_PREFIX)) {
    const rel = s.slice(HTQL_VTHH_PREFIX.length).replace(/^\/+/, '')
    const base = VATTU_IMAGE_PHYSICAL_HINT.replace(/\/+$/, '')
    return `${base}/${rel}`
  }
  return s
}

/**
 * YC21 (Mục 8): Lấy danh sách vật tư dùng trong Bán hàng.
 * Chỉ trả các bản ghi có la_vthh_ban = true (không phân biệt tính chất).
 * Dùng cho bộ chọn hàng hóa trong các nghiệp vụ Bán hàng (BaoGia, DonHangBan, HoaDonBan).
 * Module Kho dùng vatTuHangHoaGetAll() để hiện tất cả.
 */
export async function vatTuHangHoaGetForBanHang(): Promise<VatTuHangHoaRecord[]> {
  const all = await vatTuHangHoaGetAll()
  return all.filter((r) => r.la_vthh_ban === true)
}
