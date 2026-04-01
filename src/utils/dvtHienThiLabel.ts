/** Danh sách DVT từ API đơn vị tính (không import từ modules). */
export type DvtListItem = { ma_dvt: string; ten_dvt: string; ky_hieu?: string }

/**
 * Hiển thị ĐVT theo rule HTQL: `ky_hieu || ten_dvt || ma_dvt` (lưu `ma_dvt`).
 */
export function dvtHienThiLabel(value: string | null | undefined, dvtList: DvtListItem[]): string {
  if (value == null || value === '') return ''
  const v = String(value).trim()
  const d = dvtList.find((x) => x.ma_dvt === v || x.ten_dvt === v || (x.ky_hieu != null && x.ky_hieu === v))
  return d ? d.ky_hieu || d.ten_dvt || d.ma_dvt : v
}
