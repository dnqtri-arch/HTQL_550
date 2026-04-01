/**
 * Ghi sổ từ phiếu thu — lưu local (module Thu/chi tiền + sổ chi tiết là placeholder).
 */
import type { ThuTienBangRecord } from '../../../types/thuTienBang'

const KEY_THU_CHI = 'htql550_thu_chi_tien_ghi_so'
const KEY_SO_TM = 'htql550_so_chi_tiet_tien_mat_ghi_so'
const KEY_SO_NH = 'htql550_so_chi_tiet_tk_nh_ghi_so'

export type ThuChiTienGhiSoEntry = {
  id: string
  loai: 'thu'
  phieu_thu_id: string
  so_phieu: string
  ngay: string
  dien_giai: string
  so_tien: number
  kenh: 'tien_mat' | 'ngan_hang'
  ten_ngan_hang?: string
  so_tai_khoan?: string
  created_at: string
}

export type SoChiTietGhiSoEntry = {
  id: string
  phieu_thu_id: string
  ngay: string
  dien_giai: string
  no_thu: number
  no_co?: number
  created_at: string
}

function readJson<T>(key: string, fallback: T): T {
  try {
    if (typeof localStorage === 'undefined') return fallback
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    const p = JSON.parse(raw) as unknown
    return Array.isArray(p) ? (p as T) : fallback
  } catch {
    return fallback
  }
}

function writeJson(key: string, data: unknown): void {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(key, JSON.stringify(data))
  } catch {
    /* ignore */
  }
}

export function thuChiTienGhiSoGetAll(): ThuChiTienGhiSoEntry[] {
  return readJson<ThuChiTienGhiSoEntry[]>(KEY_THU_CHI, [])
}

export function soChiTietTienMatGhiSoGetAll(): SoChiTietGhiSoEntry[] {
  return readJson<SoChiTietGhiSoEntry[]>(KEY_SO_TM, [])
}

export function soChiTietTaiKhoanNhGhiSoGetAll(): SoChiTietGhiSoEntry[] {
  return readJson<SoChiTietGhiSoEntry[]>(KEY_SO_NH, [])
}

export function ghiSoTuPhieuThu(row: ThuTienBangRecord, tongThu: number): void {
  const id = `gs${Date.now()}`
  const now = new Date().toISOString()
  const ngay = (row.ngay_hach_toan ?? row.ngay_thu_tien_bang ?? '').trim().slice(0, 10) || now.slice(0, 10)
  const dien = (row.dien_giai ?? '').trim() || row.so_thu_tien_bang
  const tienMat = Boolean(row.thu_tien_mat)
  const quaNh = Boolean(row.thu_qua_ngan_hang)

  const thuChi: ThuChiTienGhiSoEntry = {
    id,
    loai: 'thu',
    phieu_thu_id: row.id,
    so_phieu: row.so_thu_tien_bang,
    ngay,
    dien_giai: dien,
    so_tien: tongThu,
    kenh: tienMat ? 'tien_mat' : 'ngan_hang',
    created_at: now,
  }
  const listTc = thuChiTienGhiSoGetAll().filter((e) => e.phieu_thu_id !== row.id)
  listTc.push(thuChi)
  writeJson(KEY_THU_CHI, listTc)

  const soEntry: SoChiTietGhiSoEntry = {
    id: `${id}-so`,
    phieu_thu_id: row.id,
    ngay,
    dien_giai: dien,
    no_thu: tongThu,
    created_at: now,
  }
  if (tienMat) {
    const l = soChiTietTienMatGhiSoGetAll().filter((e) => e.phieu_thu_id !== row.id)
    l.push(soEntry)
    writeJson(KEY_SO_TM, l)
  } else if (quaNh) {
    const l = soChiTietTaiKhoanNhGhiSoGetAll().filter((e) => e.phieu_thu_id !== row.id)
    l.push(soEntry)
    writeJson(KEY_SO_NH, l)
  }
}

export function huyGhiSoPhieuThu(phieuThuId: string): void {
  writeJson(
    KEY_THU_CHI,
    thuChiTienGhiSoGetAll().filter((e) => e.phieu_thu_id !== phieuThuId),
  )
  writeJson(
    KEY_SO_TM,
    soChiTietTienMatGhiSoGetAll().filter((e) => e.phieu_thu_id !== phieuThuId),
  )
  writeJson(
    KEY_SO_NH,
    soChiTietTaiKhoanNhGhiSoGetAll().filter((e) => e.phieu_thu_id !== phieuThuId),
  )
}

export function daGhiSoPhieuThu(phieuThuId: string): boolean {
  return thuChiTienGhiSoGetAll().some((e) => e.phieu_thu_id === phieuThuId)
}
