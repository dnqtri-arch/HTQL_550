/**
 * Sắp xếp mã chứng từ (BG, ĐHB, HĐB, …) theo cụm số cuối chuỗi — YC82.
 * Ví dụ: BG00009 → 9, DHB00012 → 12.
 */
export function parseTrailingIntFromMa(ma: string | null | undefined): number {
  const s = String(ma ?? '').trim()
  const m = s.match(/(\d+)\s*$/)
  if (!m) return 0
  const n = parseInt(m[1], 10)
  return Number.isFinite(n) ? n : 0
}
