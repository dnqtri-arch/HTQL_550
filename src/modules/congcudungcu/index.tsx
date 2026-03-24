import { ModulePage } from '../../components/ModulePage'

const subNav = [
  { id: 'danh-sach-ccdc', label: 'Danh sách CCDC' },
  { id: 'phan-bo', label: 'Phân bổ công cụ dụng cụ' },
  { id: 'bao-cao', label: 'Báo cáo CCDC' },
]

export function CongCuDungCu() {
  return (
    <ModulePage title="Công cụ dụng cụ" subNav={subNav}>
      <div style={{ padding: '24px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border)' }}>
        <p style={{ color: 'var(--text-muted)' }}>Quản lý công cụ dụng cụ, phân bổ và báo cáo. Liên kết Kho và DanhMuc_VatTu.</p>
      </div>
    </ModulePage>
  )
}
