import { useState } from 'react'
import { KhoTabs } from './KhoTabs'
import { QuyTrinhKho } from './QuyTrinhKho'
import { VatTuHangHoa } from './VatTuHangHoa'
import { DonViTinh } from './DonViTinh'
import { DanhSachKho } from './DanhSachKho'

const TABS_KHO = [
  { id: 'ton-kho', label: 'Tồn kho' },
  { id: 'nhap-kho', label: 'Nhập kho' },
  { id: 'xuat-kho', label: 'Xuất kho' },
  { id: 'chuyen-kho', label: 'Chuyển kho' },
  { id: 'lenh-san-xuat', label: 'Lệnh sản xuất' },
  { id: 'kiem-ke', label: 'Kiểm kê' },
  { id: 'bao-cao-phan-tich', label: 'Báo cáo phân tích' },
  { id: 'quy-trinh', label: 'Quy trình' },
]

type ViewDanhMuc = 'vat-tu-hang-hoa' | 'kho' | 'don-vi-tinh' | 'tien-ich' | null

export function Kho() {
  const [tabHienTai, setTabHienTai] = useState('quy-trinh')
  const [viewDanhMuc, setViewDanhMuc] = useState<ViewDanhMuc>(null)

  const noiDungTab = () => {
    if (viewDanhMuc === 'vat-tu-hang-hoa') {
      return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <VatTuHangHoa
            onQuayLai={() => setViewDanhMuc(null)}
          />
        </div>
      )
    }
    if (viewDanhMuc === 'kho') {
      return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <DanhSachKho onQuayLai={() => setViewDanhMuc(null)} />
        </div>
      )
    }
    if (viewDanhMuc === 'don-vi-tinh') {
      return (
        <DonViTinh
          onQuayLai={() => setViewDanhMuc(null)}
        />
      )
    }
    if (viewDanhMuc === 'tien-ich') {
      return (
        <div style={placeholderStyles}>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Tiện ích kho.</p>
          <button type="button" style={btnQuayLai} onClick={() => setViewDanhMuc(null)}>← Quay lại</button>
        </div>
      )
    }

    if (tabHienTai === 'quy-trinh') {
      return (
        <QuyTrinhKho
          onChonVatTuHangHoa={() => setViewDanhMuc('vat-tu-hang-hoa')}
          onChonKho={() => setViewDanhMuc('kho')}
          onChonDonViTinh={() => setViewDanhMuc('don-vi-tinh')}
          onChonTienIch={() => setViewDanhMuc('tien-ich')}
          onChonTab={(tabId) => setTabHienTai(tabId)}
        />
      )
    }

    return (
      <div style={placeholderStyles}>
        <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
          Tab &quot;{TABS_KHO.find((t) => t.id === tabHienTai)?.label}&quot; — Nội dung nghiệp vụ. Mở song song nhiều tab không mất dữ liệu.
        </p>
      </div>
    )
  }

  return (
    <div style={pageWrap}>
      {/* Khi vào Đơn vị tính: toàn màn hình như MISA, không menu trái, không tab */}
      <h1 style={tieuDe}>
        {viewDanhMuc === 'don-vi-tinh'
          ? 'Đơn vị tính'
          : viewDanhMuc === 'vat-tu-hang-hoa'
            ? 'Vật tư hàng hóa'
            : viewDanhMuc === 'kho'
              ? 'Kho'
              : viewDanhMuc === 'tien-ich'
                ? 'Tiện ích'
                : 'Kho'}
      </h1>
      {viewDanhMuc == null && (
        <KhoTabs
          tabs={TABS_KHO}
          tabHienTai={tabHienTai}
          onChonTab={(id) => setTabHienTai(id)}
        />
      )}
      <div style={contentWrap}>{noiDungTab()}</div>
    </div>
  )
}

const pageWrap: React.CSSProperties = {
  background: 'var(--bg-primary)',
  color: 'var(--text-primary)',
  minHeight: '100%',
  display: 'flex',
  flexDirection: 'column',
}

const tieuDe: React.CSSProperties = {
  fontSize: '14px',
  fontWeight: 600,
  marginBottom: '4px',
  color: 'var(--text-primary)',
}

const contentWrap: React.CSSProperties = {
  flex: 1,
  overflow: 'auto',
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
}

const placeholderStyles: React.CSSProperties = {
  padding: '8px',
  border: '1px solid var(--border-strong)',
  borderRadius: '4px',
  background: 'var(--bg-secondary)',
}

const btnQuayLai: React.CSSProperties = {
  marginTop: '6px',
  padding: '4px 8px',
  fontSize: '11px',
  background: 'var(--accent)',
  color: '#0d0d0d',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
}
