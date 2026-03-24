/** Đính kèm chứng từ trong phiếu Nhận vật tư hàng hóa. */
export interface NhanVatTuHangHoaAttachmentItem {
  id: string
  ten_file: string
  loai_file: string
  url?: string
  kieu: 'anh' | 'pdf' | 'khac'
  ngay_dinh_kem?: string
  ghi_chu?: string
}
