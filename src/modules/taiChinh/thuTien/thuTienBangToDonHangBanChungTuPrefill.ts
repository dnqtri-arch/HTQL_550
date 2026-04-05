/**
 * Map Báo giá → prefill form Đơn hàng bán (ChungTu) — module tách biệt, không import ngược từ thuTienBangForm.
 */

import type { ThuTienBangChiTiet, ThuTienBangRecord } from '../../../types/thuTienBang'
import type { DonHangBanChungTuChiTiet, DonHangBanChungTuRecord } from '../../../types/donHangBanChungTu'

const PREFILL_DON_HANG_BAN_ID = '__prefill_thu_tien_bang__'

function mapAttachments(att: ThuTienBangRecord['attachments']): DonHangBanChungTuRecord['attachments'] {
  if (!att?.length) return undefined
  return att.map((a) => ({ ...a }))
}

/** Chuẩn bị header + chi tiết để mở form ĐHB mới từ một báo giá (đủ trường đồng dạng BG). */
export function buildDonHangBanChungTuPrefillFromThuTienBang(
  row: ThuTienBangRecord,
  chiTiet: ThuTienBangChiTiet[],
  soDonHangTiepTheo: string,
): {
  prefillDhb: Partial<DonHangBanChungTuRecord>
  prefillChiTiet: DonHangBanChungTuChiTiet[]
} {
  const prefillDhb: Partial<DonHangBanChungTuRecord> = {
    loai_khach_hang: row.loai_khach_hang,
    ten_nguoi_lien_he: row.ten_nguoi_lien_he,
    so_dien_thoai_lien_he: row.so_dien_thoai_lien_he,
    tinh_trang: row.tinh_trang,
    ngay_don_hang: row.ngay_thu_tien_bang,
    so_don_hang: soDonHangTiepTheo,
    ngay_giao_hang: row.ngay_giao_hang,
    khach_hang: row.khach_hang,
    dia_chi: row.dia_chi,
    nguoi_giao_hang: row.nguoi_giao_hang,
    ma_so_thue: row.ma_so_thue,
    dien_giai: row.dien_giai,
    nv_ban_hang: row.nv_ban_hang,
    dieu_khoan_tt: row.dieu_khoan_tt,
    so_ngay_duoc_no: row.so_ngay_duoc_no,
    dieu_khoan_khac: row.dieu_khoan_khac,
    tong_tien_hang: row.tong_tien_hang,
    tong_thue_gtgt: row.tong_thue_gtgt,
    tong_thanh_toan: row.tong_thanh_toan,
    ap_dung_vat_gtgt: row.ap_dung_vat_gtgt,
    tl_ck: row.tl_ck,
    tien_ck: row.tien_ck,
    so_dien_thoai: row.so_dien_thoai,
    so_chung_tu_cukcuk: row.so_chung_tu_cukcuk,
    bao_gia_id: row.id,
    so_bao_gia_goc: row.so_thu_tien_bang,
    doi_chieu_don_mua_id: row.doi_chieu_don_mua_id,
    attachments: mapAttachments(row.attachments),
    hinh_thuc: row.hinh_thuc,
    dia_chi_cong_trinh: row.dia_chi_cong_trinh,
    chung_tu_mua_loai_chung_tu: row.chung_tu_mua_loai_chung_tu,
    chung_tu_mua_chua_thanh_toan: row.chung_tu_mua_chua_thanh_toan,
    chung_tu_mua_thanh_toan_ngay: row.chung_tu_mua_thanh_toan_ngay,
    chung_tu_mua_pttt: row.chung_tu_mua_pttt,
    chung_tu_mua_ck: row.chung_tu_mua_ck,
    chung_tu_mua_loai_hd: row.chung_tu_mua_loai_hd,
    chung_tu_mua_so_hoa_don: row.chung_tu_mua_so_hoa_don,
    hoa_don_ngay: row.hoa_don_ngay,
    hoa_don_ky_hieu: row.hoa_don_ky_hieu,
    mau_hoa_don_ma: row.mau_hoa_don_ma,
    mau_hoa_don_ten: row.mau_hoa_don_ten,
    phieu_chi_ngay: row.phieu_chi_ngay,
    phieu_chi_nha_cung_cap: row.phieu_chi_nha_cung_cap,
    phieu_chi_dia_chi: row.phieu_chi_dia_chi,
    phieu_chi_nguoi_nhan_tien: row.phieu_chi_nguoi_nhan_tien,
    phieu_chi_ly_do: row.phieu_chi_ly_do,
    phieu_chi_tai_khoan_chi: row.phieu_chi_tai_khoan_chi,
    phieu_chi_ngan_hang_chi: row.phieu_chi_ngan_hang_chi,
    phieu_chi_ten_nguoi_gui: row.phieu_chi_ten_nguoi_gui,
    phieu_chi_tai_khoan_nhan: row.phieu_chi_tai_khoan_nhan,
    phieu_chi_ngan_hang_nhan: row.phieu_chi_ngan_hang_nhan,
    phieu_chi_ten_chu_tk_nhan: row.phieu_chi_ten_chu_tk_nhan,
    phieu_chi_ngan_hang: row.phieu_chi_ngan_hang,
    phieu_chi_ten_nguoi_nhan_ck: row.phieu_chi_ten_nguoi_nhan_ck,
    phieu_chi_attachments: row.phieu_chi_attachments?.map((a) => ({ ...a })),
  }

  const prefillChiTiet: DonHangBanChungTuChiTiet[] = chiTiet.map((c, i) => ({
    id: `prefill-ct-${i}`,
    don_hang_ban_id: PREFILL_DON_HANG_BAN_ID,
    stt: c.stt,
    ma_hang: c.ma_hang,
    ten_hang: c.ten_hang,
    ma_quy_cach: c.ma_quy_cach,
    dvt: c.dvt,
    chieu_dai: c.chieu_dai,
    chieu_rong: c.chieu_rong,
    chieu_cao: c.chieu_cao,
    ban_kinh: c.ban_kinh,
    luong: c.luong,
    so_luong: c.so_luong,
    so_luong_nhan: c.so_luong_nhan,
    don_gia: c.don_gia,
    thanh_tien: c.thanh_tien,
    pt_thue_gtgt: c.pt_thue_gtgt,
    tien_thue_gtgt: c.tien_thue_gtgt,
    lenh_san_xuat: c.lenh_san_xuat,
    noi_dung: c.noi_dung,
    ghi_chu: c.ghi_chu,
  }))

  return { prefillDhb, prefillChiTiet }
}

/** Bản sao ĐHB đã lưu → prefill thêm mới (số chứng từ mới, bỏ id bản ghi). */
export function buildDonHangBanChungTuPrefillCloneFromSaved(
  row: DonHangBanChungTuRecord,
  chiTiet: DonHangBanChungTuChiTiet[],
  soDonHangTiepTheo: string,
): {
  prefillDhb: Partial<DonHangBanChungTuRecord>
  prefillChiTiet: DonHangBanChungTuChiTiet[]
} {
  const { id: _id, ...rest } = row
  const prefillDhb: Partial<DonHangBanChungTuRecord> = { ...rest, so_don_hang: soDonHangTiepTheo }
  const prefillChiTiet: DonHangBanChungTuChiTiet[] = chiTiet.map((c, i) => ({
    ...c,
    id: `prefill-clone-${i}`,
    don_hang_ban_id: PREFILL_DON_HANG_BAN_ID,
  }))
  return { prefillDhb, prefillChiTiet }
}
