import { useState } from 'react'
import { KhoTabs } from '../kho/KhoTabs'
import { VatTuHangHoa } from '../kho/VatTuHangHoa'
import { QuyTrinhMuaHang } from './QuyTrinhMuaHang'
import { NhaCungCap } from './NhaCungCap'

/** Hàng hóa, dịch vụ (Mua hàng) dùng chung danh mục với Vật tư hàng hóa (Kho) — cùng vatTuHangHoaApi / một cơ sở dữ liệu. */

const TABS_MUA_HANG = [
  { id: 'don-mua-hang', label: 'Đơn mua hàng' },
  { id: 'nhan-hang', label: 'Nhận hàng hóa dịch vụ' },
  { id: 'tra-lai-hang', label: 'Trả lại hàng mua' },
  { id: 'tra-tien-ncc', label: 'Trả tiền Nhà cung cấp' },
  { id: 'hop-dong-mua', label: 'Hợp đồng mua hàng' },
  { id: 'nhan-hoa-don', label: 'Nhận hóa đơn' },
  { id: 'giam-gia-mua', label: 'Giảm giá hàng mua' },
  { id: 'bao-cao-phan-tich', label: 'Báo cáo phân tích' },
  { id: 'quy-trinh', label: 'Quy trình' },
]

type ViewDanhMuc = 'nha-cung-cap' | 'hang-hoa-dich-vu' | 'dieu-khoan-thanh-toan' | 'tien-ich' | null

export function MuaHang() {
  const [tabHienTai, setTabHienTai] = useState('quy-trinh')
  const [viewDanhMuc, setViewDanhMuc] = useState<ViewDanhMuc>(null)

  const noiDungTab = () => {
    if (viewDanhMuc === 'nha-cung-cap') {
      return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <NhaCungCap onQuayLai={() => setViewDanhMuc(null)} />
        </div>
      )
    }
    if (viewDanhMuc === 'hang-hoa-dich-vu') {
      return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <VatTuHangHoa onQuayLai={() => setViewDanhMuc(null)} />
        </div>
      )
    }
    if (viewDanhMuc === 'dieu-khoan-thanh-toan') {
      return (
        <div style={placeholderStyles}>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Danh mục Điều khoản thanh toán.</p>
          <button type="button" style={btnQuayLai} onClick={() => setViewDanhMuc(null)}>← Quay lại</button>
        </div>
      )
    }
    if (viewDanhMuc === 'tien-ich') {
      return (
        <div style={placeholderStyles}>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Tiện ích mua hàng.</p>
          <button type="button" style={btnQuayLai} onClick={() => setViewDanhMuc(null)}>← Quay lại</button>
        </div>
      )
    }

    if (tabHienTai === 'quy-trinh') {
      return (
        <QuyTrinhMuaHang
          onChonNhaCungCap={() => setViewDanhMuc('nha-cung-cap')}
          onChonHangHoaDichVu={() => setViewDanhMuc('hang-hoa-dich-vu')}
          onChonDieuKhoanThanhToan={() => setViewDanhMuc('dieu-khoan-thanh-toan')}
          onChonTienIch={() => setViewDanhMuc('tien-ich')}
          onChonTab={(tabId) => setTabHienTai(tabId)}
        />
      )
    }

    return (
      <div style={placeholderStyles}>
        <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
          Tab &quot;{TABS_MUA_HANG.find((t) => t.id === tabHienTai)?.label}&quot; — Nội dung nghiệp vụ. Mở song song nhiều tab không mất dữ liệu.
        </p>
      </div>
    )
  }

  const tieuDeDanhMuc =
    viewDanhMuc === 'nha-cung-cap'
      ? 'Nhà cung cấp'
      : viewDanhMuc === 'hang-hoa-dich-vu'
        ? 'Hàng hóa, dịch vụ'
        : viewDanhMuc === 'dieu-khoan-thanh-toan'
          ? 'Điều khoản thanh toán'
          : viewDanhMuc === 'tien-ich'
            ? 'Tiện ích'
            : 'Mua hàng'

  return (
    <div style={pageWrap}>
      <h1 style={tieuDe}>{tieuDeDanhMuc}</h1>
      {viewDanhMuc == null && (
        <KhoTabs
          tabs={TABS_MUA_HANG}
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
