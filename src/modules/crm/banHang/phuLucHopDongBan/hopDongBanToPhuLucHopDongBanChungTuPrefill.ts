/**
 * Hợp đồng bán gốc → prefill thêm Phụ lục (chỉ header + số PL mới; không copy chi tiết SPHH).
 */
import type { HopDongBanChungTuRecord } from '../../../../types/hopDongBanChungTu'
import type { PhuLucHopDongBanChungTuRecord } from '../../../../types/phuLucHopDongBanChungTu'

function toIsoToday(): string {
  const n = new Date()
  const y = n.getFullYear()
  const m = n.getMonth() + 1
  const d = n.getDate()
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

export function buildPhuLucHopDongBanChungTuPrefillFromHopDongBanGoc(
  hopDongGoc: HopDongBanChungTuRecord,
  soPhuLucTiepTheo: string,
): { prefillHdbCt: Partial<PhuLucHopDongBanChungTuRecord>; prefillChiTiet: [] } {
  const prefillHdbCt: Partial<PhuLucHopDongBanChungTuRecord> = {
    loai_khach_hang: hopDongGoc.loai_khach_hang,
    ten_nguoi_lien_he: hopDongGoc.ten_nguoi_lien_he,
    so_dien_thoai_lien_he: hopDongGoc.so_dien_thoai_lien_he,
    tinh_trang: 'Chưa thực hiện',
    ngay_lap_hop_dong: toIsoToday(),
    so_hop_dong: soPhuLucTiepTheo,
    ngay_cam_ket_giao: hopDongGoc.ngay_cam_ket_giao,
    khach_hang: hopDongGoc.khach_hang,
    dia_chi: hopDongGoc.dia_chi,
    dia_chi_nhan_hang: hopDongGoc.dia_chi_nhan_hang,
    nguoi_giao_hang: hopDongGoc.nguoi_giao_hang,
    ma_so_thue: hopDongGoc.ma_so_thue,
    dien_giai: hopDongGoc.dien_giai,
    nv_ban_hang: hopDongGoc.nv_ban_hang,
    dieu_khoan_tt: hopDongGoc.dieu_khoan_tt,
    so_ngay_duoc_no: hopDongGoc.so_ngay_duoc_no,
    dieu_khoan_khac: hopDongGoc.dieu_khoan_khac,
    tong_tien_hang: 0,
    tong_thue_gtgt: 0,
    tong_thanh_toan: 0,
    ap_dung_vat_gtgt: hopDongGoc.ap_dung_vat_gtgt !== false,
    hop_dong_nguyen_tac: hopDongGoc.hop_dong_nguyen_tac,
    tl_ck: hopDongGoc.tl_ck,
    tien_ck: undefined,
    so_dien_thoai: hopDongGoc.so_dien_thoai,
    so_chung_tu_cukcuk: hopDongGoc.so_chung_tu_cukcuk,
    bao_gia_id: hopDongGoc.bao_gia_id,
    so_bao_gia_goc: hopDongGoc.so_bao_gia_goc,
    hop_dong_ban_chung_tu_goc_id: hopDongGoc.id,
    doi_chieu_don_mua_id: hopDongGoc.doi_chieu_don_mua_id,
    attachments: undefined,
    hinh_thuc: hopDongGoc.hinh_thuc,
    dia_chi_cong_trinh: hopDongGoc.dia_chi_cong_trinh,
  }

  return { prefillHdbCt, prefillChiTiet: [] }
}
