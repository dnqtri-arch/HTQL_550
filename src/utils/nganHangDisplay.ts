/**
 * Viết tắt tên ngân hàng hiển thị gọn; bản đầy đủ dùng cho title/tooltip.
 */

const BANK_PATTERNS: { re: RegExp; abbr: string }[] = [
  { re: /ngoại thương|vietcombank|\bvcb\b/i, abbr: 'VCB' },
  { re: /đầu tư và phát triển|\bbidv\b/i, abbr: 'BIDV' },
  { re: /công thương|vietinbank/i, abbr: 'VietinBank' },
  { re: /nông nghiệp|agribank/i, abbr: 'Agribank' },
  { re: /á châu|\bacb\b/i, abbr: 'ACB' },
  { re: /kỹ thương|techcombank/i, abbr: 'TCB' },
  { re: /quân đội|\bmb\s*bank|military/i, abbr: 'MB' },
  { re: /sài gòn thương tín|sacombank/i, abbr: 'STB' },
  { re: /tiên phong|tpbank/i, abbr: 'TPB' },
  { re: /việt nam thịnh vượng|vpbank/i, abbr: 'VPB' },
  { re: /phát triển nhà|hdbank/i, abbr: 'HDB' },
  { re: /hàng hải|\bmsb\b/i, abbr: 'MSB' },
  { re: /phương đông|\bocb\b/i, abbr: 'OCB' },
]

export function vietTatTenNganHang(raw: string): string {
  const s = (raw ?? '').trim()
  if (!s) return ''
  for (const { re, abbr } of BANK_PATTERNS) {
    if (re.test(s)) return abbr
  }
  let t = s
    .replace(/^ngân hàng\s*/i, 'NH ')
    .replace(/\bTMCP\b/gi, '')
    .replace(/\s*—\s*Chi nhánh.*$/i, '')
    .replace(/\s*-\s*Chi nhánh.*$/i, '')
    .replace(/\s+/g, ' ')
    .trim()
  if (t.length > 12) t = `${t.slice(0, 10)}…`
  return t
}
