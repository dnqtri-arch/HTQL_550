/** Kiểu kỳ lọc danh sách đơn hàng mua (đồng bộ với KY_OPTIONS trong donHangMuaApi). */
export type DonHangMuaKyValue = 'tat-ca' | 'tuan-nay' | 'thang-nay' | 'quy-nay' | 'nam-nay'

/** Một file đính kèm chứng từ mua hàng (lưu trong JSON đơn — data URL + tên đã chuẩn hóa). */
export interface DonHangMuaAttachmentItem {
  name: string
  data: string
  saved_at?: string
  virtual_path?: string
}

export interface DonHangMuaRecord {
  id: string
  tinh_trang: string
  ngay_don_hang: string
  so_don_hang: string
  ngay_giao_hang: string | null
  nha_cung_cap: string
  dia_chi: string
  /** Phiếu NVTHH — người giao hàng (cùng dòng Địa chỉ trên form). */
  nguoi_giao_hang?: string
  ma_so_thue: string
  dien_giai: string
  nv_mua_hang: string
  dieu_khoan_tt: string
  so_ngay_duoc_no: string
  dia_diem_giao_hang: string
  dieu_khoan_khac: string
  gia_tri_don_hang: number
  so_chung_tu_cukcuk: string
  doi_chieu_don_mua_id?: string
  attachments?: DonHangMuaAttachmentItem[]
  /** Hình thức giao hàng / nhập kho (form ĐHM). `ca_hai` = chọn cả nhập kho và không nhập kho. */
  hinh_thuc?: 'nhap_kho' | 'khong_nhap_kho' | 'ca_hai' | string
  kho_nhap_id?: string
  ten_cong_trinh?: string
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
  phieu_chi_attachments?: DonHangMuaAttachmentItem[]
}

export interface DonHangMuaChiTiet {
  id: string
  don_hang_mua_id: string
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
  ghi_chu?: string
  dd_gh_index?: number | null
}

export interface DonHangMuaCreatePayload {
  tinh_trang: string
  ngay_don_hang: string
  so_don_hang: string
  ngay_giao_hang: string | null
  nha_cung_cap: string
  dia_chi: string
  nguoi_giao_hang?: string
  ma_so_thue: string
  dien_giai: string
  nv_mua_hang: string
  dieu_khoan_tt: string
  so_ngay_duoc_no: string
  dia_diem_giao_hang: string
  dieu_khoan_khac: string
  gia_tri_don_hang: number
  so_chung_tu_cukcuk: string
  doi_chieu_don_mua_id?: string
  attachments?: DonHangMuaAttachmentItem[]
  hinh_thuc?: 'nhap_kho' | 'khong_nhap_kho' | 'ca_hai' | string
  kho_nhap_id?: string
  ten_cong_trinh?: string
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
  phieu_chi_attachments?: DonHangMuaAttachmentItem[]
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
    dd_gh_index?: number | null
    ghi_chu?: string
  }>
}

export interface DonHangMuaFilter {
  ky: DonHangMuaKyValue
  tu: string
  den: string
}

/** Draft các dòng đang nhập trong form (chỉ lưu cột hiển thị). */
export type DonHangMuaDraftLine = Record<string, string> & { _dvtOptions?: string[] }
