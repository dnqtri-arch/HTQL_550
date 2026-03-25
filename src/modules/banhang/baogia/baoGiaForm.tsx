/**
 * Form Báo giá — YC23: Tách file, Clone layout 1:1 từ DonHangMuaForm
 * Layout: Flexbox wrap (Trái flex: 1 1 320px minWidth 560, Phải width 268)
 * Xóa cột T.Số 1, T.Số 2 — Chỉ giữ: STT, Mã, Tên, ĐVT, SL, Đơn giá, Thành tiền, %GTGT, Tiền GTGT, Tổng
 * Brand Color: #1e40af (Header KH), #ea580c (Nút Lưu/Đóng, Cảnh báo)
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import {
  Plus, Save, Paperclip, Printer, MessageCircle, X,
  Search, History, LayoutTemplate, FileText,
} from 'lucide-react'
import { useToastOptional } from '../../../context/toastContext'
import { formatNumberDisplay, formatSoThapPhan } from '../../../utils/numberFormat'
import {
  baoGiaPost,
  baoGiaPut,
  baoGiaSoTiepTheo,
  baoGiaGetLichSuKhachHang,
  baoGiaGetAll,
  type BaoGiaRecord,
  type BaoGiaChiTiet,
} from './baoGiaApi'
import { hopDongBanGetAll, type HopDongBanRecord } from '../hopdong/hopDongBanApi'
import type { BaoGiaCreatePayload } from '../../../types/banHang'
import { khachHangGetAll, type KhachHangRecord } from '../khachhang/khachHangApi'
import { vatTuHangHoaGetForBanHang, type VatTuHangHoaRecord } from '../../inventory/kho/vatTuHangHoaApi'
import styles from '../BanHang.module.css'
import { LOOKUP_CONTROL_HEIGHT } from '../../../constants/lookupControlStyles'

const TODAY_ISO = new Date().toISOString().slice(0, 10)
const FORM_FIELD_HEIGHT = LOOKUP_CONTROL_HEIGHT
const LABEL_MIN_WIDTH = 90

type ChiTietRow = Partial<BaoGiaChiTiet> & { _key: string }

const TINH_TRANGS: BaoGiaRecord['tinh_trang'][] = ['Chờ duyệt', 'Đã gửi khách', 'Đã chốt', 'Hủy bỏ']

function formatNgay(iso: string | null | undefined): string {
  if (!iso) return ''
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/)
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso
}

// ─── [YC23 Mục 3] Bậc giá (giữ lại logic này) ───────────────────────────────
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

// ─── Side-Panel Lịch sử KH (2 tab) ──────────────────────────────────────────
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
      zIndex: 4000,
    }}>
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

// ─── Form Báo giá (YC23: Clone Layout từ DonHangMuaForm) ────────────────────
export interface BaoGiaFormProps {
  mode: 'add' | 'edit' | 'view'
  initialRecord?: BaoGiaRecord
  initialChiTiet?: BaoGiaChiTiet[]
  onClose: () => void
  onSaved: () => void
  onSavedAndAdd?: () => void
}

export function BaoGiaForm({ mode, initialRecord, initialChiTiet, onClose, onSaved, onSavedAndAdd }: BaoGiaFormProps) {
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

  const [lichSuGia,     setLichSuGia]     = useState<{ so_bao_gia: string; ngay_bao_gia: string; ten_hang: string; so_luong: number; don_gia: number }[]>([])
  const [hopDongList,   setHopDongList]   = useState<HopDongBanRecord[]>([])
  const [showSidePanel, setShowSidePanel] = useState(false)
  const [selectedKh,    setSelectedKh]    = useState<KhachHangRecord | null>(null)

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

  const chonSanPham = useCallback((sp: VatTuHangHoaRecord) => {
    if (!editKey) return
    const baseDonGia = sp.gia_ban_quy_dinh ?? sp.don_gia_ban ?? 0
    setChiTiet((prev) =>
      prev.map((c) => {
        if (c._key !== editKey) return c
        return {
          ...c,
          ma_hang:    sp.ma,
          ten_hang:   sp.ten,
          dvt:        sp.dvt_chinh ?? '',
          don_gia:    baseDonGia,
          thanh_tien: Math.round((c.so_luong ?? 1) * baseDonGia),
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

  // [YC23 Mục 9] Auto-calc realtime
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

  // [YC23 Mục 7] Cập nhật dòng - XÓA logic công thức, chỉ giữ SL, Đơn giá, Thành tiền
  const capNhatDong = useCallback((key: string, field: string, val: string | number | null) => {
    setChiTiet((prev) =>
      prev.map((c) => {
        if (c._key !== key) return c
        const updated: ChiTietRow = { ...c, [field]: val }

        if (field === 'so_luong') {
          const sl = Number(val) || 0
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
      stt:            i + 1,
      ma_hang:        c.ma_hang ?? '',
      ten_hang:       c.ten_hang ?? '',
      dvt:            c.dvt ?? '',
      so_luong:       Number(c.so_luong) || 0,
      don_gia:        Number(c.don_gia) || 0,
      thanh_tien:     Math.round(Number(c.thanh_tien) || 0),
      pt_thue_gtgt:   c.pt_thue_gtgt ?? null,
      tien_thue_gtgt: c.tien_thue_gtgt != null ? Math.round(Number(c.tien_thue_gtgt)) : null,
      ghi_chu:        c.ghi_chu,
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

  // [YC23 Mục 8] Chuyển thành Đơn hàng
  const handleChuyenDonHang = () => {
    if (!validate()) return
    const draft = {
      khach_hang:      khachHang,
      dia_chi:         diaChiKh,
      ma_so_thue:      maSoThueKh,
      nguoi_lien_he:   nguoiLienHe,
      dien_giai:       dienGiai,
      nv_ban_hang:     nvBanHang,
      bao_gia_ref:     soBaoGia,
      bao_gia_id:      initialRecord?.id,
      tong_tien_hang:  tongTienHang,
      tong_thue_gtgt:  tongThueGtgt,
      tong_thanh_toan: tongThanhToan,
      chiTiet: chiTiet.map((c) => ({
        ma_hang:        c.ma_hang,
        ten_hang:       c.ten_hang,
        dvt:            c.dvt,
        so_luong:       c.so_luong,
        don_gia:        c.don_gia,
        thanh_tien:     Math.round(Number(c.thanh_tien) || 0),
        pt_thue_gtgt:   c.pt_thue_gtgt,
        tien_thue_gtgt: c.tien_thue_gtgt != null ? Math.round(Number(c.tien_thue_gtgt)) : null,
        ghi_chu:        c.ghi_chu,
      })),
    }
    try {
      localStorage.setItem('htql_don_hang_ban_from_baogia', JSON.stringify(draft))
      toast?.showToast(`Đã tạo nháp đơn hàng từ ${soBaoGia}. Chuyển sang tab Đơn hàng bán.`, 'success')
    } catch {
      toast?.showToast('Lỗi khi tạo nháp đơn hàng.', 'error')
    }
  }

  const readOnly = mode === 'view'

  // Styles (clone từ DonHangMuaForm)
  const groupBox: React.CSSProperties = {
    border: '1px solid var(--border)',
    borderRadius: 6,
    padding: '8px 12px',
    background: 'var(--bg-primary)',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  }

  const groupBoxTitle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 700,
    marginBottom: 4,
    color: 'var(--text-primary)',
  }

  const fieldRowDyn: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    width: '100%',
    minWidth: 0,
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 11,
    minWidth: LABEL_MIN_WIDTH,
    flexShrink: 0,
    color: 'var(--text-primary)',
  }

  const inputStyle: React.CSSProperties = {
    flex: 1,
    minWidth: 0,
    height: FORM_FIELD_HEIGHT,
    minHeight: FORM_FIELD_HEIGHT,
    fontSize: 11,
    padding: '2px 6px',
    border: '1px solid var(--border)',
    borderRadius: 4,
    fontFamily: 'inherit',
    boxSizing: 'border-box',
    background: readOnly ? 'var(--bg-secondary)' : 'var(--bg-primary)',
  }

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

      {/* [YC23] Toolbar form — clone DonHangMuaForm */}
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
            {/* [YC23 Mục 8] Nút Chuyển thành Đơn hàng */}
            <button type="button" style={{ ...tbBtn, borderColor: '#16a34a', color: '#16a34a', fontWeight: 600 }}
              onClick={handleChuyenDonHang}
              title="Tạo nháp Đơn hàng bán từ báo giá này">
              <FileText size={13} /> Chuyển thành Đơn hàng
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

      {/* [YC23 Mục 6] Body: Layout flexbox wrap giống DonHangMuaForm 1:1 + side-panel */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Form body chính */}
        <div style={{ flex: 1, overflow: 'auto', padding: '10px 14px' }}>

          {/* [YC23 Mục 6] Header 2 khối: Thông tin chung (trái) + Đơn hàng (phải) — Clone layout */}
          <div style={{
            display: 'flex',
            flexDirection: 'row',
            gap: 16,
            flexWrap: 'wrap',
            alignItems: 'stretch',
            flexShrink: 0,
            width: '100%',
            minWidth: 0,
            marginBottom: 12,
          }}>

            {/* Khối Trái: Thông tin chung (flex: 1 1 320px, minWidth 560) */}
            <div style={{
              ...groupBox,
              flex: '1 1 320px',
              minWidth: 560,
              marginBottom: 0,
              alignSelf: 'stretch',
            }}>
              <div style={groupBoxTitle}>Thông tin chung</div>

              <div style={fieldRowDyn}>
                <label style={labelStyle}>Tiêu đề</label>
                <input style={inputStyle} value={dienGiai}
                  onChange={(e) => setDienGiai(e.target.value)} readOnly={readOnly}
                  placeholder="Diễn giải báo giá" />
              </div>

              <div style={fieldRowDyn}>
                <label style={labelStyle}>Khách hàng</label>
                <div style={{ flex: 1, display: 'flex', gap: 4, alignItems: 'center', minWidth: 0 }}>
                  <input style={{ ...inputStyle, flex: 1 }} value={khachHang}
                    onChange={(e) => setKhachHang(e.target.value)} readOnly={readOnly}
                    placeholder="Tên khách hàng" />
                  {!readOnly && (
                    <>
                      <button type="button" onClick={moKhLookup}
                        style={{
                          height: FORM_FIELD_HEIGHT, padding: '0 6px', border: '1px solid var(--border)',
                          borderRadius: 3, background: 'var(--bg-secondary)', cursor: 'pointer',
                          display: 'flex', alignItems: 'center',
                        }}>
                        <Search size={11} />
                      </button>
                      {(lichSuGia.length > 0 || hopDongList.length > 0) && (
                        <button type="button" onClick={() => setShowSidePanel((v) => !v)}
                          style={{
                            height: FORM_FIELD_HEIGHT, padding: '0 6px', border: '1px solid var(--border)',
                            borderRadius: 3,
                            background: showSidePanel ? '#1e40af' : 'var(--bg-secondary)',
                            color: showSidePanel ? '#fff' : 'var(--text-primary)',
                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3, fontSize: 10,
                          }}>
                          <History size={10} />
                          LS ({lichSuGia.length + hopDongList.length})
                        </button>
                      )}
                    </>
                  )}
                  {selectedKh?.isNhaCungCap && (
                    <span style={{
                      fontSize: 9, color: '#0ea5e9', whiteSpace: 'nowrap',
                      background: '#e0f2fe', borderRadius: 3, padding: '2px 5px',
                    }}>NCC</span>
                  )}
                </div>
              </div>

              <div style={fieldRowDyn}>
                <label style={labelStyle}>MST KH</label>
                <input style={inputStyle} value={maSoThueKh}
                  onChange={(e) => setMaSoThueKh(e.target.value)} readOnly={readOnly} />
              </div>

              <div style={fieldRowDyn}>
                <label style={labelStyle}>Địa chỉ KH</label>
                <input style={inputStyle} value={diaChiKh}
                  onChange={(e) => setDiaChiKh(e.target.value)} readOnly={readOnly} />
              </div>

              <div style={fieldRowDyn}>
                <label style={labelStyle}>Người liên hệ</label>
                <input style={inputStyle} value={nguoiLienHe}
                  onChange={(e) => setNguoiLienHe(e.target.value)} readOnly={readOnly} />
              </div>

              <div style={fieldRowDyn}>
                <label style={labelStyle}>Ghi chú</label>
                <input style={inputStyle} value={ghiChu}
                  onChange={(e) => setGhiChu(e.target.value)} readOnly={readOnly} />
              </div>
            </div>

            {/* Khối Phải: Đơn hàng (width 268, minWidth 268) */}
            <div style={{
              ...groupBox,
              width: 268,
              minWidth: 268,
              marginBottom: 0,
              flexShrink: 0,
              alignSelf: 'stretch',
            }}>
              <div style={groupBoxTitle}>Báo giá</div>

              <div style={fieldRowDyn}>
                <label style={{ ...labelStyle, minWidth: 82 }}>Số báo giá</label>
                <input ref={soRef} style={inputStyle} value={soBaoGia}
                  onChange={(e) => setSoBaoGia(e.target.value)} readOnly={readOnly} />
              </div>

              <div style={fieldRowDyn}>
                <label style={{ ...labelStyle, minWidth: 82 }}>Ngày báo giá</label>
                <input type="date" style={{ ...inputStyle, textAlign: 'right' }}
                  value={ngayBaoGia} onChange={(e) => setNgayBaoGia(e.target.value)} readOnly={readOnly} />
              </div>

              <div style={fieldRowDyn}>
                <label style={{ ...labelStyle, minWidth: 82 }}>Ngày hết hạn</label>
                <input type="date" style={{ ...inputStyle, textAlign: 'right' }}
                  value={ngayHetHan} onChange={(e) => setNgayHetHan(e.target.value)} readOnly={readOnly} />
              </div>

              <div style={fieldRowDyn}>
                <label style={{ ...labelStyle, minWidth: 82 }}>NV bán hàng</label>
                <input style={inputStyle} value={nvBanHang}
                  onChange={(e) => setNvBanHang(e.target.value)} readOnly={readOnly} />
              </div>

              <div style={fieldRowDyn}>
                <label style={{ ...labelStyle, minWidth: 82 }}>Trạng thái</label>
                <select style={{ ...inputStyle, cursor: readOnly ? 'default' : 'pointer' }}
                  value={tinhTrang}
                  onChange={(e) => setTinhTrang(e.target.value as BaoGiaRecord['tinh_trang'])}
                  disabled={readOnly}>
                  {TINH_TRANGS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* [YC23 Mục 7] Chi tiết VTHH — Xóa cột Công thức, T.Số 1, T.Số 2 */}
          <div className={styles.formSectionTitle} style={{ marginTop: 4 }}>
            Chi tiết vật tư hàng hóa
          </div>

          <div className={styles.tableScrollWrap} style={{ maxHeight: 320 }}>
            <table className={styles.chiTietTable}>
              <colgroup>
                <col style={{ width: 30 }} />
                <col style={{ width: 82 }} />
                <col style={{ width: 180 }} />
                <col style={{ width: 50 }} />
                <col style={{ width: 70 }} />
                <col style={{ width: 100 }} />
                <col style={{ width: 100 }} />
                <col style={{ width: 60 }} />
                <col style={{ width: 100 }} />
                <col style={{ width: 100 }} />
                <col style={{ width: 120 }} />
                {!readOnly && <col style={{ width: 26 }} />}
              </colgroup>
              <thead>
                <tr>
                  <th className={styles.tdCenter}>STT</th>
                  <th>Mã VTHH</th>
                  <th>Tên VTHH</th>
                  <th>ĐVT</th>
                  <th className={styles.thRight}>Số lượng</th>
                  <th className={styles.thRight}>Đơn giá</th>
                  <th className={styles.thRight}>Thành tiền</th>
                  <th className={styles.thRight}>% Thuế GTGT</th>
                  <th className={styles.thRight}>Tiền thuế GTGT</th>
                  <th className={styles.thRight}>Tổng tiền</th>
                  <th>Ghi chú</th>
                  {!readOnly && <th />}
                </tr>
              </thead>
              <tbody>
                {chiTiet.map((c, idx) => {
                  const tongTienDong = Math.round((Number(c.thanh_tien) || 0) + (Number(c.tien_thue_gtgt) || 0))
                  const sp = spMap.get(c.ma_hang ?? '')
                  const vuotTon = sp && (Number(c.so_luong) || 0) > sp.so_luong_ton

                  return (
                    <tr key={c._key}>
                      <td className={styles.tdCenter} style={{ fontSize: 10, color: 'var(--text-muted)' }}>{idx + 1}</td>
                      <td style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <input className={styles.chiTietInput} value={c.ma_hang ?? ''}
                          onChange={(e) => capNhatDong(c._key, 'ma_hang', e.target.value)}
                          readOnly={readOnly} style={{ flex: 1 }} />
                        {!readOnly && (
                          <button type="button" onClick={() => moSpLookup(c._key)}
                            style={{
                              background: 'transparent', border: 'none', cursor: 'pointer',
                              padding: '0 2px', color: 'var(--accent)',
                            }}>
                            <Search size={10} />
                          </button>
                        )}
                      </td>
                      <td style={{ position: 'relative' }}>
                        <input className={styles.chiTietInput} value={c.ten_hang ?? ''}
                          onChange={(e) => capNhatDong(c._key, 'ten_hang', e.target.value)}
                          readOnly={readOnly} />
                        {vuotTon && (
                          <span style={{
                            position: 'absolute', right: 2, top: 2,
                            fontSize: 8, fontWeight: 700, background: '#ea580c', color: '#fff',
                            borderRadius: 3, padding: '1px 4px', lineHeight: 1,
                          }}>Vượt tồn</span>
                        )}
                      </td>
                      <td>
                        <input className={styles.chiTietInput} value={c.dvt ?? ''}
                          onChange={(e) => capNhatDong(c._key, 'dvt', e.target.value)}
                          readOnly={readOnly} />
                      </td>
                      <td className={styles.tdRight}>
                        <input className={styles.chiTietInput} style={{ textAlign: 'right' }}
                          value={c.so_luong ?? ''} data-row={c._key} data-field="so_luong"
                          onChange={(e) => capNhatDong(c._key, 'so_luong', e.target.value)}
                          readOnly={readOnly}
                        />
                      </td>
                      <td className={styles.tdRight}>
                        <input className={styles.chiTietInput} style={{ textAlign: 'right' }}
                          value={c.don_gia ?? ''} data-row={c._key} data-field="don_gia"
                          onChange={(e) => capNhatDong(c._key, 'don_gia', e.target.value)}
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
                          readOnly={readOnly}
                        />
                      </td>
                      <td className={styles.tdRight} style={{ fontVariantNumeric: 'tabular-nums' }}>
                        {c.tien_thue_gtgt != null ? formatNumberDisplay(Math.round(Number(c.tien_thue_gtgt)), 0) : ''}
                      </td>
                      <td className={styles.tdRight} style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: '#1e40af' }}>
                        {formatNumberDisplay(tongTienDong, 0)}
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
                            style={{
                              background: 'transparent', border: 'none', cursor: 'pointer',
                              padding: '1px 3px', color: 'var(--text-muted)',
                            }}
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
                    <td colSpan={readOnly ? 11 : 12}
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

          {/* [YC23 Mục 9] Tổng tiền — auto-calc realtime */}
          <div style={{
            display: 'flex', gap: 24, justifyContent: 'flex-end', marginTop: 10,
            fontSize: 12, fontVariantNumeric: 'tabular-nums',
          }}>
            <span>Tiền hàng: <strong>{formatNumberDisplay(tongTienHang, 0)}</strong></span>
            <span>Thuế GTGT: <strong>{formatNumberDisplay(tongThueGtgt, 0)}</strong></span>
            <span style={{ color: '#ea580c', fontWeight: 700 }}>
              Tổng thanh toán: <strong>{formatNumberDisplay(tongThanhToan, 0)}</strong>
            </span>
          </div>
        </div>

        {/* Side-Panel */}
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
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 4000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
          onClick={() => setShowKhLookup(false)}>
          <div style={{
            background: 'var(--bg-primary)', borderRadius: 8, width: 500, maxHeight: 440,
            display: 'flex', flexDirection: 'column', boxShadow: '0 8px 32px rgba(0,0,0,0.28)',
          }}
            onClick={(e) => e.stopPropagation()}>
            <div style={{
              padding: '10px 14px', borderBottom: '1px solid var(--border)',
              fontWeight: 700, fontSize: 12, display: 'flex', justifyContent: 'space-between',
            }}>
              Chọn khách hàng
              <button type="button" onClick={() => setShowKhLookup(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
                <X size={14} />
              </button>
            </div>
            <div style={{ padding: '8px 14px' }}>
              <input autoFocus value={khSearch} onChange={(e) => setKhSearch(e.target.value)}
                placeholder="Tìm theo mã, tên..."
                style={{
                  width: '100%', height: 26, fontSize: 11, border: '1px solid var(--border)',
                  borderRadius: 3, padding: '0 6px', fontFamily: 'inherit', boxSizing: 'border-box',
                }} />
            </div>
            <div style={{ flex: 1, overflow: 'auto', padding: '0 14px 12px' }}>
              {filteredKh.map((kh) => (
                <div key={kh.id} onClick={() => chonKhachHang(kh)}
                  style={{
                    padding: '6px 8px', cursor: 'pointer', borderRadius: 3, fontSize: 11,
                    display: 'flex', gap: 12, alignItems: 'center',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                  <span style={{ color: 'var(--text-muted)', minWidth: 80 }}>{kh.ma_kh}</span>
                  <span style={{ fontWeight: 500, flex: 1 }}>{kh.ten_kh}</span>
                  {kh.isNhaCungCap && (
                    <span style={{
                      fontSize: 9, background: '#e0f2fe', color: '#0369a1',
                      borderRadius: 3, padding: '1px 4px',
                    }}>NCC</span>
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
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 4000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
          onClick={() => setShowSpLookup(false)}>
          <div style={{
            background: 'var(--bg-primary)', borderRadius: 8, width: 560, maxHeight: 460,
            display: 'flex', flexDirection: 'column', boxShadow: '0 8px 32px rgba(0,0,0,0.28)',
          }}
            onClick={(e) => e.stopPropagation()}>
            <div style={{
              padding: '10px 14px', borderBottom: '1px solid var(--border)',
              fontWeight: 700, fontSize: 12, display: 'flex', justifyContent: 'space-between',
            }}>
              Chọn sản phẩm, hàng hóa
              <button type="button" onClick={() => setShowSpLookup(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
                <X size={14} />
              </button>
            </div>
            <div style={{ padding: '8px 14px' }}>
              <input autoFocus value={spSearch} onChange={(e) => setSpSearch(e.target.value)}
                placeholder="Tìm theo mã, tên..."
                style={{
                  width: '100%', height: 26, fontSize: 11, border: '1px solid var(--border)',
                  borderRadius: 3, padding: '0 6px', fontFamily: 'inherit', boxSizing: 'border-box',
                }} />
            </div>
            <div style={{ flex: 1, overflow: 'auto', padding: '0 14px 12px' }}>
              {filteredSp.map((sp) => (
                <div key={sp.id} onClick={() => chonSanPham(sp)}
                  style={{
                    padding: '5px 8px', cursor: 'pointer', borderRadius: 3, fontSize: 11,
                    display: 'flex', gap: 10, alignItems: 'center',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                  <span style={{ color: 'var(--text-muted)', minWidth: 88 }}>{sp.ma}</span>
                  <span style={{ fontWeight: 500, flex: 1 }}>{sp.ten}</span>
                  {sp.chiet_khau && sp.bang_chiet_khau && sp.bang_chiet_khau.length > 0 && (
                    <span style={{
                      fontSize: 9, background: '#f0fdf4', color: '#15803d',
                      borderRadius: 3, padding: '1px 4px',
                    }}>Bậc</span>
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
