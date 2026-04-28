import { htqlEntityStorage } from '@/utils/htqlEntityStorage'
/** Key htqlEntityStorage lưu danh mục kho (dùng chung cho Danh sách kho và form Vật tư hàng hóa) */
export const STORAGE_KEY_KHO = 'htql550_danh_muc_kho'

export interface KhoStorageItem {
  id: string
  label: string
  /** Tài khoản kho (vd: 152, 156) */
  tk_kho?: string
  /** Địa chỉ kho */
  dia_chi?: string
}

export function loadKhoListFromStorage(): KhoStorageItem[] {
  try {
    const raw = htqlEntityStorage.getItem(STORAGE_KEY_KHO)
    if (raw) {
      const parsed = JSON.parse(raw) as (KhoStorageItem & Record<string, unknown>)[]
      if (Array.isArray(parsed)) {
        return parsed.map((r) => ({
          id: r.id ?? '',
          label: r.label ?? '',
          tk_kho: r.tk_kho ?? '',
          dia_chi: r.dia_chi ?? '',
        }))
      }
    }
  } catch {
    // ignore
  }
  return []
}

export function saveKhoListToStorage(list: KhoStorageItem[]): void {
  htqlEntityStorage.setItem(STORAGE_KEY_KHO, JSON.stringify(list))
}
