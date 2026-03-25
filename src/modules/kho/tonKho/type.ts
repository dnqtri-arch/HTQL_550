/** Số liệu một nhóm (đầu kỳ / nhập / xuất / cuối kỳ) — viết liền */
export interface KhoNhomSoLieu {
  soluong: number
  giatri: number
}

/** Một dòng dữ liệu tồn kho VTHH (Nhập - Xuất - Tồn) — field viết liền */
export interface KhoVthh {
  id: string
  /** Mã VTHH — luôn hiển thị IN HOA */
  mavthh: string
  tenvthh: string
  dvt: string
  dauky: KhoNhomSoLieu
  nhapkho: KhoNhomSoLieu
  xuatkho: KhoNhomSoLieu
  /** cuoiky = dauky + nhapkho - xuatkho (tự tính) */
  cuoiky: KhoNhomSoLieu
  /**
   * Giá vốn bình quân gia quyền tức thời:
   * giavon = (dauky.giatri + nhapkho.giatri) / (dauky.soluong + nhapkho.soluong)
   * Nếu mẫu = 0 thì giavon = 0.
   */
  giavon: number
}

/** Phiếu nhập/xuất liên quan đến một VTHH — dùng trong Modal chi tiết */
export interface PhieuTonKho {
  sophieu: string
  ngay: string
  loai: 'Nhập kho' | 'Xuất kho'
  tinh_trang: string
  soluong: number
  giatri: number
  ncc: string
}

/** Bộ lọc danh sách tồn kho — field viết liền */
export interface KhoVthhFilter {
  tungay: string
  denngay: string
  makho: string
  nhomvthh: string
  timkiem: string
}
