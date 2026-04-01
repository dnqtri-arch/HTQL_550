/**
 * Lịch sử bán theo tên khách (báo giá / đơn hàng bán / HĐ nguyên tắc) — đọc API mock local.
 */

import { thuTienBangGetAll, thuTienBangGetChiTiet } from './thuTienBangApi'
import { donHangBanGetAll, donHangBanGetChiTiet } from '../../crm/banHang/donHangBan/donHangBanChungTuApi'
import { hopDongBanChungTuGetAll, hopDongBanChungTuGetChiTiet } from '../../crm/banHang/hopDongBan/hopDongBanChungTuApi'
import type {
  ThuTienBangFilter,
  ThuTienBangRecord,
  ThuTienBangChiTiet,
} from '../../../types/thuTienBang'
import type {
  DonHangBanChungTuFilter,
  DonHangBanChungTuRecord,
  DonHangBanChungTuChiTiet,
} from '../../../types/donHangBanChungTu'
import type {
  HopDongBanChungTuFilter,
  HopDongBanChungTuRecord,
  HopDongBanChungTuChiTiet,
} from '../../../types/hopDongBanChungTu'

const BAO_GIA_ALL: ThuTienBangFilter = { ky: 'tat-ca', tu: '', den: '' }
const DON_HANG_BAN_ALL: DonHangBanChungTuFilter = { ky: 'tat-ca', tu: '', den: '' }
const HOP_DONG_BAN_CHUNG_TU_ALL: HopDongBanChungTuFilter = { ky: 'tat-ca', tu: '', den: '' }

function normTen(s: string): string {
  return s.trim().toLowerCase()
}

function khachKhop(khRecord: string, khDisplay: string): boolean {
  return normTen(khRecord) === normTen(khDisplay)
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
  thuTienBang: LichSuBanHangMuc[]
  donHangBan: LichSuBanHangMuc[]
  hopDong: LichSuBanHangMuc[]
}

/** Tối đa 3 giao dịch gần nhất mỗi loại; có thể loại báo giá đang sửa. */
export function layLichSuThuTienChoKhach(
  khachHangTen: string,
  options?: { excludeThuTienBangId?: string; excludeDonHangBanId?: string }
): LichSuBanHangNhom | null {
  const t = khachHangTen.trim()
  if (!t) return null

  const allBg = thuTienBangGetAll(BAO_GIA_ALL)
  const thuTienBang = allBg
    .filter((r: ThuTienBangRecord) => khachKhop(r.khach_hang, t) && r.id !== options?.excludeThuTienBangId)
    .sort((a: ThuTienBangRecord, b: ThuTienBangRecord) =>
      (b.ngay_thu_tien_bang ?? '').localeCompare(a.ngay_thu_tien_bang ?? ''),
    )
    .slice(0, 3)
    .map((r: ThuTienBangRecord) => {
      const ct = thuTienBangGetChiTiet(r.id)
      return {
        id: r.id,
        tenHienThi: r.so_thu_tien_bang,
        tongThanhToan: r.tong_thanh_toan,
        chiTiet: ct.map((c: ThuTienBangChiTiet) => ({
          ten_hang: c.ten_hang,
          dvt: c.dvt,
          so_luong: c.so_luong,
          don_gia: c.don_gia,
        })),
      }
    })

  const allDhb = donHangBanGetAll(DON_HANG_BAN_ALL)
  const donHangBan = allDhb
    .filter((r: DonHangBanChungTuRecord) => khachKhop(r.khach_hang, t) && r.id !== options?.excludeDonHangBanId)
    .sort((a: DonHangBanChungTuRecord, b: DonHangBanChungTuRecord) =>
      (b.ngay_don_hang ?? '').localeCompare(a.ngay_don_hang ?? ''),
    )
    .slice(0, 3)
    .map((r: DonHangBanChungTuRecord) => {
      const ct = donHangBanGetChiTiet(r.id)
      return {
        id: r.id,
        tenHienThi: r.so_don_hang,
        tongThanhToan: r.tong_thanh_toan,
        chiTiet: ct.map((c: DonHangBanChungTuChiTiet) => ({
          ten_hang: c.ten_hang,
          dvt: c.dvt,
          so_luong: c.so_luong,
          don_gia: c.don_gia,
        })),
      }
    })

  const allHd = hopDongBanChungTuGetAll(HOP_DONG_BAN_CHUNG_TU_ALL)
  const hopDong = allHd
    .filter((r: HopDongBanChungTuRecord) => khachKhop(r.khach_hang, t))
    .sort((a: HopDongBanChungTuRecord, b: HopDongBanChungTuRecord) =>
      (b.ngay_lap_hop_dong ?? '').localeCompare(a.ngay_lap_hop_dong ?? ''),
    )
    .slice(0, 3)
    .map((r: HopDongBanChungTuRecord) => ({
      id: r.id,
      tenHienThi: r.so_hop_dong,
      tongThanhToan: r.tong_thanh_toan,
      chiTiet: hopDongBanChungTuGetChiTiet(r.id).map((c: HopDongBanChungTuChiTiet) => ({
        ten_hang: c.ten_hang,
        dvt: c.dvt,
        so_luong: c.so_luong,
        don_gia: c.don_gia,
      })),
    }))

  return { thuTienBang, donHangBan, hopDong }
}

export function coLichSuThuTien(n: LichSuBanHangNhom | null): boolean {
  if (!n) return false
  return n.thuTienBang.length > 0 || n.donHangBan.length > 0 || n.hopDong.length > 0
}
