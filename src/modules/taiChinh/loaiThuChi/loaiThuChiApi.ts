import type { LoaiThuChiRecord } from '../../../types/loaiThuChi'
import { htqlEntityStorage } from '@/utils/htqlEntityStorage'
import { LY_DO_CHUYEN_FORM_OPTIONS } from '../../../constants/ngamDinhTaiKhoan'
import { htqlApiUrl } from '../../../config/htqlApiBase'

/** Khóa KV trên máy chủ (MySQL htql_kv_store) — không còn htqlEntityStorage entity. */
export const LOAI_THU_CHI_KV_KEY = 'htql550_loai_thu_chi'

/** React Query — dùng chung cho màn Loại thu/chi và form Thu/Chi/Chuyển tiền. */
export const loaiThuChiQueryKey = ['htql-kv-entity', LOAI_THU_CHI_KV_KEY] as const

export type LoaiThuChiQueryData = { rows: LoaiThuChiRecord[]; version: number }

const LEGACY_STORAGE_KEY = 'htql550_loai_thu_chi'

/**
 * Mẫu lý do thu — đồng bộ với dropdown «Lý do thu» trong `thuTienForm.tsx`.
 * Danh mục Loại thu/chi seed các dòng này (mã cố định) để hiển thị cùng nguồn.
 */
export const LY_DO_THU_FORM_MAU = ['Thu tiền khách hàng', 'Thu khác', 'Thu tiền nội bộ'] as const

/**
 * Mẫu lý do chi — đồng bộ với dropdown «Lý do chi» trong `chiTienForm.tsx`.
 */
export const LY_DO_CHI_FORM_MAU = ['Chi trả khách hàng', 'Chi khác', 'Chi tiền nội bộ'] as const

/** Mã cố định khi seed (trùng `ma` → không tạo bản ghi trùng). */
const SEED_MA_THU: Record<(typeof LY_DO_THU_FORM_MAU)[number], string> = {
  'Thu tiền khách hàng': 'THU_KH',
  'Thu khác': 'THU_KHAC',
  'Thu tiền nội bộ': 'THU_NB',
}
const SEED_MA_CHI: Record<(typeof LY_DO_CHI_FORM_MAU)[number], string> = {
  'Chi trả khách hàng': 'CHI_KH',
  'Chi khác': 'CHI_KHAC',
  'Chi tiền nội bộ': 'CHI_NB',
}
const SEED_MA_CHUYEN: Record<(typeof LY_DO_CHUYEN_FORM_OPTIONS)[number], string> = {
  'Rút tiền mặt': 'CT_RUT',
  'Nộp tiền mặt vào ngân hàng': 'CT_NOP',
}

function buildSeedRows(): Omit<LoaiThuChiRecord, 'id'>[] {
  const thu: Omit<LoaiThuChiRecord, 'id'>[] = [...LY_DO_THU_FORM_MAU].map((ten) => ({
    ma: SEED_MA_THU[ten],
    ten,
    ghi_chu: undefined,
    ap_dung_thu: true,
    ap_dung_chi: false,
    ap_dung_chuyen_tien: false,
  }))
  const chi: Omit<LoaiThuChiRecord, 'id'>[] = [...LY_DO_CHI_FORM_MAU].map((ten) => ({
    ma: SEED_MA_CHI[ten],
    ten,
    ghi_chu: undefined,
    ap_dung_thu: false,
    ap_dung_chi: true,
    ap_dung_chuyen_tien: false,
  }))
  const chuyen: Omit<LoaiThuChiRecord, 'id'>[] = [...LY_DO_CHUYEN_FORM_OPTIONS].map((ten) => ({
    ma: SEED_MA_CHUYEN[ten],
    ten,
    ghi_chu: undefined,
    ap_dung_thu: false,
    ap_dung_chi: false,
    ap_dung_chuyen_tien: true,
  }))
  return [...thu, ...chi, ...chuyen]
}

function cungLoaiThuChi(a: LoaiThuChiRecord, b: Omit<LoaiThuChiRecord, 'id'>): boolean {
  return (
    a.ap_dung_thu === b.ap_dung_thu &&
    a.ap_dung_chi === b.ap_dung_chi &&
    a.ap_dung_chuyen_tien === b.ap_dung_chuyen_tien
  )
}

function applySeeds(list: LoaiThuChiRecord[]): { list: LoaiThuChiRecord[]; changed: boolean } {
  const seeds = buildSeedRows()
  let changed = false
  const out = [...list]
  for (const s of seeds) {
    const maU = s.ma.trim().toUpperCase()
    const exists = out.some(
      (r) =>
        r.ma.trim().toUpperCase() === maU ||
        (r.ten.trim() === s.ten.trim() && cungLoaiThuChi(r, s)),
    )
    if (!exists) {
      out.push(normalizeRow({ ...s, id: `ltc_seed_${maU}` }))
      changed = true
    }
  }
  return { list: out, changed }
}

const LEGACY_THU_MAP: Record<string, string> = {
  thu_khach_hang: 'Thu tiền khách hàng',
  thu_khac: 'Thu khác',
  thu_noi_bo: 'Thu tiền nội bộ',
}
const LEGACY_CHI_MAP: Record<string, string> = {
  chi_nha_cung_cap: 'Chi trả khách hàng',
  chi_khac: 'Chi khác',
  chi_noi_bo: 'Chi tiền nội bộ',
}

export function normalizeRow(r: Partial<LoaiThuChiRecord> & Record<string, unknown>): LoaiThuChiRecord {
  const ten = String(r.ten ?? '').trim()
  let ma = String(r.ma ?? '').trim().toUpperCase()
  if (!ma && ten) {
    ma = ten
      .split(/\s+/)
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 24)
  }
  if (!ma) ma = `LTC${String(r.id ?? Date.now()).replace(/\W/g, '').slice(-8)}`
  return {
    id: String(r.id ?? ''),
    ma,
    ten,
    ghi_chu: String(r.ghi_chu ?? '').trim() || undefined,
    ap_dung_thu: Boolean(r.ap_dung_thu),
    ap_dung_chi: Boolean(r.ap_dung_chi),
    ap_dung_chuyen_tien: Boolean(r.ap_dung_chuyen_tien),
  }
}

function parseListFromJson(raw: string | null | undefined): LoaiThuChiRecord[] {
  if (!raw) return []
  try {
    const p = JSON.parse(raw) as unknown
    if (!Array.isArray(p)) return []
    return p.map((x) => normalizeRow(x as Partial<LoaiThuChiRecord> & Record<string, unknown>))
  } catch {
    return []
  }
}

function loadLegacyLocalStorageOnce(): LoaiThuChiRecord[] {
  try {
    if (typeof htqlEntityStorage === 'undefined') return []
    const raw = htqlEntityStorage.getItem(LEGACY_STORAGE_KEY)
    return parseListFromJson(raw)
  } catch {
    return []
  }
}

function clearLegacyLocalStorage(): void {
  try {
    if (typeof htqlEntityStorage !== 'undefined') htqlEntityStorage.removeItem(LEGACY_STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

async function kvGetEntry(): Promise<{ value: string; version: number } | null> {
  try {
    const r = await fetch(htqlApiUrl(`/api/htql-kv?prefix=${encodeURIComponent(LOAI_THU_CHI_KV_KEY)}`), {
      credentials: 'include',
    })
    if (!r.ok) return null
    const j = (await r.json()) as { entries?: { key: string; value: string; version: number }[] }
    const hit = (j.entries || []).find((e) => e.key === LOAI_THU_CHI_KV_KEY)
    if (!hit || typeof hit.value !== 'string') return null
    return { value: hit.value, version: Number(hit.version) || 0 }
  } catch {
    return null
  }
}

export async function loaiThuChiPutList(list: LoaiThuChiRecord[], expectedVersion: number | null): Promise<void> {
  const value = JSON.stringify(list)
  const entry: { key: string; value: string; expectedVersion?: number } = {
    key: LOAI_THU_CHI_KV_KEY,
    value,
  }
  if (expectedVersion != null) entry.expectedVersion = expectedVersion
  const r = await fetch(htqlApiUrl('/api/htql-kv'), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ entries: [entry] }),
  })
  if (r.status === 409) {
    throw new Error('CONFLICT')
  }
  if (!r.ok) {
    let msg = `HTTP ${r.status}`
    try {
      const j = (await r.json()) as { error?: string }
      if (j?.error) msg = j.error
    } catch {
      /* ignore */
    }
    throw new Error(msg)
  }
}

/**
 * Fetch-on-demand: đọc từ MySQL (htql_kv_store) qua /api/htql-kv; seed mẫu; one-shot migrate từ htqlEntityStorage cũ.
 */
export async function loaiThuChiQueryFn(): Promise<LoaiThuChiQueryData> {
  const fromKv = await kvGetEntry()
  let list: LoaiThuChiRecord[] = fromKv ? parseListFromJson(fromKv.value) : []
  let version = fromKv?.version ?? 0

  if (list.length === 0) {
    const legacy = loadLegacyLocalStorageOnce()
    if (legacy.length) {
      list = legacy
      try {
        await loaiThuChiPutList(list, null)
        clearLegacyLocalStorage()
      } catch {
        /* Máy chủ không ghi được — giữ bản legacy trong htqlEntityStorage cho lần sau */
      }
      const again = await kvGetEntry()
      if (again) {
        list = parseListFromJson(again.value)
        version = again.version
      }
    }
  }

  const seeded = applySeeds(list)
  if (seeded.changed) {
    try {
      await loaiThuChiPutList(seeded.list, version)
      const again = await kvGetEntry()
      if (again) {
        return { rows: parseListFromJson(again.value), version: again.version }
      }
    } catch {
      /* offline: trả list đã seed trong RAM, version cũ */
    }
    return { rows: seeded.list, version }
  }

  return { rows: list, version }
}

/** Chuẩn hóa giá trị lý do phiếu thu từ DB (legacy enum → nhãn). */
export function loaiThuChiChuanHoaLyDoPhieuThu(raw: string | null | undefined): string {
  const s = (raw ?? '').trim()
  if (!s) return 'Thu tiền khách hàng'
  return LEGACY_THU_MAP[s] ?? s
}

/** Chuẩn hóa giá trị lý do phiếu chi từ DB (legacy enum → nhãn). */
export function loaiThuChiChuanHoaLyDoPhieuChi(raw: string | null | undefined): string {
  const s = (raw ?? '').trim()
  if (!s) return 'Chi trả khách hàng'
  return LEGACY_CHI_MAP[s] ?? s
}

export function laLyDoPhieuThuKhachHang(label: string): boolean {
  const s = label.trim()
  return s === 'Thu tiền khách hàng' || s === 'thu_khach_hang'
}

export function laLyDoPhieuChiTraKhachHang(label: string): boolean {
  const s = label.trim()
  return s === 'Chi trả khách hàng' || s === 'chi_nha_cung_cap'
}

export function loaiThuChiLyDoPhieuThuOptions(rows: LoaiThuChiRecord[]): string[] {
  return [...new Set([...LY_DO_THU_FORM_MAU, ...loaiThuChiTenTheoKind('thu', rows)])]
}

export function loaiThuChiLyDoPhieuChiOptions(rows: LoaiThuChiRecord[]): string[] {
  return [...new Set([...LY_DO_CHI_FORM_MAU, ...loaiThuChiTenTheoKind('chi', rows)])]
}

export function loaiThuChiChuyenTienLyDoOptions(rows: LoaiThuChiRecord[]): string[] {
  return [...new Set([...LY_DO_CHUYEN_FORM_OPTIONS, ...loaiThuChiTenTheoKind('chuyen', rows)])]
}

export async function loaiThuChiPost(
  rec: Omit<LoaiThuChiRecord, 'id'>,
  current: LoaiThuChiQueryData,
): Promise<void> {
  const row: LoaiThuChiRecord = normalizeRow({ ...rec, id: `ltc${Date.now()}` })
  const next = [...current.rows, row]
  await loaiThuChiPutList(next, current.version)
}

export async function loaiThuChiPut(
  id: string,
  rec: Omit<LoaiThuChiRecord, 'id'>,
  current: LoaiThuChiQueryData,
): Promise<void> {
  const i = current.rows.findIndex((r) => r.id === id)
  if (i < 0) return
  const next = [...current.rows]
  next[i] = normalizeRow({ ...rec, id })
  await loaiThuChiPutList(next, current.version)
}

export async function loaiThuChiDelete(id: string, current: LoaiThuChiQueryData): Promise<void> {
  const next = current.rows.filter((r) => r.id !== id)
  await loaiThuChiPutList(next, current.version)
}

export function loaiThuChiTenTheoKind(
  kind: 'thu' | 'chi' | 'chuyen',
  rows: LoaiThuChiRecord[],
): string[] {
  return rows
    .filter((r) => {
      if (kind === 'thu') return r.ap_dung_thu
      if (kind === 'chi') return r.ap_dung_chi
      return r.ap_dung_chuyen_tien
    })
    .map((r) => r.ten)
    .filter((t) => t.length > 0)
}

export function loaiThuChiMaTrung(ma: string, rows: LoaiThuChiRecord[], excludeId?: string | null): boolean {
  const m = ma.trim().toUpperCase()
  if (!m) return false
  return rows.some((r) => r.ma.trim().toUpperCase() === m && r.id !== excludeId)
}
