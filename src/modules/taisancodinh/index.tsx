import { ModulePage } from '../../components/ModulePage'

const subNav = [
  { id: 'danh-sach-tscd', label: 'Danh sách TSCĐ' },
  { id: 'hao-mon', label: 'Hao mòn TSCĐ' },
  { id: 'thanh-ly', label: 'Thanh lý / Điều chuyển' },
]

export function TaiSanCoDinh() {
  return (
    <ModulePage title="Tài sản cố định" subNav={subNav}>
      <div style={{ padding: '24px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border)' }}>
        <p style={{ color: 'var(--text-muted)' }}>Quản lý tài sản cố định, tính hao mòn, thanh lý. Kết nối Tổng hợp và Danh mục.</p>
      </div>
    </ModulePage>
  )
}
