/**
 * Cấp mã hệ thống {năm}/{prefix}/{số} qua POST /api/htql-sequence/ma-he-thong (MySQL atomic).
 * Fallback cục bộ khi API lỗi / offline.
 */
import { htqlApiUrl } from '../config/htqlApiBase'
import { getCurrentYear, maFormatHeThong } from './maFormat'

export function hintMaxSerialForYearPrefix(
  year: number,
  modulePrefix: string,
  values: ReadonlyArray<string | null | undefined>,
): number {
  const esc = String(modulePrefix).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(`^${year}/${esc}/(\\d+)$`)
  let max = 0
  for (const v of values) {
    const m = String(v ?? '').trim().match(re)
    if (m) max = Math.max(max, parseInt(m[1], 10))
  }
  return max
}

export async function allocateMaHeThongFromServer(args: {
  seqKey: string
  modulePrefix: string
  hintMaxSerial: number
  year?: number
}): Promise<string> {
  const year = args.year ?? getCurrentYear()
  try {
    const r = await fetch(htqlApiUrl('/api/htql-sequence/ma-he-thong'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        seqKey: args.seqKey,
        modulePrefix: args.modulePrefix,
        year,
        hintMaxSerial: args.hintMaxSerial,
      }),
    })
    if (!r.ok) throw new Error('seq_fail')
    const j = (await r.json()) as { ma?: string }
    if (j.ma && typeof j.ma === 'string') return j.ma.trim()
  } catch {
    /* offline / lỗi mạng */
  }
  return maFormatHeThong(args.modulePrefix, args.hintMaxSerial + 1)
}
