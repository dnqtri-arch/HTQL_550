import { useState } from 'react'
import { KhoTabs } from './khoTabs/index'
import { QuyTrinhKho } from './quyTrinhKho/index'
import { VatTuHangHoa } from './vatTuHangHoa/index'
import { DonViTinh } from './donViTinh/index'
import { DanhSachKho } from './danhSachKho/index'
import { KhoVthhPage } from './tonKho/page'
import { NhapKhoList } from './nhapKho/index'
import { XuatKhoList } from './xuatKho/xuatKhoList'
import { LoaiVthh } from './loaiVthh/index'
import { NhomVthh } from './nhomVthh/index'
import { ThueGtgt } from './thueGtgt/index'
import { KhoGiay } from './khoGiay/index'
import { DoDayDinhLuong } from './doDayDinhLuong/index'
import { HeMau } from './heMau/index'

const TABS_KHO = [
  { id: 'ton-kho', label: 'Tồn kho' },
  { id: 'nhap-kho', label: 'Nhập kho' },
  { id: 'xuat-kho', label: 'Xuất kho' },
  { id: 'chuyen-kho', label: 'Chuyển kho' },
  { id: 'lenh-san-xuat', label: 'Lệnh sản xuất' },
  { id: 'kiem-ke', label: 'Kiểm kê' },
  { id: 'kho-vat-tu-hang-hoa', label: 'Tồn kho' },
  { id: 'quy-trinh', label: 'Quy trình' },
]

type ViewDanhMuc =
  | 'vat-tu-hang-hoa'
  | 'loai-vthh'
  | 'nhom-vthh'
  | 'kho-giay'
  | 'do-day-dinh-luong'
  | 'he-mau'
  | 'thue-gtgt'
  | 'kho'
  | 'don-vi-tinh'
  | 'tien-ich'
  | null

export function Kho() {
  const [tabHienTai, setTabHienTai] = useState('quy-trinh')
  const [viewDanhMuc, setViewDanhMuc] = useState<ViewDanhMuc>(null)
  const currentTitle =
    viewDanhMuc === 'don-vi-tinh'
      ? 'Đơn vị tính'
      : viewDanhMuc === 'vat-tu-hang-hoa'
        ? 'Vật tư hàng hóa'
        : viewDanhMuc === 'loai-vthh'
          ? 'Loại VTHH'
          : viewDanhMuc === 'nhom-vthh'
            ? 'Nhóm VTHH'
            : viewDanhMuc === 'kho-giay'
              ? 'Khổ giấy'
              : viewDanhMuc === 'do-day-dinh-luong'
                ? 'Độ dày/ Định lượng'
                : viewDanhMuc === 'he-mau'
                  ? 'Hệ màu'
                : viewDanhMuc === 'thue-gtgt'
                  ? 'Thuế GTGT'
                  : viewDanhMuc === 'kho'
                    ? 'Kho hàng'
                    : viewDanhMuc === 'tien-ich'
                      ? 'Tiện ích'
                      : tabHienTai === 'kho-vat-tu-hang-hoa'
                        ? 'Tồn kho (Nhập - Xuất - Tồn)'
                        : 'Kho hàng'

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
    if (viewDanhMuc === 'loai-vthh') {
      return <LoaiVthh onQuayLai={() => setViewDanhMuc(null)} />
    }
    if (viewDanhMuc === 'nhom-vthh') {
      return <NhomVthh onQuayLai={() => setViewDanhMuc(null)} />
    }
    if (viewDanhMuc === 'kho-giay') {
      return <KhoGiay onQuayLai={() => setViewDanhMuc(null)} />
    }
    if (viewDanhMuc === 'do-day-dinh-luong') {
      return <DoDayDinhLuong onQuayLai={() => setViewDanhMuc(null)} />
    }
    if (viewDanhMuc === 'he-mau') {
      return <HeMau onQuayLai={() => setViewDanhMuc(null)} />
    }
    if (viewDanhMuc === 'thue-gtgt') {
      return <ThueGtgt onQuayLai={() => setViewDanhMuc(null)} />
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
          onChonLoaiVthh={() => setViewDanhMuc('loai-vthh')}
          onChonNhomVthh={() => setViewDanhMuc('nhom-vthh')}
          onChonKhoGiay={() => setViewDanhMuc('kho-giay')}
          onChonDoDayDinhLuong={() => setViewDanhMuc('do-day-dinh-luong')}
          onChonHeMau={() => setViewDanhMuc('he-mau')}
          onChonThueGtgt={() => setViewDanhMuc('thue-gtgt')}
          onChonKho={() => setViewDanhMuc('kho')}
          onChonDonViTinh={() => setViewDanhMuc('don-vi-tinh')}
          onChonTienIch={() => setViewDanhMuc('tien-ich')}
          onChonTab={(tabId) => setTabHienTai(tabId)}
        />
      )
    }

    if (tabHienTai === 'kho-vat-tu-hang-hoa') {
      return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 480 }}>
          <KhoVthhPage />
        </div>
      )
    }

    if (tabHienTai === 'nhap-kho') {
      return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 300 }}>
          <NhapKhoList />
        </div>
      )
    }

    if (tabHienTai === 'xuat-kho') {
      return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 300 }}>
          <XuatKhoList />
        </div>
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
      <h1 style={tieuDe}>{currentTitle}</h1>
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
  color: 'var(--accent-text)',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
}
