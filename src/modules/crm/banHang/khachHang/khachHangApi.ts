/**
 * API danh mục Khách hàng — phân hệ Bán hàng.
 * Dữ liệu ĐỘC LẬP hoàn toàn với NhaCungCap (khác key htqlEntityStorage, khác API endpoint).
 * Tuân thủ htql550.mdc: viết liền, zIndex 4000, Toast 3200ms.
 */

import { htqlApiUrl } from '../../../../config/htqlApiBase'
import { htqlEntityStorage } from '@/utils/htqlEntityStorage'

export type LoaiKhachHang = 'to_chuc' | 'ca_nhan'
export type LoaiTaiKhoanNganHangKh = 'cong_ty' | 'ca_nhan'

export interface TaiKhoanNganHangKhItem {
  so_tai_khoan: string
  ten_ngan_hang: string
  chi_nhanh: string
  tinh_tp_ngan_hang: string
  loai_tk?: LoaiTaiKhoanNganHangKh
  ten_nguoi_nhan?: string
}

export interface KhachHangRecord {
  id: number
  ma_kh: string
  ten_kh: string
  loai_kh: LoaiKhachHang
  /** Đồng thời là Nhà cung cấp (lưỡng tính) */
  isNhaCungCap: boolean
  dia_chi?: string
  nhom_kh?: string
  ma_so_thue?: string
  ma_dvqhns?: string
  dien_thoai?: string
  fax?: string
  email?: string
  website?: string
  dien_giai?: string
  dieu_khoan_tt?: string
  so_ngay_duoc_no?: number
  /** Hạn mức nợ khách hàng */
  han_muc_no_kh?: number
  nv_ban_hang?: string
  tk_ngan_hang?: string
  ten_ngan_hang?: string
  nguoi_lien_he?: string
  tai_khoan_ngan_hang?: TaiKhoanNganHangKhItem[]
  ngung_theo_doi: boolean
  quoc_gia?: string
  quyen_huyen?: string
  tinh_tp?: string
  xa_phuong?: string
  xung_ho?: string
  gioi_tinh?: string
  ho_va_ten_lien_he?: string
  chuc_danh?: string
  dt_di_dong?: string
  dtdd_khac?: string
  dt_co_dinh?: string
  dia_chi_lien_he?: string
  dai_dien_theo_pl?: string
  /** Địa điểm giao (khi đồng thời là NCC). */
  dia_diem_giao_hang?: string[]
  /** Địa điểm nhận hàng. Dữ liệu cũ chỉ có dia_diem_giao_hang → migrate sang đây trong normalizeRecord. */
  dia_diem_nhan_hang?: string[]
  /** Khi là NCC: địa điểm nhận luôn bằng địa điểm giao (đồng bộ lúc lưu). */
  dia_diem_nhan_trung_giao?: boolean
  so_ho_chieu?: string
  so_cccd?: string
  ngay_cap?: string
  noi_cap?: string
}

export interface NhomKhachHangItem {
  ma: string
  ten: string
}

export interface DieuKhoanThanhToanKhItem {
  ma: string
  ten: string
  so_ngay_duoc_no: number
  so_cong_no_toi_da: number
}

// ─── Hằng số Storage (khác hoàn toàn với NhaCungCap) ─────────────────────────
const STORAGE_KEY = 'htql550_khach_hang'
const STORAGE_KEY_NHOM = 'htql550_nhom_khach_hang'
const STORAGE_KEY_DKTT = 'htql550_dktt_khach_hang'
const API_BASE_KH = '/api/khach-hang'

// ─── API helpers ──────────────────────────────────────────────────────────────
async function apiGet<T>(url: string): Promise<T | null> {
  try {
    const r = await fetch(htqlApiUrl(url))
    if (!r.ok) return null
    return (await r.json()) as T
  } catch { return null }
}

async function apiPost<T>(url: string, body: unknown): Promise<T | null> {
  try {
    const r = await fetch(htqlApiUrl(url), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    if (!r.ok) return null
    return (await r.json()) as T
  } catch { return null }
}

async function apiPut<T>(url: string, body: unknown): Promise<T | null> {
  try {
    const r = await fetch(htqlApiUrl(url), { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    if (!r.ok) return null
    return (await r.json()) as T
  } catch { return null }
}

async function apiDelete(url: string): Promise<boolean> {
  try {
    const r = await fetch(htqlApiUrl(url), { method: 'DELETE' })
    return r.ok || r.status === 204
  } catch { return false }
}

let useApiKh: boolean | null = null
async function checkApiKh(): Promise<boolean> {
  if (useApiKh !== null) return useApiKh
  const data = await apiGet<KhachHangRecord[]>(API_BASE_KH)
  useApiKh = data !== null
  return useApiKh
}

// ─── Dữ liệu mẫu ─────────────────────────────────────────────────────────────
const DU_LIEU_MAU: KhachHangRecord[] = [
  {
    id: 1,
    ma_kh: 'KH00001',
    ten_kh: 'CÔNG TY TNHH THƯƠNG MẠI VÀ DỊCH VỤ MIỀN NAM',
    loai_kh: 'to_chuc',
    isNhaCungCap: false,
    dia_chi: '123 Nguyễn Huệ, Quận 1, TP Hồ Chí Minh',
    ma_so_thue: '0312345678',
    dien_thoai: '0901234567',
    ngung_theo_doi: false,
  },
]

const NHOM_MAU: NhomKhachHangItem[] = [
  { ma: 'KH-VIP', ten: 'Khách hàng VIP' },
  { ma: 'KH-LE', ten: 'Khách lẻ' },
  { ma: 'KH-SY', ten: 'Khách sỉ' },
]

const DKTT_MAU: DieuKhoanThanhToanKhItem[] = [
  { ma: 'TN', ten: 'Thanh toán ngay', so_ngay_duoc_no: 0, so_cong_no_toi_da: 0 },
  { ma: 'T30', ten: 'Trả sau 30 ngày', so_ngay_duoc_no: 30, so_cong_no_toi_da: 0 },
]

// ─── Cache (giống NhaCungCap) ─────────────────────────────────────────────────
let cache: KhachHangRecord[] | null = null

if (typeof window !== 'undefined') {
  const reProbeApiKh = () => {
    useApiKh = null
    cache = null
  }
  window.addEventListener('online', reProbeApiKh)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') reProbeApiKh()
  })
}

function normalizeRecord(r: KhachHangRecord): KhachHangRecord {
  const rawGiao = Array.isArray(r.dia_diem_giao_hang)
    ? r.dia_diem_giao_hang!.filter((s) => (s ?? '').trim() !== '')
    : []
  let dia_diem_giao_hang = Array.isArray(r.dia_diem_giao_hang) ? r.dia_diem_giao_hang : undefined
  let dia_diem_nhan_hang = Array.isArray(r.dia_diem_nhan_hang) ? r.dia_diem_nhan_hang : undefined
  let dia_diem_nhan_trung_giao = r.dia_diem_nhan_trung_giao
  const legacyChiCoGiao =
    rawGiao.length > 0 && r.dia_diem_nhan_hang === undefined && r.dia_diem_nhan_trung_giao === undefined
  if (legacyChiCoGiao) {
    const copy = [...(r.dia_diem_giao_hang as string[])]
    dia_diem_nhan_hang = copy
    if (r.isNhaCungCap) {
      dia_diem_giao_hang = [...copy]
      dia_diem_nhan_trung_giao = true
    } else {
      dia_diem_giao_hang = undefined
      dia_diem_nhan_trung_giao = false
    }
  }
  return {
    ...r,
    loai_kh: r.loai_kh ?? 'to_chuc',
    isNhaCungCap: Boolean(r.isNhaCungCap),
    ngung_theo_doi: Boolean(r.ngung_theo_doi),
    han_muc_no_kh: r.han_muc_no_kh ?? 0,
    tai_khoan_ngan_hang: Array.isArray(r.tai_khoan_ngan_hang) ? r.tai_khoan_ngan_hang : undefined,
    quyen_huyen: r.quyen_huyen ?? undefined,
    so_ho_chieu: r.so_ho_chieu ?? undefined,
    so_cccd: r.so_cccd ?? undefined,
    ngay_cap: r.ngay_cap ?? undefined,
    noi_cap: r.noi_cap ?? undefined,
    dia_diem_giao_hang,
    dia_diem_nhan_hang,
    dia_diem_nhan_trung_giao: Boolean(dia_diem_nhan_trung_giao),
  }
}

function loadFromStorage(): KhachHangRecord[] {
  try {
    const raw = htqlEntityStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as KhachHangRecord[]
      if (Array.isArray(parsed)) return parsed.map(normalizeRecord)
    }
  } catch { /* ignore */ }
  return [...DU_LIEU_MAU]
}

function saveToStorage(data: KhachHangRecord[]) {
  htqlEntityStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}


// ─── CRUD — khớp chữ ký với nhaCungCapApi.ts gốc ────────────────────────────
export async function khachHangGetAll(): Promise<KhachHangRecord[]> {
  if (await checkApiKh()) {
    const data = await apiGet<KhachHangRecord[]>(API_BASE_KH)
    if (data && Array.isArray(data)) {
      cache = data.map(normalizeRecord)
      return [...cache]
    }
  }
  if (cache) return [...cache]
  cache = loadFromStorage()
  return [...cache]
}

export async function khachHangPost(
  payload: Omit<KhachHangRecord, 'id'>,
  opts?: { skipPartnerMirror?: boolean },
): Promise<KhachHangRecord> {
  if (await checkApiKh()) {
    const res = await apiPost<KhachHangRecord>(API_BASE_KH, payload)
    if (res) {
      cache = null
      const n = normalizeRecord(res)
      if (!opts?.skipPartnerMirror) {
        void import('../../shared/khNccMirrorSync').then((m) => m.mirrorNhaCungCapFromKhachHangAfterKhSave(n)).catch(() => {})
      }
      return n
    }
  }
  const list = loadFromStorage()
  const id = list.length > 0 ? Math.max(...list.map((r) => r.id)) + 1 : 1
  const newRow = normalizeRecord({ ...payload, id })
  list.push(newRow)
  saveToStorage(list)
  cache = list
  if (!opts?.skipPartnerMirror) {
    void import('../../shared/khNccMirrorSync').then((m) => m.mirrorNhaCungCapFromKhachHangAfterKhSave(newRow)).catch(() => {})
  }
  return newRow
}

export async function khachHangPut(
  id: number,
  payload: Omit<KhachHangRecord, 'id'>,
  opts?: { skipPartnerMirror?: boolean },
): Promise<KhachHangRecord> {
  if (await checkApiKh()) {
    const res = await apiPut<KhachHangRecord>(`${API_BASE_KH}/${id}`, payload)
    if (res) {
      cache = null
      const n = normalizeRecord(res)
      if (!opts?.skipPartnerMirror) {
        void import('../../shared/khNccMirrorSync').then((m) => m.mirrorNhaCungCapFromKhachHangAfterKhSave(n)).catch(() => {})
      }
      return n
    }
  }
  const list = loadFromStorage()
  const idx = list.findIndex((r) => r.id === id)
  if (idx === -1) throw new Error('Không tìm thấy bản ghi.')
  const updated = normalizeRecord({ ...payload, id })
  list[idx] = updated
  saveToStorage(list)
  cache = list
  if (!opts?.skipPartnerMirror) {
    void import('../../shared/khNccMirrorSync').then((m) => m.mirrorNhaCungCapFromKhachHangAfterKhSave(updated)).catch(() => {})
  }
  return updated
}

export async function khachHangDelete(id: number, opts?: { skipPartnerCascade?: boolean }): Promise<void> {
  let partnerMa: string | null = null
  if (!opts?.skipPartnerCascade) {
    try {
      const snapshot = await khachHangGetAll()
      partnerMa = snapshot.find((r) => r.id === id)?.ma_kh?.trim() ?? null
    } catch {
      partnerMa = null
    }
  }
  if (await checkApiKh()) {
    const ok = await apiDelete(`${API_BASE_KH}/${id}`)
    if (ok) {
      cache = null
      if (!opts?.skipPartnerCascade && partnerMa) {
        const nccApi = await import('../../muaHang/nhaCungCap/nhaCungCapApi')
        nccApi.nhaCungCapNapLai()
        const nccs = await nccApi.nhaCungCapGetAll()
        const p = nccs.find((r) => r.ma_ncc === partnerMa)
        if (p) await nccApi.nhaCungCapDelete(p.id, { skipPartnerCascade: true })
      }
      return
    }
  }
  const list = loadFromStorage()
  const row = list.find((r) => r.id === id)
  const ma = row?.ma_kh?.trim()
  const next = list.filter((r) => r.id !== id)
  saveToStorage(next)
  cache = next
  if (!opts?.skipPartnerCascade && ma) {
    const nccApi = await import('../../muaHang/nhaCungCap/nhaCungCapApi')
    nccApi.nhaCungCapNapLai()
    const nccs = await nccApi.nhaCungCapGetAll()
    const p = nccs.find((r) => r.ma_ncc === ma)
    if (p) await nccApi.nhaCungCapDelete(p.id, { skipPartnerCascade: true })
  }
}

/** Sync function — clears cache like nhaCungCapNapLai */
export function khachHangNapLai(): void {
  cache = null
}

// ─── Mã tự động (async, khớp chữ ký với nhaCungCapMaTuDong) ──────────────────
export async function khachHangMaTuDong(): Promise<string> {
  const list = await khachHangGetAll()
  const regex = /^KH(\d{5})$/
  const nums = list
    .map((r) => { const m = r.ma_kh.match(regex); return m ? parseInt(m[1], 10) : 0 })
    .filter((n) => n > 0)
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1
  return `KH${String(next).padStart(5, '0')}`
}

// ─── Kiểm tra trùng mã (sync, dùng cache) ────────────────────────────────────
export function khachHangTrungMa(ma: string, loaiTrungId?: number): boolean {
  const list = cache ?? loadFromStorage()
  return list.some((r) => r.ma_kh === ma && r.id !== (loaiTrungId ?? -1))
}

// ─── Trường kiểm tra trùng — khớp 100% với NhaCungCapTrungField ──────────────
export type KhachHangTrungField = 'ma_so_thue' | 'so_cccd' | 'dt_di_dong' | 'dt_co_dinh' | 'email'

export interface KhachHangTrungResult {
  valid: boolean
  field?: KhachHangTrungField
  message?: string
}

const TRUNG_LABELS: Record<KhachHangTrungField, string> = {
  ma_so_thue: 'Mã số thuế',
  so_cccd: 'Số CCCD',
  dt_di_dong: 'ĐTDD',
  dt_co_dinh: 'ĐT khác',
  email: 'Email',
}

export async function khachHangValidateTrung(
  payload: { ma_so_thue?: string; so_cccd?: string; dt_di_dong?: string; dt_co_dinh?: string; dtdd_khac?: string; email?: string },
  excludeId?: number
): Promise<KhachHangTrungResult> {
  const list = await khachHangGetAll()
  const others = excludeId != null ? list.filter((r) => r.id !== excludeId) : list

  const checks: { key: KhachHangTrungField; val: string }[] = [
    { key: 'ma_so_thue', val: (payload.ma_so_thue ?? '').trim() },
    { key: 'so_cccd', val: (payload.so_cccd ?? '').trim() },
    { key: 'dt_di_dong', val: (payload.dt_di_dong ?? '').trim() },
    { key: 'dt_co_dinh', val: (payload.dt_co_dinh ?? payload.dtdd_khac ?? '').trim() },
    { key: 'email', val: (payload.email ?? '').trim().toLowerCase() },
  ]

  for (const { key, val } of checks) {
    if (!val) continue
    const trung = others.some((r) => {
      const raw = key === 'dt_co_dinh' ? ((r.dt_co_dinh ?? r.dtdd_khac) ?? '') : (r[key] ?? '')
      const rVal = key === 'email' ? raw.trim().toLowerCase() : raw.trim()
      return rVal === val
    })
    if (trung) {
      return {
        valid: false,
        field: key,
        message: `${TRUNG_LABELS[key]} đã tồn tại. Vui lòng điều chỉnh.`,
      }
    }
  }
  return { valid: true }
}

// ─── Nhóm Khách hàng ──────────────────────────────────────────────────────────
export function loadNhomKhachHang(): NhomKhachHangItem[] {
  try {
    const raw = htqlEntityStorage.getItem(STORAGE_KEY_NHOM)
    if (raw) {
      const parsed = JSON.parse(raw) as unknown
      if (Array.isArray(parsed)) {
        return (parsed as unknown[])
          .map((x) => {
            if (typeof x === 'string') return { ma: x, ten: x }
            if (x && typeof x === 'object' && 'ma' in x && 'ten' in x)
              return { ma: String((x as NhomKhachHangItem).ma), ten: String((x as NhomKhachHangItem).ten) }
            return { ma: '', ten: String(x) }
          })
          .filter((o) => o.ma || o.ten)
      }
    }
  } catch { /* ignore */ }
  return [...NHOM_MAU]
}

export function saveNhomKhachHang(nhom: NhomKhachHangItem[]): void {
  htqlEntityStorage.setItem(STORAGE_KEY_NHOM, JSON.stringify(nhom))
}

// ─── Điều khoản thanh toán ────────────────────────────────────────────────────
export function loadDieuKhoanThanhToanKh(): DieuKhoanThanhToanKhItem[] {
  try {
    const raw = htqlEntityStorage.getItem(STORAGE_KEY_DKTT)
    if (raw) {
      const parsed = JSON.parse(raw) as unknown
      if (Array.isArray(parsed)) {
        return (parsed as unknown[]).map((x) => {
          if (!x || typeof x !== 'object') return DKTT_MAU[0]
          const o = x as Record<string, unknown>
          return {
            ma: String(o['ma'] ?? ''),
            ten: String(o['ten'] ?? ''),
            so_ngay_duoc_no: Number(o['so_ngay_duoc_no']) || 0,
            so_cong_no_toi_da: Number(o['so_cong_no_toi_da']) || 0,
          }
        }).filter((o) => o.ma || o.ten)
      }
    }
  } catch { /* ignore */ }
  return [...DKTT_MAU]
}

export function saveDieuKhoanThanhToanKh(list: DieuKhoanThanhToanKhItem[]): void {
  htqlEntityStorage.setItem(STORAGE_KEY_DKTT, JSON.stringify(list))
}
