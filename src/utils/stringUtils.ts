/**
 * Chuẩn hóa chuỗi tiếng Việt để tìm gần đúng (bỏ dấu, lowercase).
 * VD: "Trắng sữa" → "trang sua"; dùng so sánh khi search.
 */
export function normalizeForSearch(s: string): string {
  if (!s || typeof s !== 'string') return ''
  const lower = s.toLowerCase().trim()
  const normalized = lower.normalize('NFD').replace(/\p{Mc}|\p{Mn}|\p{Me}/gu, '')
  const from = 'đð'
  const to = 'dd'
  let out = ''
  for (let i = 0; i < normalized.length; i++) {
    const idx = from.indexOf(normalized[i])
    out += idx >= 0 ? to[idx] : normalized[i]
  }
  return out.replace(/\s+/g, ' ')
}

/**
 * Kiểm tra chuỗi gốc có chứa từ khóa tìm gần đúng hay không (so sánh đã chuẩn hóa).
 */
export function matchSearchKeyword(source: string, keyword: string): boolean {
  if (!keyword.trim()) return true
  const k = normalizeForSearch(keyword)
  const src = normalizeForSearch(source)
  return src.includes(k)
}
