/**
 * API Đề xuất mua hàng — cấu trúc giống Đơn mua hàng, lưu riêng storage.
 * Dùng chung types từ donMuaHangApi.
 */

import type {
  DonMuaHangRecord,
  DonMuaHangChiTiet,
  DonMuaHangCreatePayload,
  DonMuaHangFilter,
  DonMuaHangDraftLine,
} from './donMuaHangApi'
import {
  getDateRangeForKy,
  KY_OPTIONS,
  type KyValue,
} from './donMuaHangApi'

const STORAGE_KEY_DON = 'htql_de_xuat_mua_hang_list'
const STORAGE_KEY_CHI_TIET = 'htql_de_xuat_mua_hang_chi_tiet'
const STORAGE_KEY_DRAFT = 'htql_de_xuat_mua_hang_draft'
const ID_PREFIX = 'dx'
const SO_PREFIX = 'DXMH'

function normalizeDon(d: Partial<DonMuaHangRecord> & { id: string }): DonMuaHangRecord {
  return {
    id: d.id,
    tinh_trang: d.tinh_trang ?? 'Chưa thực hiện',
    ngay_don_hang: d.ngay_don_hang ?? '',
    so_don_hang: d.so_don_hang ?? '',
    ngay_giao_hang: d.ngay_giao_hang ?? null,
    nha_cung_cap: d.nha_cung_cap ?? '',
    dia_chi: d.dia_chi ?? '',
    ma_so_thue: d.ma_so_thue ?? '',
    dien_giai: d.dien_giai ?? '',
    nv_mua_hang: d.nv_mua_hang ?? '',
    dieu_khoan_tt: d.dieu_khoan_tt ?? '',
    so_ngay_duoc_no: d.so_ngay_duoc_no ?? '0',
    dia_diem_giao_hang: d.dia_diem_giao_hang ?? '',
    dieu_khoan_khac: d.dieu_khoan_khac ?? '',
    gia_tri_don_hang: typeof d.gia_tri_don_hang === 'number' ? d.gia_tri_don_hang : 0,
    so_chung_tu_cukcuk: d.so_chung_tu_cukcuk ?? '',
  }
}

const MOCK_DON: DonMuaHangRecord[] = []
const MOCK_CHI_TIET: DonMuaHangChiTiet[] = []

function loadFromStorage(): { don: DonMuaHangRecord[]; chiTiet: DonMuaHangChiTiet[] } {
  try {
    const rawDon = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY_DON) : null
    const rawCt = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY_CHI_TIET) : null
    const don = rawDon ? JSON.parse(rawDon) : null
    const chiTiet = rawCt ? JSON.parse(rawCt) : null
    if (Array.isArray(don) && Array.isArray(chiTiet)) {
      return { don: don.map((d: Partial<DonMuaHangRecord> & { id: string }) => normalizeDon(d)), chiTiet }
    }
  } catch {
    /* ignore */
  }
  return { don: [...MOCK_DON], chiTiet: [...MOCK_CHI_TIET] }
}

function saveToStorage(): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_DON, JSON.stringify(_donList))
      localStorage.setItem(STORAGE_KEY_CHI_TIET, JSON.stringify(_chiTietList))
    }
  } catch {
    /* ignore */
  }
}

const _initial = loadFromStorage()
let _donList: DonMuaHangRecord[] = _initial.don
let _chiTietList: DonMuaHangChiTiet[] = _initial.chiTiet

export { KY_OPTIONS, getDateRangeForKy }
export type { KyValue, DonMuaHangFilter, DonMuaHangDraftLine }

export function getDefaultFilter(): DonMuaHangFilter {
  const { tu, den } = getDateRangeForKy('dau-thang-hien-tai')
  return { ky: 'dau-thang-hien-tai', tu, den }
}

export function deXuatMuaHangGetAll(filter: DonMuaHangFilter): DonMuaHangRecord[] {
  const { tu, den } = filter
  return _donList.filter((d) => {
    const ngay = d.ngay_don_hang
    return ngay >= tu && ngay <= den
  })
}

export function deXuatMuaHangGetChiTiet(donId: string): DonMuaHangChiTiet[] {
  return _chiTietList.filter((c) => c.don_mua_hang_id === donId)
}

export function deXuatMuaHangDelete(donId: string): void {
  _donList = _donList.filter((d) => d.id !== donId)
  _chiTietList = _chiTietList.filter((c) => c.don_mua_hang_id !== donId)
  saveToStorage()
}

export function deXuatMuaHangPost(payload: DonMuaHangCreatePayload): DonMuaHangRecord {
  const id = `${ID_PREFIX}${Date.now()}`
  const don: DonMuaHangRecord = {
    id,
    tinh_trang: payload.tinh_trang,
    ngay_don_hang: payload.ngay_don_hang,
    so_don_hang: payload.so_don_hang,
    ngay_giao_hang: payload.ngay_giao_hang,
    nha_cung_cap: payload.nha_cung_cap,
    dia_chi: payload.dia_chi ?? '',
    ma_so_thue: payload.ma_so_thue ?? '',
    dien_giai: payload.dien_giai ?? '',
    nv_mua_hang: payload.nv_mua_hang ?? '',
    dieu_khoan_tt: payload.dieu_khoan_tt ?? '',
    so_ngay_duoc_no: payload.so_ngay_duoc_no ?? '0',
    dia_diem_giao_hang: payload.dia_diem_giao_hang ?? '',
    dieu_khoan_khac: payload.dieu_khoan_khac ?? '',
    gia_tri_don_hang: payload.gia_tri_don_hang,
    so_chung_tu_cukcuk: payload.so_chung_tu_cukcuk ?? '',
  }
  _donList.push(don)
  payload.chiTiet.forEach((c, i) => {
    _chiTietList.push({
      id: `ct${id}-${i}`,
      don_mua_hang_id: id,
      ma_hang: c.ma_hang,
      ten_hang: c.ten_hang,
      ma_quy_cach: '',
      dvt: c.dvt,
      chieu_dai: 0,
      chieu_rong: 0,
      chieu_cao: 0,
      ban_kinh: 0,
      luong: 0,
      so_luong: c.so_luong,
      so_luong_nhan: 0,
      don_gia: c.don_gia,
      thanh_tien: c.thanh_tien,
      pt_thue_gtgt: c.pt_thue_gtgt,
      tien_thue_gtgt: c.tien_thue_gtgt,
      lenh_san_xuat: '',
    })
  })
  saveToStorage()
  return don
}

export function deXuatMuaHangPut(donId: string, payload: DonMuaHangCreatePayload): void {
  const idx = _donList.findIndex((d) => d.id === donId)
  if (idx < 0) return
  _donList[idx] = {
    id: donId,
    tinh_trang: payload.tinh_trang,
    ngay_don_hang: payload.ngay_don_hang,
    so_don_hang: payload.so_don_hang,
    ngay_giao_hang: payload.ngay_giao_hang,
    nha_cung_cap: payload.nha_cung_cap,
    dia_chi: payload.dia_chi ?? '',
    ma_so_thue: payload.ma_so_thue ?? '',
    dien_giai: payload.dien_giai ?? '',
    nv_mua_hang: payload.nv_mua_hang ?? '',
    dieu_khoan_tt: payload.dieu_khoan_tt ?? '',
    so_ngay_duoc_no: payload.so_ngay_duoc_no ?? '0',
    dia_diem_giao_hang: payload.dia_diem_giao_hang ?? '',
    dieu_khoan_khac: payload.dieu_khoan_khac ?? '',
    gia_tri_don_hang: payload.gia_tri_don_hang,
    so_chung_tu_cukcuk: payload.so_chung_tu_cukcuk ?? '',
  }
  _chiTietList = _chiTietList.filter((c) => c.don_mua_hang_id !== donId)
  payload.chiTiet.forEach((c, i) => {
    _chiTietList.push({
      id: `ct${donId}-${i}`,
      don_mua_hang_id: donId,
      ma_hang: c.ma_hang,
      ten_hang: c.ten_hang,
      ma_quy_cach: '',
      dvt: c.dvt,
      chieu_dai: 0,
      chieu_rong: 0,
      chieu_cao: 0,
      ban_kinh: 0,
      luong: 0,
      so_luong: c.so_luong,
      so_luong_nhan: 0,
      don_gia: c.don_gia,
      thanh_tien: c.thanh_tien,
      pt_thue_gtgt: c.pt_thue_gtgt,
      tien_thue_gtgt: c.tien_thue_gtgt,
      lenh_san_xuat: '',
    })
  })
  saveToStorage()
}

export function deXuatMuaHangSoDonHangTiepTheo(): string {
  let maxNum = 0
  for (const d of _donList) {
    const s = (d.so_don_hang || '').trim()
    const m = s.replace(new RegExp(`^${SO_PREFIX}0*`), '')
    const n = parseInt(m, 10)
    if (!Number.isNaN(n) && n > maxNum) maxNum = n
  }
  return `${SO_PREFIX}${String(maxNum + 1).padStart(5, '0')}`
}

export function getDeXuatDraft(): DonMuaHangDraftLine[] | null {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY_DRAFT) : null
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function setDeXuatDraft(lines: Array<Record<string, string> & { _dvtOptions?: string[]; _vthh?: unknown }>): void {
  try {
    if (typeof localStorage !== 'undefined') {
      const toSave = lines.map((l) => {
        const { _vthh, ...rest } = l
        return rest
      })
      localStorage.setItem(STORAGE_KEY_DRAFT, JSON.stringify(toSave))
    }
  } catch {
    /* ignore */
  }
}

export function clearDeXuatDraft(): void {
  try {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(STORAGE_KEY_DRAFT)
  } catch {
    /* ignore */
  }
}
