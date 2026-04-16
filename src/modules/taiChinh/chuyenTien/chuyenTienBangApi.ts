/**
 * Phiếu chuyển tiền (nội bộ) — htqlEntityStorage, tách biệt thu/chi tiền.
 */
import { maFormatHeThong, getCurrentYear } from '../../../utils/maFormat'
import { allocateMaHeThongFromServer, hintMaxSerialForYearPrefix } from '../../../utils/htqlSequenceApi'
import { htqlEntityStorage } from '@/utils/htqlEntityStorage'
import type {
  ChuyenTienBangCreatePayload,
  ChuyenTienBangFilter,
  ChuyenTienBangKyValue,
  ChuyenTienBangRecord,
} from '../../../types/chuyenTienBang'
import { KY_OPTIONS, getDateRangeForKy } from '../chiTien/chiTienBangApi'

export type { ChuyenTienBangCreatePayload, ChuyenTienBangFilter, ChuyenTienBangKyValue, ChuyenTienBangRecord } from '../../../types/chuyenTienBang'

const STORAGE_KEY = 'htql550_chuyen_tien_bang_list'
export const HTQL_CHUYEN_TIEN_BANG_RELOAD_EVENT = 'htql:chuyen-tien-bang-reload'

const MODULE_PREFIX = 'CT'

let _list: ChuyenTienBangRecord[] = []

function normalizeRow(d: Partial<ChuyenTienBangRecord> & { id: string }): ChuyenTienBangRecord {
  return {
    id: d.id,
    tinh_trang: d.tinh_trang ?? 'Chưa thực hiện',
    so_chuyen_tien_bang: d.so_chuyen_tien_bang ?? '',
    ngay_chuyen: d.ngay_chuyen ?? '',
    ly_do_chuyen: d.ly_do_chuyen ?? '',
    tk_nguon_id: d.tk_nguon_id ?? '',
    tk_den_id: d.tk_den_id ?? '',
    so_tien: typeof d.so_tien === 'number' && Number.isFinite(d.so_tien) ? d.so_tien : 0,
    attachments: Array.isArray(d.attachments) ? d.attachments : undefined,
    phieu_thu_tu_chuyen_id: d.phieu_thu_tu_chuyen_id,
    phieu_chi_tu_chuyen_id: d.phieu_chi_tu_chuyen_id,
  }
}

function loadFromStorage(): ChuyenTienBangRecord[] {
  try {
    const raw = typeof htqlEntityStorage !== 'undefined' ? htqlEntityStorage.getItem(STORAGE_KEY) : null
    if (!raw) return []
    const p = JSON.parse(raw) as unknown
    if (!Array.isArray(p)) return []
    return p.map((x) => normalizeRow(x as Partial<ChuyenTienBangRecord> & { id: string }))
  } catch {
    return []
  }
}

function saveToStorage(): void {
  try {
    if (typeof htqlEntityStorage !== 'undefined') htqlEntityStorage.setItem(STORAGE_KEY, JSON.stringify(_list))
  } catch {
    /* ignore */
  }
}

function dispatchReload(): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(HTQL_CHUYEN_TIEN_BANG_RELOAD_EVENT))
}

_list = loadFromStorage()

export function chuyenTienBangReloadFromStorage(): void {
  _list = loadFromStorage()
}

export function chuyenTienBangGetAll(): ChuyenTienBangRecord[] {
  return [..._list]
}

export function chuyenTienBangSoTiepTheo(): string {
  const year = getCurrentYear()
  let maxSo = 0
  for (const d of _list) {
    const s = (d.so_chuyen_tien_bang || '').trim()
    const match = s.match(new RegExp(`^${year}/${MODULE_PREFIX}/(\\d+)$`))
    if (!match) continue
    const n = parseInt(match[1], 10)
    if (n > maxSo) maxSo = n
  }
  return maFormatHeThong(MODULE_PREFIX, maxSo + 1)
}

export async function chuyenTienBangPost(payload: ChuyenTienBangCreatePayload): Promise<ChuyenTienBangRecord> {
  const year = getCurrentYear()
  const hint = hintMaxSerialForYearPrefix(year, MODULE_PREFIX, _list.map((d) => d.so_chuyen_tien_bang))
  const soCtb = await allocateMaHeThongFromServer({
    seqKey: 'CT',
    modulePrefix: MODULE_PREFIX,
    hintMaxSerial: hint,
    year,
  })
  const id = `ctm${Date.now()}`
  const row: ChuyenTienBangRecord = normalizeRow({
    id,
    tinh_trang: payload.tinh_trang,
    so_chuyen_tien_bang: soCtb,
    ngay_chuyen: payload.ngay_chuyen,
    ly_do_chuyen: payload.ly_do_chuyen,
    tk_nguon_id: payload.tk_nguon_id,
    tk_den_id: payload.tk_den_id,
    so_tien: payload.so_tien,
    attachments: payload.attachments ? [...payload.attachments] : undefined,
    phieu_thu_tu_chuyen_id: payload.phieu_thu_tu_chuyen_id,
    phieu_chi_tu_chuyen_id: payload.phieu_chi_tu_chuyen_id,
  })
  _list.push(row)
  saveToStorage()
  dispatchReload()
  return row
}

export function chuyenTienBangPut(id: string, payload: ChuyenTienBangCreatePayload): void {
  const idx = _list.findIndex((r) => r.id === id)
  if (idx < 0) return
  const cur = _list[idx]
  _list[idx] = normalizeRow({
    ...cur,
    ...payload,
    id,
    attachments: payload.attachments ? [...payload.attachments] : cur.attachments,
  })
  saveToStorage()
  dispatchReload()
}

export function chuyenTienBangPatch(id: string, patch: Partial<ChuyenTienBangRecord>): void {
  const idx = _list.findIndex((r) => r.id === id)
  if (idx < 0) return
  _list[idx] = normalizeRow({ ..._list[idx], ...patch, id })
  saveToStorage()
  dispatchReload()
}

export function chuyenTienBangDelete(id: string): void {
  _list = _list.filter((r) => r.id !== id)
  saveToStorage()
  dispatchReload()
}

export function getDefaultChuyenTienBangFilter(): ChuyenTienBangFilter {
  const ky = 'thang-nay' as ChuyenTienBangKyValue
  const { tu, den } = getDateRangeForKy(ky)
  return { ky, tu, den }
}

export { KY_OPTIONS, getDateRangeForKy }
