/**
 * API cho Danh mục Đơn vị tính.
 * Khi chạy npm run dev: dùng API server (file JSON) — Web và Cursor đồng bộ dữ liệu.
 * Khi build/preview: fallback localStorage.
 */

export interface DonViTinhRecord {
  id: number
  ma_dvt: string
  ten_dvt: string
  ky_hieu?: string
  dien_giai: string
}

const STORAGE_KEY = 'htql550_don_vi_tinh'

const DU_LIEU_MAU: DonViTinhRecord[] = [
  { id: 1, ma_dvt: '01', ten_dvt: 'Cái', ky_hieu: 'Cái', dien_giai: '' },
  { id: 2, ma_dvt: '02', ten_dvt: 'Hộp', ky_hieu: 'Hộp', dien_giai: '' },
  { id: 3, ma_dvt: '03', ten_dvt: 'Mét', ky_hieu: 'm', dien_giai: 'Đơn vị đo chiều dài' },
  { id: 4, ma_dvt: '04', ten_dvt: 'Kilôgam', ky_hieu: 'Kg', dien_giai: '' },
  { id: 5, ma_dvt: '05', ten_dvt: 'Tờ', ky_hieu: 'Tờ', dien_giai: '' },
  { id: 6, ma_dvt: '06', ten_dvt: 'Ram giấy', ky_hieu: 'Ram', dien_giai: '' },
]

const API_BASE = '/api/don-vi-tinh'

async function apiGet<T>(url: string): Promise<T | null> {
  try {
    const r = await fetch(url)
    if (!r.ok) return null
    return (await r.json()) as T
  } catch {
    return null
  }
}

async function apiPost<T>(url: string, body: unknown): Promise<T | null> {
  try {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    if (!r.ok) return null
    return (await r.json()) as T
  } catch {
    return null
  }
}

async function apiPut<T>(url: string, body: unknown): Promise<T | null> {
  try {
    const r = await fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    if (!r.ok) return null
    return (await r.json()) as T
  } catch {
    return null
  }
}

async function apiDelete(url: string): Promise<boolean> {
  try {
    const r = await fetch(url, { method: 'DELETE' })
    return r.ok || r.status === 204
  } catch {
    return false
  }
}

// ——— localStorage fallback (khi không có API server) ———
function loadFromStorage(): DonViTinhRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as DonViTinhRecord[]
      if (Array.isArray(parsed)) {
        return parsed.map((r) => ({ ...r, ky_hieu: r.ky_hieu ?? r.ten_dvt ?? r.ma_dvt ?? '' }))
      }
    }
  } catch {
    // ignore
  }
  return [...DU_LIEU_MAU]
}

function saveToStorage(data: DonViTinhRecord[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

let cache: DonViTinhRecord[] | null = null
let useApi: boolean | null = null

async function checkApi(): Promise<boolean> {
  if (useApi !== null) return useApi
  const data = await apiGet<DonViTinhRecord[]>(API_BASE)
  useApi = data !== null
  return useApi
}

export async function donViTinhGetAll(): Promise<DonViTinhRecord[]> {
  if (await checkApi()) {
    const data = await apiGet<DonViTinhRecord[]>(API_BASE)
    if (data) {
      cache = data
      return [...data]
    }
  }
  if (cache) return [...cache]
  cache = loadFromStorage()
  return [...cache]
}

export async function donViTinhMaTuDong(): Promise<string> {
  const list = await donViTinhGetAll()
  const soMax = list.reduce((max, r) => {
    const n = parseInt(r.ma_dvt, 10)
    return !isNaN(n) && n > max ? n : max
  }, 0)
  return String(soMax + 1).padStart(2, '0')
}

export async function donViTinhPost(payload: Omit<DonViTinhRecord, 'id'>): Promise<DonViTinhRecord> {
  if (await checkApi()) {
    const data = await apiPost<DonViTinhRecord>(API_BASE, payload)
    if (data) {
      cache = null
      return data
    }
  }
  const list = loadFromStorage()
  const id = list.length > 0 ? Math.max(...list.map((r) => r.id)) + 1 : 1
  const ma_dvt = payload.ma_dvt?.trim() || (await donViTinhMaTuDong())
  const newRow: DonViTinhRecord = { ...payload, id, ma_dvt }
  list.push(newRow)
  saveToStorage(list)
  cache = list
  return newRow
}

export async function donViTinhPut(id: number, payload: Omit<DonViTinhRecord, 'id'>): Promise<DonViTinhRecord> {
  if (await checkApi()) {
    const data = await apiPut<DonViTinhRecord>(`${API_BASE}/${id}`, payload)
    if (data) {
      cache = null
      return data
    }
  }
  const list = loadFromStorage()
  const idx = list.findIndex((r) => r.id === id)
  if (idx === -1) throw new Error('Không tìm thấy bản ghi.')
  const updated: DonViTinhRecord = { ...payload, id }
  list[idx] = updated
  saveToStorage(list)
  cache = list
  return updated
}

export async function donViTinhDelete(id: number): Promise<void> {
  if (await checkApi()) {
    const ok = await apiDelete(`${API_BASE}/${id}`)
    if (ok) {
      cache = null
      return
    }
  }
  const list = loadFromStorage().filter((r) => r.id !== id)
  saveToStorage(list)
  cache = list
}

export function donViTinhNapLai(): void {
  cache = null
}

export async function donViTinhNapDuLieuMau(): Promise<void> {
  if (await checkApi()) {
    await apiPost(`${API_BASE}/nap-mau`, {})
    cache = null
    return
  }
  saveToStorage(DU_LIEU_MAU.map((r) => ({ ...r })))
  cache = null
}

export function donViTinhTrungMa(ma_dvt: string, loaiTrungId?: number): boolean {
  const list = cache ?? loadFromStorage()
  return list.some((r) => r.ma_dvt === ma_dvt && r.id !== (loaiTrungId ?? -1))
}

export async function donViTinhDangDuongTrongVatTu(ma_dvt: string): Promise<boolean> {
  try {
    const raw = localStorage.getItem('htql550_vat_tu_hang_hoa')
    if (!raw) return false
    const list = JSON.parse(raw) as { dvt_chinh?: string }[]
    return Array.isArray(list) && list.some((r) => r.dvt_chinh === ma_dvt)
  } catch {
    return false
  }
}
