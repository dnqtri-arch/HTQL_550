import type { DonHangMuaRecord, DonHangMuaChiTiet } from '../../muaHang/donHangMua/donHangMuaApi'
import type { DonHangMuaAttachmentItem } from '../../muaHang/donHangMua/donHangMuaAttachmentTypes'
import type {
  DonHangBanChungTuRecord,
  DonHangBanChungTuChiTiet,
  DonHangBanChungTuAttachmentItem,
} from '../../../../types/donHangBanChungTu'

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
    attachments: don.attachments?.length ? don.attachments.map((a: DonHangMuaAttachmentItem) => ({ ...a })) : undefined,
  }
}

export type GhiNhanDoanhThuPrefillDon = Partial<DonHangMuaRecord> & {
  hinh_thuc?: string
  kho_nhap_id?: string
  ten_cong_trinh?: string
  dia_chi_cong_trinh?: string
  /** Tiêu đề đơn mua (thanh tiêu đề form phiếu nhận từ ĐHM). */
  _tieu_de_nguon_dhm?: string
}

export type GhiNhanDoanhThuPrefillPayload = { don: GhiNhanDoanhThuPrefillDon; chiTiet: DonHangMuaChiTiet[] }

/** Map header ĐHB → shape prefill form phiếu Ghi nhận doanh thu (reuse form ĐHM). */
export function buildPrefillDonHeaderTuDhb(don: DonHangBanChungTuRecord): GhiNhanDoanhThuPrefillDon {
  const tieuDeDhb = (don.so_chung_tu_cukcuk ?? '').trim() || (don.so_don_hang ? `ĐHB ${don.so_don_hang}` : '')
  return {
    nha_cung_cap: don.khach_hang,
    dia_chi: don.dia_chi,
    nguoi_giao_hang: don.nguoi_giao_hang,
    ma_so_thue: don.ma_so_thue,
    dien_giai: don.dien_giai,
    nv_mua_hang: don.nv_ban_hang,
    dieu_khoan_tt: don.dieu_khoan_tt,
    so_ngay_duoc_no: don.so_ngay_duoc_no,
    dia_diem_giao_hang: don.dia_diem_giao_hang,
    dieu_khoan_khac: don.dieu_khoan_khac,
    ngay_giao_hang: don.ngay_giao_hang,
    tinh_trang: 'Chưa thực hiện',
    so_chung_tu_cukcuk: tieuDeDhb || undefined,
    /** Liên kết ĐHB: sau lưu phiếu đồng bộ `tinh_trang` ĐHB = «Đã nhận hàng». */
    doi_chieu_don_mua_id: don.id,
    gia_tri_don_hang: don.tong_thanh_toan,
    ngay_don_hang: don.ngay_don_hang,
    so_don_hang: don.so_don_hang,
    hinh_thuc: don.hinh_thuc,
    dia_chi_cong_trinh: don.dia_chi_cong_trinh,
    chung_tu_mua_loai_chung_tu: don.chung_tu_mua_loai_chung_tu,
    chung_tu_mua_chua_thanh_toan: don.chung_tu_mua_chua_thanh_toan,
    chung_tu_mua_thanh_toan_ngay: don.chung_tu_mua_thanh_toan_ngay,
    chung_tu_mua_pttt: don.chung_tu_mua_pttt,
    chung_tu_mua_ck: don.chung_tu_mua_ck,
    chung_tu_mua_loai_hd: don.chung_tu_mua_loai_hd,
    chung_tu_mua_so_hoa_don: don.chung_tu_mua_so_hoa_don,
    hoa_don_ngay: don.hoa_don_ngay,
    hoa_don_ky_hieu: don.hoa_don_ky_hieu,
    mau_hoa_don_ma: don.mau_hoa_don_ma,
    mau_hoa_don_ten: don.mau_hoa_don_ten,
    phieu_chi_nha_cung_cap: don.phieu_chi_nha_cung_cap,
    phieu_chi_dia_chi: don.phieu_chi_dia_chi,
    phieu_chi_nguoi_nhan_tien: don.phieu_chi_nguoi_nhan_tien,
    phieu_chi_ly_do: don.phieu_chi_ly_do,
    phieu_chi_ngay: don.phieu_chi_ngay,
    phieu_chi_tai_khoan_chi: don.phieu_chi_tai_khoan_chi,
    phieu_chi_ngan_hang_chi: don.phieu_chi_ngan_hang_chi,
    phieu_chi_ten_nguoi_gui: don.phieu_chi_ten_nguoi_gui,
    phieu_chi_tai_khoan_nhan: don.phieu_chi_tai_khoan_nhan,
    phieu_chi_ngan_hang_nhan: don.phieu_chi_ngan_hang_nhan,
    phieu_chi_ten_chu_tk_nhan: don.phieu_chi_ten_chu_tk_nhan,
    phieu_chi_ngan_hang: don.phieu_chi_ngan_hang,
    phieu_chi_ten_nguoi_nhan_ck: don.phieu_chi_ten_nguoi_nhan_ck,
    _tieu_de_nguon_dhm: tieuDeDhb,
    attachments: don.attachments?.length
      ? don.attachments.map((a: DonHangBanChungTuAttachmentItem) => ({
          name: a.name,
          data: a.data,
          saved_at: a.saved_at,
          virtual_path: a.virtual_path,
        })) as DonHangMuaAttachmentItem[]
      : undefined,
  }
}

/** Map chi tiết ĐHB → shape chi tiết form phiếu (cùng interface ĐHM). */
export function mapDhbChiTietToMuaChiTiet(
  rows: DonHangBanChungTuChiTiet[],
  placeholderDonId: string
): DonHangMuaChiTiet[] {
  return rows.map((c, i) => ({
    id: `prefill-dhb-${placeholderDonId}-${i}`,
    don_hang_mua_id: placeholderDonId,
    ma_hang: c.ma_hang,
    ten_hang: c.ten_hang,
    ma_quy_cach: c.ma_quy_cach ?? '',
    dvt: c.dvt,
    chieu_dai: c.chieu_dai ?? 0,
    chieu_rong: c.chieu_rong ?? 0,
    chieu_cao: c.chieu_cao ?? 0,
    ban_kinh: c.ban_kinh ?? 0,
    luong: c.luong ?? 0,
    so_luong: c.so_luong,
    so_luong_nhan: c.so_luong_nhan ?? 0,
    don_gia: c.don_gia,
    thanh_tien: c.thanh_tien,
    pt_thue_gtgt: c.pt_thue_gtgt,
    tien_thue_gtgt: c.tien_thue_gtgt,
    lenh_san_xuat: c.lenh_san_xuat ?? '',
    ghi_chu: c.ghi_chu,
    dd_gh_index: c.dd_gh_index ?? null,
  }))
}
