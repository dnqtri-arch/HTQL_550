import React, { useState } from 'react'
import { KhoTabs } from '../kho/KhoTabs'
import { VatTuHangHoa } from '../kho/VatTuHangHoa'
import { QuyTrinhMuaHang } from './QuyTrinhMuaHang'
import { NhaCungCap } from './NhaCungCap'
import { DonMuaHang } from './DonMuaHang'
import { ListPageToolbar } from '../../components/ListPageToolbar'
import { loadDieuKhoanThanhToan, saveDieuKhoanThanhToan, type DieuKhoanThanhToanItem } from './nhaCungCapApi'
import { formatNumberDisplay } from '../../utils/numberFormat'
import { ThemDieuKhoanThanhToanModal } from './ThemDieuKhoanThanhToanModal'
import { Plus } from 'lucide-react'

/** Hàng hóa, dịch vụ (Mua hàng) dùng chung danh mục với Vật tư hàng hóa (Kho) — cùng vatTuHangHoaApi / một cơ sở dữ liệu. */

function DieuKhoanThanhToanView({ onQuayLai }: { onQuayLai: () => void }) {
  const [danhSach, setDanhSach] = useState<DieuKhoanThanhToanItem[]>(() => loadDieuKhoanThanhToan())
  const [showThemModal, setShowThemModal] = useState(false)

  const handleThem = (item: DieuKhoanThanhToanItem) => {
    const list = [...danhSach, item]
    setDanhSach(list)
    saveDieuKhoanThanhToan(list)
    setShowThemModal(false)
  }

  const tableWrap: React.CSSProperties = {
    border: '1px solid var(--border)',
    borderRadius: 4,
    overflow: 'auto',
    background: 'var(--bg-secondary)',
    flex: 1,
    minHeight: 0,
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <ListPageToolbar
        onQuayLai={onQuayLai}
        quayLaiLabel="← Quay lại"
        buttons={[
          { icon: <Plus size={14} />, label: 'Thêm', onClick: () => setShowThemModal(true) },
        ]}
      />
      <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: 8 }}>Danh mục DKTT.</p>
      <div style={tableWrap}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
          <thead>
            <tr>
              <th style={{ padding: '6px 8px', textAlign: 'left', background: 'var(--bg-tab)', borderBottom: '1px solid var(--border)', fontWeight: 600, width: 72 }}>Mã</th>
              <th style={{ padding: '6px 8px', textAlign: 'left', background: 'var(--bg-tab)', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>Tên</th>
              <th style={{ padding: '6px 8px', textAlign: 'right', background: 'var(--bg-tab)', borderBottom: '1px solid var(--border)', fontWeight: 600, width: 120 }}>Số ngày được nợ</th>
              <th style={{ padding: '6px 8px', textAlign: 'right', background: 'var(--bg-tab)', borderBottom: '1px solid var(--border)', fontWeight: 600, width: 120 }}>Số nợ tối đa</th>
            </tr>
          </thead>
          <tbody>
            {danhSach.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ padding: '12px 10px', color: 'var(--text-muted)', fontSize: 11 }}>
                  Chưa có điều khoản. Bấm <strong>Thêm</strong> để tạo mới.
                </td>
              </tr>
            ) : (
              danhSach.map((d, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '6px 8px', color: 'var(--text-primary)' }}>{d.ma}</td>
                  <td style={{ padding: '6px 8px', color: 'var(--text-primary)' }}>{d.ten}</td>
                  <td style={{ padding: '6px 8px', textAlign: 'right', color: 'var(--text-primary)' }}>{d.so_ngay_duoc_no} ngày</td>
                  <td style={{ padding: '6px 8px', textAlign: 'right', color: 'var(--text-primary)' }}>{formatNumberDisplay(d.so_cong_no_toi_da, 0)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {showThemModal && (
        <ThemDieuKhoanThanhToanModal
          existingItems={danhSach}
          onClose={() => setShowThemModal(false)}
          onSave={handleThem}
          onSaveAndAdd={(item) => {
            const list = [...danhSach, item]
            setDanhSach(list)
            saveDieuKhoanThanhToan(list)
          }}
        />
      )}
    </div>
  )
}

const TABS_MUA_HANG = [
  { id: 'de-xuat-mua-hang', label: 'Đề xuất mua hàng' },
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
  const [tabHienTai, setTabHienTai] = useState('don-mua-hang')
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
        <DieuKhoanThanhToanView onQuayLai={() => setViewDanhMuc(null)} />
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

    if (tabHienTai === 'de-xuat-mua-hang') {
      return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <DonMuaHang variant="de-xuat" />
        </div>
      )
    }
    if (tabHienTai === 'don-mua-hang') {
      return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <DonMuaHang />
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
          ? 'DKTT'
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
  color: 'var(--accent-text)',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
}
