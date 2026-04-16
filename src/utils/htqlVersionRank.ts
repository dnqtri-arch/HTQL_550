/**
 * So sánh phiên bản client (tag V… / semver) — đồng bộ logic với `phanmem/htqlClientInstaller/electron/main.cjs` (versionRank).
 */

export function extractHtqlClientVxTag(...candidates: (string | null | undefined)[]): string | null {
  for (const c of candidates) {
    const s = String(c ?? '').trim()
    const m = s.match(/(V\d{4}_\d{2}_\d{2}_\d+)/i)
    if (m) return m[1]
  }
  return null
}

export function versionRankHtql(s: string): number {
  const t = String(s || '').trim()
  const sem = t.match(/^(\d+)\.(\d+)\.(\d+)-(\d+)$/)
  if (sem) {
    return (
      parseInt(sem[1], 10) * 1e12 +
      parseInt(sem[2], 10) * 1e9 +
      parseInt(sem[3], 10) * 1e6 +
      parseInt(sem[4], 10)
    )
  }
  const tag = t.match(/V(\d{4})_(\d{2})_(\d{2})_(\d+)/i)
  if (tag) {
    return (
      parseInt(tag[1], 10) * 1e12 +
      parseInt(tag[2], 10) * 1e9 +
      parseInt(tag[3], 10) * 1e6 +
      parseInt(tag[4], 10)
    )
  }
  const digits = t.replace(/\D/g, '')
  return digits ? parseInt(digits.slice(0, 16), 10) : 0
}

export function semverFromVxTag(tag: string): string {
  const m = String(tag).match(/V(\d{4})_(\d{2})_(\d{2})_(\d+)/i)
  if (!m) return ''
  return `${m[1]}.${parseInt(m[2], 10)}.${parseInt(m[3], 10)}-${m[4]}`
}
