import { ModulePage } from '../../components/modulePage'

const subNav = [
  { id: 'phat-hanh', label: 'Phát hành hóa đơn' },
  { id: 'ky-so', label: 'Ký số' },
  { id: 'dong-bo', label: 'Đồng bộ cơ quan thuế' },
]

export function HoaDonDienTu() {
  return (
    <ModulePage title="Hóa đơn điện tử" subNav={subNav}>
      <div style={{ padding: '24px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border)' }}>
        <p style={{ color: 'var(--text-muted)' }}>Phát hành và quản lý hóa đơn điện tử, ký số, đồng bộ với cơ quan thuế.</p>
      </div>
    </ModulePage>
  )
}
