/**
 * API danh mục Nhà cung cấp (phân hệ Mua hàng).
 * Khi chạy npm run dev: dùng API server (file JSON) — đồng bộ qua web, mở lại chương trình vẫn còn.
 * Khi build/preview hoặc không có server: fallback localStorage.
 */

export type LoaiNhaCungCap = 'to_chuc' | 'ca_nhan'

/** Một dòng trong bảng Tài khoản ngân hàng */
export type LoaiTaiKhoanNganHang = 'cong_ty' | 'ca_nhan'

export interface TaiKhoanNganHangItem {
  so_tai_khoan: string
  ten_ngan_hang: string
  chi_nhanh: string
  tinh_tp_ngan_hang: string
  /** Loại TK: Công ty hoặc Cá nhân (dùng trong mục Tổ chức) */
  loai_tk?: LoaiTaiKhoanNganHang
  /** Tên người nhận (dùng trong mục Tổ chức) */
  ten_nguoi_nhan?: string
}

export interface NhaCungCapRecord {
  id: number
  ma_ncc: string
  ten_ncc: string
  loai_ncc: LoaiNhaCungCap
  khach_hang: boolean
  dia_chi?: string
  nhom_kh_ncc?: string
  ma_so_thue?: string
  ma_dvqhns?: string
  dien_thoai?: string
  fax?: string
  email?: string
  website?: string
  dien_giai?: string
  dieu_khoan_tt?: string
  so_ngay_duoc_no?: number
  so_no_toi_da?: number
  nv_mua_hang?: string
  tk_ngan_hang?: string
  ten_ngan_hang?: string
  nguoi_lien_he?: string
  tai_khoan_ngan_hang?: TaiKhoanNganHangItem[]
  ngung_theo_doi: boolean
  /** Tab Khác: vị trí địa lý */
  quoc_gia?: string
  quyen_huyen?: string
  tinh_tp?: string
  xa_phuong?: string
  /** Tab Khác: thông tin liên hệ */
  xung_ho?: string
  /** Cá nhân: Giới tính (Chọn, Nam, Nữ, Khác) */
  gioi_tinh?: string
  ho_va_ten_lien_he?: string
  chuc_danh?: string
  dt_di_dong?: string
  dtdd_khac?: string
  dt_co_dinh?: string
  dia_chi_lien_he?: string
  dai_dien_theo_pl?: string
  /** Cá nhân: Số hộ chiếu, Số CCCD, Ngày cấp, Nơi cấp */
  so_ho_chieu?: string
  so_cccd?: string
  ngay_cap?: string
  noi_cap?: string
  /** Tab Khác: địa điểm giao hàng */
  dia_diem_giao_hang?: string[]
}

const STORAGE_KEY = 'htql550_nha_cung_cap'
const STORAGE_KEY_NHOM = 'htql550_nhom_kh_ncc'
const STORAGE_KEY_DKTT = 'htql550_dieu_khoan_thanh_toan'

const DU_LIEU_MAU: NhaCungCapRecord[] = [
  {
    id: 1,
    ma_ncc: 'NCC00001',
    ten_ncc: 'CÔNG TY TNHH QUẢNG CÁO VÀ XÂY DỰNG NAM BẮC',
    loai_ncc: 'to_chuc',
    khach_hang: false,
    dia_chi: '668/10 Khu vực Bình Trung, Phường Long Tuyên, TP Cần Thơ, Việt Nam',
    ma_so_thue: '1801659861',
    dien_thoai: '0939067007',
    ngung_theo_doi: false,
  },
]

export interface NhomKhNccItem {
  ma: string
  ten: string
}

const NHOM_MAU: NhomKhNccItem[] = [
  { ma: 'N1', ten: 'Nhóm 1' },
  { ma: 'NCC-DT', ten: 'Nhóm NCC đối tác' },
  { ma: 'VIP', ten: 'Nhóm VIP' },
]

/** DKTT (dùng cho dropdown + form Thêm điều khoản) */
export interface DieuKhoanThanhToanItem {
  ma: string
  ten: string
  so_ngay_duoc_no: number
  so_cong_no_toi_da: number
}

const DKTT_MAU: DieuKhoanThanhToanItem[] = [
  { ma: 'T', ten: 'Thanh toán ngay', so_ngay_duoc_no: 0, so_cong_no_toi_da: 0 },
  { ma: 'T', ten: 'Trả sau 30 ngày', so_ngay_duoc_no: 30, so_cong_no_toi_da: 0 },
]

const API_BASE_NCC = '/api/nha-cung-cap'

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

let useApiNcc: boolean | null = null
async function checkApiNcc(): Promise<boolean> {
  if (useApiNcc !== null) return useApiNcc
  const data = await apiGet<NhaCungCapRecord[]>(API_BASE_NCC)
  useApiNcc = data !== null
  return useApiNcc
}

function loadFromStorage(): NhaCungCapRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as NhaCungCapRecord[]
      if (Array.isArray(parsed)) return parsed.map(normalizeRecord)
    }
  } catch {
    // ignore
  }
  return [...DU_LIEU_MAU]
}

function normalizeRecord(r: NhaCungCapRecord): NhaCungCapRecord {
  return {
    ...r,
    loai_ncc: r.loai_ncc ?? 'to_chuc',
    khach_hang: Boolean(r.khach_hang),
    ngung_theo_doi: Boolean(r.ngung_theo_doi),
    so_ngay_duoc_no: r.so_ngay_duoc_no ?? undefined,
    so_no_toi_da: r.so_no_toi_da ?? 0,
    tai_khoan_ngan_hang: Array.isArray(r.tai_khoan_ngan_hang) ? r.tai_khoan_ngan_hang : undefined,
    quyen_huyen: r.quyen_huyen ?? undefined,
    so_ho_chieu: r.so_ho_chieu ?? undefined,
    so_cccd: r.so_cccd ?? undefined,
    ngay_cap: r.ngay_cap ?? undefined,
    noi_cap: r.noi_cap ?? undefined,
  }
}

function saveToStorage(data: NhaCungCapRecord[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export function loadNhomKhNcc(): NhomKhNccItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_NHOM)
    if (raw) {
      const parsed = JSON.parse(raw) as unknown
      if (Array.isArray(parsed)) {
        return parsed.map((x) => {
          if (typeof x === 'string') return { ma: x, ten: x }
          if (x && typeof x === 'object' && 'ma' in x && 'ten' in x) return { ma: String((x as NhomKhNccItem).ma), ten: String((x as NhomKhNccItem).ten) }
          return { ma: '', ten: String(x) }
        }).filter((o) => o.ma || o.ten)
      }
    }
  } catch {
    // ignore
  }
  return [...NHOM_MAU]
}

export function saveNhomKhNcc(nhom: NhomKhNccItem[]) {
  localStorage.setItem(STORAGE_KEY_NHOM, JSON.stringify(nhom))
}

export function loadDieuKhoanThanhToan(): DieuKhoanThanhToanItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DKTT)
    if (raw) {
      const parsed = JSON.parse(raw) as unknown
      if (Array.isArray(parsed)) {
        return parsed.map((x) => {
          if (!x || typeof x !== 'object') return DKTT_MAU[0]
          const o = x as Record<string, unknown>
          return {
            ma: String(o.ma ?? ''),
            ten: String(o.ten ?? ''),
            so_ngay_duoc_no: Number(o.so_ngay_duoc_no) || 0,
            so_cong_no_toi_da: Number(o.so_cong_no_toi_da) || 0,
          }
        }).filter((o) => o.ma || o.ten)
      }
    }
  } catch {
    // ignore
  }
  return [...DKTT_MAU]
}

export function saveDieuKhoanThanhToan(list: DieuKhoanThanhToanItem[]) {
  localStorage.setItem(STORAGE_KEY_DKTT, JSON.stringify(list))
}

let cache: NhaCungCapRecord[] | null = null

export async function nhaCungCapGetAll(): Promise<NhaCungCapRecord[]> {
  if (await checkApiNcc()) {
    const data = await apiGet<NhaCungCapRecord[]>(API_BASE_NCC)
    if (data && Array.isArray(data)) {
      cache = data.map(normalizeRecord)
      return [...cache]
    }
  }
  if (cache) return [...cache]
  cache = loadFromStorage()
  return [...cache]
}

export async function nhaCungCapPost(payload: Omit<NhaCungCapRecord, 'id'>): Promise<NhaCungCapRecord> {
  if (await checkApiNcc()) {
    const res = await apiPost<NhaCungCapRecord>(API_BASE_NCC, payload)
    if (res) {
      cache = null
      return normalizeRecord(res)
    }
  }
  const list = loadFromStorage()
  const id = list.length > 0 ? Math.max(...list.map((r) => r.id)) + 1 : 1
  const newRow: NhaCungCapRecord = normalizeRecord({ ...payload, id })
  list.push(newRow)
  saveToStorage(list)
  cache = list
  return newRow
}

export async function nhaCungCapPut(id: number, payload: Omit<NhaCungCapRecord, 'id'>): Promise<NhaCungCapRecord> {
  if (await checkApiNcc()) {
    const res = await apiPut<NhaCungCapRecord>(`${API_BASE_NCC}/${id}`, payload)
    if (res) {
      cache = null
      return normalizeRecord(res)
    }
  }
  const list = loadFromStorage()
  const idx = list.findIndex((r) => r.id === id)
  if (idx === -1) throw new Error('Không tìm thấy bản ghi.')
  const updated: NhaCungCapRecord = normalizeRecord({ ...payload, id })
  list[idx] = updated
  saveToStorage(list)
  cache = list
  return updated
}

export async function nhaCungCapDelete(id: number): Promise<void> {
  if (await checkApiNcc()) {
    const ok = await apiDelete(`${API_BASE_NCC}/${id}`)
    if (ok) {
      cache = null
      return
    }
  }
  const list = loadFromStorage().filter((r) => r.id !== id)
  saveToStorage(list)
  cache = list
}

export function nhaCungCapNapLai(): void {
  cache = null
}

export function nhaCungCapTrungMa(ma: string, loaiTrungId?: number): boolean {
  const list = cache ?? loadFromStorage()
  return list.some((r) => r.ma_ncc === ma && r.id !== (loaiTrungId ?? -1))
}

/** Trường cần kiểm tra trùng khi lưu */
export type NhaCungCapTrungField = 'ma_so_thue' | 'so_cccd' | 'dt_di_dong' | 'dt_co_dinh' | 'email'

export interface NhaCungCapTrungResult {
  valid: boolean
  field?: NhaCungCapTrungField
  message?: string
}

const TRUNG_LABELS: Record<NhaCungCapTrungField, string> = {
  ma_so_thue: 'Mã số thuế',
  so_cccd: 'Số CCCD',
  dt_di_dong: 'ĐTDD',
  dt_co_dinh: 'ĐT khác',
  email: 'Email',
}

/** Kiểm tra các trường không được trùng với dữ liệu đã có (khi bấm Lưu / Lưu và tiếp tục). excludeId = id bản ghi đang sửa (bỏ qua khi so sánh). */
export async function nhaCungCapValidateTrung(
  payload: { ma_so_thue?: string; so_cccd?: string; dt_di_dong?: string; dt_co_dinh?: string; dtdd_khac?: string; email?: string },
  excludeId?: number
): Promise<NhaCungCapTrungResult> {
  const list = await nhaCungCapGetAll()
  const others = excludeId != null ? list.filter((r) => r.id !== excludeId) : list

  const checks: { key: NhaCungCapTrungField; val: string }[] = [
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

export async function nhaCungCapMaTuDong(): Promise<string> {
  const list = await nhaCungCapGetAll()
  const regex = /^NCC(\d{5})$/
  const nums = list
    .map((r) => {
      const m = r.ma_ncc.match(regex)
      return m ? parseInt(m[1], 10) : 0
    })
    .filter((n) => n > 0)
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1
  return `NCC${String(next).padStart(5, '0')}`
}
