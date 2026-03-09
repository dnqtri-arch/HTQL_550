import { ModulePage } from '../../components/ModulePage'

const subNav = [
  { id: 'thue-gtgt', label: 'Thuế GTGT' },
  { id: 'thue-tncn', label: 'Thuế TNCN' },
  { id: 'to-khai', label: 'Tờ khai thuế' },
]

export function Thue() {
  return (
    <ModulePage title="Thuế" subNav={subNav}>
      <div style={{ padding: '24px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border)' }}>
        <p style={{ color: 'var(--text-muted)' }}>Quản lý thuế GTGT, TNCN, tờ khai. Liên kết Hóa đơn điện tử và Tổng hợp.</p>
      </div>
    </ModulePage>
  )
}
