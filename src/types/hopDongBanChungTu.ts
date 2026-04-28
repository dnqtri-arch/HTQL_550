/** Kiểu kỳ lọc danh sách đơn hàng bán (đồng bộ với KY_OPTIONS trong baoGiaApi). */
export type HopDongBanChungTuKyValue = 'tat-ca' | 'tuan-nay' | 'thang-nay' | 'quy-nay' | 'nam-nay'

/** Một file đính kèm chứng từ (HĐ) (lưu trong JSON — data URL + tên đã chuẩn hóa). */
export interface HopDongBanChungTuAttachmentItem {
  name: string
  data: string
  saved_at?: string
  virtual_path?: string
  /** Dung lượng file gốc (byte) khi đính kèm — hiển thị chính xác khi data URL quá lớn / không ước lượng tốt. */
  kich_thuoc_byte?: number
}

export interface HopDongBanChungTuRecord {
  id: string
  /** Loại khách (form Hợp đồng bán): cá nhân / doanh nghiệp — tối đa một giá trị. */
  loai_khach_hang?: 'ca_nhan' | 'doanh_nghiep' | null
  /** KH tổ chức — người liên hệ / SĐT (cùng một cụm trên form). */
  ten_nguoi_lien_he?: string
  so_dien_thoai_lien_he?: string
  tinh_trang: string
  ngay_lap_hop_dong: string
  so_hop_dong: string
  ngay_cam_ket_giao: string | null
  khach_hang: string
  dia_chi: string
  /** Địa chỉ nhận hàng — nhiều dòng (\n): ĐCNH, ĐCNH 1, … (YC79). */
  dia_chi_nhan_hang?: string
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
  /** Hợp đồng nguyên tắc — có thể bật cùng có VAT hoặc không VAT (YC74). */
  hop_dong_nguyen_tac?: boolean
  tl_ck?: number | null
  tien_ck?: number | null
  so_dien_thoai?: string
  so_chung_tu_cukcuk: string
  /** Theo dõi báo giá nguồn khi lập HĐ từ BG. */
  bao_gia_id?: string
  so_bao_gia_goc?: string
  doi_chieu_don_mua_id?: string
  attachments?: HopDongBanChungTuAttachmentItem[]
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
  phieu_chi_attachments?: HopDongBanChungTuAttachmentItem[]
  /** Phiếu thu gắn HĐ bán (id chính + danh sách). */
  thu_tien_bang_id?: string
  thu_tien_bang_ids?: string[]
  /** Snapshot `tinh_trang` trước khi gắn phiếu thu — dùng khi hủy ghi sổ / xóa phiếu. */
  tinh_trang_truoc_thu_tien?: string
  chi_tien_bang_id?: string
  chi_tien_bang_ids?: string[]
  tinh_trang_truoc_chi_tien?: string
}

export interface HopDongBanChungTuChiTiet {
  id: string
  hop_dong_ban_chung_tu_id: string
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
  noi_dung?: string
  ghi_chu?: string
  dcnh_index?: number | null
}

export interface HopDongBanChungTuCreatePayload {
  loai_khach_hang?: 'ca_nhan' | 'doanh_nghiep' | null
  ten_nguoi_lien_he?: string
  so_dien_thoai_lien_he?: string
  tinh_trang: string
  ngay_lap_hop_dong: string
  so_hop_dong: string
  ngay_cam_ket_giao: string | null
  khach_hang: string
  dia_chi: string
  dia_chi_nhan_hang?: string
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
  hop_dong_nguyen_tac?: boolean
  tl_ck?: number | null
  tien_ck?: number | null
  so_dien_thoai?: string
  so_chung_tu_cukcuk: string
  bao_gia_id?: string
  so_bao_gia_goc?: string
  doi_chieu_don_mua_id?: string
  attachments?: HopDongBanChungTuAttachmentItem[]
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
  phieu_chi_attachments?: HopDongBanChungTuAttachmentItem[]
  thu_tien_bang_id?: string
  thu_tien_bang_ids?: string[]
  tinh_trang_truoc_thu_tien?: string
  chi_tien_bang_id?: string
  chi_tien_bang_ids?: string[]
  tinh_trang_truoc_chi_tien?: string
  chiTiet: Array<{
    ma_hang: string
    ten_hang: string
    ma_quy_cach?: string
    dvt: string
    so_luong: number
    don_gia: number
    thanh_tien: number
    pt_thue_gtgt: number | null
    tien_thue_gtgt: number | null
    noi_dung?: string
    ghi_chu?: string
    chieu_dai?: number
    chieu_rong?: number
    luong?: number
    dcnh_index?: number | null
  }>
}

export interface HopDongBanChungTuFilter {
  ky: HopDongBanChungTuKyValue
  tu: string
  den: string
}

/** Draft các dòng đang nhập trong form (chỉ lưu cột hiển thị). */
export type HopDongBanChungTuDraftLine = Record<string, string> & { _dvtOptions?: string[] }
