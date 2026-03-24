import type { ModuleId } from '../config/sidebarConfig'
import { lazy, Suspense } from 'react'

function LoadingFallback() {
  return (
    <div style={{ padding: 16, color: 'var(--text-muted)', fontSize: 12 }}>
      Đang tải...
    </div>
  )
}

const BanLamViec = lazy(() => import('../modules/banlamviec').then((m) => ({ default: m.BanLamViec })))
const CongViec = lazy(() => import('../modules/congviec').then((m) => ({ default: m.CongViec })))
const BanHang = lazy(() => import('../modules/banhang').then((m) => ({ default: m.BanHang })))
const MuaHang = lazy(() => import('../modules/purchase/muahang').then((m) => ({ default: m.MuaHang })))
const HopDong = lazy(() => import('../modules/hopdong').then((m) => ({ default: m.HopDong })))
const Quy = lazy(() => import('../modules/quy').then((m) => ({ default: m.Quy })))
const NganHang = lazy(() => import('../modules/nganhang').then((m) => ({ default: m.NganHang })))
const ThuQuy = lazy(() => import('../modules/thuquy').then((m) => ({ default: m.ThuQuy })))
const Kho = lazy(() => import('../modules/inventory/kho').then((m) => ({ default: m.Kho })))
const KhoVthh = lazy(() => import('../modules/inventory/khovthh/Page').then((m) => ({ default: m.KhoVthhPage })))
const DonViTinhPage = lazy(() => import('../modules/inventory/kho/DonViTinhPage').then((m) => ({ default: m.DonViTinhPage })))
const ThuKho = lazy(() => import('../modules/thukho').then((m) => ({ default: m.ThuKho })))
const CongCuDungCu = lazy(() => import('../modules/congcudungcu').then((m) => ({ default: m.CongCuDungCu })))
const TaiSanCoDinh = lazy(() => import('../modules/taisancodinh').then((m) => ({ default: m.TaiSanCoDinh })))
const TienLuong = lazy(() => import('../modules/tienluong').then((m) => ({ default: m.TienLuong })))
const Thue = lazy(() => import('../modules/thue').then((m) => ({ default: m.Thue })))
const GiaThanh = lazy(() => import('../modules/giathanh').then((m) => ({ default: m.GiaThanh })))
const TongHop = lazy(() => import('../modules/tonghop').then((m) => ({ default: m.TongHop })))
const HoaDonDienTu = lazy(() => import('../modules/hoadondientu').then((m) => ({ default: m.HoaDonDienTu })))
const QuanLyHoaDon = lazy(() => import('../modules/quanlyhoadon').then((m) => ({ default: m.QuanLyHoaDon })))
const TaiLieu = lazy(() => import('../modules/tailieu').then((m) => ({ default: m.TaiLieu })))

const modules: Record<ModuleId, React.LazyExoticComponent<React.ComponentType>> = {
  'ban-lam-viec': BanLamViec,
  'cong-viec': CongViec,
  'ban-hang': BanHang,
  'mua-hang': MuaHang,
  'hop-dong': HopDong,
  'quy': Quy,
  'ngan-hang': NganHang,
  'thu-quy': ThuQuy,
  'kho': Kho,
  'kho-vthh': KhoVthh,
  'don-vi-tinh': DonViTinhPage,
  'thu-kho': ThuKho,
  'cong-cu-dung-cu': CongCuDungCu,
  'tai-san-co-dinh': TaiSanCoDinh,
  'tien-luong': TienLuong,
  'thue': Thue,
  'gia-thanh': GiaThanh,
  'tong-hop': TongHop,
  'hoa-don-dien-tu': HoaDonDienTu,
  'quan-ly-hoa-don': QuanLyHoaDon,
  'tai-lieu': TaiLieu,
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
