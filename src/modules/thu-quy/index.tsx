import { ModulePage } from '../../components/ModulePage'

const subNav = [
  { id: 'phieu-thu', label: 'Phiếu thu' },
  { id: 'phieu-chi', label: 'Phiếu chi' },
  { id: 'ton-quy', label: 'Tồn quỹ' },
]

export function ThuQuy() {
  return (
    <ModulePage title="Thủ quỹ" subNav={subNav}>
      <div style={{ padding: '24px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border)' }}>
        <p style={{ color: 'var(--text-muted)' }}>Nghiệp vụ thủ quỹ: phiếu thu, phiếu chi, tồn quỹ. Liên kết Quỹ và Danh mục Đối tượng.</p>
      </div>
    </ModulePage>
  )
}
