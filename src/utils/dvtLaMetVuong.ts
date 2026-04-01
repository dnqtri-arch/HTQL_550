/** Nhận diện ĐVT m² (mét vuông) để cho phép tính SL từ kích thước; ĐVT khác → SL nhập tay. */

export type DvtMetVuongListItem = { ma_dvt: string; ten_dvt: string; ky_hieu?: string }

function normalizeAscii(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, '')
}

export function dvtLaMetVuong(dvtRaw: string, dvtList: DvtMetVuongListItem[]): boolean {
  const v = String(dvtRaw ?? '').trim()
  if (!v) return false
  const d = dvtList.find((x) => x.ma_dvt === v || x.ten_dvt === v || (x.ky_hieu != null && x.ky_hieu === v))
  const candidates = [v, d?.ma_dvt, d?.ky_hieu, d?.ten_dvt].filter(
    (x): x is string => typeof x === 'string' && x.trim() !== '',
  )
  for (const c of candidates) {
    const t = c.trim()
    const ascii = normalizeAscii(t)
    if (ascii === 'm2' || t.replace(/\s/g, '').toLowerCase() === 'm²' || /^m\s*²$/i.test(t.trim())) return true
    if (t.includes('²') && /^m\s*²$/i.test(t.replace(/\s/g, ''))) return true
    if (ascii.includes('metvuong')) return true
  }
  return false
}
