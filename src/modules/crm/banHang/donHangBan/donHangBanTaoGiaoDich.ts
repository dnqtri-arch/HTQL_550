/**
 * Tạo giao dịch từ Đơn hàng bán — logic cục bộ module donHangBan (không import từ baoGia).
 * Hợp đồng bán: payload cùng cấu trúc với hopDongBan (đọc qua localStorage riêng).
 */

import type { DonHangBanChungTuRecord, DonHangBanChungTuChiTiet } from '../../../../types/donHangBanChungTu'

/** Khác key với báo giá — tránh ghi đè nháp. */
export const STORAGE_HOP_DONG_BAN_FROM_DON_HANG_BAN = 'htql_hop_dong_ban_from_donhangban'

export type HopDongBanDraftTuDonHangBan = {
  khach_hang: string
  dien_giai?: string
  nv_ban_hang?: string
  han_muc_gia_tri: number
  chi_tiet: Array<{
    ma_hang: string
    ten_hang: string
    dvt: string
    so_luong: number
    don_gia: number
    thanh_tien: number
    pt_thue_gtgt: number | null
    tien_thue_gtgt: number | null
    ghi_chu: string
  }>
}

export function buildHopDongBanDraftTuDonHangBan(
  row: DonHangBanChungTuRecord,
  chiTiet: DonHangBanChungTuChiTiet[]
): HopDongBanDraftTuDonHangBan {
  const tongHang = chiTiet.reduce((s, c) => s + (Number(c.thanh_tien) || 0), 0)
  const tongThue = chiTiet.reduce((s, c) => s + (c.tien_thue_gtgt != null ? Number(c.tien_thue_gtgt) : 0), 0)
  const hanMuc = tongHang + tongThue || row.tong_thanh_toan
  return {
    khach_hang: row.khach_hang,
    dien_giai: row.dien_giai ?? '',
    nv_ban_hang: row.nv_ban_hang ?? '',
    han_muc_gia_tri: hanMuc,
    chi_tiet: chiTiet.map((c) => ({
      ma_hang: c.ma_hang,
      ten_hang: c.ten_hang,
      dvt: c.dvt,
      so_luong: c.so_luong,
      don_gia: c.don_gia,
      thanh_tien: Math.round(c.thanh_tien),
      pt_thue_gtgt: c.pt_thue_gtgt,
      tien_thue_gtgt: c.tien_thue_gtgt != null ? Math.round(c.tien_thue_gtgt) : null,
      ghi_chu: c.ghi_chu ?? '',
    })),
  }
}
