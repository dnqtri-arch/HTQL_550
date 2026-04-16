import { ModulePage } from '../../components/modulePage'
import { QuyTrinhTaiChinh } from './quyTrinhTaiChinh'

/** Quy trình nghiệp vụ Quỹ — mặc định tab «Tài chính». */
export function TaiChinh() {
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
      <QuyTrinhTaiChinh />
    </div>
  )
}

function Placeholder({ title }: { title: string }) {
  return (
    <ModulePage title={title}>
      <div style={{ padding: 24, fontSize: 12, color: 'var(--text-muted)' }}>
        Màn hình nghiệp vụ đang phát triển.
      </div>
    </ModulePage>
  )
}

export { ThuTien } from './thuTien/thuTien'
export { ChiTien } from './chiTien/chiTien'
export { ChuyenTien } from './chuyenTien/chuyenTien'
export { ThuChiTien } from './thuChiTien/thuChiTien'
export function KiemKeQuy() {
  return <Placeholder title="Kiểm kê quỹ" />
}
export { SoChiTietTienMat } from './soTienMat/soTienMat'
export function BaoCaoTaiChinh() {
  return <Placeholder title="Báo cáo tài chính" />
}
export function TyGiaXuatQuy() {
  return <Placeholder title="Tính tỷ giá xuất quỹ" />
}
export { SoTienGuiNganHang } from './soNganHang/soNganHang'
export { TaiKhoan } from './taiKhoan/taiKhoan'
export { LoaiThuChi } from './loaiThuChi/loaiThuChi'
