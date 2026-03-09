import type { ModuleId } from '../config/sidebarConfig'
import { BanLamViec } from '../modules/ban-lam-viec'
import { CongViec } from '../modules/cong-viec'
import { BanHang } from '../modules/ban-hang'
import { MuaHang } from '../modules/mua-hang'
import { HopDong } from '../modules/hop-dong'
import { Quy } from '../modules/quy'
import { NganHang } from '../modules/ngan-hang'
import { ThuQuy } from '../modules/thu-quy'
import { Kho } from '../modules/kho'
import { DonViTinh } from '../modules/kho/DonViTinh'
import { ThuKho } from '../modules/thu-kho'

function DonViTinhPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <h1 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '4px', color: 'var(--text-primary)' }}>
        Đơn vị tính
      </h1>
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        <DonViTinh />
      </div>
    </div>
  )
}
import { CongCuDungCu } from '../modules/cong-cu-dung-cu'
import { TaiSanCoDinh } from '../modules/tai-san-co-dinh'
import { TienLuong } from '../modules/tien-luong'
import { Thue } from '../modules/thue'
import { GiaThanh } from '../modules/gia-thanh'
import { TongHop } from '../modules/tong-hop'
import { HoaDonDienTu } from '../modules/hoa-don-dien-tu'
import { QuanLyHoaDon } from '../modules/quan-ly-hoa-don'
import { TaiLieu } from '../modules/tai-lieu'

const modules: Record<ModuleId, React.ComponentType> = {
  'ban-lam-viec': BanLamViec,
  'cong-viec': CongViec,
  'ban-hang': BanHang,
  'mua-hang': MuaHang,
  'hop-dong': HopDong,
  'quy': Quy,
  'ngan-hang': NganHang,
  'thu-quy': ThuQuy,
  'kho': Kho,
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
  return <Module />
}
