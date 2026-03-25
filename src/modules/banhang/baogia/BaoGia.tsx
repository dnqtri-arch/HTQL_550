/**
 * Danh sach + Form Bao gia - YC20
 * [1] Panel Lich su KH  [2] Cong thuc SL  [3] Bac gia
 * [4] Chuyen DH         [5] Canh bao han muc  [6] NCC luong tinh
 * [7] Math.round VND    [8] Enter nav   [9] Phan trang 50
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import {
  Plus, Trash2, Eye, Mail, MessageCircle, ChevronDown, X,
  Search, FileText, History, ChevronLeft, ChevronRight,
} from 'lucide-react'
import { DataGrid, type DataGridColumn } from '../../../components/common/DataGrid'
import { Modal } from '../../../components/common/Modal'
import { useToastOptional } from '../../../context/ToastContext'
import { matchSearchKeyword } from '../../../utils/stringUtils'
import { formatNumberDisplay, formatSoThapPhan } from '../../../utils/numberFormat'
import {
  formFooterButtonCancel,
  formFooterButtonSave,
  formFooterButtonSaveAndAdd,
} from '../../../constants/formFooterButtons'
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
import type { BaoGiaCreatePayload, BanHangFilter } from '../../../types/banHang'
import { khachHangGetAll, type KhachHangRecord } from '../khachhang/khachHangApi'
import { vatTuHangHoaGetForBanHang, type VatTuHangHoaRecord } from '../../inventory/kho/vatTuHangHoaApi'
import styles from '../BanHang.module.css'

// Badge trang thai
function BaoGiaBadge({ value }: { value: string }) {
  const cls =
    value === '\u0110\u00e3 ch\u1ed1t' ? styles.badgeDaChot
    : value === 'Ch\u1edd duy\u1ec7t' ? styles.badgeChoDuyet
    : value === 'H\u1ee7y b\u1ecf' ? styles.badgeDaHuy
    : value === '\u0110\u00e3 g\u1eedi kh\u00e1ch' ? styles.badgeDangThucHien
    : styles.badgeDefault
  return <span className={cls}>{value}</span>
}

function formatNgay(iso: string | null | undefined): string {
  if (!iso) return ''
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/)
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso
}

// Tiered Pricing: ap dung bac gia theo so luong
function applyTieredPrice(sp: VatTuHangHoaRecord, soLuong: number): number {
  const basePrice = sp.gia_ban_quy_dinh ?? sp.don_gia_ban ?? 0
  if (!sp.chiet_khau || !sp.bang_chiet_khau || sp.bang_chiet_khau.length === 0) return basePrice
  const tier = sp.bang_chiet_khau.find((t) => {
    const from = parseFloat(t.so_luong_tu) || 0
    const to = t.so_luong_den ? parseFloat(t.so_luong_den) : Infinity
    return soLuong >= from && soLuong <= to
  })
  if (tier) {
    const pct = parseFloat(tier.ty_le_chiet_khau) || 0
    return Math.round(basePrice * (1 - pct / 100))
  }
  return basePrice
}

// Tinh so luong tu cong thuc
function tinhSoLuongTuCongThuc(formula: string, ts1: number, ts2: number): number {
  if (formula.includes('*')) return Math.round(ts1 * ts2 * 1000) / 1000
  if (formula.includes('+')) return ts1 + ts2
  if (formula.includes('-')) return ts1 - ts2
  return ts1
}

function hasFormula(formula?: string): boolean {
  return Boolean(formula && /[*/+\-]/.test(formula))
}

// Enter navigation qua cac o trong bang chi tiet
function navEnter(
  e: React.KeyboardEvent<HTMLInputElement>,
  rowKey: string,
  field: string,
  coFormula: boolean
) {
  if (e.key !== 'Enter') return
  e.preventDefault()
  const seqFormula = ['tham_so_1', 'tham_so_2', 'don_gia', 'pt_thue_gtgt', 'ghi_chu']
  const seqNormal = ['so_luong', 'don_gia', 'pt_thue_gtgt', 'ghi_chu']
  const seq = coFormula ? seqFormula : seqNormal
  const idx = seq.indexOf(field)
  if (idx >= 0 && idx < seq.length - 1) {
    const nf = seq[idx + 1]
    const next = document.querySelector<HTMLElement>(`[data-row="${rowKey}"][data-field="${nf}"]`)
    next?.focus()
  } else {
    const firstField = seq[0]
    const allFirst = Array.from(document.querySelectorAll<HTMLElement>(`[data-field="${firstField}"]`))
    const cur = document.querySelector<HTMLElement>(`[data-row="${rowKey}"][data-field="${field}"]`)
    const ci = cur ? allFirst.indexOf(cur) : -1
    if (ci >= 0 && ci < allFirst.length - 1) allFirst[ci + 1]?.focus()
  }
}

// Cac trang thai bao gia
const TINH_TRANGS = [
  'Ch\u1edd duy\u1ec7t',
  '\u0110\u00e3 g\u1eedi kh\u00e1ch',
  '\u0110\u00e3 ch\u1ed1t',
  'H\u1ee7y b\u1ecf',
] as const

const TODAY_ISO = new Date().toISOString().slice(0, 10)
type ChiTietRow = Partial<BaoGiaChiTiet> & { _key: string }

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

  const [soBaoGia, setSoBaoGia] = useState(initialRecord?.so_bao_gia ?? '')
  const [ngayBaoGia, setNgayBaoGia] = useState(initialRecord?.ngay_bao_gia ?? TODAY_ISO)
  const [ngayHetHan, setNgayHetHan] = useState(initialRecord?.ngay_het_han ?? '')
  const [khachHang, setKhachHang] = useState(initialRecord?.khach_hang ?? '')
  const [diaChiKh, setDiaChiKh] = useState(initialRecord?.dia_chi_kh ?? '')
  const [maSoThueKh, setMaSoThueKh] = useState(initialRecord?.ma_so_thue_kh ?? '')
  const [nguoiLienHe, setNguoiLienHe] = useState(initialRecord?.nguoi_lien_he ?? '')
  const [dienGiai, setDienGiai] = useState(initialRecord?.dien_giai ?? '')
  const [tinhTrang, setTinhTrang] = useState<BaoGiaRecord['tinh_trang']>(
    initialRecord?.tinh_trang ?? 'Ch\u1edd duy\u1ec7t'
  )
  const [nvBanHang, setNvBanHang] = useState(initialRecord?.nv_ban_hang ?? '')
  const [ghiChu, setGhiChu] = useState(initialRecord?.ghi_chu ?? '')
  const [loi, setLoi] = useState('')
  const [chiTiet, setChiTiet] = useState<ChiTietRow[]>(
    initialChiTiet?.map((c) => ({ ...c, _key: c.id })) ?? []
  )

  // [1] Lich su KH
  const [lichSu, setLichSu] = useState<
    { so_bao_gia: string; ngay_bao_gia: string; ten_hang: string; so_luong: number; don_gia: number }[]
  >([])
  const [showLichSu, setShowLichSu] = useState(false)

  // KH da chon (kiem tra han muc, NCC)
  const [selectedKh, setSelectedKh] = useState<KhachHangRecord | null>(null)

  // Lookup KH
  const [showKhLookup, setShowKhLookup] = useState(false)
  const [khList, setKhList] = useState<KhachHangRecord[]>([])
  const [khSearch, setKhSearch] = useState('')

  // Lookup SP
  const [showSpLookup, setShowSpLookup] = useState(false)
  const [spList, setSpList] = useState<VatTuHangHoaRecord[]>([])
  const [spSearch, setSpSearch] = useState('')
  const [editKey, setEditKey] = useState<string | null>(null)

  // spMap: tra cuu nhanh de ap dung tiered pricing
  const spMap = useMemo(() => new Map(spList.map((s) => [s.ma, s])), [spList])

  // Load danh sach san pham ngay khi mo form de san sang tiered pricing
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

  // [1] + [5] + [6] Chon KH
  const chonKhachHang = (kh: KhachHangRecord) => {
    setKhachHang(kh.ten_kh)
    setDiaChiKh(kh.dia_chi ?? '')
    setMaSoThueKh(kh.ma_so_thue ?? '')
    setNguoiLienHe(kh.dai_dien_theo_pl ?? '')
    setSelectedKh(kh)
    setShowKhLookup(false)

    // [1] Lay lich su giao dich
    const lich = baoGiaGetLichSuKhachHang(kh.ten_kh, 5)
    setLichSu(lich)
    if (lich.length > 0) setShowLichSu(true)

    // [5] Canh bao han muc cong no
    if (kh.han_muc_no_kh && kh.han_muc_no_kh > 0) {
      const existing = baoGiaGetAll({ ky: 'tat_ca', tu: '', den: '', tim_kiem: '' })
        .filter((r) => r.khach_hang === kh.ten_kh && r.tinh_trang !== 'H\u1ee7y b\u1ecf')
        .reduce((s, r) => s + r.tong_thanh_toan, 0)
      if (existing >= kh.han_muc_no_kh) {
        toast?.showToast(
          `\u26a0\ufe0f KH ${kh.ten_kh} \u0111\u00e3 v\u01b0\u1ee3t h\u1ea1n m\u1ee9c c\u00f4ng n\u1ee3 ${formatNumberDisplay(kh.han_muc_no_kh, 0)} \u0111!`,
          'warning'
        )
      }
    }
  }

  const moSpLookup = (key: string) => {
    setShowSpLookup(true)
    setSpSearch('')
    setEditKey(key)
  }

  // [2] + [3] Chon SP: set cong thuc + tiered pricing
  const chonSanPham = (sp: VatTuHangHoaRecord) => {
    if (!editKey) return
    const congThuc = sp.cong_thuc_tinh_so_luong ?? ''
    const baseDonGia = sp.gia_ban_quy_dinh ?? sp.don_gia_ban ?? 0
    setChiTiet((prev) =>
      prev.map((c) => {
        if (c._key !== editKey) return c
        return {
          ...c,
          ma_hang: sp.ma,
          ten_hang: sp.ten,
          dvt: sp.dvt_chinh ?? '',
          cong_thuc_tinh_sl: congThuc || undefined,
          tham_so_1: congThuc ? 0 : undefined,
          tham_so_2: congThuc ? 0 : undefined,
          don_gia: baseDonGia,
          thanh_tien: Math.round((c.so_luong ?? 1) * baseDonGia),
        }
      })
    )
    setShowSpLookup(false)
    setEditKey(null)
  }

  const filteredKh = khSearch
    ? khList.filter((k) => `${k.ma_kh} ${k.ten_kh}`.toLowerCase().includes(khSearch.toLowerCase()))
    : khList

  const filteredSp = spSearch
    ? spList.filter((s) => `${s.ma} ${s.ten}`.toLowerCase().includes(spSearch.toLowerCase()))
    : spList

  useEffect(() => {
    if (mode === 'add' && !initialRecord) setSoBaoGia(baoGiaSoTiepTheo())
    setTimeout(() => soRef.current?.focus(), 60)
  }, [])

  // [7] Math.round toan bo tong
  const tongTienHang = Math.round(chiTiet.reduce((s, c) => s + (Number(c.thanh_tien) || 0), 0))
  const tongThueGtgt = Math.round(chiTiet.reduce((s, c) => s + (Number(c.tien_thue_gtgt) || 0), 0))
  const tongThanhToan = tongTienHang + tongThueGtgt

  const themDong = () => {
    setChiTiet((prev) => [
      ...prev,
      {
        _key: `new_${Date.now()}`,
        ma_hang: '',
        ten_hang: '',
        dvt: '',
        so_luong: 1,
        don_gia: 0,
        thanh_tien: 0,
        pt_thue_gtgt: null,
        tien_thue_gtgt: null,
        ghi_chu: '',
      },
    ])
  }

  const xoaDong = (key: string) => {
    setChiTiet((prev) => prev.filter((c) => c._key !== key))
  }

  // [2] + [3] + [7] Cap nhat dong: cong thuc SL + tiered pricing + Math.round
  const capNhatDong = (key: string, field: string, val: string | number | null) => {
    setChiTiet((prev) =>
      prev.map((c) => {
        if (c._key !== key) return c
        const updated: ChiTietRow = { ...c, [field]: val }

        // [2] Tinh lai SL khi thay doi tham so cong thuc
        if (field === 'tham_so_1' || field === 'tham_so_2') {
          const ts1 = field === 'tham_so_1' ? Number(val) : Number(c.tham_so_1) || 0
          const ts2 = field === 'tham_so_2' ? Number(val) : Number(c.tham_so_2) || 0
          updated.so_luong = tinhSoLuongTuCongThuc(c.cong_thuc_tinh_sl || '', ts1, ts2)
        }

        // [3] Khi SL thay doi: kiem tra bac gia
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
          updated.pt_thue_gtgt = pct
          updated.tien_thue_gtgt = pct == null ? null : Math.round((Number(c.thanh_tien) || 0) * pct / 100)
        }

        return updated
      })
    )
  }

  const validate = (): boolean => {
    if (!soBaoGia.trim()) {
      setLoi('S\u1ed1 b\u00e1o gi\u00e1 kh\u00f4ng \u0111\u01b0\u1ee3c \u0111\u1ec3 tr\u1ed1ng.')
      soRef.current?.focus()
      return false
    }
    if (!khachHang.trim()) {
      setLoi('Kh\u00e1ch h\u00e0ng kh\u00f4ng \u0111\u01b0\u1ee3c \u0111\u1ec3 tr\u1ed1ng.')
      return false
    }
    setLoi('')
    return true
  }

  const buildPayload = (): BaoGiaCreatePayload => ({
    so_bao_gia: soBaoGia.trim(),
    ngay_bao_gia: ngayBaoGia,
    ngay_het_han: ngayHetHan || null,
    khach_hang: khachHang.trim(),
    dia_chi_kh: diaChiKh.trim() || undefined,
    ma_so_thue_kh: maSoThueKh.trim() || undefined,
    nguoi_lien_he: nguoiLienHe.trim() || undefined,
    dien_giai: dienGiai.trim() || undefined,
    tong_tien_hang: tongTienHang,
    tong_thue_gtgt: tongThueGtgt,
    tong_thanh_toan: tongThanhToan,
    tinh_trang: tinhTrang,
    ghi_chu: ghiChu.trim() || undefined,
    nv_ban_hang: nvBanHang.trim() || undefined,
    chi_tiet: chiTiet.map((c, i) => ({
      stt: i + 1,
      ma_hang: c.ma_hang ?? '',
      ten_hang: c.ten_hang ?? '',
      dvt: c.dvt ?? '',
      cong_thuc_tinh_sl: c.cong_thuc_tinh_sl,
      tham_so_1: c.tham_so_1,
      tham_so_2: c.tham_so_2,
      so_luong: Number(c.so_luong) || 0,
      don_gia: Number(c.don_gia) || 0,
      thanh_tien: Math.round(Number(c.thanh_tien) || 0),
      pt_thue_gtgt: c.pt_thue_gtgt ?? null,
      tien_thue_gtgt: c.tien_thue_gtgt != null ? Math.round(Number(c.tien_thue_gtgt)) : null,
      ghi_chu: c.ghi_chu,
    })),
  })

  const handleLuu = () => {
    if (!validate()) return
    const payload = buildPayload()
    if (mode === 'edit' && initialRecord) {
      baoGiaPut(initialRecord.id, payload)
      toast?.showToast('\u0110\u00e3 l\u01b0u b\u00e1o gi\u00e1.', 'success')
    } else {
      baoGiaPost(payload)
      toast?.showToast('\u0110\u00e3 th\u00eam b\u00e1o gi\u00e1.', 'success')
    }
    onSaved()
  }

  const handleLuuVaTiepTuc = () => {
    if (!validate()) return
    baoGiaPost(buildPayload())
    toast?.showToast('\u0110\u00e3 l\u01b0u b\u00e1o gi\u00e1. Ti\u1ebfp t\u1ee5c th\u00eam m\u1edbi.', 'success')
    setSoBaoGia(baoGiaSoTiepTheo())
    setKhachHang('')
    setSelectedKh(null)
    setLichSu([])
    setShowLichSu(false)
    setNguoiLienHe('')
    setDienGiai('')
    setTinhTrang('Ch\u1edd duy\u1ec7t')
    setNvBanHang('')
    setGhiChu('')
    setChiTiet([])
    setLoi('')
    onSavedAndAdd?.()
    setTimeout(() => soRef.current?.focus(), 60)
  }

  const readOnly = mode === 'view'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div className={styles.modalHeader}>
        <span className={styles.modalTitle}>
          {mode === 'add' ? 'Th\u00eam B\u00e1o gi\u00e1' : mode === 'edit' ? 'S\u1eeda B\u00e1o gi\u00e1' : 'Xem B\u00e1o gi\u00e1'}
        </span>
        {loi && <span style={{ fontSize: 11, color: '#dc2626', marginLeft: 12 }}>{loi}</span>}
        <button type="button" className={styles.modalCloseBtn} onClick={onClose}><X size={14} /></button>
      </div>

      {/* Body */}
      <div className={styles.modalBody}>
        <div className={styles.formSectionTitle}>Th\u00f4ng tin chung</div>

        <div className={styles.formRow}>
          <span className={styles.formLabel}>S\u1ed1 b\u00e1o gi\u00e1</span>
          <div className={styles.formControl}>
            <input ref={soRef} className={styles.formInput} value={soBaoGia}
              onChange={(e) => setSoBaoGia(e.target.value)} readOnly={readOnly} />
          </div>
          <span className={styles.formLabel} style={{ minWidth: 80 }}>Tr\u1ea1ng th\u00e1i</span>
          <div className={styles.formControl}>
            <select className={styles.formSelect} value={tinhTrang}
              onChange={(e) => setTinhTrang(e.target.value as BaoGiaRecord['tinh_trang'])}
              disabled={readOnly}>
              {TINH_TRANGS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        <div className={styles.formRow}>
          <span className={styles.formLabel}>Ng\u00e0y b\u00e1o gi\u00e1</span>
          <div className={styles.formControl}>
            <input type="date" className={styles.formInput} style={{ textAlign: 'right' }}
              value={ngayBaoGia} onChange={(e) => setNgayBaoGia(e.target.value)} readOnly={readOnly} />
          </div>
          <span className={styles.formLabel} style={{ minWidth: 80 }}>Ng\u00e0y h\u1ebft h\u1ea1n</span>
          <div className={styles.formControl}>
            <input type="date" className={styles.formInput} style={{ textAlign: 'right' }}
              value={ngayHetHan} onChange={(e) => setNgayHetHan(e.target.value)} readOnly={readOnly} />
          </div>
        </div>

        {/* [5][6] Khach hang */}
        <div className={styles.formRow}>
          <span className={styles.formLabel}>Kh\u00e1ch h\u00e0ng</span>
          <div className={styles.formControl} style={{ flex: 3, display: 'flex', gap: 4, alignItems: 'center' }}>
            <input className={styles.formInput} value={khachHang}
              onChange={(e) => setKhachHang(e.target.value)} readOnly={readOnly}
              placeholder="T\u00ean kh\u00e1ch h\u00e0ng" style={{ flex: 1 }} />
            {!readOnly && (
              <button type="button" onClick={moKhLookup} title="Ch\u1ecdn kh\u00e1ch h\u00e0ng"
                style={{ height: 26, padding: '0 8px', border: '1px solid var(--border)', borderRadius: 3,
                  background: 'var(--bg-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                <Search size={12} />
              </button>
            )}
            {/* [1] Nut mo lich su */}
            {lichSu.length > 0 && (
              <button type="button" onClick={() => setShowLichSu((v) => !v)}
                title="Xem l\u1ecbch s\u1eed giao d\u1ecbch"
                style={{ height: 26, padding: '0 6px', border: '1px solid var(--border)', borderRadius: 3,
                  background: showLichSu ? 'var(--accent)' : 'var(--bg-secondary)',
                  color: showLichSu ? '#fff' : 'var(--text-primary)',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3, fontSize: 10 }}>
                <History size={11} /> L\u1ecbch s\u1eed ({lichSu.length})
              </button>
            )}
            {/* [6] NCC luong tinh */}
            {selectedKh?.isNhaCungCap && (
              <span style={{ fontSize: 10, color: '#0ea5e9', whiteSpace: 'nowrap',
                background: '#e0f2fe', borderRadius: 3, padding: '2px 6px' }}>
                C\u0169ng l\u00e0 NCC \u2014 ki\u1ec3m tra d\u01b0 n\u1ee3 NCC-{selectedKh.ma_kh}
              </span>
            )}
          </div>
          <span className={styles.formLabel} style={{ minWidth: 70 }}>MST KH</span>
          <div className={styles.formControl}>
            <input className={styles.formInput} value={maSoThueKh}
              onChange={(e) => setMaSoThueKh(e.target.value)} readOnly={readOnly} />
          </div>
        </div>

        {/* [1] Panel lich su KH */}
        {showLichSu && lichSu.length > 0 && (
          <div style={{ marginBottom: 8, border: '1px solid #bae6fd', borderRadius: 5,
            background: '#f0f9ff', padding: '6px 10px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#0369a1', marginBottom: 4,
              display: 'flex', alignItems: 'center', gap: 4 }}>
              <History size={11} />
              5 giao d\u1ecbch/b\u00e1o gi\u00e1 g\u1ea7n nh\u1ea5t c\u1ee7a {khachHang}
              <button type="button" onClick={() => setShowLichSu(false)}
                style={{ marginLeft: 'auto', background: 'transparent', border: 'none',
                  cursor: 'pointer', color: '#64748b', lineHeight: 1 }}>
                <X size={11} />
              </button>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
              <thead>
                <tr style={{ color: '#64748b' }}>
                  <th style={{ textAlign: 'left', padding: '1px 4px', fontWeight: 500 }}>S\u1ed1 BG</th>
                  <th style={{ textAlign: 'left', padding: '1px 4px', fontWeight: 500 }}>Ng\u00e0y</th>
                  <th style={{ textAlign: 'left', padding: '1px 4px', fontWeight: 500 }}>T\u00ean h\u00e0ng</th>
                  <th style={{ textAlign: 'right', padding: '1px 4px', fontWeight: 500 }}>SL</th>
                  <th style={{ textAlign: 'right', padding: '1px 4px', fontWeight: 500 }}>\u0110\u01a1n gi\u00e1 c\u0169</th>
                </tr>
              </thead>
              <tbody>
                {lichSu.map((h, i) => (
                  <tr key={i} style={{ borderTop: '1px solid #e0f2fe' }}>
                    <td style={{ padding: '2px 4px', color: '#0ea5e9' }}>{h.so_bao_gia}</td>
                    <td style={{ padding: '2px 4px' }}>{formatNgay(h.ngay_bao_gia)}</td>
                    <td style={{ padding: '2px 4px', maxWidth: 180, overflow: 'hidden',
                      textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.ten_hang}</td>
                    <td style={{ padding: '2px 4px', textAlign: 'right',
                      fontVariantNumeric: 'tabular-nums' }}>{formatSoThapPhan(h.so_luong, 2)}</td>
                    <td style={{ padding: '2px 4px', textAlign: 'right',
                      fontVariantNumeric: 'tabular-nums', color: '#0369a1', fontWeight: 600 }}>
                      {formatNumberDisplay(h.don_gia, 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className={styles.formRow}>
          <span className={styles.formLabel}>\u0110\u1ecba ch\u1ec9 KH</span>
          <div className={styles.formControl} style={{ flex: 3 }}>
            <input className={styles.formInput} value={diaChiKh}
              onChange={(e) => setDiaChiKh(e.target.value)} readOnly={readOnly} />
          </div>
        </div>

        <div className={styles.formRow}>
          <span className={styles.formLabel}>Ng\u01b0\u1eddi li\u00ean h\u1ec7</span>
          <div className={styles.formControl}>
            <input className={styles.formInput} value={nguoiLienHe}
              onChange={(e) => setNguoiLienHe(e.target.value)} readOnly={readOnly} />
          </div>
          <span className={styles.formLabel} style={{ minWidth: 80 }}>NV b\u00e1n h\u00e0ng</span>
          <div className={styles.formControl}>
            <input className={styles.formInput} value={nvBanHang}
              onChange={(e) => setNvBanHang(e.target.value)} readOnly={readOnly} />
          </div>
        </div>

        <div className={styles.formRow}>
          <span className={styles.formLabel}>Di\u1ec5n gi\u1ea3i</span>
          <div className={styles.formControl} style={{ flex: 3 }}>
            <input className={styles.formInput} value={dienGiai}
              onChange={(e) => setDienGiai(e.target.value)} readOnly={readOnly} />
          </div>
        </div>

        {/* Chi tiet VTHH */}
        <div className={styles.formSectionTitle} style={{ marginTop: 14 }}>
          Chi ti\u1ebft v\u1eadt t\u01b0 h\u00e0ng h\u00f3a
          <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 400, marginLeft: 8 }}>
            (H\u00e0ng c\u00f3 c\u00f4ng th\u1ee9c: nh\u1eadp T.S\u1ed1 1 \u00d7 T.S\u1ed1 2 \u2192 t\u1ef1 t\u00ednh SL; SL thay \u0111\u1ed5i \u2192 t\u1ef1 tra b\u1eadc gi\u00e1)
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
              <col style={{ width: 88 }} />
              <col style={{ width: 110 }} />
              {!readOnly && <col style={{ width: 26 }} />}
            </colgroup>
            <thead>
              <tr>
                <th className={styles.tdCenter}>STT</th>
                <th>M\u00e3 VTHH</th>
                <th>T\u00ean VTHH</th>
                <th>\u0110VT</th>
                <th className={styles.thRight} title="Tham s\u1ed1 1 (VD: D\u00e0i)">T.S\u1ed1 1</th>
                <th className={styles.thRight} title="Tham s\u1ed1 2 (VD: R\u1ed9ng)">T.S\u1ed1 2</th>
                <th className={styles.thRight}>S\u1ed1 l\u01b0\u1ee3ng</th>
                <th className={styles.thRight}>\u0110\u01a1n gi\u00e1</th>
                <th className={styles.thRight}>Th\u00e0nh ti\u1ec1n</th>
                <th className={styles.thRight}>% GTGT</th>
                <th className={styles.thRight}>Ti\u1ec1n GTGT</th>
                <th>Ghi ch\u00fa</th>
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
                        title={c.cong_thuc_tinh_sl ? `C\u00f4ng th\u1ee9c: ${c.cong_thuc_tinh_sl}` : undefined} />
                      {!readOnly && (
                        <button type="button" onClick={() => moSpLookup(c._key)}
                          style={{ background: 'transparent', border: 'none', cursor: 'pointer',
                            padding: '0 2px', color: 'var(--accent)' }}>
                          <Search size={10} />
                        </button>
                      )}
                    </td>
                    <td>
                      <input className={styles.chiTietInput} value={c.ten_hang ?? ''}
                        onChange={(e) => capNhatDong(c._key, 'ten_hang', e.target.value)}
                        readOnly={readOnly} />
                    </td>
                    <td>
                      <input className={styles.chiTietInput} value={c.dvt ?? ''}
                        onChange={(e) => capNhatDong(c._key, 'dvt', e.target.value)}
                        readOnly={readOnly} />
                    </td>

                    {/* [2] Tham so 1 */}
                    <td className={styles.tdRight}>
                      {coFormula && !readOnly ? (
                        <input className={styles.chiTietInput}
                          style={{ textAlign: 'right', background: '#fef9c3' }}
                          type="number"
                          value={c.tham_so_1 ?? ''}
                          data-row={c._key}
                          data-field="tham_so_1"
                          onChange={(e) => capNhatDong(c._key, 'tham_so_1', e.target.value === '' ? 0 : Number(e.target.value))}
                          onKeyDown={(e) => navEnter(e, c._key, 'tham_so_1', coFormula)}
                        />
                      ) : coFormula ? (
                        <span style={{ fontSize: 10, display: 'block', textAlign: 'right' }}>{c.tham_so_1 ?? 0}</span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: 10, display: 'block', textAlign: 'center' }}>\u2014</span>
                      )}
                    </td>

                    {/* [2] Tham so 2 */}
                    <td className={styles.tdRight}>
                      {coFormula && !readOnly ? (
                        <input className={styles.chiTietInput}
                          style={{ textAlign: 'right', background: '#fef9c3' }}
                          type="number"
                          value={c.tham_so_2 ?? ''}
                          data-row={c._key}
                          data-field="tham_so_2"
                          onChange={(e) => capNhatDong(c._key, 'tham_so_2', e.target.value === '' ? 0 : Number(e.target.value))}
                          onKeyDown={(e) => navEnter(e, c._key, 'tham_so_2', coFormula)}
                        />
                      ) : coFormula ? (
                        <span style={{ fontSize: 10, display: 'block', textAlign: 'right' }}>{c.tham_so_2 ?? 0}</span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: 10, display: 'block', textAlign: 'center' }}>\u2014</span>
                      )}
                    </td>

                    {/* So luong: tu dong neu co cong thuc */}
                    <td className={styles.tdRight}>
                      {coFormula ? (
                        <span style={{ fontWeight: 600, fontSize: 11, color: '#0369a1',
                          display: 'block', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                          {formatSoThapPhan(Number(c.so_luong) || 0, 3)}
                        </span>
                      ) : (
                        <input className={styles.chiTietInput} style={{ textAlign: 'right' }}
                          value={c.so_luong ?? ''}
                          data-row={c._key}
                          data-field="so_luong"
                          onChange={(e) => capNhatDong(c._key, 'so_luong', e.target.value)}
                          onKeyDown={(e) => navEnter(e, c._key, 'so_luong', false)}
                          readOnly={readOnly}
                        />
                      )}
                    </td>

                    <td className={styles.tdRight}>
                      <input className={styles.chiTietInput} style={{ textAlign: 'right' }}
                        value={c.don_gia ?? ''}
                        data-row={c._key}
                        data-field="don_gia"
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
                        value={c.pt_thue_gtgt ?? ''}
                        data-row={c._key}
                        data-field="pt_thue_gtgt"
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
                        data-row={c._key}
                        data-field="ghi_chu"
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
                    {readOnly ? 'Kh\u00f4ng c\u00f3 chi ti\u1ebft.' : 'Ch\u01b0a c\u00f3 d\u00f2ng. B\u1ea5m "+ Th\u00eam d\u00f2ng" \u0111\u1ec3 th\u00eam.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {!readOnly && (
          <div className={styles.chiTietAddRow}>
            <button type="button" className={styles.toolbarBtn} onClick={themDong}>
              <Plus size={12} /> Th\u00eam d\u00f2ng
            </button>
          </div>
        )}

        {/* [7] Tong hop - Math.round */}
        <div style={{ display: 'flex', gap: 24, justifyContent: 'flex-end', marginTop: 10,
          fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>
          <span>Ti\u1ec1n h\u00e0ng: <strong>{formatNumberDisplay(tongTienHang, 0)}</strong></span>
          <span>Thu\u1ebf GTGT: <strong>{formatNumberDisplay(tongThueGtgt, 0)}</strong></span>
          <span style={{ color: 'var(--accent)', fontWeight: 700 }}>
            T\u1ed5ng thanh to\u00e1n: <strong>{formatNumberDisplay(tongThanhToan, 0)}</strong>
          </span>
        </div>

        {/* Ghi chu */}
        <div className={styles.formRow} style={{ marginTop: 10 }}>
          <span className={styles.formLabel}>Ghi ch\u00fa</span>
          <div className={styles.formControl}>
            <textarea className={styles.formTextarea} value={ghiChu}
              onChange={(e) => setGhiChu(e.target.value)} readOnly={readOnly} rows={2} />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className={styles.modalFooter}>
        {!readOnly ? (
          <>
            <button type="button" style={formFooterButtonCancel} onClick={onClose}>H\u1ee7y b\u1ecf</button>
            <button type="button" style={formFooterButtonSave} onClick={handleLuu}>L\u01b0u</button>
            {mode === 'add' && (
              <button type="button" style={formFooterButtonSaveAndAdd} onClick={handleLuuVaTiepTuc}>
                L\u01b0u v\u00e0 ti\u1ebfp t\u1ee5c
              </button>
            )}
          </>
        ) : (
          <button type="button" style={formFooterButtonCancel} onClick={onClose}>\u0110\u00f3ng</button>
        )}
      </div>

      {/* Lookup Khach hang */}
      {showKhLookup && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 4000,
          display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setShowKhLookup(false)}>
          <div style={{ background: 'var(--bg-primary)', borderRadius: 8, width: 500, maxHeight: 440,
            display: 'flex', flexDirection: 'column', boxShadow: '0 8px 32px rgba(0,0,0,0.28)' }}
            onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)',
              fontWeight: 700, fontSize: 12, display: 'flex', justifyContent: 'space-between' }}>
              Ch\u1ecdn kh\u00e1ch h\u00e0ng
              <button type="button" onClick={() => setShowKhLookup(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
                <X size={14} />
              </button>
            </div>
            <div style={{ padding: '8px 14px' }}>
              <input autoFocus value={khSearch} onChange={(e) => setKhSearch(e.target.value)}
                placeholder="T\u00ecm theo m\u00e3, t\u00ean..."
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
                  Kh\u00f4ng t\u00ecm th\u1ea5y kh\u00e1ch h\u00e0ng.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Lookup San pham */}
      {showSpLookup && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 4000,
          display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setShowSpLookup(false)}>
          <div style={{ background: 'var(--bg-primary)', borderRadius: 8, width: 560, maxHeight: 460,
            display: 'flex', flexDirection: 'column', boxShadow: '0 8px 32px rgba(0,0,0,0.28)' }}
            onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)',
              fontWeight: 700, fontSize: 12, display: 'flex', justifyContent: 'space-between' }}>
              Ch\u1ecdn s\u1ea3n ph\u1ea9m, h\u00e0ng h\u00f3a
              <button type="button" onClick={() => setShowSpLookup(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
                <X size={14} />
              </button>
            </div>
            <div style={{ padding: '8px 14px' }}>
              <input autoFocus value={spSearch} onChange={(e) => setSpSearch(e.target.value)}
                placeholder="T\u00ecm theo m\u00e3, t\u00ean..."
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
                      borderRadius: 3, padding: '1px 4px' }} title="C\u00f3 c\u00f4ng th\u1ee9c t\u00ednh SL">CT</span>
                  )}
                  {sp.chiet_khau && sp.bang_chiet_khau && sp.bang_chiet_khau.length > 0 && (
                    <span style={{ fontSize: 9, background: '#f0fdf4', color: '#15803d',
                      borderRadius: 3, padding: '1px 4px' }} title="C\u00f3 b\u1eadc gi\u00e1">B\u1eadc</span>
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
                  Ch\u01b0a c\u00f3 s\u1ea3n ph\u1ea9m n\u00e0o.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Cot danh sach chinh
const columns: DataGridColumn<BaoGiaRecord>[] = [
  { key: 'so_bao_gia', label: 'S\u1ed1 BG', width: 100 },
  { key: 'ngay_bao_gia', label: 'Ng\u00e0y BG', width: 76, align: 'right', renderCell: (v) => formatNgay(v as string) },
  { key: 'ngay_het_han', label: 'H\u1ebft h\u1ea1n', width: 76, align: 'right', renderCell: (v) => formatNgay(v as string | null) },
  { key: 'khach_hang', label: 'Kh\u00e1ch h\u00e0ng', width: '28%' },
  { key: 'dien_giai', label: 'Di\u1ec5n gi\u1ea3i', width: '20%' },
  { key: 'tong_thanh_toan', label: 'T\u1ed5ng ti\u1ec1n', width: 110, align: 'right',
    renderCell: (v) => formatNumberDisplay(Number(v), 0) },
  { key: 'tinh_trang', label: 'Tr\u1ea1ng th\u00e1i', width: 110,
    renderCell: (v) => <BaoGiaBadge value={String(v)} /> },
  { key: 'nv_ban_hang', label: 'NV b\u00e1n h\u00e0ng', width: '10%' },
]

// Cot chi tiet phia duoi
const columnsChiTiet: DataGridColumn<BaoGiaChiTiet>[] = [
  { key: 'stt', label: 'STT', width: 36, align: 'center', renderCell: (_v, _r, idx) => String((idx ?? 0) + 1) },
  { key: 'ma_hang', label: 'M\u00e3 VTHH', width: 88 },
  { key: 'ten_hang', label: 'T\u00ean VTHH', width: 180 },
  { key: 'dvt', label: '\u0110VT', width: 52 },
  {
    key: 'cong_thuc_tinh_sl', label: 'C\u00f4ng th\u1ee9c', width: 80,
    renderCell: (v) => v
      ? <span style={{ fontSize: 9, color: '#854d0e', background: '#fef9c3', borderRadius: 3, padding: '1px 4px' }}>{String(v)}</span>
      : '',
  },
  { key: 'so_luong', label: 'S\u1ed1 l\u01b0\u1ee3ng', width: 64, align: 'right',
    renderCell: (v) => formatSoThapPhan(Number(v), 2) },
  { key: 'don_gia', label: '\u0110\u01a1n gi\u00e1', width: 94, align: 'right',
    renderCell: (v) => formatNumberDisplay(Number(v), 0) },
  { key: 'thanh_tien', label: 'Th\u00e0nh ti\u1ec1n', width: 94, align: 'right',
    renderCell: (v) => formatNumberDisplay(Math.round(Number(v)), 0) },
  { key: 'pt_thue_gtgt', label: '% GTGT', width: 60, align: 'right',
    renderCell: (v) => v != null ? formatSoThapPhan(Number(v), 0) : '' },
  { key: 'tien_thue_gtgt', label: 'Ti\u1ec1n GTGT', width: 94, align: 'right',
    renderCell: (v) => v != null ? formatNumberDisplay(Math.round(Number(v)), 0) : '' },
  { key: 'ghi_chu', label: 'Ghi ch\u00fa', width: 140 },
]

// [9] Phan trang 50 dong/trang
const PAGE_SIZE = 50

function Pagination({ page, total, onChange }: { page: number; total: number; onChange: (p: number) => void }) {
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
}

// Danh sach Bao gia
export function BaoGia() {
  const toast = useToastOptional()
  const [filter, setFilter] = useState<BanHangFilter>(getDefaultBaoGiaFilter)
  const [danhSach, setDanhSach] = useState<BaoGiaRecord[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [chiTiet, setChiTiet] = useState<BaoGiaChiTiet[]>([])
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [formMode, setFormMode] = useState<'add' | 'edit' | 'view'>('add')
  const [formRecord, setFormRecord] = useState<BaoGiaRecord | null>(null)
  const [xoaModalRow, setXoaModalRow] = useState<BaoGiaRecord | null>(null)
  const [contextMenu, setContextMenu] = useState<{
    open: boolean; x: number; y: number; row: BaoGiaRecord | null
  }>({ open: false, x: 0, y: 0, row: null })
  const [formKey, setFormKey] = useState(0)
  const [dropdownXuat, setDropdownXuat] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // [9] Phan trang
  const [page, setPage] = useState(1)

  const loadData = useCallback(() => {
    setDanhSach(baoGiaGetAll(filter))
  }, [filter])

  useEffect(() => { loadData() }, [loadData])
  useEffect(() => {
    if (selectedId) setChiTiet(baoGiaGetChiTiet(selectedId))
    else setChiTiet([])
  }, [selectedId])

  const filtered = search.trim()
    ? danhSach.filter((r) =>
        matchSearchKeyword(`${r.so_bao_gia} ${r.khach_hang} ${r.dien_giai ?? ''} ${r.tinh_trang}`, search)
      )
    : danhSach

  useEffect(() => { setPage(1) }, [filter, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setDropdownXuat(false)
      setContextMenu((m) => m.open ? { ...m, open: false } : m)
    }
    window.addEventListener('click', h)
    return () => window.removeEventListener('click', h)
  }, [])

  const tongTien = filtered.reduce((s, r) => s + r.tong_thanh_toan, 0)
  const selectedRow = selectedId ? danhSach.find((r) => r.id === selectedId) ?? null : null

  const moFormThem = () => { setFormRecord(null); setFormMode('add'); setFormKey((k) => k + 1); setShowForm(true) }
  const moFormXem = (row: BaoGiaRecord) => { setFormRecord(row); setFormMode('view'); setFormKey((k) => k + 1); setShowForm(true) }
  const moFormSua = (row: BaoGiaRecord) => { setFormRecord(row); setFormMode('edit'); setFormKey((k) => k + 1); setShowForm(true) }

  const xacNhanXoa = (row: BaoGiaRecord) => {
    baoGiaDelete(row.id)
    loadData()
    if (selectedId === row.id) setSelectedId(null)
    toast?.showToast(`\u0110\u00e3 x\u00f3a b\u00e1o gi\u00e1 ${row.so_bao_gia}.`, 'info')
    setXoaModalRow(null)
  }

  // [4] Lap don hang tu bao gia - copy 100% du lieu
  const lapDonHang = () => {
    if (!selectedRow) return
    const ct = baoGiaGetChiTiet(selectedRow.id)
    const draft = {
      khach_hang: selectedRow.khach_hang,
      dia_chi: selectedRow.dia_chi_kh,
      ma_so_thue: selectedRow.ma_so_thue_kh,
      nguoi_lien_he: selectedRow.nguoi_lien_he,
      dien_giai: selectedRow.dien_giai ?? '',
      nv_ban_hang: selectedRow.nv_ban_hang,
      bao_gia_ref: selectedRow.so_bao_gia,
      bao_gia_id: selectedRow.id,
      tong_tien_hang: selectedRow.tong_tien_hang,
      tong_thue_gtgt: selectedRow.tong_thue_gtgt,
      tong_thanh_toan: selectedRow.tong_thanh_toan,
      chiTiet: ct.map((c) => ({
        ma_hang: c.ma_hang,
        ten_hang: c.ten_hang,
        dvt: c.dvt,
        cong_thuc_tinh_sl: c.cong_thuc_tinh_sl,
        tham_so_1: c.tham_so_1,
        tham_so_2: c.tham_so_2,
        so_luong: c.so_luong,
        don_gia: c.don_gia,
        thanh_tien: Math.round(c.thanh_tien),
        pt_thue_gtgt: c.pt_thue_gtgt,
        tien_thue_gtgt: c.tien_thue_gtgt != null ? Math.round(c.tien_thue_gtgt) : null,
        ghi_chu: c.ghi_chu,
      })),
    }
    try { localStorage.setItem('htql_don_hang_ban_from_baogia', JSON.stringify(draft)) } catch { /* ignore */ }
    toast?.showToast(
      `\u0110\u00e3 t\u1ea1o nh\u00e1p \u0111\u01a1n h\u00e0ng t\u1eeb ${selectedRow.so_bao_gia}. Chuy\u1ec3n sang tab \u0110\u01a1n h\u00e0ng b\u00e1n.`,
      'success'
    )
  }

  return (
    <div className={styles.root}>
      <div className={styles.toolbarWrap}>
        <button type="button" className={styles.toolbarBtn} onClick={moFormThem}>
          <Plus size={13} /><span>Th\u00eam</span>
        </button>
        <button type="button" className={styles.toolbarBtnDanger} disabled={!selectedId}
          onClick={() => selectedRow && setXoaModalRow(selectedRow)}>
          <Trash2 size={13} /><span>X\u00f3a</span>
        </button>

        {/* [4] Lap don hang */}
        <button type="button" className={styles.toolbarBtn} disabled={!selectedId} onClick={lapDonHang}
          title={selectedId ? 'L\u1eadp \u0111\u01a1n h\u00e0ng t\u1eeb b\u00e1o gi\u00e1 n\u00e0y' : 'Ch\u1ecdn m\u1ed9t b\u00e1o gi\u00e1 \u0111\u1ec3 l\u1eadp \u0111\u01a1n h\u00e0ng'}>
          <FileText size={13} /><span>L\u1eadp \u0111\u01a1n h\u00e0ng</span>
        </button>

        <div ref={dropdownRef} className={styles.dropdownWrap} style={{ marginLeft: 8 }}>
          <button type="button" className={styles.toolbarBtn} onClick={() => setDropdownXuat((v) => !v)}>
            <ChevronDown size={12} /><span>G\u1eedi</span>
          </button>
          {dropdownXuat && (
            <div className={styles.dropdownMenu}>
              <button type="button" className={styles.dropdownItem}
                onClick={() => { toast?.showToast('\u0110\u00e3 g\u1eedi email b\u00e1o gi\u00e1.', 'success'); setDropdownXuat(false) }}>
                <Mail size={13} /> G\u1eedi Email
              </button>
              <button type="button" className={styles.dropdownItem}
                onClick={() => { toast?.showToast('\u0110\u00e3 g\u1eedi Zalo b\u00e1o gi\u00e1.', 'success'); setDropdownXuat(false) }}>
                <MessageCircle size={13} /> G\u1eedi Zalo
              </button>
            </div>
          )}
        </div>

        <div className={styles.filterWrap} style={{ marginLeft: 8 }}>
          <span className={styles.filterLabel}>K\u1ef3</span>
          <select className={styles.filterInput} value={filter.ky}
            onChange={(e) => setFilter((f) => ({ ...f, ky: e.target.value as BanHangKyValue }))}>
            {KY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        <input type="text" className={styles.searchInput}
          placeholder="T\u00ecm ki\u1ebfm m\u00e3, t\u00ean KH, di\u1ec5n gi\u1ea3i..."
          value={search} onChange={(e) => setSearch(e.target.value)} />

        <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-muted)' }}>
          {filtered.length} b\u1ea3n ghi \u00b7 trang {page}/{totalPages}
        </span>
      </div>

      <div className={styles.contentArea}>
        <div className={styles.gridWrap} style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <DataGrid<BaoGiaRecord>
              columns={columns}
              data={paginated}
              keyField="id"
              stripedRows
              compact
              height="100%"
              selectedRowId={selectedId}
              onRowSelect={(r) => setSelectedId(r.id)}
              onRowDoubleClick={(r) => moFormXem(r)}
              onRowContextMenu={(row, e) => {
                e.preventDefault()
                setSelectedId(row.id)
                setContextMenu({ open: true, x: e.clientX, y: e.clientY, row })
              }}
              summary={[
                { label: 'T\u1ed5ng thanh to\u00e1n', value: formatNumberDisplay(tongTien, 0) },
                { label: 'S\u1ed1 d\u00f2ng', value: `= ${filtered.length}` },
              ]}
            />
          </div>
          <Pagination page={page} total={totalPages} onChange={setPage} />
        </div>

        <div className={styles.detailWrap}>
          <div className={styles.detailTabBar}>
            <button type="button" className={styles.detailTabActive}>Chi ti\u1ebft VTHH</button>
          </div>
          <div className={styles.detailTabPanel}>
            <DataGrid<BaoGiaChiTiet>
              columns={columnsChiTiet}
              data={chiTiet}
              keyField="id"
              stripedRows
              compact
              height="100%"
              summary={[
                { label: 'S\u1ed1 d\u00f2ng', value: `= ${chiTiet.length}` },
                { label: 'Th\u00e0nh ti\u1ec1n', value: formatNumberDisplay(chiTiet.reduce((s, c) => s + Math.round(c.thanh_tien), 0), 0) },
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
            <Plus size={13} /> S\u1eeda
          </button>
          <hr className={styles.contextMenuSep} />
          <button type="button" className={styles.contextMenuItem}
            onClick={() => { toast?.showToast('\u0110\u00e3 g\u1eedi email.', 'success'); setContextMenu((m) => ({ ...m, open: false })) }}>
            <Mail size={13} /> G\u1eedi Email
          </button>
          <button type="button" className={styles.contextMenuItem}
            onClick={() => { toast?.showToast('\u0110\u00e3 g\u1eedi Zalo.', 'success'); setContextMenu((m) => ({ ...m, open: false })) }}>
            <MessageCircle size={13} /> G\u1eedi Zalo
          </button>
          <hr className={styles.contextMenuSep} />
          <button type="button" className={styles.contextMenuItem} style={{ color: '#dc2626' }}
            onClick={() => { setXoaModalRow(contextMenu.row!); setContextMenu((m) => ({ ...m, open: false })) }}>
            <Trash2 size={13} /> X\u00f3a
          </button>
        </div>
      )}

      {/* Modal xoa */}
      <Modal open={xoaModalRow != null} onClose={() => setXoaModalRow(null)}
        title="X\u00e1c nh\u1eadn x\u00f3a" size="sm"
        footer={
          <>
            <button type="button" className={styles.modalBtn} onClick={() => setXoaModalRow(null)}>H\u1ee7y b\u1ecf</button>
            <button type="button" className={styles.modalBtnDanger}
              onClick={() => xoaModalRow && xacNhanXoa(xoaModalRow)}>\u0110\u1ed3ng \u00fd x\u00f3a</button>
          </>
        }>
        {xoaModalRow && (
          <p style={{ margin: 0, fontSize: 12, lineHeight: 1.6 }}>
            X\u00f3a b\u00e1o gi\u00e1 <strong>{xoaModalRow.so_bao_gia}</strong> \u2014 <strong>{xoaModalRow.khach_hang}</strong>?<br />
            <span style={{ color: '#dc2626' }}>Thao t\u00e1c n\u00e0y kh\u00f4ng th\u1ec3 ho\u00e0n t\u00e1c.</span>
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
