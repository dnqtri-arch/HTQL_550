import { ModulePage } from '../../components/ModulePage'

const subNav = [
  { id: 'danh-sach-hd', label: 'Danh sách hóa đơn' },
  { id: 'tra-cuu', label: 'Tra cứu hóa đơn' },
  { id: 'bao-cao-hd', label: 'Báo cáo hóa đơn' },
]

export function QuanLyHoaDon() {
  return (
    <ModulePage title="Quản lý hóa đơn" subNav={subNav}>
      <div style={{ padding: '24px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border)' }}>
        <p style={{ color: 'var(--text-muted)' }}>Quản lý và tra cứu toàn bộ hóa đơn. Liên kết Hóa đơn điện tử, Bán hàng, Mua hàng.</p>
      </div>
    </ModulePage>
  )
}
