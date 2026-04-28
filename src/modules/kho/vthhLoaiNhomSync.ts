/**
 * Đồng bộ danh mục Loại / Nhóm VTHH / Thuế GTGT giữa form VTHH, VthhCategoryManager và htqlEntityStorage.
 * htqlEntityStorage được bọc sync /api/htql-kv => lưu MySQL htql_kv_store, đồng bộ đa client.
 */

import type { NhomVTHHItem } from './nhomVTHHLookupModal'
import type { VatTuHangHoaRecord } from '../../types/vatTuHangHoa'
import { htqlEntityStorage } from '../../utils/htqlEntityStorage'
import { thueGtgtStdToken, THUE_GTGT_STD_SET } from '../../utils/thueGtgtTokens'

export const STORAGE_KEY_VTHH_LOAI_CUSTOM = 'htql550_vthh_loai_custom'
export const STORAGE_KEY_VTHH_NHOM_CUSTOM = 'htql550_vthh_nhom_custom'
export const STORAGE_KEY_VTHH_THUE_VAT_CUSTOM = 'htql550_vthh_thue_vat_custom'
export const STORAGE_KEY_VTHH_NHOM_DISABLED = 'htql550_vthh_nhom_disabled'
export const STORAGE_KEY_VTHH_THUE_VAT_DISABLED = 'htql550_vthh_thue_vat_disabled'
export const STORAGE_KEY_VTHH_KHO_GIAY_CUSTOM = 'htql550_vthh_kho_giay_custom'
export const STORAGE_KEY_VTHH_DINH_LUONG_CUSTOM = 'htql550_vthh_dinh_luong_custom'
export const STORAGE_KEY_VTHH_HE_MAU_CUSTOM = 'htql550_vthh_he_mau_custom'

export const HTQL_VTHH_LOAI_NHOM_CHANGED = 'htql-vthh-loai-nhom-changed'

export const TINH_CHAT_BASE_OPTIONS: { value: string; label: string }[] = [
  { value: 'Vật tư', label: 'Vật tư' },
  { value: 'Sản phẩm', label: 'Sản phẩm' },
]

export interface VthhDanhMucItem {
  ma: string
  ten: string
  chieu_rong_m?: string
  chieu_dai_m?: string
  dien_giai?: string
  he_mau_in?: boolean
  he_mau_vat_tu?: boolean
}

export interface ThueVatItem {
  ma: string
  ten: string
}

export const NHOM_VTHH_BASE_ITEMS: NhomVTHHItem[] = [
  { id: 'CCDC', ma: 'CCDC', ten: 'Công cụ dụng cụ' },
  { id: 'DV', ma: 'DV', ten: 'Dịch vụ' },
  { id: 'HH', ma: 'HH', ten: 'Hàng hóa' },
  { id: 'NVL', ma: 'NVL', ten: 'Nguyên vật liệu' },
  { id: 'OTO', ma: 'OTO', ten: 'Xe ô tô' },
  { id: 'TP', ma: 'TP', ten: 'Thành phẩm' },
  { id: 'XEMAY', ma: 'XEMAY', ten: 'Xe hai bánh gắn máy' },
]

export const THUE_VAT_BASE_ITEMS: ThueVatItem[] = [
  { ma: 'Chưa xác định', ten: 'Chưa xác định' },
  { ma: '0', ten: '0%' },
  { ma: '5', ten: '5%' },
  { ma: '8', ten: '8%' },
  { ma: '10', ten: '10%' },
  { ma: 'Tự nhập', ten: 'Tự nhập' },
]

export function dispatchVthhLoaiNhomChanged(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(HTQL_VTHH_LOAI_NHOM_CHANGED))
}

function normalizeMa(raw: string): string {
  const s = raw.trim().toUpperCase()
  if (!s) return ''
  return s.replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, '')
}

function normalizeTen(raw: string): string {
  return raw.trim()
}

function stableHash36(s: string): string {
  let h = 0
  for (let i = 0; i < s.length; i++) h = Math.imul(31, h) + s.charCodeAt(i) | 0
  return (h >>> 0).toString(36)
}

function legacyNhomMaFromTen(ten: string): string {
  return `nhom_c_${stableHash36(ten)}`
}

function uniqueMa(baseMa: string, used: Set<string>): string {
  if (!used.has(baseMa)) {
    used.add(baseMa)
    return baseMa
  }
  let n = 2
  while (used.has(`${baseMa}_${n}`)) n++
  const ma = `${baseMa}_${n}`
  used.add(ma)
  return ma
}

function parseDanhMucStorageRaw(
  raw: string | null,
  opts?: { legacyPrefix?: string; nhomLegacyToken?: boolean; allowRawMa?: boolean },
): VthhDanhMucItem[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    const out: VthhDanhMucItem[] = []
    const used = new Set<string>()
    for (const item of parsed) {
      if (typeof item === 'string') {
        const ten = normalizeTen(item)
        if (!ten) continue
        const maBase = opts?.nhomLegacyToken
          ? legacyNhomMaFromTen(ten)
          : normalizeMa(`${opts?.legacyPrefix ?? 'DM'}_${ten}`)
        const ma = uniqueMa(maBase, used)
        out.push({ ma, ten })
        continue
      }
      if (item && typeof item === 'object') {
        const obj = item as {
          ma?: unknown
          ten?: unknown
          label?: unknown
          value?: unknown
          chieu_rong_m?: unknown
          chieu_dai_m?: unknown
          dien_giai?: unknown
          he_mau_in?: unknown
          he_mau_vat_tu?: unknown
          chieu_rong_mm?: unknown
          chieu_dai_mm?: unknown
          kich_thuoc_rong_mm?: unknown
          kich_thuoc_dai_mm?: unknown
          kich_thuoc_rong_m?: unknown
          kich_thuoc_dai_m?: unknown
        }
        const ten = normalizeTen(String(obj.ten ?? obj.label ?? obj.value ?? ''))
        const maRaw = String(obj.ma ?? '')
        if (!ten) continue
        const maBase =
          (opts?.allowRawMa ? normalizeTen(maRaw) : normalizeMa(maRaw)) ||
          (opts?.allowRawMa ? ten : normalizeMa(`${opts?.legacyPrefix ?? 'DM'}_${ten}`))
        const ma = uniqueMa(maBase, used)
        const chieuRong = normalizeTen(String(obj.chieu_rong_m ?? obj.kich_thuoc_rong_m ?? obj.chieu_rong_mm ?? obj.kich_thuoc_rong_mm ?? ''))
        const chieuDai = normalizeTen(String(obj.chieu_dai_m ?? obj.kich_thuoc_dai_m ?? obj.chieu_dai_mm ?? obj.kich_thuoc_dai_mm ?? ''))
        out.push({
          ma,
          ten,
          ...(chieuRong ? { chieu_rong_m: chieuRong } : {}),
          ...(chieuDai ? { chieu_dai_m: chieuDai } : {}),
          ...(String(obj.dien_giai ?? '').trim() ? { dien_giai: String(obj.dien_giai ?? '').trim() } : {}),
          ...(typeof obj.he_mau_in === 'boolean' ? { he_mau_in: obj.he_mau_in } : {}),
          ...(typeof obj.he_mau_vat_tu === 'boolean' ? { he_mau_vat_tu: obj.he_mau_vat_tu } : {}),
        })
      }
    }
    return out
  } catch {
    return []
  }
}

export function readVthhLoaiCustomFromStorage(): VthhDanhMucItem[] {
  const raw = htqlEntityStorage.getItem(STORAGE_KEY_VTHH_LOAI_CUSTOM)
  return parseDanhMucStorageRaw(raw, { legacyPrefix: 'LOAI' })
}

export function readVthhNhomCustomFromStorage(): VthhDanhMucItem[] {
  const raw = htqlEntityStorage.getItem(STORAGE_KEY_VTHH_NHOM_CUSTOM)
  return parseDanhMucStorageRaw(raw, { legacyPrefix: 'NHOM', nhomLegacyToken: true })
}

export function readVthhNhomDisabledFromStorage(): string[] {
  const raw = htqlEntityStorage.getItem(STORAGE_KEY_VTHH_NHOM_DISABLED)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    const out: string[] = []
    const seen = new Set<string>()
    for (const x of parsed) {
      const token = normalizeMa(String(x ?? ''))
      if (!token || seen.has(token)) continue
      seen.add(token)
      out.push(token)
    }
    return out
  } catch {
    return []
  }
}

export function saveVthhNhomDisabledToStorage(items: string[]): void {
  const out: string[] = []
  const seen = new Set<string>()
  for (const x of items) {
    const token = normalizeMa(String(x ?? ''))
    if (!token || seen.has(token)) continue
    seen.add(token)
    out.push(token)
  }
  htqlEntityStorage.setItem(STORAGE_KEY_VTHH_NHOM_DISABLED, JSON.stringify(out))
}

export function readVthhThueVatDisabledFromStorage(): string[] {
  const raw = htqlEntityStorage.getItem(STORAGE_KEY_VTHH_THUE_VAT_DISABLED)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    const out: string[] = []
    const seen = new Set<string>()
    for (const x of parsed) {
      const token = normalizeTen(String(x ?? ''))
      if (!token || seen.has(token)) continue
      seen.add(token)
      out.push(token)
    }
    return out
  } catch {
    return []
  }
}

export function saveVthhThueVatDisabledToStorage(items: string[]): void {
  const out: string[] = []
  const seen = new Set<string>()
  for (const x of items) {
    const token = normalizeTen(String(x ?? ''))
    if (!token || seen.has(token)) continue
    seen.add(token)
    out.push(token)
  }
  htqlEntityStorage.setItem(STORAGE_KEY_VTHH_THUE_VAT_DISABLED, JSON.stringify(out))
}

function saveVthhLoaiCustomToStorage(items: VthhDanhMucItem[]): void {
  htqlEntityStorage.setItem(STORAGE_KEY_VTHH_LOAI_CUSTOM, JSON.stringify(items))
}

function saveVthhNhomCustomToStorage(items: VthhDanhMucItem[]): void {
  htqlEntityStorage.setItem(STORAGE_KEY_VTHH_NHOM_CUSTOM, JSON.stringify(items))
}

export function readVthhThueVatCustomFromStorage(): VthhDanhMucItem[] {
  const raw = htqlEntityStorage.getItem(STORAGE_KEY_VTHH_THUE_VAT_CUSTOM)
  return parseDanhMucStorageRaw(raw, { legacyPrefix: 'VAT', allowRawMa: true })
}

export function readVthhKhoGiayCustomFromStorage(): VthhDanhMucItem[] {
  const raw = htqlEntityStorage.getItem(STORAGE_KEY_VTHH_KHO_GIAY_CUSTOM)
  return parseDanhMucStorageRaw(raw, { legacyPrefix: 'KG' })
}

export function readVthhDinhLuongCustomFromStorage(): VthhDanhMucItem[] {
  const raw = htqlEntityStorage.getItem(STORAGE_KEY_VTHH_DINH_LUONG_CUSTOM)
  return parseDanhMucStorageRaw(raw, { legacyPrefix: 'DL' })
}

export function readVthhHeMauCustomFromStorage(): VthhDanhMucItem[] {
  const raw = htqlEntityStorage.getItem(STORAGE_KEY_VTHH_HE_MAU_CUSTOM)
  return parseDanhMucStorageRaw(raw, { legacyPrefix: 'HM' })
}

function saveVthhThueVatCustomToStorage(items: VthhDanhMucItem[]): void {
  htqlEntityStorage.setItem(STORAGE_KEY_VTHH_THUE_VAT_CUSTOM, JSON.stringify(items))
}

export function appendVthhLoaiCustom(input: { ma?: string; ten: string }): boolean {
  const ten = normalizeTen(input.ten)
  if (!ten) return false
  if (TINH_CHAT_BASE_OPTIONS.some((o) => o.value.toLowerCase() === ten.toLowerCase())) return false
  const ma = normalizeMa(input.ma ?? '') || normalizeMa(`LOAI_${ten}`)
  if (!ma) return false
  const cur = readVthhLoaiCustomFromStorage()
  if (cur.some((x) => x.ma === ma || x.ten.toLowerCase() === ten.toLowerCase())) return false
  saveVthhLoaiCustomToStorage([...cur, { ma, ten }])
  dispatchVthhLoaiNhomChanged()
  return true
}

export function appendVthhNhomCustom(input: { ma?: string; ten: string }): boolean {
  const ten = normalizeTen(input.ten)
  if (!ten) return false
  const ma = normalizeMa(input.ma ?? '') || legacyNhomMaFromTen(ten)
  if (!ma) return false
  if (NHOM_VTHH_BASE_ITEMS.some((o) => o.id === ma || o.ma === ma || o.ten.toLowerCase() === ten.toLowerCase())) return false
  const cur = readVthhNhomCustomFromStorage()
  if (cur.some((x) => x.ma === ma || x.ten.toLowerCase() === ten.toLowerCase())) return false
  saveVthhNhomCustomToStorage([...cur, { ma, ten }])
  dispatchVthhLoaiNhomChanged()
  return true
}

export function appendVthhThueVatCustom(input: { ma?: string; ten: string }): boolean {
  const ten = normalizeTen(input.ten)
  const ma = normalizeTen(input.ma ?? '')
  if (!ten || !ma) return false
  const cur = readVthhThueVatCustomFromStorage()
  if (THUE_VAT_BASE_ITEMS.some((x) => x.ma === ma || x.ten.toLowerCase() === ten.toLowerCase())) return false
  if (cur.some((x) => x.ma === ma || x.ten.toLowerCase() === ten.toLowerCase())) return false
  saveVthhThueVatCustomToStorage([...cur, { ma, ten }])
  dispatchVthhLoaiNhomChanged()
  return true
}

export function parseNhomVthhStored(raw: string | undefined | null): string[] {
  return (raw ?? '').split(';').map((s) => s.trim()).filter(Boolean)
}

export function nhomTokenDisplayLabel(token: string, customItems: VthhDanhMucItem[]): string {
  const hitCustom = customItems.find((x) => x.ma === token)
  if (hitCustom) return hitCustom.ten
  const hit = NHOM_VTHH_BASE_ITEMS.find((x) => x.id === token || x.ma === token)
  if (hit) return hit.ten
  return token
}

export function nhomVthhStoredToTenHienThi(raw: string | undefined | null, list: NhomVTHHItem[]): string {
  const ids = parseNhomVthhStored(raw)
  if (ids.length === 0) return ''
  return ids
    .map((id) => {
      const hit = list.find((x) => x.id === id || x.ma === id)
      return hit?.ten ?? id
    })
    .join(', ')
}

export function replaceNhomTokenInStored(stored: string, fromToken: string, toToken: string): string {
  const parts = parseNhomVthhStored(stored).map((t) => (t === fromToken ? toToken : t))
  const seen = new Set<string>()
  const out: string[] = []
  for (const p of parts) {
    if (!p || seen.has(p)) continue
    seen.add(p)
    out.push(p)
  }
  return out.join(';')
}

export function buildLoaiVthhSelectOptions(records: Pick<VatTuHangHoaRecord, 'tinh_chat'>[]): { value: string; label: string }[] {
  const map = new Map<string, string>()
  for (const o of TINH_CHAT_BASE_OPTIONS) map.set(o.value, o.label)
  for (const c of readVthhLoaiCustomFromStorage()) {
    if (c.ten) map.set(c.ten, c.ten)
  }
  for (const r of records) {
    const v = (r.tinh_chat ?? '').trim()
    if (v) map.set(v, v)
  }
  return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0], 'vi')).map(([value, label]) => ({ value, label }))
}

export function buildNhomVthhLookupList(records: Pick<VatTuHangHoaRecord, 'nhom_vthh'>[]): NhomVTHHItem[] {
  const disabled = new Set(readVthhNhomDisabledFromStorage())
  const byId = new Map<string, NhomVTHHItem>()
  for (const x of NHOM_VTHH_BASE_ITEMS) {
    if (disabled.has(x.id) || disabled.has(x.ma)) continue
    byId.set(x.id, x)
  }
  for (const item of readVthhNhomCustomFromStorage()) {
    if (!item.ma || !item.ten) continue
    if (disabled.has(item.ma)) continue
    byId.set(item.ma, { id: item.ma, ma: item.ma, ten: item.ten })
  }
  const tokens = new Set<string>()
  for (const r of records) {
    for (const t of parseNhomVthhStored(r.nhom_vthh)) tokens.add(t)
  }
  for (const t of tokens) {
    if (byId.has(t)) continue
    const hitBase = NHOM_VTHH_BASE_ITEMS.find((x) => x.id === t || x.ma === t)
    if (hitBase) {
      byId.set(hitBase.id, hitBase)
      continue
    }
    byId.set(t, { id: t, ma: t, ten: t })
  }
  return [...byId.values()].sort((a, b) => a.ten.localeCompare(b.ten, 'vi'))
}

export function thueVatTokenDisplayLabel(token: string, customItems: VthhDanhMucItem[]): string {
  const hitCustom = customItems.find((x) => x.ma === token)
  if (hitCustom) return hitCustom.ten
  const hit = THUE_VAT_BASE_ITEMS.find((x) => x.ma === token)
  if (hit) return hit.ten
  return token
}

export function buildThueVatSelectOptions(
  records: Pick<VatTuHangHoaRecord, 'thue_suat_gtgt_dau_ra'>[] = [],
): { value: string; label: string }[] {
  const disabled = new Set(readVthhThueVatDisabledFromStorage())
  const customs = readVthhThueVatCustomFromStorage()
  const map = new Map<string, string>()
  for (const b of THUE_VAT_BASE_ITEMS) {
    if (disabled.has(b.ma)) continue
    map.set(b.ma, b.ten)
  }
  for (const c of customs) {
    if (disabled.has(c.ma)) continue
    if (c.ma && c.ten) map.set(c.ma, c.ten)
  }
  for (const r of records) {
    const raw = String(r.thue_suat_gtgt_dau_ra ?? '').trim()
    if (!raw) continue
    if (!map.has(raw)) {
      const tok = thueGtgtStdToken(raw) || raw
      map.set(raw, thueVatTokenDisplayLabel(tok, customs))
    }
  }
  return [...map.entries()].map(([value, label]) => ({ value, label }))
}

/**
 * Giá trị `<select>` Thuế GTGT (%) khi mở form: token mã đồng bộ với `formatThueGtgtBangHienThiTuDanhMuc`.
 * Xử lý dữ liệu lệch: `thue_suat_gtgt_dau_ra = 'Tự nhập'` nhưng `thue_suat_gtgt` vẫn là mức chuẩn (vd. `8`).
 */
export function resolveThueGtgtFormSelectMa(
  r: Pick<VatTuHangHoaRecord, 'thue_suat_gtgt' | 'thue_suat_gtgt_dau_ra'> | null | undefined,
): string {
  if (!r) return 'Chưa xác định'
  const gtgRaw = String(r.thue_suat_gtgt ?? '').trim()
  const dauRaw = String(r.thue_suat_gtgt_dau_ra ?? '').trim()
  const gtg = thueGtgtStdToken(gtgRaw)
  const dau = thueGtgtStdToken(dauRaw)

  if (dauRaw === 'Tự nhập' || dau === 'Tự nhập') {
    if (gtgRaw && gtg !== 'Tự nhập') {
      if (THUE_GTGT_STD_SET.has(gtg)) return gtg
      return gtgRaw
    }
    return 'Tự nhập'
  }

  if (THUE_GTGT_STD_SET.has(gtg) && THUE_GTGT_STD_SET.has(dau) && gtg && dau && gtg !== dau) {
    const s = dau
    if (s === '' || s === 'Chưa xác định' || s === '0' || s === '5' || s === '8' || s === '10') return s || 'Chưa xác định'
    return 'Tự nhập'
  }

  const merged = (dauRaw || gtgRaw || '').trim() || 'Chưa xác định'
  const tok = thueGtgtStdToken(merged) || merged
  if (tok === 'Tự nhập') return 'Tự nhập'
  if (THUE_GTGT_STD_SET.has(tok) && tok) return tok
  if (merged && merged !== 'Chưa xác định') return merged
  return 'Chưa xác định'
}

/** Hiển thị thuế GTGT (lưới VTHH, CSV, chi tiết): tra nhãn danh mục Thuế GTGT theo mã đã lưu. */
export function formatThueGtgtBangHienThiTuDanhMuc(r: VatTuHangHoaRecord): string {
  const customs = readVthhThueVatCustomFromStorage()
  const dauRaw = (r.thue_suat_gtgt_dau_ra ?? '').trim()
  const gtgRaw = (r.thue_suat_gtgt ?? '').trim()
  const dauTok = thueGtgtStdToken(dauRaw)
  const gtgTok = thueGtgtStdToken(gtgRaw)
  if (dauRaw === 'Tự nhập' || dauTok === 'Tự nhập') {
    if (gtgRaw && gtgRaw !== 'Tự nhập') {
      const tok = thueGtgtStdToken(gtgRaw) || gtgRaw
      const lab = thueVatTokenDisplayLabel(tok, customs)
      if (lab !== tok) return lab
      if (gtgRaw.endsWith('%')) return gtgRaw
      return gtgRaw.includes('%') ? gtgRaw : `${gtgRaw}%`
    }
    return thueVatTokenDisplayLabel('Tự nhập', customs)
  }
  let token = (dauTok || gtgTok).trim()
  if (THUE_GTGT_STD_SET.has(gtgTok) && THUE_GTGT_STD_SET.has(dauTok) && gtgTok !== dauTok) {
    token = dauTok
  }
  if (!token) return thueVatTokenDisplayLabel('Chưa xác định', customs)
  return thueVatTokenDisplayLabel(token, customs)
}
