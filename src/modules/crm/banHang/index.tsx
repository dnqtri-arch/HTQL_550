/**
 * Module Bán hàng — entry point.
 * Tabs: Quy trình | Báo giá | Đơn hàng bán | Hợp đồng | Hóa đơn | Công nợ | Trả lại hàng
 * Tuân thủ imports-cau-truc.mdc: folder viết liền, không gạch ngang.
 * Quản lý tab nội bộ (không phụ thuộc vào ModulePage.setActiveSub).
 */

import { useState, useEffect } from 'react'
import { BaoGia } from './baoGia/baoGia'
import { DonHangBan } from './donHangBan/donHangBan'
import { HopDongBan } from './hopDongBan/hopDongBan'
import { HoaDonBan } from './hoaDon/hoaDonBan'
import { CongNoKhachHang } from './congNo/congNoKhachHang'
import { TraLaiHang } from './traLai/traLaiHang'
import { GhiNhanDoanhThu } from './ghiNhanDoanhThu/ghiNhanDoanhThu'
import { QuyTrinhBanHang } from './quyTrinhBanHang'
import { KhachHang } from './khachHang/khachHang'
import { VatTuHangHoa } from '../../kho/khoHang/vatTuHangHoa'
import { DieuKhoanThanhToanBanHangView } from './dieuKhoanThanhToan/dieuKhoanThanhToanBanHangView'
import { HTQL_BAN_HANG_TAB_EVENT, type BanHangTabEventDetail } from './banHangTabEvent'
import type { DonHangBanChungTuRecord, DonHangBanChungTuChiTiet } from '../../../types/donHangBanChungTu'

type SubId =
  | 'quy-trinh'
  | 'baogia'
  | 'donhangban'
  | 'hopdong'
  | 'ghinhandoanhthu'
  | 'hoadon'
  | 'congno'
  | 'tralai'

type ViewDanhMuc = 'khachhang' | 'vathh' | 'dieukhoanntt' | null

const TABS: { id: SubId; label: string }[] = [
  { id: 'quy-trinh', label: 'Quy trình' },
  { id: 'baogia', label: 'Báo giá' },
  { id: 'donhangban', label: 'Đơn hàng bán' },
  { id: 'hopdong', label: 'Hợp đồng' },
  { id: 'ghinhandoanhthu', label: 'Ghi nhận doanh thu' },
  { id: 'hoadon', label: 'Hóa đơn bán' },
  { id: 'congno', label: 'Công nợ KH' },
  { id: 'tralai', label: 'Trả lại hàng' },
]

export function BanHang() {
  const [activeTab, setActiveTab] = useState<SubId>('quy-trinh')
  const [viewDanhMuc, setViewDanhMuc] = useState<ViewDanhMuc>(null)
  const [prefillGndtTuDhb, setPrefillGndtTuDhb] = useState<{
    don: DonHangBanChungTuRecord
    chiTiet: DonHangBanChungTuChiTiet[]
  } | null>(null)

  useEffect(() => {
    const onTab = (e: Event) => {
      const raw = (e as CustomEvent<BanHangTabEventDetail>).detail
      let tabId: string | undefined
      let gndtTuDhb: { don: DonHangBanChungTuRecord; chiTiet: DonHangBanChungTuChiTiet[] } | undefined
      if (typeof raw === 'string') tabId = raw
      else if (raw && typeof raw === 'object' && 'tab' in raw) {
        tabId = raw.tab
        gndtTuDhb = raw.ghiNhanTuDonBan
      }
      if (!tabId || !TABS.some((t) => t.id === tabId)) return
      setViewDanhMuc(null)
      setActiveTab(tabId as SubId)
      if (gndtTuDhb) setPrefillGndtTuDhb(gndtTuDhb)
    }
    window.addEventListener(HTQL_BAN_HANG_TAB_EVENT, onTab)
    return () => window.removeEventListener(HTQL_BAN_HANG_TAB_EVENT, onTab)
  }, [])

  const navigate = (tab: string) => {
    if (tab === 'khachhang') { setViewDanhMuc('khachhang'); return }
    if (tab === 'vathh') { setViewDanhMuc('vathh'); return }
    if (tab === 'dieukhoanntt') { setViewDanhMuc('dieukhoanntt'); return }
    const found = TABS.find((t) => t.id === tab)
    if (found) {
      setViewDanhMuc(null)
      setActiveTab(found.id)
    }
  }

  const tieuDe =
    viewDanhMuc === 'khachhang' ? 'Khách hàng'
    : viewDanhMuc === 'vathh' ? 'Sản phẩm, hàng hóa'
    : viewDanhMuc === 'dieukhoanntt' ? 'Điều khoản thanh toán'
    : 'Bán hàng'

  return (
    <div style={{
      background: 'var(--bg-primary)',
      color: 'var(--text-primary)',
      height: '100%',
      minHeight: 0,
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Header */}
      <h1 style={{ fontSize: 14, fontWeight: 600, marginBottom: 6, color: 'var(--text-primary)' }}>
        {tieuDe}
      </h1>

      {/* Danh mục view — che tab bar */}
      {viewDanhMuc === 'khachhang' && (
        <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <KhachHang onQuayLai={() => setViewDanhMuc(null)} />
        </div>
      )}
      {viewDanhMuc === 'vathh' && (
        <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <VatTuHangHoa onQuayLai={() => setViewDanhMuc(null)} filterMode="ban" />
        </div>
      )}
      {viewDanhMuc === 'dieukhoanntt' && (
        <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <DieuKhoanThanhToanBanHangView onQuayLai={() => setViewDanhMuc(null)} />
        </div>
      )}

      {/* Tab bar — ẩn khi xem danh mục */}
      {viewDanhMuc == null && (
        <>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 4,
            marginBottom: 8,
            paddingBottom: 6,
            borderBottom: '1px solid var(--border-strong)',
          }}>
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                style={{
                  padding: '4px 10px',
                  background: activeTab === tab.id ? 'var(--accent)' : 'var(--bg-secondary)',
                  color: activeTab === tab.id ? 'var(--accent-text)' : 'var(--text-primary)',
                  border: `1px solid ${activeTab === tab.id ? 'var(--accent)' : 'var(--border)'}`,
                  borderRadius: 4,
                  cursor: 'pointer',
                  fontSize: 11,
                  fontFamily: 'inherit',
                  fontWeight: activeTab === tab.id ? 700 : 400,
                  transition: 'background 0.12s, color 0.12s',
                }}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {activeTab === 'quy-trinh' && <QuyTrinhBanHang onNavigate={navigate} />}
            {activeTab === 'baogia' && <BaoGia onNavigate={navigate} />}
            {activeTab === 'donhangban' && <DonHangBan onNavigate={navigate} />}
            {activeTab === 'hopdong' && <HopDongBan />}
            {activeTab === 'ghinhandoanhthu' && (
              <GhiNhanDoanhThu
                prefillTuDonHangBan={prefillGndtTuDhb}
                onConsumedPrefillTuDonHangBan={() => setPrefillGndtTuDhb(null)}
              />
            )}
            {activeTab === 'hoadon' && <HoaDonBan />}
            {activeTab === 'congno' && <CongNoKhachHang />}
            {activeTab === 'tralai' && <TraLaiHang />}
          </div>
        </>
      )}
    </div>
  )
}
