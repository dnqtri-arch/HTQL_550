/** Một dòng chiết khấu theo số lượng (Tab Bậc giá) */
export interface ChietKhauItem {
  so_luong_tu: string
  so_luong_den: string
  ty_le_chiet_khau: string
  mo_ta?: string
}

/** Một dòng quy đổi ĐVT (Tab Đơn vị quy đổi và bậc giá) */
export interface DonViQuyDoiItem {
  dvt: string
  ti_le_quy_doi: string
  phep_tinh: 'nhan' | 'chia'
  mo_ta?: string
  gia_mua: string
  gia_ban: string
  gia_ban_1?: string
  gia_ban_2?: string
  gia_ban_3?: string
}

/** Một dòng định mức nguyên vật liệu (tab Định mức NVL khi tính chất = Sản phẩm) */
export interface DinhMucNvlItem {
  ma: string
  ten: string
  dvt: string
  so_luong: string
  hao_hut: string
}

export interface VatTuHangHoaRecord {
  id: number
  ma: string
  ten: string
  tinh_chat: string
  nhom_vthh: string
  dvt_chinh: string
  so_luong_ton: number
  gia_tri_ton: number
  kho_ngam_dinh?: string
  tai_khoan_kho?: string
  tk_doanh_thu?: string
  tk_chi_phi?: string
  thue_suat_gtgt?: string
  co_giam_thue?: string
  don_gia_mua?: number
  don_gia_ban?: number
  mo_ta?: string
  duong_dan_hinh_anh?: string
  dien_giai?: string
  thoi_han_bh?: string
  nguon_goc?: string
  dien_giai_khi_mua?: string
  dien_giai_khi_ban?: string
  so_luong_ton_toi_thieu?: number
  tk_chiet_khau?: string
  tk_giam_gia?: string
  tk_tra_lai?: string
  ty_le_ckmh?: string
  loai_hh_dac_trung?: string
  don_gia_mua_co_dinh?: number
  thue_suat_nk?: string
  thue_suat_xk?: string
  nhom_hhdv_ttdb?: string
  /** Là vật tư (phân loại nghiệp vụ) */
  la_vat_tu?: boolean
  /** Là hàng hóa (phân loại nghiệp vụ) */
  la_hang_hoa?: boolean
  la_vthh_ban?: boolean
  la_hang_khuyen_mai?: boolean
  la_bo_phan_lap_rap?: boolean
  mau_sac?: string
  kich_thuoc?: string
  kich_thuoc_md?: string
  kich_thuoc_mr?: string
  so_khung?: string
  so_may?: string
  thoi_gian_bao_hanh?: string
  xuat_xu?: string
  don_vi_quy_doi?: DonViQuyDoiItem[]
  thue_suat_gtgt_dau_ra?: string
  thue_suat_gtgt_dau_vao?: string
  gia_mua_gan_nhat?: number
  gia_ban_quy_dinh?: number
  chiet_khau?: boolean
  loai_chiet_khau?: string
  bang_chiet_khau?: ChietKhauItem[]
  dac_tinh?: string
  cong_thuc_tinh_so_luong?: string
  dinh_muc_nvl?: DinhMucNvlItem[]
  ma_vthh_cap_cha?: string
  vt_chinh?: boolean
}
