/** Chuẩn hóa mức thuế GTGT từ DB/API (vd. "8%", "8") về token lưu trên form ("8"). */
export function thueGtgtStdToken(raw: string | null | undefined): string {
  const t = String(raw ?? '').trim()
  if (!t) return ''
  if (t === 'Chưa xác định' || t === 'Tự nhập') return t
  const noPct = t.endsWith('%') ? t.slice(0, -1).trim() : t
  const num = noPct.replace(/\s/g, '').replace(',', '.')
  if (num === '0' || num === '5' || num === '8' || num === '10') return num
  const asFloat = Number(num)
  if (!Number.isNaN(asFloat) && asFloat > 0 && asFloat <= 1) {
    const pct = Math.round(asFloat * 100)
    if (pct === 0 || pct === 5 || pct === 8 || pct === 10) return String(pct)
  }
  return t
}

export const THUE_GTGT_STD_SET = new Set(['0', '5', '8', '10', 'Chưa xác định'])
