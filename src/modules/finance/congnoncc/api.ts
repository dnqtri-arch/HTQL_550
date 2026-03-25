/**
 * API Công nợ NCC — Phải trả người bán (localStorage)
 * Tích hợp: tự động tạo khi NVTHH chuyển "Đã nhập kho" (gọi từ NhanVatTuHangHoa.tsx).
 * Tích hợp: thanh toán trừ số dư Quỹ/Ngân hàng (quy/Api.ts).
 */

import type { PhaiTraNguoiBan, PhaiTraNguoiBanCreatePayload, TinhTrangCongNo } from './type'
import { truxSoDuQuy } from '../quy/api'

const LS_KEY = 'htql_congno_ncc'

function loadAll(): PhaiTraNguoiBan[] {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) return JSON.parse(raw) as PhaiTraNguoiBan[]
  } catch { /* ignore */ }
  return []
}

function saveAll(data: PhaiTraNguoiBan[]): void {
  localStorage.setItem(LS_KEY, JSON.stringify(data))
}

function genId(): string {
  return `ptnb-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

/** Tính hạn thanh toán từ ngày phát sinh và số ngày được nợ */
export function tinhHanThanhToan(ngayphat: string, soNgayDuocNo: string | number): string {
  const ngay = new Date(ngayphat)
  if (isNaN(ngay.getTime())) return ''
  const soNgay = typeof soNgayDuocNo === 'string' ? parseInt(soNgayDuocNo) || 0 : soNgayDuocNo
  ngay.setDate(ngay.getDate() + soNgay)
  return ngay.toISOString().slice(0, 10)
}

/** Kiểm tra công nợ quá hạn (so ngày hiện tại) */
export function isQuaHan(hanthanhtoan: string, tinhTrang: TinhTrangCongNo): boolean {
  if (tinhTrang === 'dathanhtoan') return false
  if (!hanthanhtoan) return false
  return new Date(hanthanhtoan) < new Date(new Date().toISOString().slice(0, 10))
}

/* ─── CRUD ─── */

export function congNoGetAll(): PhaiTraNguoiBan[] {
  return loadAll()
}

export function congNoGetById(id: string): PhaiTraNguoiBan | null {
  return loadAll().find((r) => r.id === id) ?? null
}

export function congNoGetBySophieu(sophieu: string): PhaiTraNguoiBan | null {
  return loadAll().find((r) => r.sophieu === sophieu) ?? null
}

/** Tạo bản ghi Phải trả người bán — gọi khi NVTHH "Đã nhập kho" */
export function taoPhaiTraNguoiBan(payload: PhaiTraNguoiBanCreatePayload): PhaiTraNguoiBan {
  const existing = loadAll()
  /* Tránh tạo trùng cùng một nguồn phiếu */
  const dup = existing.find((r) => r.nguonid === payload.nguonid)
  if (dup) return dup

  const record: PhaiTraNguoiBan = {
    id: genId(),
    sophieu: payload.sophieu,
    nguonid: payload.nguonid,
    tenncc: payload.tenncc,
    ngayphat: payload.ngayphat,
    hanthanhtoan: payload.hanthanhtoan,
    sotien: payload.sotien,
    sotiencon: payload.sotien,
    tinhTrang: 'chuathanhtoan',
    pttt: payload.pttt,
    taikhoanchi: payload.taikhoanchi,
    ghichu: payload.ghichu,
    created: new Date().toISOString(),
  }
  saveAll([...existing, record])
  return record
}

/**
 * Thanh toán một phần hoặc toàn bộ công nợ.
 * Tự động trừ số dư Quỹ/Ngân hàng theo taikhoanchi.
 * @returns true nếu thành công, false nếu số dư không đủ.
 */
export function thanhToanCongNo(id: string, sothanhtoan: number, taikhoanchi: string): boolean {
  const data = loadAll()
  const idx = data.findIndex((r) => r.id === id)
  if (idx === -1) return false

  const rec = data[idx]
  if (sothanhtoan <= 0 || sothanhtoan > rec.sotiencon) return false

  /* Trừ số dư quỹ/ngân hàng */
  const ok = truxSoDuQuy(taikhoanchi, sothanhtoan)
  if (!ok) return false

  const sotiencon = rec.sotiencon - sothanhtoan
  const tinhTrang: TinhTrangCongNo =
    sotiencon <= 0 ? 'dathanhtoan' : 'thanhtoanmot'

  data[idx] = { ...rec, sotiencon, tinhTrang, taikhoanchi }
  saveAll(data)
  return true
}
