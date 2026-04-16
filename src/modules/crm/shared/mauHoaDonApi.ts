import { htqlEntityStorage } from '@/utils/htqlEntityStorage'
/**
 * Danh mục mẫu hóa đơn (tham chiếu cấu trúc thông tư / dữ liệu kê khai thuế).
 * Tầng ứng dụng: gộp mẫu quốc gia + mẫu người dùng thêm (htqlEntityStorage).
 */

const STORAGE_KEY = 'htql550_mau_hoa_don_user'

export interface MauHoaDonItem {
  id: string
  /** Mã mẫu (vd. 1, 2, 3, 5, 6…) */
  ma_mau: string
  /** Tên mẫu hiển thị */
  ten_mau: string
  /** Ký hiệu HĐ gợi ý theo mẫu (có thể chỉnh trên form). */
  ky_hieu: string
}

/** Mẫu tham chiếu (không thay thế tra cứu trực tiếp CQT — chỉ phục vụ UI & lưu cục bộ). */
const MAU_QUOC_GIA: MauHoaDonItem[] = [
  { id: 'q-1', ma_mau: '1', ten_mau: 'Hóa đơn GTGT (mẫu số 1)', ky_hieu: 'K25TYY' },
  { id: 'q-2', ma_mau: '2', ten_mau: 'Hóa đơn bán hàng (mẫu số 2)', ky_hieu: 'K25TYY' },
  { id: 'q-3', ma_mau: '3', ten_mau: 'Hóa đơn bán tài sản công (mẫu số 3)', ky_hieu: 'K25TYY' },
  { id: 'q-5', ma_mau: '5', ten_mau: 'Tem, vé (mẫu số 5)', ky_hieu: 'K25TYY' },
  { id: 'q-6', ma_mau: '6', ten_mau: 'Phiếu xuất kho kiêm vận chuyển nội bộ / HĐ GTGT (mẫu số 6)', ky_hieu: 'K25TYY' },
]

function loadUserMau(): MauHoaDonItem[] {
  try {
    if (typeof htqlEntityStorage === 'undefined') return []
    const raw = htqlEntityStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const arr = JSON.parse(raw) as unknown
    if (!Array.isArray(arr)) return []
    return arr.filter((x) => x && typeof (x as MauHoaDonItem).id === 'string') as MauHoaDonItem[]
  } catch {
    return []
  }
}

function saveUserMau(list: MauHoaDonItem[]): void {
  try {
    if (typeof htqlEntityStorage === 'undefined') return
    htqlEntityStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  } catch {
    /* ignore */
  }
}

export async function mauHoaDonGetAll(): Promise<MauHoaDonItem[]> {
  const user = loadUserMau()
  return [...MAU_QUOC_GIA, ...user]
}

export function mauHoaDonThemLuu(item: Omit<MauHoaDonItem, 'id'>): MauHoaDonItem {
  const id = `u-${Date.now()}`
  const row: MauHoaDonItem = {
    id,
    ma_mau: item.ma_mau.trim(),
    ten_mau: item.ten_mau.trim(),
    ky_hieu: item.ky_hieu.trim(),
  }
  const prev = loadUserMau()
  saveUserMau([...prev, row])
  return row
}
