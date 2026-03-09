import { ModulePage } from '../../components/ModulePage'

const subNav = [
  { id: 'so-cai', label: 'Sổ cái' },
  { id: 'so-chi-tiet', label: 'Sổ chi tiết' },
  { id: 'can-doi', label: 'Cân đối tài khoản' },
  { id: 'bao-cao-tc', label: 'Báo cáo tài chính' },
]

export function TongHop() {
  return (
    <ModulePage title="Tổng hợp" subNav={subNav}>
      <div style={{ padding: '24px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border)' }}>
        <p style={{ color: 'var(--text-muted)' }}>Kế toán tổng hợp: sổ cái, sổ chi tiết, cân đối. Sử dụng Hệ thống tài khoản (DanhMuc_TaiKhoan). Trung tâm kết nối các phân hệ.</p>
      </div>
    </ModulePage>
  )
}
