import type { DonHangMuaRecord, DonHangMuaChiTiet } from '../../crm/muaHang/donHangMua/donHangMuaApi'

/** Map header ĐHM → form Nhận vật tư hàng hóa (prefill từ tab Đơn hàng mua). */
export function buildPrefillDonHeaderTuDhm(don: DonHangMuaRecord): Partial<DonHangMuaRecord> & {
  hinh_thuc?: string
  kho_nhap_id?: string
  ten_cong_trinh?: string
  dia_chi_cong_trinh?: string
  _tieu_de_nguon_dhm?: string
} {
  const ext = don as DonHangMuaRecord & {
    hinh_thuc?: string
    kho_nhap_id?: string
    ten_cong_trinh?: string
    dia_chi_cong_trinh?: string
  }
  const tieuDeDmh = (don.so_chung_tu_cukcuk ?? '').trim() || (don.so_don_hang ? `ĐHM ${don.so_don_hang}` : '')
  return {
    nha_cung_cap: don.nha_cung_cap,
    dia_chi: don.dia_chi,
    nguoi_giao_hang: don.nguoi_giao_hang,
    ma_so_thue: don.ma_so_thue,
    dien_giai: don.dien_giai,
    nv_mua_hang: don.nv_mua_hang,
    dieu_khoan_tt: don.dieu_khoan_tt,
    so_ngay_duoc_no: don.so_ngay_duoc_no,
    dia_diem_giao_hang: don.dia_diem_giao_hang,
    dieu_khoan_khac: don.dieu_khoan_khac,
    ngay_giao_hang: don.ngay_giao_hang,
    tinh_trang: 'Chưa thực hiện',
    /** Ô Tiêu đề phiếu nhận = tiêu đề đơn mua (cùng nguồn với thanh tiêu đề `_tieu_de_nguon_dhm`). */
    so_chung_tu_cukcuk: tieuDeDmh || undefined,
    doi_chieu_don_mua_id: don.id,
    hinh_thuc: ext.hinh_thuc,
    kho_nhap_id: ext.kho_nhap_id,
    ten_cong_trinh: ext.ten_cong_trinh,
    dia_chi_cong_trinh: ext.dia_chi_cong_trinh,
    _tieu_de_nguon_dhm: tieuDeDmh,
    attachments: don.attachments?.length ? don.attachments.map((a) => ({ ...a })) : undefined,
  }
}

export type NhanVatTuHangHoaPrefillDon = Partial<DonHangMuaRecord> & {
  hinh_thuc?: string
  kho_nhap_id?: string
  ten_cong_trinh?: string
  dia_chi_cong_trinh?: string
  /** Tiêu đề đơn mua (thanh tiêu đề form phiếu nhận từ ĐHM). */
  _tieu_de_nguon_dhm?: string
}

export type NhanVatTuHangHoaPrefillPayload = { don: NhanVatTuHangHoaPrefillDon; chiTiet: DonHangMuaChiTiet[] }
