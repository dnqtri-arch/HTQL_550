import { ModulePage } from '../../components/ModulePage'

const subNav = [
  { id: 'bang-luong', label: 'Bảng lương' },
  { id: 'bhxh', label: 'BHXH' },
  { id: 'bao-cao', label: 'Báo cáo tiền lương' },
]

export function TienLuong() {
  return (
    <ModulePage title="Tiền lương" subNav={subNav}>
      <div style={{ padding: '24px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border)' }}>
        <p style={{ color: 'var(--text-muted)' }}>Tính lương, BHXH. Sử dụng Danh mục Nhân viên (DanhMuc_DoiTuong).</p>
      </div>
    </ModulePage>
  )
}
