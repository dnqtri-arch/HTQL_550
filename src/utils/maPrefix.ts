/**
 * Sinh mã prefix từ Tên — lấy chữ cái đầu của từng từ, IN HOA.
 * VD: "Mực in" → "MI", "Vật tư in" → "VT", "Bổ sung" → "BS".
 * Rule: .cursor/rules/ma-he-thong.mdc
 */
export function maPrefixFromTen(ten: string): string {
  const t = ten.trim()
  if (!t) return ''
  const words = t.split(/\s+/).filter(Boolean)
  const up = (s: string) => (s.charAt(0) || '').toUpperCase()
  if (words.length >= 2) return `${up(words[0])}${up(words[1])}`
  const w = words[0]
  return w.slice(0, 2).toUpperCase()
}
