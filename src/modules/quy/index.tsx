import { ModulePage } from '../../components/ModulePage'

const subNav = [
  { id: 'quy-tien-mat', label: 'Quỹ tiền mặt' },
  { id: 'phieu-thu-chi', label: 'Phiếu thu / Phiếu chi' },
  { id: 'bao-cao-quy', label: 'Báo cáo quỹ' },
]

export function Quy() {
  return (
    <ModulePage title="Quỹ" subNav={subNav}>
      <div style={{ padding: '24px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border)' }}>
        <p style={{ color: 'var(--text-muted)' }}>Quản lý quỹ tiền mặt, phiếu thu chi. Kết nối DanhMuc_TaiKhoan (Hệ thống tài khoản).</p>
      </div>
    </ModulePage>
  )
}
