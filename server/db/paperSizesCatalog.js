function mFromMm(mm) {
  return Number((Number(mm) / 1000).toFixed(4))
}

function seed(code, name, widthMm, heightMm, aliases = []) {
  return {
    code,
    name,
    widthM: mFromMm(widthMm),
    heightM: mFromMm(heightMm),
    aliases,
  }
}

export const PAPER_SIZE_SEED = [
  seed('A0', 'A0', 841, 1189, ['a0']),
  seed('A1', 'A1', 594, 841, ['a1']),
  seed('A2', 'A2', 420, 594, ['a2']),
  seed('A3', 'A3', 297, 420, ['a3']),
  // Theo chuẩn vận hành HTQL: A3+ dùng 325x430mm.
  seed('A3_PLUS', 'A3+', 325, 430, ['a3+', 'a3 plus', 'a3plus']),
  seed('A4', 'A4', 210, 297, ['a4']),
  seed('A4_PLUS', 'A4+', 223, 310, ['a4+', 'a4 plus', 'a4plus']),
  seed('A5', 'A5', 148, 210, ['a5']),
  seed('A6', 'A6', 105, 148, ['a6']),
  seed('A7', 'A7', 74, 105, ['a7']),
  seed('A8', 'A8', 52, 74, ['a8']),
  seed('A9', 'A9', 37, 52, ['a9']),
  seed('A10', 'A10', 26, 37, ['a10']),
  seed('B0', 'B0', 1000, 1414, ['b0']),
  seed('B1', 'B1', 707, 1000, ['b1']),
  seed('B2', 'B2', 500, 707, ['b2']),
  seed('B3', 'B3', 353, 500, ['b3']),
  seed('B4', 'B4', 250, 353, ['b4']),
  seed('B5', 'B5', 176, 250, ['b5']),
  seed('B6', 'B6', 125, 176, ['b6']),
  seed('C0', 'C0', 917, 1297, ['c0']),
  seed('C1', 'C1', 648, 917, ['c1']),
  seed('C2', 'C2', 458, 648, ['c2']),
  seed('C3', 'C3', 324, 458, ['c3']),
  seed('C4', 'C4', 229, 324, ['c4']),
  seed('C5', 'C5', 162, 229, ['c5']),
  seed('C6', 'C6', 114, 162, ['c6']),
  seed('LETTER', 'Letter', 216, 279, ['letter', '8.5x11', '8.5 x 11']),
  seed('LEGAL', 'Legal', 216, 356, ['legal', '8.5x14', '8.5 x 14']),
  seed('TABLOID', 'Tabloid', 279, 432, ['tabloid', '11x17', '11 x 17']),
  seed('LEDGER', 'Ledger', 432, 279, ['ledger', '17x11', '17 x 11']),
  seed('SRA3', 'SRA3', 320, 450, ['sra3']),
  seed('SRA4', 'SRA4', 225, 320, ['sra4']),
  seed('RA0', 'RA0', 860, 1220, ['ra0']),
  seed('RA1', 'RA1', 610, 860, ['ra1']),
  seed('RA2', 'RA2', 430, 610, ['ra2']),
  seed('RA3', 'RA3', 305, 430, ['ra3']),
  seed('RA4', 'RA4', 215, 305, ['ra4']),
]

function normalizeText(raw) {
  return String(raw ?? '')
    .replace(/\+/g, ' PLUS ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim()
}

function extractSizePair(raw) {
  const q = String(raw ?? '')
  const m = q.match(/(\d{2,4})\s*[xX*]\s*(\d{2,4})/)
  if (!m) return null
  const a = Number.parseInt(m[1], 10)
  const b = Number.parseInt(m[2], 10)
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null
  return [Math.min(a, b), Math.max(a, b)]
}

function rowAliasList(row) {
  const out = new Set([row.code, row.name, ...(Array.isArray(row.aliases) ? row.aliases : [])])
  const widthMm = Math.round(Number(row.widthM || 0) * 1000)
  const heightMm = Math.round(Number(row.heightM || 0) * 1000)
  out.add(`${widthMm}x${heightMm}`)
  out.add(`${heightMm}x${widthMm}`)
  return Array.from(out)
}

function scorePaperSize(row, query) {
  const qNorm = normalizeText(query)
  if (!qNorm) return 0
  const aliases = rowAliasList(row).map((x) => normalizeText(x))
  let score = 0
  if (aliases.some((a) => a === qNorm)) score = Math.max(score, 100)
  if (aliases.some((a) => a.startsWith(qNorm))) score = Math.max(score, 92)
  if (aliases.some((a) => a.includes(qNorm))) score = Math.max(score, 82)
  const qTokens = qNorm.split(' ').filter(Boolean)
  if (qTokens.length > 0 && aliases.some((a) => qTokens.every((tk) => a.includes(tk)))) score = Math.max(score, 78)

  const pair = extractSizePair(query)
  if (pair) {
    const widthMm = Math.round(Number(row.widthM || 0) * 1000)
    const heightMm = Math.round(Number(row.heightM || 0) * 1000)
    const rowPair = [Math.min(widthMm, heightMm), Math.max(widthMm, heightMm)]
    if (pair[0] === rowPair[0] && pair[1] === rowPair[1]) score = Math.max(score, 100)
  }
  return score
}

export function findBestPaperSize(query, rows = PAPER_SIZE_SEED) {
  const list = Array.isArray(rows) ? rows : []
  const ranked = list
    .map((row) => ({ row, score: scorePaperSize(row, query) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.row.code.localeCompare(b.row.code))
  if (ranked.length === 0) return null
  return ranked[0]
}
