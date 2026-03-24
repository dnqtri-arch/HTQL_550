/**
 * Domain types — Danh mục Khách hàng (Phân hệ Bán hàng).
 * Độc lập hoàn toàn với `nhaCungCapApi` / purchase module.
 * Tuân thủ htql-core-standards.mdc: viết liền, không gạch ngang.
 */

// ─── Kiểu phân loại ─────────────────────────────────────────────────────────
export type LoaiKhachHang = 'to_chuc' | 'ca_nhan'
export type LoaiTaiKhoanNganHangKh = 'cong_ty' | 'ca_nhan'

// ─── Tài khoản ngân hàng (dùng cho KH) ──────────────────────────────────────
export interface TaiKhoanNganHangKhItem {
  so_tai_khoan: string
  ten_ngan_hang: string
  chi_nhanh: string
  tinh_tp_ngan_hang: string
  loai_tk?: LoaiTaiKhoanNganHangKh
  ten_nguoi_nhan?: string
}

// ─── Nhóm Khách hàng ────────────────────────────────────────────────────────
export interface NhomKhachHangItem {
  ma: string
  ten: string
}

// ─── Điều khoản thanh toán (dùng trong KhachHang) ───────────────────────────
export interface DieuKhoanThanhToanKhItem {
  ma: string
  ten: string
  so_ngay_duoc_no: number
  so_cong_no_toi_da: number
}

// ─── Bản ghi Khách hàng ─────────────────────────────────────────────────────
export interface KhachHangRecord {
  id: number
  /** Mã khách hàng — duy nhất trong hệ thống Bán hàng */
  ma_kh: string
  /** Tên khách hàng */
  ten_kh: string
  /** Loại: Tổ chức hoặc Cá nhân */
  loai_kh: LoaiKhachHang
  /** Đồng thời là Nhà cung cấp (lưỡng tính) */
  isNhaCungCap: boolean
  /** Địa chỉ */
  dia_chi?: string
  /** Nhóm KH */
  nhom_kh?: string
  /** Mã số thuế */
  ma_so_thue?: string
  /** Mã đơn vị quan hệ ngân sách */
  ma_dvqhns?: string
  /** Điện thoại */
  dien_thoai?: string
  /** Fax */
  fax?: string
  /** Email */
  email?: string
  /** Website */
  website?: string
  /** Diễn giải */
  dien_giai?: string
  /** Điều khoản thanh toán (tên DKTT) */
  dieu_khoan_tt?: string
  /** Số ngày được nợ (ngày) */
  so_ngay_duoc_no?: number
  /** Hạn mức nợ khách hàng (số tiền tối đa) */
  han_muc_no_kh?: number
  /** Nhân viên bán hàng phụ trách */
  nv_ban_hang?: string
  /** TK ngân hàng đầu tiên (đồng bộ từ bảng) */
  tk_ngan_hang?: string
  ten_ngan_hang?: string
  /** Người liên hệ chính */
  nguoi_lien_he?: string
  /** Tài khoản ngân hàng (nhiều dòng) */
  tai_khoan_ngan_hang?: TaiKhoanNganHangKhItem[]
  /** Ngừng theo dõi */
  ngung_theo_doi: boolean
  /** Vị trí địa lý (Tab Khác) */
  quoc_gia?: string
  tinh_tp?: string
  xa_phuong?: string
  quyen_huyen?: string
  /** Thông tin liên hệ mở rộng */
  xung_ho?: string
  gioi_tinh?: string
  ho_va_ten_lien_he?: string
  chuc_danh?: string
  dt_di_dong?: string
  dtdd_khac?: string
  dt_co_dinh?: string
  dia_chi_lien_he?: string
  dai_dien_theo_pl?: string
  /** Địa điểm giao hàng (nhiều dòng) */
  dia_diem_giao_hang?: string[]
  /** Giấy tờ cá nhân */
  so_ho_chieu?: string
  so_cccd?: string
  ngay_cap?: string
  noi_cap?: string
}
