/**
 * API và storage cho Hình thức mua hàng.
 * Mã: HT + số nguyên tăng dần (HT1, HT2...)
 */

export interface HinhThucRecord {
  id: string
  ma: string
  ten: string
  ghi_chu: string
}

const STORAGE_KEY = 'htql_hinh_thuc_list'
const ID_PREFIX = 'ht'
const MA_PREFIX = 'HT'

function loadFromStorage(): HinhThucRecord[] {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed
    }
  } catch {
    /* ignore */
  }
  return [
    { id: 'ht1', ma: 'HT1', ten: 'Mua hàng nhập kho', ghi_chu: '' },
    { id: 'ht2', ma: 'HT2', ten: 'Mua hàng không nhập kho', ghi_chu: '' },
  ]
}

let _list: HinhThucRecord[] = loadFromStorage()

function saveToStorage(): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(_list))
    }
  } catch {
    /* ignore */
  }
}

export function hinhThucGetAll(): HinhThucRecord[] {
  return [..._list]
}

export function hinhThucGetById(id: string): HinhThucRecord | null {
  return _list.find((d) => d.id === id) ?? null
}

function extractSoFromMa(ma: string): number | null {
  const m = (ma || '').trim()
  const match = m.match(/^HT(\d+)$/i)
  return match ? parseInt(match[1], 10) : null
}

function nextSo(): number {
  let maxSo = 0
  for (const d of _list) {
    const n = extractSoFromMa(d.ma)
    if (n != null && n > maxSo) maxSo = n
  }
  return maxSo + 1
}

export function hinhThucMaLienSau(): string {
  return `${MA_PREFIX}${nextSo()}`
}

export function hinhThucPost(payload: { ma: string; ten: string; ghi_chu?: string }): HinhThucRecord {
  const maTrim = (payload.ma || '').trim()
  const tenTrim = (payload.ten || '').trim()
  const id = `${ID_PREFIX}${Date.now()}`
  const ma = maTrim || `${MA_PREFIX}${nextSo()}`
  const rec: HinhThucRecord = {
    id,
    ma,
    ten: tenTrim,
    ghi_chu: (payload.ghi_chu || '').trim(),
  }
  _list.push(rec)
  saveToStorage()
  return rec
}

export function hinhThucPut(id: string, payload: { ma: string; ten: string; ghi_chu?: string }): void {
  const idx = _list.findIndex((d) => d.id === id)
  if (idx < 0) return
  _list[idx] = {
    ..._list[idx],
    ma: (payload.ma || '').trim(),
    ten: (payload.ten || '').trim(),
    ghi_chu: (payload.ghi_chu || '').trim(),
  }
  saveToStorage()
}

export function hinhThucDelete(id: string): void {
  _list = _list.filter((d) => d.id !== id)
  saveToStorage()
}
