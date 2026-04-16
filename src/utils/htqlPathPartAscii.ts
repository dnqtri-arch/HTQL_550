/**
 * Thư mục/tên file đính kèm trên server: chữ thường ASCII, không dấu, [a-z0-9_-].
 */
export function htqlPathPartAscii(raw: string): string {
  const s = String(raw ?? '').trim()
  if (!s) return ''
  try {
    return s
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '_')
      .replace(/^_+|_+$/g, '')
  } catch {
    return s.toLowerCase().replace(/[^a-z0-9_-]+/gi, '_').replace(/^_+|_+$/g, '')
  }
}
