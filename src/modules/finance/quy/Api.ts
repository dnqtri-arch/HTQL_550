/**
 * API Quỹ tiền mặt & Tài khoản Ngân hàng (localStorage).
 * Dùng cho tích hợp thanh toán công nợ NCC.
 */

import type { QuyRecord } from './Type'

const LS_KEY = 'htql_quy_accounts'

const DU_LIEU_MAU: QuyRecord[] = [
  { id: 'QUY001', ten: 'Quỹ tiền mặt', loai: 'tienmat', sodubandau: 500_000_000, soduhientai: 500_000_000 },
  { id: 'NH001', ten: 'Vietcombank — Công ty', loai: 'nganhang', sodubandau: 2_000_000_000, soduhientai: 2_000_000_000, nganhangnguoc: 'Vietcombank', sotaikhoan: '1234567890' },
  { id: 'NH002', ten: 'BIDV — Công ty', loai: 'nganhang', sodubandau: 1_500_000_000, soduhientai: 1_500_000_000, nganhangnguoc: 'BIDV', sotaikhoan: '0987654321' },
]

function loadAll(): QuyRecord[] {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) return JSON.parse(raw) as QuyRecord[]
  } catch { /* ignore */ }
  const fresh = DU_LIEU_MAU.map((r) => ({ ...r }))
  localStorage.setItem(LS_KEY, JSON.stringify(fresh))
  return fresh
}

function saveAll(data: QuyRecord[]): void {
  localStorage.setItem(LS_KEY, JSON.stringify(data))
}

export function quyGetAll(): QuyRecord[] {
  return loadAll()
}

export function quyGetById(id: string): QuyRecord | null {
  return loadAll().find((r) => r.id === id) ?? null
}

/**
 * Trừ số dư tài khoản quỹ/ngân hàng theo id.
 * @returns true nếu đủ số dư và trừ thành công, false nếu không đủ.
 */
export function truxSoDuQuy(taikhoanId: string, sotien: number): boolean {
  if (!taikhoanId || sotien <= 0) return true /* Không cần trừ */
  const data = loadAll()
  const idx = data.findIndex((r) => r.id === taikhoanId)
  if (idx === -1) return true /* Tài khoản không tồn tại — bỏ qua */
  if (data[idx].soduhientai < sotien) return false /* Số dư không đủ */
  data[idx] = { ...data[idx], soduhientai: data[idx].soduhientai - sotien }
  saveAll(data)
  return true
}

/** Nạp tiền vào tài khoản (dùng khi test hoặc điều chỉnh số dư) */
export function napTienQuy(taikhoanId: string, sotien: number): void {
  const data = loadAll()
  const idx = data.findIndex((r) => r.id === taikhoanId)
  if (idx === -1) return
  data[idx] = { ...data[idx], soduhientai: data[idx].soduhientai + sotien }
  saveAll(data)
}
