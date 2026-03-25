import { ModulePage } from '../../components/modulePage'
import { QuyTrinhNghiepVu } from './quyTrinhNghiepVu'

const subNav = [
  { id: 'tong-quan', label: 'Tổng quan tài chính' },
  { id: 'doanh-thu', label: 'Doanh thu' },
  { id: 'chi-phi', label: 'Chi phí' },
  { id: 'lai-lo', label: 'Lãi lỗ' },
  { id: 'cong-no', label: 'Công nợ' },
  { id: 'ton-kho', label: 'Tồn kho' },
  { id: 'quy-trinh', label: 'Quy trình nghiệp vụ' },
  { id: 'thong-bao', label: 'Thông báo' },
]

export function BanLamViec() {
  return (
    <ModulePage title="Bàn làm việc" subNav={subNav} defaultSubId="quy-trinh">
      <div
        style={{
          padding: '8px',
          background: 'var(--bg-secondary)',
          borderRadius: '4px',
          border: '1px solid var(--border-strong)',
        }}
      >
        <h2
          style={{
            fontSize: '12px',
            marginBottom: '6px',
            color: 'var(--accent)',
            fontWeight: 600,
          }}
        >
          Quy trình nghiệp vụ
        </h2>
        <QuyTrinhNghiepVu />
      </div>
    </ModulePage>
  )
}
