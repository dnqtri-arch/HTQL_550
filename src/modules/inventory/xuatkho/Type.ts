export type TinhTrangXuatKho = 'Chờ duyệt' | 'Đã xuất kho' | 'Hủy bỏ'

export interface ChiTietXuatKho {
  id: string
  mavthh: string
  tenvthh: string
  dvt: string
  /** Số lượng tồn kho tại thời điểm nhập liệu (snapshot) */
  soluongton: number
  soluong: number
  dongia: number
  thanhtien: number
}

export interface PhieuXuatKho {
  id: string
  sophieu: string
  ngayxuat: string          // yyyy-MM-dd
  nguoinhan: string
  khoxuat: string           // kho ID
  lenhsanxuat: string       // Task 4: lệnh sản xuất / công trình
  tonggiatri: number
  tinhtrang: TinhTrangXuatKho
  ghichu: string
  ngaytao: string
  chitiet: ChiTietXuatKho[]
}

export interface TonKhoSnapshot {
  mavthh: string
  tenvthh: string
  dvt: string
  soluongton: number
}
