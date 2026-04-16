export type ModuleId =
  // Công việc
  | 'banLamViec'
  | 'ketNoiMayChu'
  | 'congViec'
  // CRM - Entry points (parent modules with internal tabs/workflow)
  | 'banHang'
  | 'muaHang'
  // CRM - Bán hàng (sub-modules)
  | 'baoGia'
  | 'donHangBan'
  | 'khachHang'
  | 'hoaDon'
  | 'hopDongBan'
  | 'phuLucHopDongBan'
  | 'congNoKhachHang'
  | 'traLaiHang'
  // CRM - Mua hàng (sub-modules)
  | 'donHangMua'
  | 'nhaCungCap'
  | 'nhanVatTuHangHoa'
  | 'hopDongMua'
  | 'traLaiHangMua'
  | 'traTienNcc'
  | 'nhanHoaDon'
  | 'giamGiaHangMua'
  // Tài chính
  | 'taiChinh'
  | 'thuTien'
  | 'chiTien'
  | 'thuChiTien'
  | 'kiemKeQuy'
  | 'soChiTietTienMat'
  | 'baoCaoTaiChinh'
  | 'tyGiaXuatQuy'
  | 'soTienGuiNganHang'
  | 'taiKhoan'
  | 'loaiThuChi'
  | 'quy'
  | 'chuyenTien'
  | 'nganHang'
  | 'thuQuy'
  // Kho
  | 'khoHang'
  | 'tonKho'
  | 'donViTinh'
  | 'thuKho'
  | 'congCuDungCu'
  | 'taiSanCoDinh'
  // HRM
  | 'tienLuong'
  | 'thue'
  | 'giaThanh'
  | 'tongHop'
  // Hóa đơn
  | 'hoaDonDienTu'
  | 'quanLyHoaDon'
  | 'taiLieu'

export interface SidebarItem {
  id: ModuleId
  label: string
  icon: string
  children?: SidebarItem[]
}

export const MODULE_GROUPS: Array<{
  id: string
  label: string
  items: SidebarItem[]
}> = [
  {
    id: 'congViec',
    label: 'CÔNG VIỆC',
    items: [
      { id: 'banLamViec', label: 'Bàn làm việc', icon: 'LayoutDashboard' },
      { id: 'ketNoiMayChu', label: 'Kết nối máy chủ', icon: 'Server' },
      { id: 'congViec', label: 'Công việc', icon: 'ClipboardList' },
    ],
  },
  {
    id: 'crm',
    label: 'CRM',
    items: [
      {
        id: 'banHang',
        label: 'Bán hàng',
        icon: 'Store',
        children: [
          { id: 'banHang', label: 'Quy trình', icon: 'GitBranch' },
          { id: 'baoGia', label: 'Báo giá', icon: 'FileText' },
          { id: 'donHangBan', label: 'Đơn hàng bán', icon: 'ShoppingCart' },
          { id: 'khachHang', label: 'Khách hàng', icon: 'Users' },
          { id: 'hoaDon', label: 'Hóa đơn bán', icon: 'Receipt' },
          { id: 'hopDongBan', label: 'Hợp đồng bán', icon: 'FileSignature' },
          { id: 'phuLucHopDongBan', label: 'Phụ lục HĐ bán', icon: 'FileStack' },
          { id: 'congNoKhachHang', label: 'Công nợ KH', icon: 'CreditCard' },
          { id: 'traLaiHang', label: 'Trả lại hàng', icon: 'RotateCcw' },
        ],
      },
      {
        id: 'muaHang',
        label: 'Mua hàng',
        icon: 'ShoppingCart',
        children: [
          { id: 'muaHang', label: 'Quy trình', icon: 'GitBranch' },
          { id: 'donHangMua', label: 'Đơn hàng mua', icon: 'FileText' },
          { id: 'nhaCungCap', label: 'Nhà cung cấp', icon: 'Users' },
          { id: 'nhanVatTuHangHoa', label: 'Nhận VTHH', icon: 'Package' },
          { id: 'hopDongMua', label: 'Hợp đồng mua', icon: 'FileSignature' },
          { id: 'traLaiHangMua', label: 'Trả lại hàng mua', icon: 'RotateCcw' },
          { id: 'traTienNcc', label: 'Trả tiền NCC', icon: 'CreditCard' },
          { id: 'nhanHoaDon', label: 'Nhận hóa đơn', icon: 'Receipt' },
          { id: 'giamGiaHangMua', label: 'Giảm giá hàng mua', icon: 'Percent' },
        ],
      },
    ],
  },
  {
    id: 'taiChinh',
    label: 'TÀI CHÍNH',
    items: [
      {
        id: 'taiChinh',
        label: 'Tài chính',
        icon: 'Wallet',
        children: [
          { id: 'taiChinh', label: 'Quy trình', icon: 'GitBranch' },
          { id: 'thuTien', label: 'Thu tiền', icon: 'TrendingUp' },
          { id: 'chiTien', label: 'Chi tiền', icon: 'TrendingDown' },
          { id: 'thuChiTien', label: 'Thu/chi tiền', icon: 'ArrowLeftRight' },
          { id: 'kiemKeQuy', label: 'Kiểm kê quỹ', icon: 'ClipboardCheck' },
          { id: 'soChiTietTienMat', label: 'Sổ tiền mặt', icon: 'BookMarked' },
          { id: 'soTienGuiNganHang', label: 'Sổ ngân hàng', icon: 'Building2' },
          { id: 'baoCaoTaiChinh', label: 'Báo cáo', icon: 'BarChart3' },
          { id: 'chuyenTien', label: 'Chuyển tiền', icon: 'Wallet' },
          { id: 'nganHang', label: 'Ngân hàng', icon: 'Landmark' },
          { id: 'thuQuy', label: 'Thủ quỹ', icon: 'UserCircle' },
          { id: 'tyGiaXuatQuy', label: 'Tính tỷ giá xuất quỹ', icon: 'TableProperties' },
          { id: 'taiKhoan', label: 'Tài khoản', icon: 'Landmark' },
          { id: 'loaiThuChi', label: 'Loại thu/chi', icon: 'Tags' },
        ],
      },
    ],
  },
  {
    id: 'kho',
    label: 'KHO VÀ HÀNG HÓA',
    items: [
      { id: 'khoHang', label: 'Kho hàng', icon: 'Warehouse' },
      { id: 'tonKho', label: 'Tồn kho', icon: 'BarChart3' },
      { id: 'donViTinh', label: 'Đơn vị tính', icon: 'Ruler' },
      { id: 'thuKho', label: 'Thủ kho', icon: 'UserCog' },
      { id: 'congCuDungCu', label: 'Công cụ dụng cụ', icon: 'Wrench' },
      { id: 'taiSanCoDinh', label: 'Tài sản cố định', icon: 'Car' },
    ],
  },
  {
    id: 'hrm',
    label: 'HRM',
    items: [
      { id: 'tienLuong', label: 'Tiền lương', icon: 'Banknote' },
      { id: 'thue', label: 'Thuế', icon: 'Percent' },
      { id: 'giaThanh', label: 'Giá thành', icon: 'Calculator' },
      { id: 'tongHop', label: 'Tổng hợp', icon: 'BookOpen' },
    ],
  },
  {
    id: 'hoaDon',
    label: 'HÓA ĐƠN',
    items: [
      { id: 'hoaDonDienTu', label: 'Hóa đơn điện tử', icon: 'FileCheck' },
      { id: 'quanLyHoaDon', label: 'Quản lý hóa đơn', icon: 'Files' },
      { id: 'taiLieu', label: 'Tài liệu', icon: 'FolderOpen' },
    ],
  },
]
