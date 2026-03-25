import { ModulePage } from '../../components/modulePage'

const subNav = [
  { id: 'danh-sach', label: 'Danh sách công việc' },
  { id: 'tao-moi', label: 'Tạo công việc' },
  { id: 'bao-cao', label: 'Báo cáo' },
]

export function CongViec() {
  return (
    <ModulePage title="Công việc" subNav={subNav}>
      <div style={{ padding: '24px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border)' }}>
        <p style={{ color: 'var(--text-muted)' }}>Quản lý danh sách công việc, tạo mới và xem báo cáo. Dữ liệu từ Danh mục Nhân viên được sử dụng tại đây.</p>
      </div>
    </ModulePage>
  )
}
