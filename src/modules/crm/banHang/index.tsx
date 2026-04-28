/**
 * Module Bán hàng — entry point (YC82: không tab bar; điều hướng qua sơ đồ / sự kiện).
 */

import { useState, useEffect } from 'react'
import { BaoGia } from './baoGia/baoGia'
import { DonHangBan } from './donHangBan/donHangBan'
import { HopDongBan } from './hopDongBan/hopDongBan'
import { PhuLucHopDongBan } from './phuLucHopDongBan/phuLucHopDongBan'
import { HoaDonBan } from './hoaDon/hoaDonBan'
import { CongNoKhachHang } from './congNo/congNoKhachHang'
import { TraLaiHang } from './traLai/traLaiHang'
import { GhiNhanDoanhThu } from './ghiNhanDoanhThu/ghiNhanDoanhThu'
import { QuyTrinhBanHang } from './quyTrinhBanHang'
import { KhachHang } from './khachHang/khachHang'
import { VatTuHangHoa } from '../../kho/vatTuHangHoa/index'
import { DieuKhoanThanhToanBanHangView } from './dieuKhoanThanhToan/dieuKhoanThanhToanBanHangView'
import { HTQL_BAN_HANG_TAB_EVENT, type BanHangTabEventDetail } from './banHangTabEvent'
import type { DonHangBanChungTuRecord, DonHangBanChungTuChiTiet } from '../../../types/donHangBanChungTu'

type SubId =
  | 'quy-trinh'
  | 'baogia'
  | 'donhangban'
  | 'hopdong'
  | 'phu-luc-hop-dong'
  | 'ghinhandoanhthu'
  | 'hoadon'
  | 'congno'
  | 'tralai'

type ViewDanhMuc = 'khachhang' | 'vathh' | 'dieukhoanntt' | null

const VALID_SUB_IDS = new Set<SubId>([
  'quy-trinh',
  'baogia',
  'donhangban',
  'hopdong',
  'phu-luc-hop-dong',
  'ghinhandoanhthu',
  'hoadon',
  'congno',
  'tralai',
])

/** Ánh xạ id từ sơ đồ / sự kiện → tab nội bộ */
const NAV_TO_SUB: Record<string, SubId> = {
  baogia: 'baogia',
  donhangban: 'donhangban',
  hopdong: 'hopdong',
  phuluchopdong: 'phu-luc-hop-dong',
  ghinhandoanhthu: 'ghinhandoanhthu',
  hoadon: 'hoadon',
  congno: 'congno',
  tralai: 'tralai',
}

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
      const mapped = tabId ? NAV_TO_SUB[tabId] ?? (VALID_SUB_IDS.has(tabId as SubId) ? (tabId as SubId) : undefined) : undefined
      if (!mapped) return
      setViewDanhMuc(null)
      setActiveTab(mapped)
      if (gndtTuDhb) setPrefillGndtTuDhb(gndtTuDhb)
    }
    window.addEventListener(HTQL_BAN_HANG_TAB_EVENT, onTab)
    return () => window.removeEventListener(HTQL_BAN_HANG_TAB_EVENT, onTab)
  }, [])

  const navigate = (tab: string) => {
    if (tab === 'khachhang') {
      setViewDanhMuc('khachhang')
      return
    }
    if (tab === 'vathh') {
      setViewDanhMuc('vathh')
      return
    }
    if (tab === 'dieukhoanntt') {
      setViewDanhMuc('dieukhoanntt')
      return
    }
    const sub = NAV_TO_SUB[tab]
    if (sub) {
      setViewDanhMuc(null)
      setActiveTab(sub)
    }
  }

  return (
    <div
      style={{
        background: 'var(--bg-primary)',
        color: 'var(--text-primary)',
        height: '100%',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
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

      {viewDanhMuc == null && (
        <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {activeTab === 'quy-trinh' && <QuyTrinhBanHang onNavigate={navigate} />}
          {activeTab === 'baogia' && <BaoGia onNavigate={navigate} />}
          {activeTab === 'donhangban' && <DonHangBan onNavigate={navigate} />}
          {activeTab === 'hopdong' && <HopDongBan />}
          {activeTab === 'phu-luc-hop-dong' && <PhuLucHopDongBan />}
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
      )}
    </div>
  )
}
