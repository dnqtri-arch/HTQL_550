/**
 * Tra cứu thông tin công dân theo số CCCD (Căn cước công dân).
 * Gọi API backend; backend có thể tích hợp Cổng Dịch vụ công hoặc nguồn khác.
 * Trả về: mã số thuế, ĐT di động, ĐT cố định, email, ngày cấp, nơi cấp.
 */

import { htqlApiUrl } from '../../../config/htqlApiBase'

const API_CCCD_LOOKUP = '/api/cccd-lookup'

export interface CccdLookupResult {
  ma_so_thue?: string
  dt_di_dong?: string
  dt_co_dinh?: string
  email?: string
  ngay_cap?: string
  noi_cap?: string
}

/**
 * Tra cứu theo số CCCD. Trả về null nếu không có dữ liệu hoặc lỗi.
 */
export async function lookupByCccd(cccd: string): Promise<CccdLookupResult | null> {
  const so = (cccd || '').trim().replace(/\s/g, '')
  if (!so) return null
  try {
    const res = await fetch(htqlApiUrl(`${API_CCCD_LOOKUP}?cccd=${encodeURIComponent(so)}`))
    if (!res.ok) return null
    const data = await res.json()
    if (!data || typeof data !== 'object') return null
    return {
      ma_so_thue: (data.ma_so_thue ?? data.maSoThue ?? '').toString().trim() || undefined,
      dt_di_dong: (data.dt_di_dong ?? data.dtDiDong ?? data.dien_thoai ?? '').toString().trim() || undefined,
      dt_co_dinh: (data.dt_co_dinh ?? data.dtCoDinh ?? '').toString().trim() || undefined,
      email: (data.email ?? '').toString().trim() || undefined,
      ngay_cap: (data.ngay_cap ?? data.ngayCap ?? '').toString().trim() || undefined,
      noi_cap: (data.noi_cap ?? data.noiCap ?? '').toString().trim() || undefined,
    }
  } catch {
    return null
  }
}
