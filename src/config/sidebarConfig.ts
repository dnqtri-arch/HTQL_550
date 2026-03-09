export type ModuleId =
  | 'ban-lam-viec'
  | 'cong-viec'
  | 'ban-hang'
  | 'mua-hang'
  | 'hop-dong'
  | 'quy'
  | 'ngan-hang'
  | 'thu-quy'
  | 'kho'
  | 'don-vi-tinh'
  | 'thu-kho'
  | 'cong-cu-dung-cu'
  | 'tai-san-co-dinh'
  | 'tien-luong'
  | 'thue'
  | 'gia-thanh'
  | 'tong-hop'
  | 'hoa-don-dien-tu'
  | 'quan-ly-hoa-don'
  | 'tai-lieu'

export interface SidebarItem {
  id: ModuleId
  label: string
  icon: string
}

export const MODULE_GROUPS: Array<{
  id: string
  label: string
  items: SidebarItem[]
}> = [
  {
    id: 'group1',
    label: 'Công việc',
    items: [
      { id: 'ban-lam-viec', label: 'Bàn làm việc', icon: 'LayoutDashboard' },
      { id: 'cong-viec', label: 'Công việc', icon: 'ClipboardList' },
    ],
  },
  {
    id: 'group2',
    label: 'CRM',
    items: [
      { id: 'ban-hang', label: 'Bán hàng', icon: 'Store' },
      { id: 'mua-hang', label: 'Mua hàng', icon: 'ShoppingCart' },
      { id: 'hop-dong', label: 'Hợp đồng', icon: 'FileText' },
    ],
  },
  {
    id: 'group3',
    label: 'Tài chính',
    items: [
      { id: 'quy', label: 'Quỹ', icon: 'Wallet' },
      { id: 'ngan-hang', label: 'Ngân hàng', icon: 'Landmark' },
      { id: 'thu-quy', label: 'Thủ quỹ', icon: 'UserCircle' },
    ],
  },
  {
    id: 'group4',
    label: 'Kho và hàng hóa',
    items: [
      { id: 'kho', label: 'Kho', icon: 'Warehouse' },
      { id: 'don-vi-tinh', label: 'Đơn vị tính', icon: 'Ruler' },
      { id: 'thu-kho', label: 'Thủ kho', icon: 'UserCog' },
      { id: 'cong-cu-dung-cu', label: 'Công cụ dụng cụ', icon: 'Wrench' },
      { id: 'tai-san-co-dinh', label: 'Tài sản cố định', icon: 'Car' },
    ],
  },
  {
    id: 'group5',
    label: 'HRM',
    items: [
      { id: 'tien-luong', label: 'Tiền lương', icon: 'Banknote' },
      { id: 'thue', label: 'Thuế', icon: 'Percent' },
      { id: 'gia-thanh', label: 'Giá thành', icon: 'Calculator' },
      { id: 'tong-hop', label: 'Tổng hợp', icon: 'BookOpen' },
    ],
  },
  {
    id: 'group6',
    label: 'Hóa đơn',
    items: [
      { id: 'hoa-don-dien-tu', label: 'Hóa đơn điện tử', icon: 'FileCheck' },
      { id: 'quan-ly-hoa-don', label: 'Quản lý hóa đơn', icon: 'Files' },
      { id: 'tai-lieu', label: 'Tài liệu', icon: 'FolderOpen' },
    ],
  },
]
