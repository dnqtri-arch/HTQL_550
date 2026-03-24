/**
 * API Khách hàng — Phân hệ Bán hàng.
 * Lưu trữ localStorage; tách biệt hoàn toàn khỏi module Mua hàng.
 */
import type { KhachHangRecord } from '../../../types/banHang'

const KEY_LIST = 'htql_khach_hang_list'

export type { KhachHangRecord }

export function khachHangGetAll(): KhachHangRecord[] {
  try {
    const raw = localStorage.getItem(KEY_LIST)
    return raw ? (JSON.parse(raw) as KhachHangRecord[]) : []
  } catch {
    return []
  }
}

export function khachHangSaveAll(list: KhachHangRecord[]): void {
  localStorage.setItem(KEY_LIST, JSON.stringify(list))
}

export function khachHangCreate(payload: Omit<KhachHangRecord, 'id'>): KhachHangRecord {
  const list = khachHangGetAll()
  const record: KhachHangRecord = { ...payload, id: `kh_${Date.now()}` }
  khachHangSaveAll([...list, record])
  return record
}

export function khachHangUpdate(id: string, payload: Partial<Omit<KhachHangRecord, 'id'>>): KhachHangRecord | null {
  const list = khachHangGetAll()
  const idx = list.findIndex((r) => r.id === id)
  if (idx === -1) return null
  const updated = { ...list[idx], ...payload }
  list[idx] = updated
  khachHangSaveAll(list)
  return updated
}

export function khachHangDelete(id: string): boolean {
  const list = khachHangGetAll()
  const next = list.filter((r) => r.id !== id)
  if (next.length === list.length) return false
  khachHangSaveAll(next)
  return true
}

/** Sinh mã tự động — KH0001, KH0002, ... */
export function khachHangSinhMa(): string {
  const list = khachHangGetAll()
  const nums = list
    .map((r) => parseInt(r.ma_kh.replace(/\D/g, ''), 10))
    .filter((n) => !isNaN(n))
  const max = nums.length > 0 ? Math.max(...nums) : 0
  return `KH${String(max + 1).padStart(4, '0')}`
}
