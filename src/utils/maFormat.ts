/**
 * Mã hệ thống: {Năm}/{ModulePrefix}/{Số thứ tự}
 * Reset số về 1 mỗi năm mới.
 * Rule: .cursor/rules/ma-he-thong.mdc
 */

export function getCurrentYear(): number {
  return new Date().getFullYear()
}

/** Trả về mã dạng 2026/DXMH/1 */
export function maFormatHeThong(modulePrefix: string, nextSo: number): string {
  const year = getCurrentYear()
  return `${year}/${modulePrefix}/${nextSo}`
}
