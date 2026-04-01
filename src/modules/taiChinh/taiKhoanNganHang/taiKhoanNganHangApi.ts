import type { TaiKhoanNganHangRecord } from '../../../types/taiKhoanNganHang'

const STORAGE_KEY = 'htql550_tai_khoan_ngan_hang'

function loadFromStorage(): TaiKhoanNganHangRecord[] {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? (parsed as TaiKhoanNganHangRecord[]) : []
  } catch {
    return []
  }
}

function saveToStorage(list: TaiKhoanNganHangRecord[]): void {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  } catch {
    /* ignore */
  }
}

let _list: TaiKhoanNganHangRecord[] = loadFromStorage()

export const NGAM_DINH_KHI_OPTIONS = [
  'Thu tiền gửi',
  'Thu qua NH',
  'Thu tiền mặt',
  'Chi lương',
  'Chuyển khoản',
  'Khác',
] as const

export function taiKhoanNganHangGetAll(): TaiKhoanNganHangRecord[] {
  return [..._list]
}

export function taiKhoanNganHangPost(rec: Omit<TaiKhoanNganHangRecord, 'id'>): TaiKhoanNganHangRecord {
  const row: TaiKhoanNganHangRecord = { ...rec, id: `tknh${Date.now()}` }
  _list.push(row)
  saveToStorage(_list)
  return row
}

export function taiKhoanNganHangPut(id: string, rec: Omit<TaiKhoanNganHangRecord, 'id'>): void {
  const i = _list.findIndex((r) => r.id === id)
  if (i < 0) return
  _list[i] = { ...rec, id }
  saveToStorage(_list)
}

export function taiKhoanNganHangDelete(id: string): void {
  _list = _list.filter((r) => r.id !== id)
  saveToStorage(_list)
}
