/** Danh mục «Loại thu/chi» — lý do thu, chi, chuyển tiền (YC94). */
export interface LoaiThuChiRecord {
  id: string
  /** Mã loại (duy nhất, nhập tay). */
  ma: string
  /** Tên hiển thị / nội dung lý do. */
  ten: string
  /** Ghi chú thêm (tùy chọn). */
  ghi_chu?: string
  /** Dùng cho phiếu thu (gợi ý trên form Thu tiền sau này). */
  ap_dung_thu: boolean
  /** Dùng cho phiếu chi. */
  ap_dung_chi: boolean
  /** Dùng cho chuyển tiền / lý do nội bộ chuyển. */
  ap_dung_chuyen_tien: boolean
}
