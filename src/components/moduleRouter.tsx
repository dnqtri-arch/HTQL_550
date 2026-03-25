import type { ModuleId } from '../config/sidebarConfig'
import { lazy, Suspense } from 'react'

function LoadingFallback() {
  return (
    <div style={{ padding: 16, color: 'var(--text-muted)', fontSize: 12 }}>
      Đang tải...
    </div>
  )
}

// Công việc
const BanLamViec = lazy(() => import('../modules/banlamviec').then((m) => ({ default: m.BanLamViec })))
const CongViec = lazy(() => import('../modules/congviec').then((m) => ({ default: m.CongViec })))

// CRM - Bán hàng
const BaoGia = lazy(() => import('../modules/crm/banHang/baoGia/baoGia').then((m) => ({ default: m.BaoGia })))
const DonHangBan = lazy(() => import('../modules/crm/banHang/donHangBan/donHangBan').then((m) => ({ default: m.DonHangBan })))
const KhachHang = lazy(() => import('../modules/crm/banHang/khachHang/khachHang').then((m) => ({ default: m.KhachHang })))
const HoaDonBan = lazy(() => import('../modules/crm/banHang/hoaDon/hoaDonBan').then((m) => ({ default: m.HoaDonBan })))
const HopDongBan = lazy(() => import('../modules/crm/banHang/hopDong/hopDongBan').then((m) => ({ default: m.HopDongBan })))
const CongNoKhachHang = lazy(() => import('../modules/crm/banHang/congNo/congNoKhachHang').then((m) => ({ default: m.CongNoKhachHang })))
const TraLaiHang = lazy(() => import('../modules/crm/banHang/traLai/traLaiHang').then((m) => ({ default: m.TraLaiHang })))

// CRM - Mua hàng
const DonHangMua = lazy(() => import('../modules/crm/muaHang/donHangMua/donHangMua').then((m) => ({ default: m.DonHangMua })))
const NhaCungCap = lazy(() => import('../modules/crm/muaHang/nhaCungCap/nhaCungCap').then((m) => ({ default: m.NhaCungCap })))
const NhanVatTuHangHoa = lazy(() => import('../modules/kho/nhanVatTuHangHoa/nhanVatTuHangHoa').then((m) => ({ default: m.NhanVatTuHangHoa })))
const HopDongMua = lazy(() => import('../modules/crm/muaHang/hopDongMua/hopDongMua').then((m) => ({ default: m.HopDongMua })))
const TraLaiHangMua = lazy(() => import('../modules/crm/muaHang/traLaiHangMua/traLaiHangMua').then((m) => ({ default: m.TraLaiHangMua })))
const TraTienNcc = lazy(() => import('../modules/crm/muaHang/traTienNcc/traTienNcc').then((m) => ({ default: m.TraTienNcc })))
const NhanHoaDon = lazy(() => import('../modules/crm/muaHang/nhanHoaDon/nhanHoaDon').then((m) => ({ default: m.NhanHoaDon })))
const GiamGiaHangMua = lazy(() => import('../modules/crm/muaHang/giamGiaHangMua/giamGiaHangMua').then((m) => ({ default: m.GiamGiaHangMua })))

// Tài chính
const Quy = lazy(() => import('../modules/quy').then((m) => ({ default: m.Quy })))
const NganHang = lazy(() => import('../modules/nganhang').then((m) => ({ default: m.NganHang })))
const ThuQuy = lazy(() => import('../modules/thuquy').then((m) => ({ default: m.ThuQuy })))

// Kho
const KhoHang = lazy(() => import('../modules/kho/khoHang').then((m) => ({ default: m.Kho })))
const TonKho = lazy(() => import('../modules/kho/tonKho/page').then((m) => ({ default: m.KhoVthhPage })))
const DonViTinhPage = lazy(() => import('../modules/kho/khoHang/donViTinhPage').then((m) => ({ default: m.DonViTinhPage })))
const ThuKho = lazy(() => import('../modules/thukho').then((m) => ({ default: m.ThuKho })))
const CongCuDungCu = lazy(() => import('../modules/congcudungcu').then((m) => ({ default: m.CongCuDungCu })))
const TaiSanCoDinh = lazy(() => import('../modules/taisancodinh').then((m) => ({ default: m.TaiSanCoDinh })))

// HRM
const TienLuong = lazy(() => import('../modules/tienluong').then((m) => ({ default: m.TienLuong })))
const Thue = lazy(() => import('../modules/thue').then((m) => ({ default: m.Thue })))
const GiaThanh = lazy(() => import('../modules/giathanh').then((m) => ({ default: m.GiaThanh })))
const TongHop = lazy(() => import('../modules/tonghop').then((m) => ({ default: m.TongHop })))

// Hóa đơn
const HoaDonDienTu = lazy(() => import('../modules/hoadondientu').then((m) => ({ default: m.HoaDonDienTu })))
const QuanLyHoaDon = lazy(() => import('../modules/quanlyhoadon').then((m) => ({ default: m.QuanLyHoaDon })))
const TaiLieu = lazy(() => import('../modules/tailieu').then((m) => ({ default: m.TaiLieu })))

const modules: Record<ModuleId, React.LazyExoticComponent<React.ComponentType>> = {
  // Công việc
  banLamViec: BanLamViec,
  congViec: CongViec,
  
  // CRM - Bán hàng
  baoGia: BaoGia,
  donHangBan: DonHangBan,
  khachHang: KhachHang,
  hoaDon: HoaDonBan,
  hopDongBan: HopDongBan,
  congNoKhachHang: CongNoKhachHang,
  traLaiHang: TraLaiHang,
  
  // CRM - Mua hàng
  donHangMua: DonHangMua,
  nhaCungCap: NhaCungCap,
  nhanVatTuHangHoa: NhanVatTuHangHoa,
  hopDongMua: HopDongMua,
  traLaiHangMua: TraLaiHangMua,
  traTienNcc: TraTienNcc,
  nhanHoaDon: NhanHoaDon,
  giamGiaHangMua: GiamGiaHangMua,
  
  // Tài chính
  quy: Quy,
  nganHang: NganHang,
  thuQuy: ThuQuy,
  
  // Kho
  khoHang: KhoHang,
  tonKho: TonKho,
  donViTinh: DonViTinhPage,
  thuKho: ThuKho,
  congCuDungCu: CongCuDungCu,
  taiSanCoDinh: TaiSanCoDinh,
  
  // HRM
  tienLuong: TienLuong,
  thue: Thue,
  giaThanh: GiaThanh,
  tongHop: TongHop,
  
  // Hóa đơn
  hoaDonDienTu: HoaDonDienTu,
  quanLyHoaDon: QuanLyHoaDon,
  taiLieu: TaiLieu,
}

export interface ModuleRouterProps {
  moduleId: ModuleId
}

export function ModuleRouter({ moduleId }: ModuleRouterProps) {
  const Module = modules[moduleId]
  if (!Module) return <div>Phân hệ không tồn tại.</div>
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Module />
    </Suspense>
  )
}
