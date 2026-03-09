import { ModulePage } from '../../components/ModulePage'

const subNav = [
  { id: 'danh-sach', label: 'Danh sách hợp đồng' },
  { id: 'tao-moi', label: 'Tạo hợp đồng' },
  { id: 'theo-doi', label: 'Theo dõi thực hiện' },
]

export function HopDong() {
  return (
    <ModulePage title="Hợp đồng" subNav={subNav}>
      <div style={{ padding: '24px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border)' }}>
        <p style={{ color: 'var(--text-muted)' }}>Quản lý hợp đồng với Khách hàng, Nhà cung cấp. Liên kết với DanhMuc_DoiTuong.</p>
      </div>
    </ModulePage>
  )
}
