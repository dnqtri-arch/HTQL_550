import { ModulePage } from '../../components/ModulePage'

const subNav = [
  { id: 'thu-muc', label: 'Thư mục tài liệu' },
  { id: 'upload', label: 'Tải lên' },
  { id: 'tim-kiem', label: 'Tìm kiếm tài liệu' },
]

export function TaiLieu() {
  return (
    <ModulePage title="Tài liệu" subNav={subNav}>
      <div style={{ padding: '24px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border)' }}>
        <p style={{ color: 'var(--text-muted)' }}>Lưu trữ và quản lý tài liệu chung của doanh nghiệp.</p>
      </div>
    </ModulePage>
  )
}
