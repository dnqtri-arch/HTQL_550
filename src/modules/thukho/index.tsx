import { ModulePage } from '../../components/modulePage'

const subNav = [
  { id: 'phieu-nhap', label: 'Phiếu nhập kho' },
  { id: 'phieu-xuat', label: 'Phiếu xuất kho' },
  { id: 'kiem-ke', label: 'Kiểm kê kho' },
]

export function ThuKho() {
  return (
    <ModulePage title="Thủ kho" subNav={subNav}>
      <div style={{ padding: '24px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border)' }}>
        <p style={{ color: 'var(--text-muted)' }}>Nghiệp vụ thủ kho: phiếu nhập, phiếu xuất, kiểm kê. Gắn với phân hệ Kho và DanhMuc_VatTu.</p>
      </div>
    </ModulePage>
  )
}
