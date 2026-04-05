/**
 * Lịch sử bán theo tên khách (báo giá / đơn hàng bán / HĐ nguyên tắc) — đọc API mock local.
 */

import { baoGiaGetAll, baoGiaGetChiTiet } from './baoGiaApi'
import { donHangBanGetAll, donHangBanGetChiTiet } from '../donHangBan/donHangBanChungTuApi'
import { hopDongBanChungTuGetAll, hopDongBanChungTuGetChiTiet } from '../hopDongBan/hopDongBanChungTuApi'
import type { BaoGiaFilter } from '../../../../types/baoGia'
import type { DonHangBanChungTuFilter } from '../../../../types/donHangBanChungTu'
import type { HopDongBanChungTuFilter } from '../../../../types/hopDongBanChungTu'

const BAO_GIA_ALL: BaoGiaFilter = { ky: 'tat-ca', tu: '', den: '' }
const DON_HANG_BAN_ALL: DonHangBanChungTuFilter = { ky: 'tat-ca', tu: '', den: '' }
const HOP_DONG_BAN_CHUNG_TU_ALL: HopDongBanChungTuFilter = { ky: 'tat-ca', tu: '', den: '' }

function normTen(s: string): string {
  return s.trim().toLowerCase()
}

function khachKhop(khRecord: string, khDisplay: string): boolean {
  return normTen(khRecord) === normTen(khDisplay)
}

/** Mã chứa đoạn `/BG/` là mã báo giá — không dùng làm mã ĐHB/HĐ (tránh hiển thị nhầm trong lịch sử). */
function laMaCoDoanBaoGia(so: string): boolean {
  return /\/BG\//i.test((so ?? '').trim())
}

export type LichSuBanHangDongChiTiet = {
  ten_hang: string
  dvt: string
  so_luong: number
  don_gia: number
}

export type LichSuBanHangMuc = {
  id: string
  tenHienThi: string
  tongThanhToan: number
  chiTiet: LichSuBanHangDongChiTiet[]
}

export type LichSuBanHangNhom = {
  baoGia: LichSuBanHangMuc[]
  donHangBan: LichSuBanHangMuc[]
  hopDong: LichSuBanHangMuc[]
}

/** Tối đa 3 giao dịch gần nhất mỗi loại; có thể loại báo giá đang sửa. */
export function layLichSuBanChoKhach(
  khachHangTen: string,
  options?: { excludeBaoGiaId?: string; excludeDonHangBanId?: string }
): LichSuBanHangNhom | null {
  const t = khachHangTen.trim()
  if (!t) return null

  const allBg = baoGiaGetAll(BAO_GIA_ALL)
  const validBaoGiaIds = new Set(allBg.map((r) => r.id))
  const baoGia = allBg
    .filter((r) => khachKhop(r.khach_hang, t) && r.id !== options?.excludeBaoGiaId && (r.tinh_trang ?? '').trim() !== 'Hủy bỏ')
    .sort((a, b) => (b.ngay_bao_gia ?? '').localeCompare(a.ngay_bao_gia ?? ''))
    .slice(0, 3)
    .map((r) => {
      const ct = baoGiaGetChiTiet(r.id)
      return {
        id: r.id,
        tenHienThi: r.so_bao_gia,
        tongThanhToan: r.tong_thanh_toan,
        chiTiet: ct.map((c) => ({
          ten_hang: c.ten_hang,
          dvt: c.dvt,
          so_luong: c.so_luong,
          don_gia: c.don_gia,
        })),
      }
    })

  const allDhb = donHangBanGetAll(DON_HANG_BAN_ALL)
  const donHangBan = allDhb
    .filter((r) => {
      if ((r.tinh_trang ?? '').trim() === 'Hủy bỏ') return false
      const maDh = (r.so_don_hang ?? '').trim()
      if (laMaCoDoanBaoGia(maDh)) return false
      if (!khachKhop(r.khach_hang, t) || r.id === options?.excludeDonHangBanId) return false
      const bid = (r.bao_gia_id ?? '').trim()
      if (bid && !validBaoGiaIds.has(bid)) return false
      return true
    })
    .sort((a, b) => (b.ngay_don_hang ?? '').localeCompare(a.ngay_don_hang ?? ''))
    .slice(0, 3)
    .map((r) => {
      const ct = donHangBanGetChiTiet(r.id)
      return {
        id: r.id,
        tenHienThi: r.so_don_hang,
        tongThanhToan: r.tong_thanh_toan,
        chiTiet: ct.map((c) => ({
          ten_hang: c.ten_hang,
          dvt: c.dvt,
          so_luong: c.so_luong,
          don_gia: c.don_gia,
        })),
      }
    })

  const allHd = hopDongBanChungTuGetAll(HOP_DONG_BAN_CHUNG_TU_ALL)
  const hopDong = allHd
    .filter((r) => {
      if ((r.tinh_trang ?? '').trim() === 'Hủy bỏ') return false
      const maHd = (r.so_hop_dong ?? '').trim()
      if (laMaCoDoanBaoGia(maHd)) return false
      if (!khachKhop(r.khach_hang, t)) return false
      const bid = (r.bao_gia_id ?? '').trim()
      if (bid && !validBaoGiaIds.has(bid)) return false
      return true
    })
    .sort((a, b) => (b.ngay_lap_hop_dong ?? '').localeCompare(a.ngay_lap_hop_dong ?? ''))
    .slice(0, 3)
    .map((r) => ({
      id: r.id,
      tenHienThi: r.so_hop_dong,
      tongThanhToan: r.tong_thanh_toan,
      chiTiet: hopDongBanChungTuGetChiTiet(r.id).map((c) => ({
        ten_hang: c.ten_hang,
        dvt: c.dvt,
        so_luong: c.so_luong,
        don_gia: c.don_gia,
      })),
    }))

  return { baoGia, donHangBan, hopDong }
}

export function coLichSuBan(n: LichSuBanHangNhom | null): boolean {
  if (!n) return false
  return n.baoGia.length > 0 || n.donHangBan.length > 0 || n.hopDong.length > 0
}
