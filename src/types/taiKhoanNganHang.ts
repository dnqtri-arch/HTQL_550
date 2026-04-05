export interface TaiKhoanNganHangRecord {
  id: string
  /** Thuộc công ty / chi nhánh — danh mục sẽ cấu hình sau (placeholder). */
  thuoc_cty_cn: string
  so_tai_khoan: string
  /** Tên ngân hàng — nhập có gợi ý (datalist), không bắt buộc trùng danh mục cố định. */
  ten_ngan_hang: string
  chu_tai_khoan: string
  ngam_dinh_khi: string
  dien_giai: string
}
