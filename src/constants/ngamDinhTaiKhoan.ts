/**
 * Giá trị «Ngầm định khi» gộp từ lý do Thu tiền, Chi tiền, Chuyển tiền (YC91).
 * Lưu trong `TaiKhoanRecord.ngam_dinh_khi` dạng chuỗi nhiều mục qua `encodeNgamDinhKhiList` / `decodeNgamDinhKhiList`.
 */
export const NGAM_DINH_TAI_KHOAN_SEP = '||'

/** Danh sách hiển thị trong form TK (thứ tự: Thu → Chi → Chuyển tiền). */
export const NGAM_DINH_TAI_KHOAN_OPTIONS = [
  'Thu tiền khách hàng',
  'Thu tiền nội bộ',
  'Chi trả khách hàng',
  'Chi tiền nội bộ',
  'Rút tiền mặt',
  'Nộp tiền mặt vào ngân hàng',
] as const

/** Đã bỏ khỏi danh sách chọn — gỡ khỏi chuỗi lưu khi chuẩn hóa. */
export const NGAM_DINH_TAI_KHOAN_DA_BO = new Set(['Thu khác', 'Chi khác'])

export type NgamDinhTaiKhoanValue = (typeof NGAM_DINH_TAI_KHOAN_OPTIONS)[number]

export function decodeNgamDinhKhiList(raw: string | null | undefined): string[] {
  const s = (raw ?? '').trim()
  if (!s) return []
  if (s.includes(NGAM_DINH_TAI_KHOAN_SEP)) {
    return s.split(NGAM_DINH_TAI_KHOAN_SEP).map((x) => x.trim()).filter(Boolean)
  }
  return [s]
}

export function encodeNgamDinhKhiList(values: string[]): string {
  const u = [...new Set(values.map((v) => v.trim()).filter(Boolean))]
  return u.join(NGAM_DINH_TAI_KHOAN_SEP)
}

/** Lý do chuyển tiền — đồng bộ form & mục ngầm định TK. */
export const LY_DO_CHUYEN_RUT_TIEN_MAT = 'Rút tiền mặt'
export const LY_DO_CHUYEN_NOP_TIEN_MAT_VAO_NH = 'Nộp tiền mặt vào ngân hàng'

export const LY_DO_CHUYEN_FORM_OPTIONS = [LY_DO_CHUYEN_RUT_TIEN_MAT, LY_DO_CHUYEN_NOP_TIEN_MAT_VAO_NH] as const
