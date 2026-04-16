export interface TaiKhoanRecord {
  id: string
  /** Tài khoản dùng cho giao dịch ngân hàng (ô tick). */
  la_tai_khoan_ngan_hang?: boolean
  /** Tài khoản tiền mặt / quỹ (ô tick). */
  la_tien_mat?: boolean
  /** Thuộc công ty / chi nhánh — danh mục sẽ cấu hình sau (placeholder). */
  thuoc_cty_cn: string
  so_tai_khoan: string
  /**
   * Ngân hàng: tên NH; Tiền mặt: «tên tài khoản» (cùng trường, nhãn đổi theo ô tick).
   */
  ten_ngan_hang: string
  /**
   * Nhiều mục «Ngầm định khi» — chuỗi nối bằng HTQL (xem `encodeNgamDinhKhiList` / `decodeNgamDinhKhiList`).
   */
  ngam_dinh_khi: string
  dien_giai: string
  /**
   * Số dư đầu kỳ (lưu trữ mock, khóa `so_du_hien_tai` giữ tương thích JSON cũ).
   * Giới hạn chuyển tiền rút/nộp; thiếu = không giới hạn khi kiểm tra.
   */
  so_du_hien_tai?: number
  /** @deprecated Đã bỏ khỏi form — đọc dữ liệu cũ. */
  chu_tai_khoan?: string
}
