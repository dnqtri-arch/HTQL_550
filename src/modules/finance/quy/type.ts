/** Tài khoản Quỹ tiền mặt hoặc Ngân hàng — dùng trong thanh toán công nợ */
export interface QuyRecord {
  id: string
  ten: string
  loai: 'tienmat' | 'nganhang'
  sodubandau: number
  soduhientai: number
  nganhangnguoc?: string
  sotaikhoan?: string
}
