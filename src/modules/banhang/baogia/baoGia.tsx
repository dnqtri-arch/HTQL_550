/**
 * Danh sách + Form Báo giá — YC20 / YC21 / YC22
 * [1] Side-Panel lịch sử KH (2 tab: Giá gần đây / Hợp đồng·HĐNT)
 * [2] Công thức SL  [3] Bậc giá  [4] Chuyển ĐH
 * [5] Cảnh báo hạn mức  [6] NCC lưỡng tính  [7] Math.round VND
 * [8] Enter nav   [9] Phân trang 50   [Toolbar] Lưu·Đính kèm·Mẫu·In·Gửi Zalo | Đóng
 * YC22: Unicode UTF-8 chuẩn, Brand Color Nam Bắc AD
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import {
  Plus, Trash2, Eye, Mail, MessageCircle, ChevronDown, X,
  Search, FileText, History, ChevronLeft, ChevronRight,
  Save, Paperclip, Printer, LayoutTemplate,
} from 'lucide-react'
import { DataGrid, type DataGridColumn } from '../../../components/common/dataGrid'
import { Modal } from '../../../components/common/modal'
import { useToastOptional } from '../../../context/toastContext'
import { matchSearchKeyword } from '../../../utils/stringUtils'
import { formatNumberDisplay, formatSoThapPhan } from '../../../utils/numberFormat'
import {
  baoGiaGetAll,
  baoGiaGetChiTiet,
  baoGiaDelete,
  baoGiaPost,
  baoGiaPut,
  baoGiaSoTiepTheo,
  baoGiaGetLichSuKhachHang,
  getDefaultBaoGiaFilter,
  KY_OPTIONS,
  type BaoGiaRecord,
  type BaoGiaChiTiet,
  type BanHangKyValue,
} from './baoGiaApi'
import { hopDongBanGetAll, type HopDongBanRecord } from '../hopdong/hopDongBanApi'
import type { BaoGiaCreatePayload, BanHangFilter } from '../../../types/banHang'
import { khachHangGetAll, type KhachHangRecord } from '../khachhang/khachHangApi'
import { vatTuHangHoaGetForBanHang, type VatTuHangHoaRecord } from '../../inventory/kho/vatTuHangHoaApi'
import styles from '../BanHang.module.css'

// ─── Badge trạng thái ──────────────────────────────────────────────────────
function BaoGiaBadge({ value }: { value: string }) {
  const cls =
    value === 'Đã chốt'      ? styles.badgeDaChot
    : value === 'Chờ duyệt'  ? styles.badgeChoDuyet
    : value === 'Hủy bỏ'     ? styles.badgeDaHuy
    : value === 'Đã gửi khách' ? styles.badgeDangThucHien
    : styles.badgeDefault
  return <span className={cls}>{value}</span>
}

function formatNgay(iso: string | null | undefined): string {
  if (!iso) return ''
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/)
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso
}

// ─── Tiered Pricing ─────────────────────────────────────────────────────────
function applyTieredPrice(sp: VatTuHangHoaRecord, soLuong: number): number {
  const basePrice = sp.gia_ban_quy_dinh ?? sp.don_gia_ban ?? 0
  if (!sp.chiet_khau || !sp.bang_chiet_khau || sp.bang_chiet_khau.length === 0) return basePrice
  const tier = sp.bang_chiet_khau.find((t) => {
    const from = parseFloat(t.so_luong_tu) || 0
    const to   = t.so_luong_den ? parseFloat(t.so_luong_den) : Infinity
    return soLuong >= from && soLuong <= to
  })
  if (tier) {
    const pct = parseFloat(tier.ty_le_chiet_khau) || 0
    return Math.round(basePrice * (1 - pct / 100))
  }
  return basePrice
}

// ─── Công thức SL ───────────────────────────────────────────────────────────
function tinhSoLuongTuCongThuc(formula: string, ts1: number, ts2: number): number {
  if (formula.includes('*')) return Math.round(ts1 * ts2 * 1000) / 1000
  if (formula.includes('+')) return ts1 + ts2
  if (formula.includes('-')) return ts1 - ts2
  return ts1
}

function hasFormula(formula?: string): boolean {
  return Boolean(formula && /[*/+\-]/.test(formula))
}

// ─── [8] Enter navigation ───────────────────────────────────────────────────
function navEnter(
  e: React.KeyboardEvent<HTMLInputElement>,
  rowKey: string,
  field: string,
  coFormula: boolean
) {
  if (e.key !== 'Enter') return
  e.preventDefault()
  const seqFormula = ['tham_so_1', 'tham_so_2', 'don_gia', 'pt_thue_gtgt', 'ghi_chu']
  const seqNormal  = ['so_luong', 'don_gia', 'pt_thue_gtgt', 'ghi_chu']
  const seq = coFormula ? seqFormula : seqNormal
  const idx = seq.indexOf(field)
  if (idx >= 0 && idx < seq.length - 1) {
    const nf   = seq[idx + 1]
    const next = document.querySelector<HTMLElement>(`[data-row="${rowKey}"][data-field="${nf}"]`)
    next?.focus()
  } else {
    const firstField = seq[0]
    const allFirst   = Array.from(document.querySelectorAll<HTMLElement>(`[data-field="${firstField}"]`))
    const cur        = document.querySelector<HTMLElement>(`[data-row="${rowKey}"][data-field="${field}"]`)
    const ci         = cur ? allFirst.indexOf(cur) : -1
    if (ci >= 0 && ci < allFirst.length - 1) allFirst[ci + 1]?.focus()
  }
}

// ─── Trạng thái báo giá ─────────────────────────────────────────────────────
const TINH_TRANGS: BaoGiaRecord['tinh_trang'][] = [
  'Chờ duyệt',
  'Đã gửi khách',
  'Đã chốt',
  'Hủy bỏ',
]

const TODAY_ISO = new Date().toISOString().slice(0, 10)
type ChiTietRow = Partial<BaoGiaChiTiet> & { _key: string }

// ─── [1] Side-Panel Lịch sử KH (2 tab) ─────────────────────────────────────
type LichSuTab = 'gia' | 'hopdong'

interface SidePanelLichSuProps {
  tenKh: string
  lichSuGia: { so_bao_gia: string; ngay_bao_gia: string; ten_hang: string; so_luong: number; don_gia: number }[]
  hopDongList: HopDongBanRecord[]
  onClose: () => void
  onCopyDonGia?: (tenHang: string, donGia: number) => void
}

function SidePanelLichSu({ tenKh, lichSuGia, hopDongList, onClose, onCopyDonGia }: SidePanelLichSuProps) {
  const [tab, setTab] = useState<LichSuTab>('gia')

  return (
    <div style={{
      width: 280, flexShrink: 0,
      borderLeft: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column',
      background: 'var(--bg-secondary)',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '6px 10px', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'var(--bg-primary)',
      }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)',
          display: 'flex', alignItems: 'center', gap: 4 }}>
          <History size={12} /> Lịch sử · {tenKh}
        </span>
        <button type="button" onClick={onClose}
          style={{ background: 'transparent', border: 'none', cursor: 'pointer',
            color: 'var(--text-muted)', padding: '0 2px' }}>
          <X size={13} />
        </button>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
        {([['gia', 'Giá gần đây'], ['hopdong', 'Hợp đồng / HĐNT']] as [LichSuTab, string][]).map(([key, label]) => (
          <button key={key} type="button" onClick={() => setTab(key)}
            style={{
              flex: 1, padding: '5px 6px', fontSize: 10, fontWeight: 600,
              border: 'none', cursor: 'pointer', fontFamily: 'inherit',
              background: tab === key ? 'var(--bg-tab-active)' : 'transparent',
              color: tab === key ? 'var(--accent)' : 'var(--text-muted)',
              borderBottom: tab === key ? '2px solid var(--accent)' : '2px solid transparent',
              transition: 'all 0.12s',
            }}>
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '6px 10px' }}>
        {tab === 'gia' ? (
          lichSuGia.length === 0 ? (
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', marginTop: 20 }}>
              Chưa có giao dịch nào.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
              <thead>
                <tr style={{ color: 'var(--text-muted)' }}>
                  <th style={{ textAlign: 'left', padding: '2px 3px', fontWeight: 600 }}>Số BG</th>
                  <th style={{ textAlign: 'left', padding: '2px 3px', fontWeight: 600 }}>Ngày</th>
                  <th style={{ textAlign: 'left', padding: '2px 3px', fontWeight: 600 }}>Tên hàng</th>
                  <th style={{ textAlign: 'right', padding: '2px 3px', fontWeight: 600 }}>SL</th>
                  <th style={{ textAlign: 'right', padding: '2px 3px', fontWeight: 600 }}>Đơn giá cũ</th>
                </tr>
              </thead>
              <tbody>
                {lichSuGia.map((h, i) => (
                  <tr key={i} style={{ borderTop: '1px solid var(--border)', cursor: 'pointer' }}
                    onClick={() => onCopyDonGia?.(h.ten_hang, h.don_gia)}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#eff6ff')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    title="Click để áp dụng đơn giá này vào dòng hàng tương ứng">
                    <td style={{ padding: '3px 3px', color: 'var(--accent)' }}>{h.so_bao_gia}</td>
                    <td style={{ padding: '3px 3px' }}>{formatNgay(h.ngay_bao_gia)}</td>
                    <td style={{ padding: '3px 3px', maxWidth: 100, overflow: 'hidden',
                      textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.ten_hang}</td>
                    <td style={{ padding: '3px 3px', textAlign: 'right',
                      fontVariantNumeric: 'tabular-nums' }}>{formatSoThapPhan(h.so_luong, 2)}</td>
                    <td style={{ padding: '3px 3px', textAlign: 'right',
                      fontVariantNumeric: 'tabular-nums', color: '#1e40af', fontWeight: 600 }}>
                      {formatNumberDisplay(h.don_gia, 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        ) : (
          hopDongList.length === 0 ? (
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', marginTop: 20 }}>
              Không có hợp đồng hiệu lực với KH này.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {hopDongList.map((hd) => (
                <div key={hd.id} style={{
                  border: '1px solid var(--border)', borderRadius: 5, padding: '6px 8px',
                  background: 'var(--bg-primary)', fontSize: 10,
                }}>
                  <div style={{ fontWeight: 700, color: '#1e40af', marginBottom: 2 }}>
                    {hd.so_hop_dong}
                  </div>
                  <div style={{ color: 'var(--text-muted)', lineHeight: 1.5 }}>
                    {hd.dien_giai && <div style={{ color: 'var(--text-primary)' }}>{hd.dien_giai}</div>}
                    <div>Hiệu lực: {formatNgay(hd.ngay_hieu_luc)} → {formatNgay(hd.ngay_het_han)}</div>
                    {hd.han_muc_gia_tri != null && (
                      <div>Hạn mức: <strong>{formatNumberDisplay(hd.han_muc_gia_tri, 0)} đ</strong></div>
                    )}
                    <div>
                      <span style={{
                        background: hd.tinh_trang === 'Đang hiệu lực' ? '#f0fdf4' : '#fef9c3',
                        color:      hd.tinh_trang === 'Đang hiệu lực' ? '#16a34a' : '#854d0e',
                        borderRadius: 3, padding: '1px 5px', fontSize: 9,
                      }}>{hd.tinh_trang}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  )
}

// ─── Form Báo giá (YC22: Layout 2 cột Grid 12 + Brand Color) ────────────────
interface BaoGiaFormProps {
  mode: 'add' | 'edit' | 'view'
  initialRecord?: BaoGiaRecord
  initialChiTiet?: BaoGiaChiTiet[]
  onClose: () => void
  onSaved: () => void
  onSavedAndAdd?: () => void
}

function BaoGiaForm({ mode, initialRecord, initialChiTiet, onClose, onSaved, onSavedAndAdd }: BaoGiaFormProps) {
  const toast = useToastOptional()
  const soRef = useRef<HTMLInputElement>(null)

  const [soBaoGia,    setSoBaoGia]    = useState(initialRecord?.so_bao_gia ?? '')
  const [ngayBaoGia,  setNgayBaoGia]  = useState(initialRecord?.ngay_bao_gia ?? TODAY_ISO)
  const [ngayHetHan,  setNgayHetHan]  = useState(initialRecord?.ngay_het_han ?? '')
  const [khachHang,   setKhachHang]   = useState(initialRecord?.khach_hang ?? '')
  const [diaChiKh,    setDiaChiKh]    = useState(initialRecord?.dia_chi_kh ?? '')
  const [maSoThueKh,  setMaSoThueKh]  = useState(initialRecord?.ma_so_thue_kh ?? '')
  const [nguoiLienHe, setNguoiLienHe] = useState(initialRecord?.nguoi_lien_he ?? '')
  const [dienGiai,    setDienGiai]    = useState(initialRecord?.dien_giai ?? '')
  const [tinhTrang,   setTinhTrang]   = useState<BaoGiaRecord['tinh_trang']>(
    initialRecord?.tinh_trang ?? 'Chờ duyệt'
  )
  const [nvBanHang, setNvBanHang] = useState(initialRecord?.nv_ban_hang ?? '')
  const [ghiChu,    setGhiChu]    = useState(initialRecord?.ghi_chu ?? '')
  const [loi,       setLoi]       = useState('')
  const [chiTiet,   setChiTiet]   = useState<ChiTietRow[]>(
    initialChiTiet?.map((c) => ({ ...c, _key: c.id })) ?? []
  )

  // [1] Side-panel lịch sử
  const [lichSuGia,     setLichSuGia]     = useState<{ so_bao_gia: string; ngay_bao_gia: string; ten_hang: string; so_luong: number; don_gia: number }[]>([])
  const [hopDongList,   setHopDongList]   = useState<HopDongBanRecord[]>([])
  const [showSidePanel, setShowSidePanel] = useState(false)

  const [selectedKh, setSelectedKh] = useState<KhachHangRecord | null>(null)

  const [showKhLookup, setShowKhLookup] = useState(false)
  const [khList,       setKhList]       = useState<KhachHangRecord[]>([])
  const [khSearch,     setKhSearch]     = useState('')

  const [showSpLookup, setShowSpLookup] = useState(false)
  const [spList,       setSpList]       = useState<VatTuHangHoaRecord[]>([])
  const [spSearch,     setSpSearch]     = useState('')
  const [editKey,      setEditKey]      = useState<string | null>(null)

  const spMap = useMemo(() => new Map(spList.map((s) => [s.ma, s])), [spList])

  useEffect(() => {
    vatTuHangHoaGetForBanHang().then(setSpList)
  }, [])

  const moKhLookup = () => {
    khachHangGetAll().then((list) => {
      setKhList(list)
      setShowKhLookup(true)
      setKhSearch('')
    })
  }

  // [1] + [5] + [6] Chọn KH
  const chonKhachHang = useCallback((kh: KhachHangRecord) => {
    setKhachHang(kh.ten_kh)
    setDiaChiKh(kh.dia_chi ?? '')
    setMaSoThueKh(kh.ma_so_thue ?? '')
    setNguoiLienHe(kh.dai_dien_theo_pl ?? '')
    setSelectedKh(kh)
    setShowKhLookup(false)

    const lich = baoGiaGetLichSuKhachHang(kh.ten_kh, 5)
    setLichSuGia(lich)

    const allHopDong = hopDongBanGetAll({ ky: 'tat_ca', tu: '', den: '', tim_kiem: '' })
    setHopDongList(allHopDong.filter((h) => h.khach_hang === kh.ten_kh))

    if (lich.length > 0 || allHopDong.length > 0) setShowSidePanel(true)

    // [5] Cảnh báo hạn mức
    if (kh.han_muc_no_kh && kh.han_muc_no_kh > 0) {
      const existing = baoGiaGetAll({ ky: 'tat_ca', tu: '', den: '', tim_kiem: '' })
        .filter((r) => r.khach_hang === kh.ten_kh && r.tinh_trang !== 'Hủy bỏ')
        .reduce((s, r) => s + r.tong_thanh_toan, 0)
      if (existing >= kh.han_muc_no_kh) {
        toast?.showToast(
          `⚠️ KH ${kh.ten_kh} đã vượt hạn mức công nợ ${formatNumberDisplay(kh.han_muc_no_kh, 0)} đ!`,
          'warning'
        )
      }
    }
  }, [toast])

  const moSpLookup = (key: string) => {
    setShowSpLookup(true)
    setSpSearch('')
    setEditKey(key)
  }

  // [2] + [3] Chọn SP
  const chonSanPham = useCallback((sp: VatTuHangHoaRecord) => {
    if (!editKey) return
    const congThuc   = sp.cong_thuc_tinh_so_luong ?? ''
    const baseDonGia = sp.gia_ban_quy_dinh ?? sp.don_gia_ban ?? 0
    setChiTiet((prev) =>
      prev.map((c) => {
        if (c._key !== editKey) return c
        return {
          ...c,
          ma_hang:           sp.ma,
          ten_hang:          sp.ten,
          dvt:               sp.dvt_chinh ?? '',
          cong_thuc_tinh_sl: congThuc || undefined,
          tham_so_1:         congThuc ? 0 : undefined,
          tham_so_2:         congThuc ? 0 : undefined,
          don_gia:           baseDonGia,
          thanh_tien:        Math.round((c.so_luong ?? 1) * baseDonGia),
        }
      })
    )
    setShowSpLookup(false)
    setEditKey(null)
  }, [editKey])

  const filteredKh = useMemo(() => 
    khSearch
      ? khList.filter((k) => `${k.ma_kh} ${k.ten_kh}`.toLowerCase().includes(khSearch.toLowerCase()))
      : khList,
    [khList, khSearch]
  )

  const filteredSp = useMemo(() => 
    spSearch
      ? spList.filter((s) => `${s.ma} ${s.ten}`.toLowerCase().includes(spSearch.toLowerCase()))
      : spList,
    [spList, spSearch]
  )

  useEffect(() => {
    if (mode === 'add' && !initialRecord) setSoBaoGia(baoGiaSoTiepTheo())
    setTimeout(() => soRef.current?.focus(), 60)
  }, [mode, initialRecord])

  // [7] Math.round tổng
  const tongTienHang  = Math.round(chiTiet.reduce((s, c) => s + (Number(c.thanh_tien) || 0), 0))
  const tongThueGtgt  = Math.round(chiTiet.reduce((s, c) => s + (Number(c.tien_thue_gtgt) || 0), 0))
  const tongThanhToan = tongTienHang + tongThueGtgt

  const themDong = () => {
    setChiTiet((prev) => [
      ...prev,
      {
        _key:           `new_${Date.now()}`,
        ma_hang:        '',
        ten_hang:       '',
        dvt:            '',
        so_luong:       1,
        don_gia:        0,
        thanh_tien:     0,
        pt_thue_gtgt:   null,
        tien_thue_gtgt: null,
        ghi_chu:        '',
      },
    ])
  }

  const xoaDong = (key: string) => {
    setChiTiet((prev) => prev.filter((c) => c._key !== key))
  }

  // [YC22 Mục 9] Copy đơn giá từ lịch sử vào dòng hàng tương ứng
  const apDungDonGiaLichSu = useCallback((tenHang: string, donGia: number) => {
    setChiTiet((prev) => {
      let found = false
      const updated = prev.map((c) => {
        if (!found && c.ten_hang === tenHang) {
          found = true
          const sl = Number(c.so_luong) || 1
          return {
            ...c,
            don_gia: donGia,
            thanh_tien: Math.round(sl * donGia),
            tien_thue_gtgt: c.pt_thue_gtgt != null ? Math.round(sl * donGia * Number(c.pt_thue_gtgt) / 100) : null,
          }
        }
        return c
      })
      if (found) {
        toast?.showToast(`Đã áp dụng đơn giá ${formatNumberDisplay(donGia, 0)} cho ${tenHang}.`, 'success')
      } else {
        toast?.showToast(`Không tìm thấy dòng hàng "${tenHang}" trong chi tiết.`, 'warning')
      }
      return updated
    })
  }, [toast])

  // [2] + [3] + [7] Cập nhật dòng
  const capNhatDong = useCallback((key: string, field: string, val: string | number | null) => {
    setChiTiet((prev) =>
      prev.map((c) => {
        if (c._key !== key) return c
        const updated: ChiTietRow = { ...c, [field]: val }

        if (field === 'tham_so_1' || field === 'tham_so_2') {
          const ts1 = field === 'tham_so_1' ? Number(val) : Number(c.tham_so_1) || 0
          const ts2 = field === 'tham_so_2' ? Number(val) : Number(c.tham_so_2) || 0
          updated.so_luong = tinhSoLuongTuCongThuc(c.cong_thuc_tinh_sl || '', ts1, ts2)
        }

        if (field === 'so_luong' || field === 'tham_so_1' || field === 'tham_so_2') {
          const sl = Number(updated.so_luong) || 0
          const sp = spMap.get(c.ma_hang ?? '')
          if (sp && sl > 0) {
            const tieredPrice = applyTieredPrice(sp, sl)
            if (tieredPrice > 0 && tieredPrice !== Number(c.don_gia)) {
              updated.don_gia = tieredPrice
            }
          }
          updated.thanh_tien = Math.round(sl * (Number(updated.don_gia) || 0))
          if (c.pt_thue_gtgt != null) {
            updated.tien_thue_gtgt = Math.round(updated.thanh_tien * Number(c.pt_thue_gtgt) / 100)
          }
        }

        if (field === 'don_gia') {
          const sl = Number(c.so_luong) || 0
          updated.thanh_tien = Math.round(sl * (Number(val) || 0))
          if (c.pt_thue_gtgt != null) {
            updated.tien_thue_gtgt = Math.round(updated.thanh_tien * Number(c.pt_thue_gtgt) / 100)
          }
        }

        if (field === 'pt_thue_gtgt') {
          const pct = val == null || val === '' ? null : Number(val)
          updated.pt_thue_gtgt   = pct
          updated.tien_thue_gtgt = pct == null ? null : Math.round((Number(c.thanh_tien) || 0) * pct / 100)
        }

        return updated
      })
    )
  }, [spMap])

  const validate = (): boolean => {
    if (!soBaoGia.trim()) {
      setLoi('Số báo giá không được để trống.')
      soRef.current?.focus()
      return false
    }
    if (!khachHang.trim()) {
      setLoi('Khách hàng không được để trống.')
      return false
    }
    setLoi('')
    return true
  }

  const buildPayload = (): BaoGiaCreatePayload => ({
    so_bao_gia:      soBaoGia.trim(),
    ngay_bao_gia:    ngayBaoGia,
    ngay_het_han:    ngayHetHan || null,
    khach_hang:      khachHang.trim(),
    dia_chi_kh:      diaChiKh.trim() || undefined,
    ma_so_thue_kh:   maSoThueKh.trim() || undefined,
    nguoi_lien_he:   nguoiLienHe.trim() || undefined,
    dien_giai:       dienGiai.trim() || undefined,
    tong_tien_hang:  tongTienHang,
    tong_thue_gtgt:  tongThueGtgt,
    tong_thanh_toan: tongThanhToan,
    tinh_trang:      tinhTrang,
    ghi_chu:         ghiChu.trim() || undefined,
    nv_ban_hang:     nvBanHang.trim() || undefined,
    chi_tiet: chiTiet.map((c, i) => ({
      stt:               i + 1,
      ma_hang:           c.ma_hang ?? '',
      ten_hang:          c.ten_hang ?? '',
      dvt:               c.dvt ?? '',
      cong_thuc_tinh_sl: c.cong_thuc_tinh_sl,
      tham_so_1:         c.tham_so_1,
      tham_so_2:         c.tham_so_2,
      so_luong:          Number(c.so_luong) || 0,
      don_gia:           Number(c.don_gia) || 0,
      thanh_tien:        Math.round(Number(c.thanh_tien) || 0),
      pt_thue_gtgt:      c.pt_thue_gtgt ?? null,
      tien_thue_gtgt:    c.tien_thue_gtgt != null ? Math.round(Number(c.tien_thue_gtgt)) : null,
      ghi_chu:           c.ghi_chu,
    })),
  })

  const handleLuu = () => {
    if (!validate()) return
    const payload = buildPayload()
    if (mode === 'edit' && initialRecord) {
      baoGiaPut(initialRecord.id, payload)
      toast?.showToast('Đã lưu báo giá.', 'success')
    } else {
      baoGiaPost(payload)
      toast?.showToast('Đã thêm báo giá.', 'success')
    }
    onSaved()
  }

  const handleLuuVaTiepTuc = () => {
    if (!validate()) return
    baoGiaPost(buildPayload())
    toast?.showToast('Đã lưu. Tiếp tục thêm mới.', 'success')
    setSoBaoGia(baoGiaSoTiepTheo())
    setKhachHang(''); setSelectedKh(null); setLichSuGia([]); setHopDongList([])
    setShowSidePanel(false); setNguoiLienHe(''); setDienGiai('')
    setTinhTrang('Chờ duyệt'); setNvBanHang(''); setGhiChu('')
    setChiTiet([]); setLoi('')
    onSavedAndAdd?.()
    setTimeout(() => soRef.current?.focus(), 60)
  }

  const readOnly = mode === 'view'

  // YC22: Brand Color Nam Bắc AD
  const tbBtn: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 4,
    padding: '4px 10px', background: 'transparent',
    border: '1px solid var(--border)', color: 'var(--text-primary)',
    cursor: 'pointer', borderRadius: 4, fontSize: 11, fontFamily: 'inherit',
  }
  const tbBtnSave: React.CSSProperties = {
    ...tbBtn,
    background: '#1e40af', color: '#fff', border: 'none', fontWeight: 600,
  }
  const tbBtnClose: React.CSSProperties = {
    ...tbBtn,
    background: '#ea580c', color: '#fff', border: 'none', fontWeight: 600,
    marginLeft: 'auto',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* Toolbar form (YC22: Brand Color) */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 4,
        padding: '5px 10px', borderBottom: '1px solid var(--border)',
        background: 'var(--bg-secondary)',
      }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginRight: 8 }}>
          {mode === 'add' ? 'Thêm Báo giá' : mode === 'edit' ? 'Sửa Báo giá' : 'Xem Báo giá'}
        </span>
        {loi && <span style={{ fontSize: 11, color: '#dc2626', marginRight: 8 }}>{loi}</span>}

        {!readOnly && (
          <>
            <button type="button" style={tbBtnSave} onClick={handleLuu}>
              <Save size={13} /> Lưu
            </button>
            <button type="button" style={tbBtn}
              onClick={() => toast?.showToast('Đính kèm đang phát triển.', 'info')}>
              <Paperclip size={13} /> Đính kèm
            </button>
            <button type="button" style={tbBtn}
              onClick={() => toast?.showToast('Chọn mẫu báo giá.', 'info')}>
              <LayoutTemplate size={13} /> Mẫu
            </button>
            <button type="button" style={tbBtn}
              onClick={() => toast?.showToast('Đang in báo giá...', 'info')}>
              <Printer size={13} /> In
            </button>
            <button type="button" style={tbBtn}
              onClick={() => toast?.showToast('Đã gửi Zalo báo giá.', 'success')}>
              <MessageCircle size={13} /> Gửi Zalo
            </button>
            {mode === 'add' && (
              <button type="button"
                style={{ ...tbBtn, borderColor: '#16a34a', color: '#16a34a' }}
                onClick={handleLuuVaTiepTuc}>
                <Save size={13} /> Lưu và tiếp tục
              </button>
            )}
          </>
        )}

        <button type="button" style={tbBtnClose} onClick={onClose}>
          <X size={13} /> Đóng
        </button>
      </div>

      {/* Body: 2-cột Grid 12 (YC22) + side-panel */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Form body chính */}
        <div style={{ flex: 1, overflow: 'auto', padding: '10px 14px' }}>

          {/* Thông tin chung — Grid 2 cột (9+3) */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '3fr 2fr',
            gap: '8px 24px',
            marginBottom: 12,
          }}>
            {/* Cột trái (9/12) - Khách hàng */}
            <div style={{ gridColumn: 1 }}>
              <div style={{
                background: '#eff6ff',
                border: '1px solid #1e40af',
                borderRadius: 6,
                padding: '8px 12px',
                marginBottom: 8,
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#1e40af', marginBottom: 6 }}>
                  Thông tin khách hàng
                </div>

                <div className={styles.formRow}>
                  <span className={styles.formLabel}>Khách hàng</span>
                  <div className={styles.formControl} style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    <input className={styles.formInput} value={khachHang}
                      onChange={(e) => setKhachHang(e.target.value)} readOnly={readOnly}
                      placeholder="Tên khách hàng" style={{ flex: 1 }} />
                    {!readOnly && (
                      <button type="button" onClick={moKhLookup}
                        style={{ height: 24, padding: '0 6px', border: '1px solid var(--border)',
                          borderRadius: 3, background: 'var(--bg-secondary)', cursor: 'pointer',
                          display: 'flex', alignItems: 'center' }}>
                        <Search size={11} />
                      </button>
                    )}
                    {(lichSuGia.length > 0 || hopDongList.length > 0) && (
                      <button type="button" onClick={() => setShowSidePanel((v) => !v)}
                        style={{ height: 24, padding: '0 6px', border: '1px solid var(--border)',
                          borderRadius: 3,
                          background: showSidePanel ? '#1e40af' : 'var(--bg-secondary)',
                          color: showSidePanel ? '#fff' : 'var(--text-primary)',
                          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3, fontSize: 10 }}>
                        <History size={10} />
                        LS ({lichSuGia.length + hopDongList.length})
                      </button>
                    )}
                    {selectedKh?.isNhaCungCap && (
                      <span style={{ fontSize: 9, color: '#0ea5e9', whiteSpace: 'nowrap',
                        background: '#e0f2fe', borderRadius: 3, padding: '2px 5px' }}>
                        NCC
                      </span>
                    )}
                  </div>
                </div>

                <div className={styles.formRow}>
                  <span className={styles.formLabel}>MST KH</span>
                  <div className={styles.formControl}>
                    <input className={styles.formInput} value={maSoThueKh}
                      onChange={(e) => setMaSoThueKh(e.target.value)} readOnly={readOnly} />
                  </div>
                </div>

                <div className={styles.formRow}>
                  <span className={styles.formLabel}>Địa chỉ KH</span>
                  <div className={styles.formControl}>
                    <input className={styles.formInput} value={diaChiKh}
                      onChange={(e) => setDiaChiKh(e.target.value)} readOnly={readOnly} />
                  </div>
                </div>

                <div className={styles.formRow}>
                  <span className={styles.formLabel}>Người liên hệ</span>
                  <div className={styles.formControl}>
                    <input className={styles.formInput} value={nguoiLienHe}
                      onChange={(e) => setNguoiLienHe(e.target.value)} readOnly={readOnly} />
                  </div>
                </div>

                <div className={styles.formRow}>
                  <span className={styles.formLabel}>Diễn giải</span>
                  <div className={styles.formControl}>
                    <input className={styles.formInput} value={dienGiai}
                      onChange={(e) => setDienGiai(e.target.value)} readOnly={readOnly} />
                  </div>
                </div>
              </div>
            </div>

            {/* Cột phải (3/12) - Số BG, Ngày, NV */}
            <div style={{ gridColumn: 2 }}>
              <div style={{
                background: '#fff7ed',
                border: '1px solid #ea580c',
                borderRadius: 6,
                padding: '8px 12px',
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#ea580c', marginBottom: 6 }}>
                  Thông tin chứng từ
                </div>

                <div className={styles.formRow}>
                  <span className={styles.formLabel}>Số báo giá</span>
                  <div className={styles.formControl}>
                    <input ref={soRef} className={styles.formInput} value={soBaoGia}
                      onChange={(e) => setSoBaoGia(e.target.value)} readOnly={readOnly} />
                  </div>
                </div>

                <div className={styles.formRow}>
                  <span className={styles.formLabel}>Ngày báo giá</span>
                  <div className={styles.formControl}>
                    <input type="date" className={styles.formInput} style={{ textAlign: 'right' }}
                      value={ngayBaoGia} onChange={(e) => setNgayBaoGia(e.target.value)} readOnly={readOnly} />
                  </div>
                </div>

                <div className={styles.formRow}>
                  <span className={styles.formLabel}>Ngày hết hạn</span>
                  <div className={styles.formControl}>
                    <input type="date" className={styles.formInput} style={{ textAlign: 'right' }}
                      value={ngayHetHan} onChange={(e) => setNgayHetHan(e.target.value)} readOnly={readOnly} />
                  </div>
                </div>

                <div className={styles.formRow}>
                  <span className={styles.formLabel}>NV bán hàng</span>
                  <div className={styles.formControl}>
                    <input className={styles.formInput} value={nvBanHang}
                      onChange={(e) => setNvBanHang(e.target.value)} readOnly={readOnly} />
                  </div>
                </div>

                <div className={styles.formRow}>
                  <span className={styles.formLabel}>Trạng thái</span>
                  <div className={styles.formControl}>
                    <select className={styles.formSelect} value={tinhTrang}
                      onChange={(e) => setTinhTrang(e.target.value as BaoGiaRecord['tinh_trang'])}
                      disabled={readOnly}>
                      {TINH_TRANGS.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>

                <div className={styles.formRow}>
                  <span className={styles.formLabel}>Ghi chú</span>
                  <div className={styles.formControl}>
                    <input className={styles.formInput} value={ghiChu}
                      onChange={(e) => setGhiChu(e.target.value)} readOnly={readOnly} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Chi tiết VTHH */}
          <div className={styles.formSectionTitle} style={{ marginTop: 4 }}>
            Chi tiết vật tư hàng hóa
            <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 400, marginLeft: 8 }}>
              (Hàng có công thức: nhập T.Số 1 × T.Số 2 → tự tính SL; SL thay đổi → tự tra bậc giá)
            </span>
          </div>

          <div className={styles.tableScrollWrap} style={{ maxHeight: 240 }}>
            <table className={styles.chiTietTable}>
              <colgroup>
                <col style={{ width: 30 }} />
                <col style={{ width: 82 }} />
                <col style={{ width: 155 }} />
                <col style={{ width: 50 }} />
                <col style={{ width: 60 }} />
                <col style={{ width: 60 }} />
                <col style={{ width: 66 }} />
                <col style={{ width: 94 }} />
                <col style={{ width: 94 }} />
                <col style={{ width: 60 }} />
                <col style={{ width: 94 }} />
                <col style={{ width: 110 }} />
                {!readOnly && <col style={{ width: 26 }} />}
              </colgroup>
              <thead>
                <tr>
                  <th className={styles.tdCenter}>STT</th>
                  <th>Mã VTHH</th>
                  <th>Tên VTHH</th>
                  <th>ĐVT</th>
                  <th className={styles.thRight} title="Tham số 1 (VD: Dài)">T.Số 1</th>
                  <th className={styles.thRight} title="Tham số 2 (VD: Rộng)">T.Số 2</th>
                  <th className={styles.thRight}>Số lượng</th>
                  <th className={styles.thRight}>Đơn giá</th>
                  <th className={styles.thRight}>Thành tiền</th>
                  <th className={styles.thRight}>% GTGT</th>
                  <th className={styles.thRight}>Tiền GTGT</th>
                  <th>Ghi chú</th>
                  {!readOnly && <th />}
                </tr>
              </thead>
              <tbody>
                {chiTiet.map((c, idx) => {
                  const coFormula = hasFormula(c.cong_thuc_tinh_sl)
                  return (
                    <tr key={c._key}>
                      <td className={styles.tdCenter} style={{ fontSize: 10, color: 'var(--text-muted)' }}>{idx + 1}</td>
                      <td style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <input className={styles.chiTietInput} value={c.ma_hang ?? ''}
                          onChange={(e) => capNhatDong(c._key, 'ma_hang', e.target.value)}
                          readOnly={readOnly} style={{ flex: 1 }}
                          title={c.cong_thuc_tinh_sl ? `Công thức: ${c.cong_thuc_tinh_sl}` : undefined} />
                        {!readOnly && (
                          <button type="button" onClick={() => moSpLookup(c._key)}
                            style={{ background: 'transparent', border: 'none', cursor: 'pointer',
                              padding: '0 2px', color: 'var(--accent)' }}>
                            <Search size={10} />
                          </button>
                        )}
                      </td>
                      <td style={{ position: 'relative' }}>
                        <input className={styles.chiTietInput} value={c.ten_hang ?? ''}
                          onChange={(e) => capNhatDong(c._key, 'ten_hang', e.target.value)}
                          readOnly={readOnly} />
                        {(() => {
                          const sp = spMap.get(c.ma_hang ?? '')
                          const sl = Number(c.so_luong) || 0
                          if (sp && sl > sp.so_luong_ton) {
                            return (
                              <span style={{
                                position: 'absolute', right: 2, top: 2,
                                fontSize: 8, fontWeight: 700, background: '#ea580c', color: '#fff',
                                borderRadius: 3, padding: '1px 4px', lineHeight: 1,
                              }}>Vượt tồn</span>
                            )
                          }
                          return null
                        })()}
                      </td>
                      <td>
                        <input className={styles.chiTietInput} value={c.dvt ?? ''}
                          onChange={(e) => capNhatDong(c._key, 'dvt', e.target.value)}
                          readOnly={readOnly} />
                      </td>
                      <td className={styles.tdRight}>
                        {coFormula && !readOnly ? (
                          <input className={styles.chiTietInput}
                            style={{ textAlign: 'right', background: '#fef9c3' }} type="number"
                            value={c.tham_so_1 ?? ''} data-row={c._key} data-field="tham_so_1"
                            onChange={(e) => capNhatDong(c._key, 'tham_so_1', e.target.value === '' ? 0 : Number(e.target.value))}
                            onKeyDown={(e) => navEnter(e, c._key, 'tham_so_1', coFormula)}
                          />
                        ) : coFormula ? (
                          <span style={{ fontSize: 10, display: 'block', textAlign: 'right' }}>{c.tham_so_1 ?? 0}</span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: 10, display: 'block', textAlign: 'center' }}>—</span>
                        )}
                      </td>
                      <td className={styles.tdRight}>
                        {coFormula && !readOnly ? (
                          <input className={styles.chiTietInput}
                            style={{ textAlign: 'right', background: '#fef9c3' }} type="number"
                            value={c.tham_so_2 ?? ''} data-row={c._key} data-field="tham_so_2"
                            onChange={(e) => capNhatDong(c._key, 'tham_so_2', e.target.value === '' ? 0 : Number(e.target.value))}
                            onKeyDown={(e) => navEnter(e, c._key, 'tham_so_2', coFormula)}
                          />
                        ) : coFormula ? (
                          <span style={{ fontSize: 10, display: 'block', textAlign: 'right' }}>{c.tham_so_2 ?? 0}</span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: 10, display: 'block', textAlign: 'center' }}>—</span>
                        )}
                      </td>
                      <td className={styles.tdRight}>
                        {coFormula ? (
                          <span style={{ fontWeight: 600, fontSize: 11, color: '#1e40af',
                            display: 'block', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                            {formatSoThapPhan(Number(c.so_luong) || 0, 3)}
                          </span>
                        ) : (
                          <input className={styles.chiTietInput} style={{ textAlign: 'right' }}
                            value={c.so_luong ?? ''} data-row={c._key} data-field="so_luong"
                            onChange={(e) => capNhatDong(c._key, 'so_luong', e.target.value)}
                            onKeyDown={(e) => navEnter(e, c._key, 'so_luong', false)}
                            readOnly={readOnly}
                          />
                        )}
                      </td>
                      <td className={styles.tdRight}>
                        <input className={styles.chiTietInput} style={{ textAlign: 'right' }}
                          value={c.don_gia ?? ''} data-row={c._key} data-field="don_gia"
                          onChange={(e) => capNhatDong(c._key, 'don_gia', e.target.value)}
                          onKeyDown={(e) => navEnter(e, c._key, 'don_gia', coFormula)}
                          readOnly={readOnly}
                        />
                      </td>
                      <td className={styles.tdRight} style={{ fontVariantNumeric: 'tabular-nums' }}>
                        {formatNumberDisplay(Math.round(Number(c.thanh_tien) || 0), 0)}
                      </td>
                      <td className={styles.tdRight}>
                        <input className={styles.chiTietInput} style={{ textAlign: 'right' }}
                          value={c.pt_thue_gtgt ?? ''} data-row={c._key} data-field="pt_thue_gtgt"
                          onChange={(e) => capNhatDong(c._key, 'pt_thue_gtgt', e.target.value === '' ? null : e.target.value)}
                          onKeyDown={(e) => navEnter(e, c._key, 'pt_thue_gtgt', coFormula)}
                          readOnly={readOnly}
                        />
                      </td>
                      <td className={styles.tdRight} style={{ fontVariantNumeric: 'tabular-nums' }}>
                        {c.tien_thue_gtgt != null ? formatNumberDisplay(Math.round(Number(c.tien_thue_gtgt)), 0) : ''}
                      </td>
                      <td>
                        <input className={styles.chiTietInput} value={c.ghi_chu ?? ''}
                          data-row={c._key} data-field="ghi_chu"
                          onChange={(e) => capNhatDong(c._key, 'ghi_chu', e.target.value)}
                          readOnly={readOnly}
                        />
                      </td>
                      {!readOnly && (
                        <td className={styles.tdCenter}>
                          <button type="button"
                            style={{ background: 'transparent', border: 'none', cursor: 'pointer',
                              padding: '1px 3px', color: 'var(--text-muted)' }}
                            onClick={() => xoaDong(c._key)}>
                            <X size={11} />
                          </button>
                        </td>
                      )}
                    </tr>
                  )
                })}
                {chiTiet.length === 0 && (
                  <tr>
                    <td colSpan={readOnly ? 12 : 13}
                      style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '12px 0', fontSize: 11 }}>
                      {readOnly ? 'Không có chi tiết.' : 'Chưa có dòng. Bấm "+ Thêm dòng" để thêm.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {!readOnly && (
            <div className={styles.chiTietAddRow}>
              <button type="button" className={styles.toolbarBtn} onClick={themDong}>
                <Plus size={12} /> Thêm dòng
              </button>
            </div>
          )}

          {/* [7] Tổng */}
          <div style={{ display: 'flex', gap: 24, justifyContent: 'flex-end', marginTop: 10,
            fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>
            <span>Tiền hàng: <strong>{formatNumberDisplay(tongTienHang, 0)}</strong></span>
            <span>Thuế GTGT: <strong>{formatNumberDisplay(tongThueGtgt, 0)}</strong></span>
            <span style={{ color: '#ea580c', fontWeight: 700 }}>
              Tổng thanh toán: <strong>{formatNumberDisplay(tongThanhToan, 0)}</strong>
            </span>
          </div>
        </div>

        {/* [1] Side-Panel */}
        {showSidePanel && (
          <SidePanelLichSu
            tenKh={khachHang}
            lichSuGia={lichSuGia}
            hopDongList={hopDongList}
            onClose={() => setShowSidePanel(false)}
            onCopyDonGia={apDungDonGiaLichSu}
          />
        )}
      </div>

      {/* Lookup Khách hàng */}
      {showKhLookup && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 4000,
          display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setShowKhLookup(false)}>
          <div style={{ background: 'var(--bg-primary)', borderRadius: 8, width: 500, maxHeight: 440,
            display: 'flex', flexDirection: 'column', boxShadow: '0 8px 32px rgba(0,0,0,0.28)' }}
            onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)',
              fontWeight: 700, fontSize: 12, display: 'flex', justifyContent: 'space-between' }}>
              Chọn khách hàng
              <button type="button" onClick={() => setShowKhLookup(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
                <X size={14} />
              </button>
            </div>
            <div style={{ padding: '8px 14px' }}>
              <input autoFocus value={khSearch} onChange={(e) => setKhSearch(e.target.value)}
                placeholder="Tìm theo mã, tên..."
                style={{ width: '100%', height: 26, fontSize: 11, border: '1px solid var(--border)',
                  borderRadius: 3, padding: '0 6px', fontFamily: 'inherit', boxSizing: 'border-box' }} />
            </div>
            <div style={{ flex: 1, overflow: 'auto', padding: '0 14px 12px' }}>
              {filteredKh.map((kh) => (
                <div key={kh.id} onClick={() => chonKhachHang(kh)}
                  style={{ padding: '6px 8px', cursor: 'pointer', borderRadius: 3, fontSize: 11,
                    display: 'flex', gap: 12, alignItems: 'center' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                  <span style={{ color: 'var(--text-muted)', minWidth: 80 }}>{kh.ma_kh}</span>
                  <span style={{ fontWeight: 500, flex: 1 }}>{kh.ten_kh}</span>
                  {kh.isNhaCungCap && (
                    <span style={{ fontSize: 9, background: '#e0f2fe', color: '#0369a1',
                      borderRadius: 3, padding: '1px 4px' }}>NCC</span>
                  )}
                  {kh.han_muc_no_kh && kh.han_muc_no_kh > 0 && (
                    <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>
                      HM: {formatNumberDisplay(kh.han_muc_no_kh, 0)}
                    </span>
                  )}
                  <span style={{ color: 'var(--text-muted)' }}>{kh.ma_so_thue}</span>
                </div>
              ))}
              {filteredKh.length === 0 && (
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', padding: 16 }}>
                  Không tìm thấy khách hàng.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Lookup Sản phẩm */}
      {showSpLookup && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 4000,
          display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setShowSpLookup(false)}>
          <div style={{ background: 'var(--bg-primary)', borderRadius: 8, width: 560, maxHeight: 460,
            display: 'flex', flexDirection: 'column', boxShadow: '0 8px 32px rgba(0,0,0,0.28)' }}
            onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)',
              fontWeight: 700, fontSize: 12, display: 'flex', justifyContent: 'space-between' }}>
              Chọn sản phẩm, hàng hóa
              <button type="button" onClick={() => setShowSpLookup(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
                <X size={14} />
              </button>
            </div>
            <div style={{ padding: '8px 14px' }}>
              <input autoFocus value={spSearch} onChange={(e) => setSpSearch(e.target.value)}
                placeholder="Tìm theo mã, tên..."
                style={{ width: '100%', height: 26, fontSize: 11, border: '1px solid var(--border)',
                  borderRadius: 3, padding: '0 6px', fontFamily: 'inherit', boxSizing: 'border-box' }} />
            </div>
            <div style={{ flex: 1, overflow: 'auto', padding: '0 14px 12px' }}>
              {filteredSp.map((sp) => (
                <div key={sp.id} onClick={() => chonSanPham(sp)}
                  style={{ padding: '5px 8px', cursor: 'pointer', borderRadius: 3, fontSize: 11,
                    display: 'flex', gap: 10, alignItems: 'center' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                  <span style={{ color: 'var(--text-muted)', minWidth: 88 }}>{sp.ma}</span>
                  <span style={{ fontWeight: 500, flex: 1 }}>{sp.ten}</span>
                  {sp.cong_thuc_tinh_so_luong && (
                    <span style={{ fontSize: 9, background: '#fef9c3', color: '#854d0e',
                      borderRadius: 3, padding: '1px 4px' }}>CT</span>
                  )}
                  {sp.chiet_khau && sp.bang_chiet_khau && sp.bang_chiet_khau.length > 0 && (
                    <span style={{ fontSize: 9, background: '#f0fdf4', color: '#15803d',
                      borderRadius: 3, padding: '1px 4px' }}>Bậc</span>
                  )}
                  <span style={{ color: 'var(--text-muted)', minWidth: 50 }}>{sp.dvt_chinh}</span>
                  {(sp.gia_ban_quy_dinh ?? sp.don_gia_ban) ? (
                    <span style={{ fontVariantNumeric: 'tabular-nums', minWidth: 80, textAlign: 'right' }}>
                      {formatNumberDisplay(sp.gia_ban_quy_dinh ?? sp.don_gia_ban ?? 0, 0)}
                    </span>
                  ) : null}
                </div>
              ))}
              {filteredSp.length === 0 && (
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', padding: 16 }}>
                  Chưa có sản phẩm nào có la_vthh_ban = true.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Cột danh sách ───────────────────────────────────────────────────────────
const columns: DataGridColumn<BaoGiaRecord>[] = [
  { key: 'so_bao_gia',      label: 'Số BG',       width: 100 },
  { key: 'ngay_bao_gia',    label: 'Ngày BG',     width: 76, align: 'right', renderCell: (v) => formatNgay(v as string) },
  { key: 'ngay_het_han',    label: 'Hết hạn',     width: 76, align: 'right', renderCell: (v) => formatNgay(v as string | null) },
  { key: 'khach_hang',      label: 'Khách hàng',  width: '28%' },
  { key: 'dien_giai',       label: 'Diễn giải',   width: '20%' },
  { key: 'tong_thanh_toan', label: 'Tổng tiền',   width: 110, align: 'right',
    renderCell: (v) => formatNumberDisplay(Number(v), 0) },
  { key: 'tinh_trang',      label: 'Trạng thái',  width: 110,
    renderCell: (v) => <BaoGiaBadge value={String(v)} /> },
  { key: 'nv_ban_hang',     label: 'NV bán hàng', width: '10%' },
]

// ─── Cột chi tiết ────────────────────────────────────────────────────────────
const columnsChiTiet: DataGridColumn<BaoGiaChiTiet>[] = [
  { key: 'stt',              label: 'STT',        width: 36, align: 'center', renderCell: (_v, _r, idx) => String((idx ?? 0) + 1) },
  { key: 'ma_hang',          label: 'Mã VTHH',    width: 88 },
  { key: 'ten_hang',         label: 'Tên VTHH',   width: 180 },
  { key: 'dvt',              label: 'ĐVT',        width: 52 },
  {
    key: 'cong_thuc_tinh_sl', label: 'Công thức', width: 80,
    renderCell: (v) => v
      ? <span style={{ fontSize: 9, color: '#854d0e', background: '#fef9c3', borderRadius: 3, padding: '1px 4px' }}>{String(v)}</span>
      : '',
  },
  { key: 'so_luong',         label: 'Số lượng',   width: 64, align: 'right',
    renderCell: (v) => formatSoThapPhan(Number(v), 2) },
  { key: 'don_gia',          label: 'Đơn giá',    width: 94, align: 'right',
    renderCell: (v) => formatNumberDisplay(Number(v), 0) },
  { key: 'thanh_tien',       label: 'Thành tiền', width: 94, align: 'right',
    renderCell: (v) => formatNumberDisplay(Math.round(Number(v)), 0) },
  { key: 'pt_thue_gtgt',     label: '% GTGT',     width: 60, align: 'right',
    renderCell: (v) => v != null ? formatSoThapPhan(Number(v), 0) : '' },
  { key: 'tien_thue_gtgt',   label: 'Tiền GTGT',  width: 94, align: 'right',
    renderCell: (v) => v != null ? formatNumberDisplay(Math.round(Number(v)), 0) : '' },
  { key: 'ghi_chu',          label: 'Ghi chú',    width: 140 },
]

// ─── [9] Phân trang ──────────────────────────────────────────────────────────
const PAGE_SIZE = 50

const Pagination = React.memo(({ page, total, onChange }: { page: number; total: number; onChange: (p: number) => void }) => {
  if (total <= 1) return null
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px',
      borderTop: '1px solid var(--border)', background: 'var(--bg-secondary)', fontSize: 11 }}>
      <button type="button" onClick={() => onChange(page - 1)} disabled={page <= 1}
        style={{ background: 'transparent', border: 'none',
          cursor: page > 1 ? 'pointer' : 'default',
          color: page > 1 ? 'var(--accent)' : 'var(--text-muted)', padding: '1px 4px' }}>
        <ChevronLeft size={13} />
      </button>
      <span style={{ color: 'var(--text-muted)' }}>Trang {page}/{total}</span>
      <button type="button" onClick={() => onChange(page + 1)} disabled={page >= total}
        style={{ background: 'transparent', border: 'none',
          cursor: page < total ? 'pointer' : 'default',
          color: page < total ? 'var(--accent)' : 'var(--text-muted)', padding: '1px 4px' }}>
        <ChevronRight size={13} />
      </button>
    </div>
  )
})

// ─── Màn hình danh sách Báo giá ──────────────────────────────────────────────
export function BaoGia() {
  const toast = useToastOptional()
  const [filter,      setFilter]      = useState<BanHangFilter>(getDefaultBaoGiaFilter)
  const [danhSach,    setDanhSach]    = useState<BaoGiaRecord[]>([])
  const [selectedId,  setSelectedId]  = useState<string | null>(null)
  const [chiTiet,     setChiTiet]     = useState<BaoGiaChiTiet[]>([])
  const [search,      setSearch]      = useState('')
  const [showForm,    setShowForm]    = useState(false)
  const [formMode,    setFormMode]    = useState<'add' | 'edit' | 'view'>('add')
  const [formRecord,  setFormRecord]  = useState<BaoGiaRecord | null>(null)
  const [xoaModalRow, setXoaModalRow] = useState<BaoGiaRecord | null>(null)
  const [contextMenu, setContextMenu] = useState<{
    open: boolean; x: number; y: number; row: BaoGiaRecord | null
  }>({ open: false, x: 0, y: 0, row: null })
  const [formKey,      setFormKey]      = useState(0)
  const [dropdownXuat, setDropdownXuat] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [page, setPage] = useState(1)

  const loadData = useCallback(() => {
    setDanhSach(baoGiaGetAll(filter))
  }, [filter])

  useEffect(() => { loadData() }, [loadData])
  useEffect(() => {
    if (selectedId) setChiTiet(baoGiaGetChiTiet(selectedId))
    else setChiTiet([])
  }, [selectedId])

  const filtered = useMemo(() => 
    search.trim()
      ? danhSach.filter((r) =>
          matchSearchKeyword(`${r.so_bao_gia} ${r.khach_hang} ${r.dien_giai ?? ''} ${r.tinh_trang}`, search)
        )
      : danhSach,
    [danhSach, search]
  )

  useEffect(() => { setPage(1) }, [filter, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated  = useMemo(() => 
    filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page]
  )

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setDropdownXuat(false)
      setContextMenu((m) => m.open ? { ...m, open: false } : m)
    }
    window.addEventListener('click', h)
    return () => window.removeEventListener('click', h)
  }, [])

  const tongTien   = useMemo(() => filtered.reduce((s, r) => s + r.tong_thanh_toan, 0), [filtered])
  const selectedRow = useMemo(() => selectedId ? danhSach.find((r) => r.id === selectedId) ?? null : null, [selectedId, danhSach])

  const moFormThem = () => { setFormRecord(null); setFormMode('add');  setFormKey((k) => k + 1); setShowForm(true) }
  const moFormXem  = (row: BaoGiaRecord) => { setFormRecord(row); setFormMode('view'); setFormKey((k) => k + 1); setShowForm(true) }
  const moFormSua  = (row: BaoGiaRecord) => { setFormRecord(row); setFormMode('edit'); setFormKey((k) => k + 1); setShowForm(true) }

  const xacNhanXoa = (row: BaoGiaRecord) => {
    baoGiaDelete(row.id)
    loadData()
    if (selectedId === row.id) setSelectedId(null)
    toast?.showToast(`Đã xóa báo giá ${row.so_bao_gia}.`, 'info')
    setXoaModalRow(null)
  }

  // [4] Lập đơn hàng
  const lapDonHang = () => {
    if (!selectedRow) return
    const ct = baoGiaGetChiTiet(selectedRow.id)
    const draft = {
      khach_hang:      selectedRow.khach_hang,
      dia_chi:         selectedRow.dia_chi_kh,
      ma_so_thue:      selectedRow.ma_so_thue_kh,
      nguoi_lien_he:   selectedRow.nguoi_lien_he,
      dien_giai:       selectedRow.dien_giai ?? '',
      nv_ban_hang:     selectedRow.nv_ban_hang,
      bao_gia_ref:     selectedRow.so_bao_gia,
      bao_gia_id:      selectedRow.id,
      tong_tien_hang:  selectedRow.tong_tien_hang,
      tong_thue_gtgt:  selectedRow.tong_thue_gtgt,
      tong_thanh_toan: selectedRow.tong_thanh_toan,
      chiTiet: ct.map((c) => ({
        ma_hang:           c.ma_hang,
        ten_hang:          c.ten_hang,
        dvt:               c.dvt,
        cong_thuc_tinh_sl: c.cong_thuc_tinh_sl,
        tham_so_1:         c.tham_so_1,
        tham_so_2:         c.tham_so_2,
        so_luong:          c.so_luong,
        don_gia:           c.don_gia,
        thanh_tien:        Math.round(c.thanh_tien),
        pt_thue_gtgt:      c.pt_thue_gtgt,
        tien_thue_gtgt:    c.tien_thue_gtgt != null ? Math.round(c.tien_thue_gtgt) : null,
        ghi_chu:           c.ghi_chu,
      })),
    }
    try { localStorage.setItem('htql_don_hang_ban_from_baogia', JSON.stringify(draft)) } catch { /* ignore */ }
    toast?.showToast(
      `Đã tạo nháp đơn hàng từ ${selectedRow.so_bao_gia}. Chuyển sang tab Đơn hàng bán.`,
      'success'
    )
  }

  return (
    <div className={styles.root}>
      {/* Toolbar danh sách */}
      <div className={styles.toolbarWrap}>
        <button type="button" className={styles.toolbarBtn} onClick={moFormThem}>
          <Plus size={13} /><span>Thêm</span>
        </button>
        <button type="button" className={styles.toolbarBtnDanger} disabled={!selectedId}
          onClick={() => selectedRow && setXoaModalRow(selectedRow)}>
          <Trash2 size={13} /><span>Xóa</span>
        </button>
        <button type="button" className={styles.toolbarBtn} disabled={!selectedId} onClick={lapDonHang}>
          <FileText size={13} /><span>Lập đơn hàng</span>
        </button>
        <div ref={dropdownRef} className={styles.dropdownWrap} style={{ marginLeft: 8 }}>
          <button type="button" className={styles.toolbarBtn} onClick={() => setDropdownXuat((v) => !v)}>
            <ChevronDown size={12} /><span>Gửi</span>
          </button>
          {dropdownXuat && (
            <div className={styles.dropdownMenu}>
              <button type="button" className={styles.dropdownItem}
                onClick={() => { toast?.showToast('Đã gửi email báo giá.', 'success'); setDropdownXuat(false) }}>
                <Mail size={13} /> Gửi Email
              </button>
              <button type="button" className={styles.dropdownItem}
                onClick={() => { toast?.showToast('Đã gửi Zalo báo giá.', 'success'); setDropdownXuat(false) }}>
                <MessageCircle size={13} /> Gửi Zalo
              </button>
            </div>
          )}
        </div>
        <div className={styles.filterWrap} style={{ marginLeft: 8 }}>
          <span className={styles.filterLabel}>Kỳ</span>
          <select className={styles.filterInput} value={filter.ky}
            onChange={(e) => setFilter((f) => ({ ...f, ky: e.target.value as BanHangKyValue }))}>
            {KY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <input type="text" className={styles.searchInput}
          placeholder="Tìm kiếm mã, tên KH, diễn giải..."
          value={search} onChange={(e) => setSearch(e.target.value)} />
        <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-muted)' }}>
          {filtered.length} bản ghi · trang {page}/{totalPages}
        </span>
      </div>

      {/* Nội dung */}
      <div className={styles.contentArea}>
        <div className={styles.gridWrap} style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <DataGrid<BaoGiaRecord>
              columns={columns}
              data={paginated}
              keyField="id"
              stripedRows compact height="100%"
              selectedRowId={selectedId}
              onRowSelect={(r) => setSelectedId(r.id)}
              onRowDoubleClick={(r) => moFormXem(r)}
              onRowContextMenu={(row, e) => {
                e.preventDefault()
                setSelectedId(row.id)
                setContextMenu({ open: true, x: e.clientX, y: e.clientY, row })
              }}
              summary={[
                { label: 'Tổng thanh toán', value: formatNumberDisplay(tongTien, 0) },
                { label: 'Số dòng',          value: `= ${filtered.length}` },
              ]}
            />
          </div>
          <Pagination page={page} total={totalPages} onChange={setPage} />
        </div>

        <div className={styles.detailWrap}>
          <div className={styles.detailTabBar}>
            <button type="button" className={styles.detailTabActive}>Chi tiết VTHH</button>
          </div>
          <div className={styles.detailTabPanel}>
            <DataGrid<BaoGiaChiTiet>
              columns={columnsChiTiet}
              data={chiTiet}
              keyField="id"
              stripedRows compact height="100%"
              summary={[
                { label: 'Số dòng',    value: `= ${chiTiet.length}` },
                { label: 'Thành tiền', value: formatNumberDisplay(chiTiet.reduce((s, c) => s + Math.round(c.thanh_tien), 0), 0) },
              ]}
            />
          </div>
        </div>
      </div>

      {/* Context menu */}
      {contextMenu.open && contextMenu.row && (
        <div className={styles.contextMenu} style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}>
          <button type="button" className={styles.contextMenuItem}
            onClick={() => { moFormXem(contextMenu.row!); setContextMenu((m) => ({ ...m, open: false })) }}>
            <Eye size={13} /> Xem
          </button>
          <button type="button" className={styles.contextMenuItem}
            onClick={() => { moFormSua(contextMenu.row!); setContextMenu((m) => ({ ...m, open: false })) }}>
            <Plus size={13} /> Sửa
          </button>
          <hr className={styles.contextMenuSep} />
          <button type="button" className={styles.contextMenuItem}
            onClick={() => { toast?.showToast('Đã gửi email.', 'success'); setContextMenu((m) => ({ ...m, open: false })) }}>
            <Mail size={13} /> Gửi Email
          </button>
          <button type="button" className={styles.contextMenuItem}
            onClick={() => { toast?.showToast('Đã gửi Zalo.', 'success'); setContextMenu((m) => ({ ...m, open: false })) }}>
            <MessageCircle size={13} /> Gửi Zalo
          </button>
          <hr className={styles.contextMenuSep} />
          <button type="button" className={styles.contextMenuItem} style={{ color: '#dc2626' }}
            onClick={() => { setXoaModalRow(contextMenu.row!); setContextMenu((m) => ({ ...m, open: false })) }}>
            <Trash2 size={13} /> Xóa
          </button>
        </div>
      )}

      {/* Modal xóa */}
      <Modal open={xoaModalRow != null} onClose={() => setXoaModalRow(null)}
        title="Xác nhận xóa" size="sm"
        footer={
          <>
            <button type="button" className={styles.modalBtn} onClick={() => setXoaModalRow(null)}>Hủy bỏ</button>
            <button type="button" className={styles.modalBtnDanger}
              onClick={() => xoaModalRow && xacNhanXoa(xoaModalRow)}>Đồng ý xóa</button>
          </>
        }>
        {xoaModalRow && (
          <p style={{ margin: 0, fontSize: 12, lineHeight: 1.6 }}>
            Xóa báo giá <strong>{xoaModalRow.so_bao_gia}</strong> — <strong>{xoaModalRow.khach_hang}</strong>?<br />
            <span style={{ color: '#dc2626' }}>Thao tác này không thể hoàn tác.</span>
          </p>
        )}
      </Modal>

      {/* Modal form */}
      {showForm && (
        <div className={styles.modalOverlay} onClick={() => setShowForm(false)}>
          <div className={styles.modalBoxLarge} style={{ height: '90vh' }}
            onClick={(e) => e.stopPropagation()}>
            <BaoGiaForm
              key={formKey}
              mode={formMode}
              initialRecord={formRecord ?? undefined}
              initialChiTiet={formRecord ? baoGiaGetChiTiet(formRecord.id) : undefined}
              onClose={() => setShowForm(false)}
              onSaved={() => { setShowForm(false); loadData() }}
              onSavedAndAdd={() => { loadData(); setFormKey((k) => k + 1) }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
