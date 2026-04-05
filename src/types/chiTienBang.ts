/** Kiểu kỳ lọc danh sách báo giá (đồng bộ với KY_OPTIONS trong chiTienBangApi). */
export type ChiTienBangKyValue = 'tat-ca' | 'tuan-nay' | 'thang-nay' | 'quy-nay' | 'nam-nay'

/** Một file đính kèm chứng từ (lưu trong JSON — data URL + tên đã chuẩn hóa). */
export interface ChiTienBangAttachmentItem {
  name: string
  data: string
  saved_at?: string
  virtual_path?: string
  /** Dung lượng file gốc (byte) khi đính kèm — hiển thị chính xác khi data URL quá lớn / không ước lượng tốt. */
  kich_thuoc_byte?: number
}

export interface ChiTienBangRecord {
  id: string
  /** Loại khách (form Báo giá): cá nhân / doanh nghiệp — tối đa một giá trị. */
  loai_khach_hang?: 'ca_nhan' | 'doanh_nghiep' | null
  /** KH tổ chức — người liên hệ / SĐT (cùng một cụm trên form). */
  ten_nguoi_lien_he?: string
  so_dien_thoai_lien_he?: string
  tinh_trang: string
  ngay_chi_tien_bang: string
  so_chi_tien_bang: string
  ngay_giao_hang: string | null
  khach_hang: string
  dia_chi: string
  /** Phiếu NVTHH — người giao hàng (cùng dòng Địa chỉ trên form). */
  nguoi_giao_hang?: string
  ma_so_thue: string
  dien_giai: string
  nv_ban_hang: string
  dieu_khoan_tt: string
  so_ngay_duoc_no: string
  dieu_khoan_khac: string
  tong_tien_hang: number
  tong_thue_gtgt: number
  tong_thanh_toan: number
  /** `true` = có VAT (cột thuế trên lưới); `false` = không VAT. Bản ghi cũ thiếu trường → coi như `true`. */
  ap_dung_vat_gtgt?: boolean
  tl_ck?: number | null
  tien_ck?: number | null
  so_dien_thoai?: string
  so_chung_tu_cukcuk: string
  doi_chieu_don_mua_id?: string
  attachments?: ChiTienBangAttachmentItem[]
  /** Hình thức giao hàng / nhập kho (form BG). `ca_hai` = chọn cả nhập kho và không nhập kho. */
  hinh_thuc?: 'nhap_kho' | 'khong_nhap_kho' | 'ca_hai' | string
  dia_chi_cong_trinh?: string
  /** Phiếu nhận vật tư hàng hóa (NVTHH) — chứng từ mua hàng (thanh toán). */
  chung_tu_mua_loai_chung_tu?: string
  chung_tu_mua_chua_thanh_toan?: boolean
  chung_tu_mua_thanh_toan_ngay?: boolean
  chung_tu_mua_pttt?: string
  /** @deprecated Gộp vào PTTT; giữ khi đọc dữ liệu cũ. */
  chung_tu_mua_ck?: 'tien_mat' | 'chuyen_khoan'
  chung_tu_mua_loai_hd?: 'gtgt' | 'hd_le' | 'khong_co'
  /** Phiếu NVTHH — số hóa đơn (tab Hóa đơn). */
  chung_tu_mua_so_hoa_don?: string
  /** Phiếu NVTHH — tab Hóa đơn: ngày trên HĐ (yyyy-mm-dd). */
  hoa_don_ngay?: string
  hoa_don_ky_hieu?: string
  mau_hoa_don_ma?: string
  mau_hoa_don_ten?: string
  /** Phiếu NVTHH — tab Phiếu chi: ngày giờ chi (ISO datetime). */
  phieu_chi_ngay?: string
  /** Phiếu NVTHH — tab Phiếu chi. */
  phieu_chi_nha_cung_cap?: string
  phieu_chi_dia_chi?: string
  phieu_chi_nguoi_nhan_tien?: string
  phieu_chi_ly_do?: string
  /** Phiếu chi — PTTT chuyển khoản (tài khoản chi công ty). */
  phieu_chi_tai_khoan_chi?: string
  phieu_chi_ngan_hang_chi?: string
  phieu_chi_ten_nguoi_gui?: string
  /** Tài khoản nhận đối tác (điền từ NCC). */
  phieu_chi_tai_khoan_nhan?: string
  phieu_chi_ngan_hang_nhan?: string
  phieu_chi_ten_chu_tk_nhan?: string
  /** @deprecated Dùng phieu_chi_ngan_hang_nhan / phieu_chi_ngan_hang_chi */
  phieu_chi_ngan_hang?: string
  /** @deprecated Dùng phieu_chi_ten_chu_tk_nhan */
  phieu_chi_ten_nguoi_nhan_ck?: string
  phieu_chi_attachments?: ChiTienBangAttachmentItem[]
  /** Phiếu chi tiền (module Chi tiền): lý do chi — dropdown. */
  ly_do_chi_phieu?: 'chi_nha_cung_cap' | 'chi_khac' | null
  /** Phiếu chi: Chi tiền mặt */
  chi_tien_mat?: boolean
  /** Phiếu chi: Chi qua ngân hàng */
  chi_qua_ngan_hang?: boolean
  /** Phiếu chi: ngày hạch toán (yyyy-mm-dd), có thể khác TG tạo */
  ngay_hach_toan?: string
}

export interface ChiTienBangChiTiet {
  id: string
  chi_tien_bang_id: string
  stt?: number
  ma_hang: string
  ten_hang: string
  ma_quy_cach: string
  dvt: string
  chieu_dai: number
  chieu_rong: number
  chieu_cao: number
  ban_kinh: number
  luong: number
  so_luong: number
  so_luong_nhan: number
  don_gia: number
  thanh_tien: number
  pt_thue_gtgt: number | null
  tien_thue_gtgt: number | null
  lenh_san_xuat: string
  /** Nội dung dòng (sau Tên SPHH) — cho phép nhiều dòng cùng mã hàng. */
  noi_dung?: string
  ghi_chu?: string
}

export interface ChiTienBangCreatePayload {
  loai_khach_hang?: 'ca_nhan' | 'doanh_nghiep' | null
  ten_nguoi_lien_he?: string
  so_dien_thoai_lien_he?: string
  tinh_trang: string
  ngay_chi_tien_bang: string
  so_chi_tien_bang: string
  ngay_giao_hang: string | null
  khach_hang: string
  dia_chi: string
  nguoi_giao_hang?: string
  ma_so_thue: string
  dien_giai: string
  nv_ban_hang: string
  dieu_khoan_tt: string
  so_ngay_duoc_no: string
  dieu_khoan_khac: string
  tong_tien_hang: number
  tong_thue_gtgt: number
  tong_thanh_toan: number
  ap_dung_vat_gtgt?: boolean
  tl_ck?: number | null
  tien_ck?: number | null
  so_dien_thoai?: string
  so_chung_tu_cukcuk: string
  doi_chieu_don_mua_id?: string
  attachments?: ChiTienBangAttachmentItem[]
  hinh_thuc?: 'nhap_kho' | 'khong_nhap_kho' | 'ca_hai' | string
  dia_chi_cong_trinh?: string
  chung_tu_mua_loai_chung_tu?: string
  chung_tu_mua_chua_thanh_toan?: boolean
  chung_tu_mua_thanh_toan_ngay?: boolean
  chung_tu_mua_pttt?: string
  chung_tu_mua_ck?: 'tien_mat' | 'chuyen_khoan'
  chung_tu_mua_loai_hd?: 'gtgt' | 'hd_le' | 'khong_co'
  chung_tu_mua_so_hoa_don?: string
  hoa_don_ngay?: string
  hoa_don_ky_hieu?: string
  mau_hoa_don_ma?: string
  mau_hoa_don_ten?: string
  phieu_chi_nha_cung_cap?: string
  phieu_chi_dia_chi?: string
  phieu_chi_nguoi_nhan_tien?: string
  phieu_chi_ly_do?: string
  phieu_chi_ngay?: string
  phieu_chi_tai_khoan_chi?: string
  phieu_chi_ngan_hang_chi?: string
  phieu_chi_ten_nguoi_gui?: string
  phieu_chi_tai_khoan_nhan?: string
  phieu_chi_ngan_hang_nhan?: string
  phieu_chi_ten_chu_tk_nhan?: string
  phieu_chi_ngan_hang?: string
  phieu_chi_ten_nguoi_nhan_ck?: string
  phieu_chi_attachments?: ChiTienBangAttachmentItem[]
  ly_do_chi_phieu?: 'chi_nha_cung_cap' | 'chi_khac' | null
  chi_tien_mat?: boolean
  chi_qua_ngan_hang?: boolean
  /** Phiếu chi — ngày hạch toán */
  ngay_hach_toan?: string
  chiTiet: Array<{
    ma_hang: string
    ten_hang: string
    dvt: string
    so_luong: number
    don_gia: number
    thanh_tien: number
    pt_thue_gtgt: number | null
    tien_thue_gtgt: number | null
    noi_dung?: string
    ghi_chu?: string
  }>
}

export interface ChiTienBangFilter {
  ky: ChiTienBangKyValue
  tu: string
  den: string
}

/** Draft các dòng đang nhập trong form (chỉ lưu cột hiển thị). */
export type ChiTienBangDraftLine = Record<string, string> & { _dvtOptions?: string[] }
