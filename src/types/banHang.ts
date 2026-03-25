/**
 * Domain types — Phân hệ Bán hàng.
 * Tất cả interface bán hàng dùng chung từ đây; không nhân đôi trong module.
 */

// ─── Danh mục Khách hàng ───────────────────────────────────────────────────

export interface KhachHangRecord {
  id: string
  ma_kh: string
  ten_kh: string
  dia_chi?: string
  ma_so_thue?: string
  email?: string
  dien_thoai?: string
  nhom_kh_ncc?: string
  dieu_khoan_tt?: string
  so_ngay_duoc_no?: string
  so_no_toi_da?: string
  ghi_chu?: string
  /** Khách hàng đồng thời là Nhà cung cấp */
  isNhaCungCap: boolean
}

// ─── Báo giá ──────────────────────────────────────────────────────────────

export type BaoGiaTinhTrang = 'Chờ duyệt' | 'Đã gửi khách' | 'Đã chốt' | 'Hủy bỏ'

export interface BaoGiaRecord {
  id: string
  so_bao_gia: string
  ngay_bao_gia: string
  ngay_het_han: string | null
  khach_hang: string
  dia_chi_kh?: string
  ma_so_thue_kh?: string
  nguoi_lien_he?: string
  dien_giai?: string
  tong_tien_hang: number
  tong_thue_gtgt: number
  tong_thanh_toan: number
  tinh_trang: BaoGiaTinhTrang
  ghi_chu?: string
  nv_ban_hang?: string
}

export interface BaoGiaChiTiet {
  id: string
  bao_gia_id: string
  stt?: number
  ma_hang: string
  ten_hang: string
  dvt: string
  /** Công thức tính SL, ví dụ "Dài * Rộng" */
  cong_thuc_tinh_sl?: string
  /** Tham số 1 (Dài) khi có công thức */
  tham_so_1?: number
  /** Tham số 2 (Rộng) khi có công thức */
  tham_so_2?: number
  so_luong: number
  don_gia: number
  thanh_tien: number
  pt_thue_gtgt: number | null
  tien_thue_gtgt: number | null
  ghi_chu?: string
}

export interface BaoGiaCreatePayload {
  so_bao_gia: string
  ngay_bao_gia: string
  ngay_het_han: string | null
  khach_hang: string
  dia_chi_kh?: string
  ma_so_thue_kh?: string
  nguoi_lien_he?: string
  dien_giai?: string
  tong_tien_hang: number
  tong_thue_gtgt: number
  tong_thanh_toan: number
  tinh_trang: BaoGiaTinhTrang
  ghi_chu?: string
  nv_ban_hang?: string
  chi_tiet: Omit<BaoGiaChiTiet, 'id' | 'bao_gia_id'>[]
}

// ─── Đơn hàng bán ─────────────────────────────────────────────────────────

export type DonHangBanTinhTrang = 'Chưa thực hiện' | 'Đang thực hiện' | 'Đã xuất kho' | 'Hủy bỏ'

export interface DonHangBanRecord {
  id: string
  so_don_hang: string
  ngay_don_hang: string
  ngay_giao_hang: string | null
  khach_hang: string
  dia_chi?: string
  ma_so_thue?: string
  dien_giai?: string
  tong_tien_hang: number
  tong_thue_gtgt: number
  tong_thanh_toan: number
  tinh_trang: DonHangBanTinhTrang
  ghi_chu?: string
  nv_ban_hang?: string
  bao_gia_id?: string
  so_bao_gia_goc?: string
  phieu_xuat_kho_ids?: string[]
}

export interface DonHangBanChiTiet {
  id: string
  don_hang_ban_id: string
  stt?: number
  ma_hang: string
  ten_hang: string
  dvt: string
  so_luong: number
  don_gia: number
  thanh_tien: number
  pt_thue_gtgt: number | null
  tien_thue_gtgt: number | null
  ghi_chu?: string
}

export interface DonHangBanCreatePayload {
  so_don_hang: string
  ngay_don_hang: string
  ngay_giao_hang: string | null
  khach_hang: string
  dia_chi?: string
  ma_so_thue?: string
  dien_giai?: string
  tong_tien_hang: number
  tong_thue_gtgt: number
  tong_thanh_toan: number
  tinh_trang: DonHangBanTinhTrang
  ghi_chu?: string
  nv_ban_hang?: string
  bao_gia_id?: string
  so_bao_gia_goc?: string
  chi_tiet: Omit<DonHangBanChiTiet, 'id' | 'don_hang_ban_id'>[]
}

// ─── Hợp đồng nguyên tắc (bán hàng) ──────────────────────────────────────

export type HopDongBanTinhTrang = 'Chưa hiệu lực' | 'Đang hiệu lực' | 'Hết hạn' | 'Hủy bỏ'

export interface HopDongBanRecord {
  id: string
  so_hop_dong: string
  ngay_ky: string
  ngay_hieu_luc: string
  ngay_het_han: string
  khach_hang: string
  han_muc_gia_tri: number
  gia_tri_da_su_dung: number
  dien_giai?: string
  tinh_trang: HopDongBanTinhTrang
  ghi_chu?: string
  nv_ban_hang?: string
}

export interface HopDongBanChiTiet {
  id: string
  hop_dong_ban_id: string
  stt?: number
  ma_hang: string
  ten_hang: string
  dvt: string
  so_luong: number
  don_gia: number
  thanh_tien: number
  pt_thue_gtgt: number | null
  tien_thue_gtgt: number | null
  ghi_chu?: string
}

export interface HopDongBanCreatePayload {
  so_hop_dong: string
  ngay_ky: string
  ngay_hieu_luc: string
  ngay_het_han: string
  khach_hang: string
  han_muc_gia_tri: number
  gia_tri_da_su_dung: number
  dien_giai?: string
  tinh_trang: HopDongBanTinhTrang
  ghi_chu?: string
  nv_ban_hang?: string
  chi_tiet: Omit<HopDongBanChiTiet, 'id' | 'hop_dong_ban_id'>[]
}

// ─── Hóa đơn bán ──────────────────────────────────────────────────────────

export type HoaDonBanTinhTrang = 'Chưa thanh toán' | 'Thanh toán 1 phần' | 'Đã thanh toán' | 'Hủy bỏ'

export interface HoaDonBanRecord {
  id: string
  so_hoa_don: string
  ngay_hoa_don: string
  khach_hang: string
  dia_chi?: string
  ma_so_thue?: string
  dien_giai?: string
  tong_tien_hang: number
  tong_thue_gtgt: number
  tong_thanh_toan: number
  so_tien_da_thu: number
  con_lai: number
  tinh_trang: HoaDonBanTinhTrang
  ghi_chu?: string
  nv_ban_hang?: string
  don_hang_ban_id?: string
  so_don_hang_goc?: string
  hop_dong_ban_id?: string
  so_hop_dong_goc?: string
}

export interface HoaDonBanChiTiet {
  id: string
  hoa_don_ban_id: string
  stt?: number
  ma_hang: string
  ten_hang: string
  dvt: string
  so_luong: number
  don_gia: number
  thanh_tien: number
  pt_thue_gtgt: number | null
  tien_thue_gtgt: number | null
  ghi_chu?: string
}

export interface HoaDonBanCreatePayload {
  so_hoa_don: string
  ngay_hoa_don: string
  khach_hang: string
  dia_chi?: string
  ma_so_thue?: string
  dien_giai?: string
  tong_tien_hang: number
  tong_thue_gtgt: number
  tong_thanh_toan: number
  so_tien_da_thu: number
  con_lai: number
  tinh_trang: HoaDonBanTinhTrang
  ghi_chu?: string
  nv_ban_hang?: string
  don_hang_ban_id?: string
  so_don_hang_goc?: string
  hop_dong_ban_id?: string
  so_hop_dong_goc?: string
  chi_tiet: Omit<HoaDonBanChiTiet, 'id' | 'hoa_don_ban_id'>[]
}

// ─── Trả lại hàng bán ─────────────────────────────────────────────────────

export type TraLaiHangBanTinhTrang = 'Chờ xử lý' | 'Đã hoàn kho' | 'Đã trả tiền' | 'Hủy bỏ'

export interface TraLaiHangBanRecord {
  id: string
  so_phieu_tra: string
  ngay_tra: string
  khach_hang: string
  dien_giai?: string
  tong_tien_hang: number
  tong_thue_gtgt: number
  tong_thanh_toan: number
  tinh_trang: TraLaiHangBanTinhTrang
  hoa_don_ban_id?: string
  so_hoa_don_goc?: string
  hoan_kho: boolean
  ghi_chu?: string
}

export interface TraLaiHangBanChiTiet {
  id: string
  tra_lai_hang_ban_id: string
  stt?: number
  ma_hang: string
  ten_hang: string
  dvt: string
  so_luong: number
  don_gia: number
  thanh_tien: number
  pt_thue_gtgt: number | null
  tien_thue_gtgt: number | null
  ghi_chu?: string
}

// ─── Phiếu thu tiền khách hàng ────────────────────────────────────────────

export interface PhieuThuKhachHangRecord {
  id: string
  so_phieu: string
  ngay_thu: string
  khach_hang: string
  so_tien: number
  dien_giai?: string
  hoa_don_ban_id?: string
  so_hoa_don_lien_quan?: string
}

// ─── Bộ lọc chung ─────────────────────────────────────────────────────────

export type BanHangKyValue =
  | 'thang_nay'
  | 'thang_truoc'
  | 'quy_nay'
  | 'quy_truoc'
  | 'nam_nay'
  | 'tat_ca'

export interface BanHangFilter {
  ky: BanHangKyValue
  tu: string
  den: string
  tim_kiem?: string
}
