import type { TaiKhoanRecord } from '../../../types/taiKhoan'
import { htqlEntityStorage } from '@/utils/htqlEntityStorage'
import { decodeNgamDinhKhiList, encodeNgamDinhKhiList, NGAM_DINH_TAI_KHOAN_DA_BO } from '../../../constants/ngamDinhTaiKhoan'

const STORAGE_KEY = 'htql550_tai_khoan'
/** Khóa cũ trước YC92 — tự migrate sang `STORAGE_KEY`. */
const LEGACY_STORAGE_KEY = 'htql550_tai_khoan_ngan_hang'

/** Giá trị mặc định khi chưa chọn mục ngầm định (chuỗi rỗng). */
export const NGAM_DINH_KHI_DEFAULT = ''

const LEGACY_NH_TOKENS = new Set(['Thu tiền gửi', 'Thu qua NH', 'Chi qua NH', 'Chuyển khoản', 'Chi lương'])

function inferLaNganHangFromLegacy(r: Partial<TaiKhoanRecord>): boolean {
  const tokens = decodeNgamDinhKhiList(String(r.ngam_dinh_khi ?? ''))
  return tokens.some((t) => LEGACY_NH_TOKENS.has(t.trim()))
}

function inferLaTienMatFromLegacy(r: Partial<TaiKhoanRecord>): boolean {
  const tokens = decodeNgamDinhKhiList(String(r.ngam_dinh_khi ?? ''))
  return tokens.some((t) => t.trim() === 'Thu tiền mặt')
}

function boTokenNgamDinhDaThayThe(raw: string): string {
  const parts = decodeNgamDinhKhiList(raw).filter((t) => !NGAM_DINH_TAI_KHOAN_DA_BO.has(t.trim()))
  return encodeNgamDinhKhiList(parts)
}

function normalizeTaiKhoanRow(r: Partial<TaiKhoanRecord> & Record<string, unknown>): TaiKhoanRecord {
  let laNh: boolean
  if (typeof r.la_tai_khoan_ngan_hang === 'boolean') laNh = r.la_tai_khoan_ngan_hang
  else laNh = inferLaNganHangFromLegacy(r)

  let laTm: boolean
  if (typeof r.la_tien_mat === 'boolean') laTm = r.la_tien_mat
  else laTm = inferLaTienMatFromLegacy(r)

  const soDuRaw = (r as Record<string, unknown>).so_du_hien_tai
  const soDu =
    typeof soDuRaw === 'number' && Number.isFinite(soDuRaw)
      ? soDuRaw
      : typeof soDuRaw === 'string' && soDuRaw.trim()
        ? Number(soDuRaw.replace(/\./g, '').replace(',', '.'))
        : undefined

  return {
    id: String(r.id ?? ''),
    la_tai_khoan_ngan_hang: laNh,
    la_tien_mat: laTm,
    thuoc_cty_cn: String(r.thuoc_cty_cn ?? ''),
    so_tai_khoan: String(r.so_tai_khoan ?? ''),
    ten_ngan_hang: String(r.ten_ngan_hang ?? ''),
    ngam_dinh_khi: boTokenNgamDinhDaThayThe(String(r.ngam_dinh_khi ?? NGAM_DINH_KHI_DEFAULT)),
    dien_giai: String(r.dien_giai ?? ''),
    so_du_hien_tai: soDu !== undefined && Number.isFinite(soDu) ? soDu : undefined,
    chu_tai_khoan: r.chu_tai_khoan !== undefined ? String(r.chu_tai_khoan) : undefined,
  }
}

function readRawFromStorage(): string | null {
  if (typeof htqlEntityStorage === 'undefined') return null
  let raw = htqlEntityStorage.getItem(STORAGE_KEY)
  if (!raw) {
    const legacy = htqlEntityStorage.getItem(LEGACY_STORAGE_KEY)
    if (legacy) {
      raw = legacy
      try {
        htqlEntityStorage.setItem(STORAGE_KEY, legacy)
        htqlEntityStorage.removeItem(LEGACY_STORAGE_KEY)
      } catch {
        /* ignore */
      }
    }
  }
  return raw
}

function loadFromStorage(): TaiKhoanRecord[] {
  try {
    const raw = readRawFromStorage()
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.map((x) => normalizeTaiKhoanRow(x as Partial<TaiKhoanRecord> & Record<string, unknown>))
  } catch {
    return []
  }
}

function saveToStorage(list: TaiKhoanRecord[]): void {
  try {
    if (typeof htqlEntityStorage !== 'undefined') htqlEntityStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  } catch {
    /* ignore */
  }
}

let _list: TaiKhoanRecord[] = loadFromStorage()

export function taiKhoanGetAll(): TaiKhoanRecord[] {
  return [..._list]
}

export function taiKhoanPost(rec: Omit<TaiKhoanRecord, 'id'>): TaiKhoanRecord {
  const row: TaiKhoanRecord = normalizeTaiKhoanRow({ ...rec, id: `tk${Date.now()}` })
  _list.push(row)
  saveToStorage(_list)
  return row
}

export function taiKhoanPut(id: string, rec: Omit<TaiKhoanRecord, 'id'>): void {
  const i = _list.findIndex((r) => r.id === id)
  if (i < 0) return
  _list[i] = normalizeTaiKhoanRow({ ...rec, id })
  saveToStorage(_list)
}

export function taiKhoanDelete(id: string): void {
  _list = _list.filter((r) => r.id !== id)
  saveToStorage(_list)
}

/** TK đủ điều kiện «giao dịch qua ngân hàng» trên form Thu/Chi (ô tick hoặc dữ liệu cũ). */
export function taiKhoanLaTkNganHang(r: TaiKhoanRecord): boolean {
  if (r.la_tai_khoan_ngan_hang) return true
  return inferLaNganHangFromLegacy(r)
}

/** TK tiền mặt (ô tick hoặc ngầm định cũ «Thu tiền mặt»). */
export function taiKhoanLaTienMat(r: TaiKhoanRecord): boolean {
  if (r.la_tien_mat) return true
  return inferLaTienMatFromLegacy(r)
}
