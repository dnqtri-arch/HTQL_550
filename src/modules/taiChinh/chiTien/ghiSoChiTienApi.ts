/**
 * Ghi sổ từ phiếu chi — lưu local riêng khỏi phiếu thu (YC88).
 */
import type { ChiTienBangRecord } from '../../../types/chiTienBang'
import { htqlEntityStorage } from '@/utils/htqlEntityStorage'
import { dispatchTaiChinhGhiSoReload } from '../thuTien/ghiSoTaiChinhApi'

const KEY_CHI_GHI_SO = 'htql550_chi_tien_bang_ghi_so'
const KEY_SO_TM_CHI = 'htql550_chi_tien_so_chi_tiet_tien_mat'
const KEY_SO_NH_CHI = 'htql550_chi_tien_so_chi_tiet_tk_nh'

export type ChiTienGhiSoEntry = {
  id: string
  loai: 'chi'
  phieu_chi_id: string
  so_phieu: string
  ngay: string
  dien_giai: string
  so_tien: number
  kenh: 'tien_mat' | 'ngan_hang'
  ten_ngan_hang?: string
  so_tai_khoan?: string
  created_at: string
}

export type SoChiTietChiGhiSoEntry = {
  id: string
  phieu_chi_id: string
  ngay: string
  dien_giai: string
  no_chi: number
  no_co?: number
  created_at: string
}

function readJson<T>(key: string, fallback: T): T {
  try {
    if (typeof htqlEntityStorage === 'undefined') return fallback
    const raw = htqlEntityStorage.getItem(key)
    if (!raw) return fallback
    const p = JSON.parse(raw) as unknown
    return Array.isArray(p) ? (p as T) : fallback
  } catch {
    return fallback
  }
}

function writeJson(key: string, data: unknown): void {
  try {
    if (typeof htqlEntityStorage !== 'undefined') htqlEntityStorage.setItem(key, JSON.stringify(data))
  } catch {
    /* ignore */
  }
}

export function chiTienGhiSoGetAll(): ChiTienGhiSoEntry[] {
  return readJson<ChiTienGhiSoEntry[]>(KEY_CHI_GHI_SO, [])
}

export function soChiTietTienMatChiGhiSoGetAll(): SoChiTietChiGhiSoEntry[] {
  return readJson<SoChiTietChiGhiSoEntry[]>(KEY_SO_TM_CHI, [])
}

export function soChiTietTaiKhoanNhChiGhiSoGetAll(): SoChiTietChiGhiSoEntry[] {
  return readJson<SoChiTietChiGhiSoEntry[]>(KEY_SO_NH_CHI, [])
}

export function ghiSoTuPhieuChi(row: ChiTienBangRecord, tongChi: number): void {
  const id = `gsc${Date.now()}`
  const now = new Date().toISOString()
  const ngay = (row.ngay_hach_toan ?? row.ngay_chi_tien_bang ?? '').trim().slice(0, 10) || now.slice(0, 10)
  const dien = (row.dien_giai ?? '').trim() || row.so_chi_tien_bang
  const tienMat = Boolean(row.chi_tien_mat)
  const quaNh = Boolean(row.chi_qua_ngan_hang)

  const entry: ChiTienGhiSoEntry = {
    id,
    loai: 'chi',
    phieu_chi_id: row.id,
    so_phieu: row.so_chi_tien_bang,
    ngay,
    dien_giai: dien,
    so_tien: tongChi,
    kenh: tienMat ? 'tien_mat' : 'ngan_hang',
    created_at: now,
  }
  const listTc = chiTienGhiSoGetAll().filter((e) => e.phieu_chi_id !== row.id)
  listTc.push(entry)
  writeJson(KEY_CHI_GHI_SO, listTc)

  const soEntry: SoChiTietChiGhiSoEntry = {
    id: `${id}-so`,
    phieu_chi_id: row.id,
    ngay,
    dien_giai: dien,
    no_chi: tongChi,
    created_at: now,
  }
  if (tienMat) {
    const l = soChiTietTienMatChiGhiSoGetAll().filter((e) => e.phieu_chi_id !== row.id)
    l.push(soEntry)
    writeJson(KEY_SO_TM_CHI, l)
  } else if (quaNh) {
    const l = soChiTietTaiKhoanNhChiGhiSoGetAll().filter((e) => e.phieu_chi_id !== row.id)
    l.push(soEntry)
    writeJson(KEY_SO_NH_CHI, l)
  }
}

export function huyGhiSoPhieuChi(phieuChiId: string): void {
  writeJson(
    KEY_CHI_GHI_SO,
    chiTienGhiSoGetAll().filter((e) => e.phieu_chi_id !== phieuChiId),
  )
  writeJson(
    KEY_SO_TM_CHI,
    soChiTietTienMatChiGhiSoGetAll().filter((e) => e.phieu_chi_id !== phieuChiId),
  )
  writeJson(
    KEY_SO_NH_CHI,
    soChiTietTaiKhoanNhChiGhiSoGetAll().filter((e) => e.phieu_chi_id !== phieuChiId),
  )
  dispatchTaiChinhGhiSoReload()
}

export function daGhiSoPhieuChi(phieuChiId: string): boolean {
  return chiTienGhiSoGetAll().some((e) => e.phieu_chi_id === phieuChiId)
}
