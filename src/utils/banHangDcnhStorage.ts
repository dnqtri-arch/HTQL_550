/** Địa chỉ nhận hàng (ĐCNH) — lưu nhiều dòng cách nhau bằng xuống dòng (YC79). */

export const BAN_HANG_COL_DCNH = 'ĐCNH' as const

export type BanHangColDcnh = typeof BAN_HANG_COL_DCNH

/** Tách chuỗi lưu trữ → danh sách dòng hiển thị (luôn ít nhất một ô). */
export function splitDiaChiNhanHangLines(stored: string | undefined | null): string[] {
  if (stored == null || stored === '') return ['']
  const parts = stored.split(/\r?\n/)
  return parts.length > 0 ? parts : ['']
}

export function joinDiaChiNhanHangLines(lines: string[]): string {
  return lines.join('\n')
}

/** Nhãn cột lưới chi tiết / option ĐCNH: ĐCNH | ĐCNH 1 | … (YC81 giữ nguyên trên lưới). */
export function dcnhRowLabel(index: number): string {
  if (index <= 0) return 'ĐCNH'
  return `ĐCNH ${index}`
}

/** Nhãn cụm ô trên form: ĐC nhận hàng | ĐC nhận hàng 1 | … */
export function dcnhFormRowLabel(index: number): string {
  if (index <= 0) return 'ĐC nhận hàng'
  return `ĐC nhận hàng ${index}`
}

export function dcnhOptionDescriptors(numLines: number): { value: string; label: string }[] {
  const n = Math.max(1, numLines)
  return Array.from({ length: n }, (_, i) => ({
    value: String(i),
    label: dcnhRowLabel(i),
  }))
}

export function parseDcnhIndexFromLineCell(cell: string | undefined, maxIndexInclusive: number): number {
  const raw = parseInt(String(cell ?? '0').trim(), 10)
  if (!Number.isFinite(raw) || raw < 0) return 0
  return Math.min(raw, Math.max(0, maxIndexInclusive))
}

export function dcnhIndexToLineCell(idx: number): string {
  return String(Math.max(0, idx))
}
