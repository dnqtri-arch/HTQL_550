/**
 * Phải trả người bán — Công nợ NCC — viết liền (camelCase)
 * Tự động tạo khi phiếu Nhận VTHH chuyển sang "Đã nhập kho".
 */

export type TinhTrangCongNo = 'chuathanhtoan' | 'thanhtoanmot' | 'dathanhtoan'

export interface PhaiTraNguoiBan {
  id: string
  /** Số phiếu NVTHH nguồn */
  sophieu: string
  /** ID phiếu NVTHH để tra cứu */
  nguonid: string
  /** Tên nhà cung cấp */
  tenncc: string
  /** Ngày phát sinh (ngày nhập kho) */
  ngayphat: string
  /** Hạn thanh toán = ngayphat + so_ngay_duoc_no */
  hanthanhtoan: string
  /** Tổng số tiền phải trả */
  sotien: number
  /** Số tiền còn phải thanh toán */
  sotiencon: number
  tinhTrang: TinhTrangCongNo
  /** Phương thức thanh toán (tien_mat / chuyen_khoan / ...) */
  pttt: string
  /** Tài khoản/quỹ dùng để thanh toán */
  taikhoanchi: string
  ghichu: string
  created: string
}

export interface PhaiTraNguoiBanCreatePayload {
  sophieu: string
  nguonid: string
  tenncc: string
  ngayphat: string
  hanthanhtoan: string
  sotien: number
  pttt: string
  taikhoanchi: string
  ghichu: string
}
