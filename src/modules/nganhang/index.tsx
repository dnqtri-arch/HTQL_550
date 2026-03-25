import { ModulePage } from '../../components/modulePage'

const subNav = [
  { id: 'danh-sach-nh', label: 'Danh sách ngân hàng' },
  { id: 'so-phieu', label: 'Sổ phiếu ngân hàng' },
  { id: 'doi-ung', label: 'Đối ứng ngân hàng' },
]

export function NganHang() {
  return (
    <ModulePage title="Ngân hàng" subNav={subNav}>
      <div style={{ padding: '24px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border)' }}>
        <p style={{ color: 'var(--text-muted)' }}>Quản lý tài khoản ngân hàng và giao dịch. Sử dụng Danh mục Ngân hàng (DanhMuc_TaiKhoan).</p>
      </div>
    </ModulePage>
  )
}
