/**
 * Số tài khoản / ngân hàng công ty — đọc từ thiết lập (localStorage).
 * Khi module «Tài khoản ngân hàng» ghi cấu hình, dùng cùng khóa để đồng bộ.
 */
const LS_KEY = 'htql550_cong_ty_tk_ngan_hang'

export interface CongTyTaiKhoanNganHang {
  so_tai_khoan: string
  ten_ngan_hang: string
}

export function getCongTyTaiKhoanNganHang(): CongTyTaiKhoanNganHang {
  if (typeof localStorage === 'undefined') return { so_tai_khoan: '', ten_ngan_hang: '' }
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return { so_tai_khoan: '', ten_ngan_hang: '' }
    const o = JSON.parse(raw) as Partial<CongTyTaiKhoanNganHang>
    return {
      so_tai_khoan: String(o.so_tai_khoan ?? '').trim(),
      ten_ngan_hang: String(o.ten_ngan_hang ?? '').trim(),
    }
  } catch {
    return { so_tai_khoan: '', ten_ngan_hang: '' }
  }
}
