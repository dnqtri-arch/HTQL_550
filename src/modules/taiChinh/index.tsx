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
export function ThuChiTien() {
  return <Placeholder title="Thu/chi tiền" />
}
export function KiemKeQuy() {
  return <Placeholder title="Kiểm kê quỹ" />
}
export function SoChiTietTienMat() {
  return <Placeholder title="Sổ chi tiết tiền mặt" />
}
export function BaoCaoTaiChinh() {
  return <Placeholder title="Báo cáo tài chính" />
}
export function TyGiaXuatQuy() {
  return <Placeholder title="Tính tỷ giá xuất quỹ" />
}
export function SoTienGuiNganHang() {
  return <Placeholder title="Sổ chi tiết tài khoản ngân hàng" />
}
export { TaiKhoanNganHang } from './taiKhoanNganHang/taiKhoanNganHang'
