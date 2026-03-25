import { ModulePage } from '../../components/modulePage'

const subNav = [
  { id: 'gia-thanh-sp', label: 'Giá thành sản phẩm' },
  { id: 'chi-phi', label: 'Tập hợp chi phí' },
  { id: 'phan-bo', label: 'Phân bổ giá thành' },
]

export function GiaThanh() {
  return (
    <ModulePage title="Giá thành" subNav={subNav}>
      <div style={{ padding: '24px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border)' }}>
        <p style={{ color: 'var(--text-muted)' }}>Tính giá thành sản phẩm, tập hợp chi phí. Kết nối Kho, Tổng hợp, Tiền lương.</p>
      </div>
    </ModulePage>
  )
}
