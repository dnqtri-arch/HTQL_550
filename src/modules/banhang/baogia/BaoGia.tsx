/**
 * Danh sách + Form Báo giá — tuân thủ o-nhap.mdc, nut.mdc, canh-le.mdc
 * Badge: Chờ duyệt (cam), Đã gửi khách (xanh dương), Đã chốt (xanh lá), Hủy bỏ (đỏ)
 * Fuzzy search: matchSearchKeyword từ stringUtils
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { Plus, Trash2, Eye, Mail, MessageCircle, ChevronDown, X } from 'lucide-react'
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
  getDefaultBaoGiaFilter,
  KY_OPTIONS,
  type BaoGiaRecord,
  type BaoGiaChiTiet,
  type BanHangKyValue,
} from './baoGiaApi'
import type { BaoGiaCreatePayload, BanHangFilter } from '../../../types/banHang'
import styles from '../BanHang.module.css'

// ─── Badge ───────────────────────────────────────────────────────────────

function BaoGiaBadge({ value }: { value: string }) {
  const cls =
    value === 'Đã chốt' ? styles.badgeDaChot
    : value === 'Chờ duyệt' ? styles.badgeChoDuyet
    : value === 'Hủy bỏ' ? styles.badgeDaHuy
    : value === 'Đã gửi khách' ? styles.badgeDangThucHien
    : styles.badgeDefault
  return <span className={cls}>{value}</span>
}

// ─── Chuyển ISO → dd/MM/yyyy ──────────────────────────────────────────────

function formatNgay(iso: string | null | undefined): string {
  if (!iso) return ''
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/)
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso
}

// ─── Form thêm / sửa Báo giá ────────────────────────────────────────────

interface BaoGiaFormProps {
  mode: 'add' | 'edit' | 'view'
  initialRecord?: BaoGiaRecord
  initialChiTiet?: BaoGiaChiTiet[]
  onClose: () => void
  onSaved: () => void
  onSavedAndAdd?: () => void
}

const TINH_TRANGS: BaoGiaRecord['tinh_trang'][] = ['Chờ duyệt', 'Đã gửi khách', 'Đã chốt', 'Hủy bỏ']
const TODAY_ISO = new Date().toISOString().slice(0, 10)

function BaoGiaForm({ mode, initialRecord, initialChiTiet, onClose, onSaved, onSavedAndAdd }: BaoGiaFormProps) {
  const toast = useToastOptional()
  const soRef = useRef<HTMLInputElement>(null)

  const [soBaoGia, setSoBaoGia] = useState(initialRecord?.so_bao_gia ?? '')
  const [ngayBaoGia, setNgayBaoGia] = useState(initialRecord?.ngay_bao_gia ?? TODAY_ISO)
  const [ngayHetHan, setNgayHetHan] = useState(initialRecord?.ngay_het_han ?? '')
  const [khachHang, setKhachHang] = useState(initialRecord?.khach_hang ?? '')
  const [nguoiLienHe, setNguoiLienHe] = useState(initialRecord?.nguoi_lien_he ?? '')
  const [dienGiai, setDienGiai] = useState(initialRecord?.dien_giai ?? '')
  const [tinhTrang, setTinhTrang] = useState<BaoGiaRecord['tinh_trang']>(initialRecord?.tinh_trang ?? 'Chờ duyệt')
  const [nvBanHang, setNvBanHang] = useState(initialRecord?.nv_ban_hang ?? '')
  const [ghiChu, setGhiChu] = useState(initialRecord?.ghi_chu ?? '')
  const [loi, setLoi] = useState('')
  const [chiTiet, setChiTiet] = useState<(Partial<BaoGiaChiTiet> & { _key: string })[]>(
    initialChiTiet?.map((c) => ({ ...c, _key: c.id })) ?? []
  )

  useEffect(() => {
    if (mode === 'add' && !initialRecord) {
      setSoBaoGia(baoGiaSoTiepTheo())
    }
    setTimeout(() => soRef.current?.focus(), 60)
  }, [])

  const tongTienHang = chiTiet.reduce((s, c) => s + (Number(c.thanh_tien) || 0), 0)
  const tongThueGtgt = chiTiet.reduce((s, c) => s + (Number(c.tien_thue_gtgt) || 0), 0)
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

  const capNhatDong = (key: string, field: string, val: string | number | null) => {
    setChiTiet((prev) =>
      prev.map((c) => {
        if (c._key !== key) return c
        const updated = { ...c, [field]: val }
        if (field === 'so_luong' || field === 'don_gia') {
          const sl = field === 'so_luong' ? Number(val) : Number(c.so_luong) || 0
          const dg = field === 'don_gia' ? Number(val) : Number(c.don_gia) || 0
          updated.thanh_tien = sl * dg
          if (c.pt_thue_gtgt != null) {
            updated.tien_thue_gtgt = Math.round((updated.thanh_tien * Number(c.pt_thue_gtgt)) / 100)
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
    if (!soBaoGia.trim()) { setLoi('Số báo giá không được để trống.'); soRef.current?.focus(); return false }
    if (!khachHang.trim()) { setLoi('Khách hàng không được để trống.'); return false }
    setLoi('')
    return true
  }

  const buildPayload = (): BaoGiaCreatePayload => ({
    so_bao_gia: soBaoGia.trim(),
    ngay_bao_gia: ngayBaoGia,
    ngay_het_han: ngayHetHan || null,
    khach_hang: khachHang.trim(),
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
      so_luong: Number(c.so_luong) || 0,
      don_gia: Number(c.don_gia) || 0,
      thanh_tien: Number(c.thanh_tien) || 0,
      pt_thue_gtgt: c.pt_thue_gtgt ?? null,
      tien_thue_gtgt: c.tien_thue_gtgt ?? null,
      ghi_chu: c.ghi_chu,
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
    toast?.showToast('Đã lưu báo giá. Tiếp tục thêm mới.', 'success')
    setSoBaoGia(baoGiaSoTiepTheo())
    setKhachHang('')
    setNguoiLienHe('')
    setDienGiai('')
    setTinhTrang('Chờ duyệt')
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
          {mode === 'add' ? 'Thêm Báo giá' : mode === 'edit' ? 'Sửa Báo giá' : 'Xem Báo giá'}
        </span>
        {loi && (
          <span style={{ fontSize: 11, color: '#dc2626', marginLeft: 12 }}>{loi}</span>
        )}
        <button type="button" className={styles.modalCloseBtn} onClick={onClose}><X size={14} /></button>
      </div>

      {/* Body */}
      <div className={styles.modalBody}>
        {/* Thông tin chung */}
        <div className={styles.formSectionTitle}>Thông tin chung</div>

        <div className={styles.formRow}>
          <span className={styles.formLabel}>Số báo giá</span>
          <div className={styles.formControl}>
            <input ref={soRef} className={styles.formInput} value={soBaoGia} onChange={(e) => setSoBaoGia(e.target.value)} readOnly={readOnly} />
          </div>
          <span className={styles.formLabel} style={{ minWidth: 80 }}>Trạng thái</span>
          <div className={styles.formControl}>
            <select className={styles.formSelect} value={tinhTrang} onChange={(e) => setTinhTrang(e.target.value as BaoGiaRecord['tinh_trang'])} disabled={readOnly}>
              {TINH_TRANGS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        <div className={styles.formRow}>
          <span className={styles.formLabel}>Ngày báo giá</span>
          <div className={styles.formControl}>
            <input type="date" className={styles.formInput} style={{ textAlign: 'right' }} value={ngayBaoGia} onChange={(e) => setNgayBaoGia(e.target.value)} readOnly={readOnly} />
          </div>
          <span className={styles.formLabel} style={{ minWidth: 80 }}>Ngày hết hạn</span>
          <div className={styles.formControl}>
            <input type="date" className={styles.formInput} style={{ textAlign: 'right' }} value={ngayHetHan} onChange={(e) => setNgayHetHan(e.target.value)} readOnly={readOnly} />
          </div>
        </div>

        <div className={styles.formRow}>
          <span className={styles.formLabel}>Khách hàng</span>
          <div className={styles.formControl} style={{ flex: 3 }}>
            <input className={styles.formInput} value={khachHang} onChange={(e) => setKhachHang(e.target.value)} readOnly={readOnly} placeholder="Tên khách hàng" />
          </div>
        </div>

        <div className={styles.formRow}>
          <span className={styles.formLabel}>Người liên hệ</span>
          <div className={styles.formControl}>
            <input className={styles.formInput} value={nguoiLienHe} onChange={(e) => setNguoiLienHe(e.target.value)} readOnly={readOnly} />
          </div>
          <span className={styles.formLabel} style={{ minWidth: 80 }}>NV bán hàng</span>
          <div className={styles.formControl}>
            <input className={styles.formInput} value={nvBanHang} onChange={(e) => setNvBanHang(e.target.value)} readOnly={readOnly} />
          </div>
        </div>

        <div className={styles.formRow}>
          <span className={styles.formLabel}>Diễn giải</span>
          <div className={styles.formControl} style={{ flex: 3 }}>
            <input className={styles.formInput} value={dienGiai} onChange={(e) => setDienGiai(e.target.value)} readOnly={readOnly} />
          </div>
        </div>

        {/* Chi tiết VTHH */}
        <div className={styles.formSectionTitle} style={{ marginTop: 14 }}>Chi tiết vật tư hàng hóa</div>

        <div className={styles.tableScrollWrap} style={{ maxHeight: 220 }}>
          <table className={styles.chiTietTable}>
            <colgroup>
              <col style={{ width: 36 }} />
              <col style={{ width: 88 }} />
              <col style={{ width: 180 }} />
              <col style={{ width: 60 }} />
              <col style={{ width: 72 }} />
              <col style={{ width: 100 }} />
              <col style={{ width: 100 }} />
              <col style={{ width: 72 }} />
              <col style={{ width: 100 }} />
              <col style={{ width: 120 }} />
              {!readOnly && <col style={{ width: 28 }} />}
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
                <th className={styles.thRight}>% GTGT</th>
                <th className={styles.thRight}>Tiền GTGT</th>
                <th>Ghi chú</th>
                {!readOnly && <th />}
              </tr>
            </thead>
            <tbody>
              {chiTiet.map((c, idx) => (
                <tr key={c._key}>
                  <td className={styles.tdCenter} style={{ fontSize: 10, color: 'var(--text-muted)' }}>{idx + 1}</td>
                  <td><input className={styles.chiTietInput} value={c.ma_hang ?? ''} onChange={(e) => capNhatDong(c._key, 'ma_hang', e.target.value)} readOnly={readOnly} /></td>
                  <td><input className={styles.chiTietInput} value={c.ten_hang ?? ''} onChange={(e) => capNhatDong(c._key, 'ten_hang', e.target.value)} readOnly={readOnly} /></td>
                  <td><input className={styles.chiTietInput} value={c.dvt ?? ''} onChange={(e) => capNhatDong(c._key, 'dvt', e.target.value)} readOnly={readOnly} /></td>
                  <td className={styles.tdRight}><input className={styles.chiTietInput} style={{ textAlign: 'right' }} value={c.so_luong ?? ''} onChange={(e) => capNhatDong(c._key, 'so_luong', e.target.value)} readOnly={readOnly} /></td>
                  <td className={styles.tdRight}><input className={styles.chiTietInput} style={{ textAlign: 'right' }} value={c.don_gia ?? ''} onChange={(e) => capNhatDong(c._key, 'don_gia', e.target.value)} readOnly={readOnly} /></td>
                  <td className={styles.tdRight} style={{ color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{formatNumberDisplay(Number(c.thanh_tien) || 0, 0)}</td>
                  <td className={styles.tdRight}><input className={styles.chiTietInput} style={{ textAlign: 'right' }} value={c.pt_thue_gtgt ?? ''} onChange={(e) => capNhatDong(c._key, 'pt_thue_gtgt', e.target.value === '' ? null : e.target.value)} readOnly={readOnly} /></td>
                  <td className={styles.tdRight} style={{ fontVariantNumeric: 'tabular-nums' }}>{c.tien_thue_gtgt != null ? formatNumberDisplay(Number(c.tien_thue_gtgt), 0) : ''}</td>
                  <td><input className={styles.chiTietInput} value={c.ghi_chu ?? ''} onChange={(e) => capNhatDong(c._key, 'ghi_chu', e.target.value)} readOnly={readOnly} /></td>
                  {!readOnly && (
                    <td className={styles.tdCenter}>
                      <button type="button" style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '1px 3px', color: 'var(--text-muted)' }} onClick={() => xoaDong(c._key)}>
                        <X size={11} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {chiTiet.length === 0 && (
                <tr>
                  <td colSpan={readOnly ? 10 : 11} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '12px 0', fontSize: 11 }}>
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

        {/* Tổng hợp */}
        <div style={{ display: 'flex', gap: 24, justifyContent: 'flex-end', marginTop: 10, fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>
          <span>Tiền hàng: <strong>{formatNumberDisplay(tongTienHang, 0)}</strong></span>
          <span>Thuế GTGT: <strong>{formatNumberDisplay(tongThueGtgt, 0)}</strong></span>
          <span style={{ color: 'var(--accent)', fontWeight: 700 }}>Tổng thanh toán: <strong>{formatNumberDisplay(tongThanhToan, 0)}</strong></span>
        </div>

        {/* Ghi chú */}
        <div className={styles.formRow} style={{ marginTop: 10 }}>
          <span className={styles.formLabel}>Ghi chú</span>
          <div className={styles.formControl}>
            <textarea className={styles.formTextarea} value={ghiChu} onChange={(e) => setGhiChu(e.target.value)} readOnly={readOnly} rows={2} />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className={styles.modalFooter}>
        {!readOnly ? (
          <>
            <button type="button" style={formFooterButtonCancel} onClick={onClose}>Hủy bỏ</button>
            <button type="button" style={formFooterButtonSave} onClick={handleLuu}>Lưu</button>
            {mode === 'add' && (
              <button type="button" style={formFooterButtonSaveAndAdd} onClick={handleLuuVaTiepTuc}>Lưu và tiếp tục</button>
            )}
          </>
        ) : (
          <button type="button" style={formFooterButtonCancel} onClick={onClose}>Đóng</button>
        )}
      </div>
    </div>
  )
}

// ─── Danh sách Báo giá ───────────────────────────────────────────────────

const columns: DataGridColumn<BaoGiaRecord>[] = [
  { key: 'so_bao_gia', label: 'Số BG', width: 100 },
  { key: 'ngay_bao_gia', label: 'Ngày BG', width: 76, align: 'right', renderCell: (v) => formatNgay(v as string) },
  { key: 'ngay_het_han', label: 'Hết hạn', width: 76, align: 'right', renderCell: (v) => formatNgay(v as string | null) },
  { key: 'khach_hang', label: 'Khách hàng', width: '28%' },
  { key: 'dien_giai', label: 'Diễn giải', width: '20%' },
  {
    key: 'tong_thanh_toan',
    label: 'Tổng tiền',
    width: 110,
    align: 'right',
    renderCell: (v) => formatNumberDisplay(Number(v), 0),
  },
  {
    key: 'tinh_trang',
    label: 'Trạng thái',
    width: 110,
    renderCell: (v) => <BaoGiaBadge value={String(v)} />,
  },
  { key: 'nv_ban_hang', label: 'NV bán hàng', width: '10%' },
]

const columnsChiTiet: DataGridColumn<BaoGiaChiTiet>[] = [
  { key: 'stt', label: 'STT', width: 36, align: 'center', renderCell: (_v, _r, idx) => String((idx ?? 0) + 1) },
  { key: 'ma_hang', label: 'Mã VTHH', width: 88 },
  { key: 'ten_hang', label: 'Tên VTHH', width: 220 },
  { key: 'dvt', label: 'ĐVT', width: 60 },
  { key: 'so_luong', label: 'Số lượng', width: 68, align: 'right', renderCell: (v) => formatSoThapPhan(Number(v), 2) },
  { key: 'don_gia', label: 'Đơn giá', width: 100, align: 'right', renderCell: (v) => formatNumberDisplay(Number(v), 0) },
  { key: 'thanh_tien', label: 'Thành tiền', width: 100, align: 'right', renderCell: (v) => formatNumberDisplay(Number(v), 0) },
  { key: 'pt_thue_gtgt', label: '% GTGT', width: 72, align: 'right', renderCell: (v) => v != null ? formatSoThapPhan(Number(v), 0) : '' },
  { key: 'tien_thue_gtgt', label: 'Tiền GTGT', width: 100, align: 'right', renderCell: (v) => v != null ? formatNumberDisplay(Number(v), 0) : '' },
  { key: 'ghi_chu', label: 'Ghi chú', width: 160 },
]

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
  const [contextMenu, setContextMenu] = useState<{ open: boolean; x: number; y: number; row: BaoGiaRecord | null }>({ open: false, x: 0, y: 0, row: null })
  const [formKey, setFormKey] = useState(0)
  const [dropdownXuat, setDropdownXuat] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const loadData = useCallback(() => {
    setDanhSach(baoGiaGetAll(filter))
  }, [filter])

  useEffect(() => { loadData() }, [loadData])
  useEffect(() => {
    if (selectedId) setChiTiet(baoGiaGetChiTiet(selectedId))
    else setChiTiet([])
  }, [selectedId])

  // Fuzzy search: matchSearchKeyword (stringUtils.mdc)
  const filtered = search.trim()
    ? danhSach.filter((r) =>
        matchSearchKeyword(`${r.so_bao_gia} ${r.khach_hang} ${r.dien_giai ?? ''} ${r.tinh_trang}`, search)
      )
    : danhSach

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

  const moFormThem = () => {
    setFormRecord(null)
    setFormMode('add')
    setFormKey((k) => k + 1)
    setShowForm(true)
  }

  const moFormXem = (row: BaoGiaRecord) => {
    setFormRecord(row)
    setFormMode('view')
    setFormKey((k) => k + 1)
    setShowForm(true)
  }

  const moFormSua = (row: BaoGiaRecord) => {
    setFormRecord(row)
    setFormMode('edit')
    setFormKey((k) => k + 1)
    setShowForm(true)
  }

  const xacNhanXoa = (row: BaoGiaRecord) => {
    baoGiaDelete(row.id)
    loadData()
    if (selectedId === row.id) setSelectedId(null)
    toast?.showToast(`Đã xóa báo giá ${row.so_bao_gia}.`, 'info')
    setXoaModalRow(null)
  }

  return (
    <div className={styles.root}>
      {/* Toolbar */}
      <div className={styles.toolbarWrap}>
        <button type="button" className={styles.toolbarBtn} onClick={moFormThem}>
          <Plus size={13} /><span>Thêm</span>
        </button>
        <button
          type="button"
          className={styles.toolbarBtnDanger}
          disabled={!selectedId}
          onClick={() => selectedRow && setXoaModalRow(selectedRow)}
          title={selectedId ? 'Xóa báo giá đang chọn' : 'Chọn một dòng để xóa'}
        >
          <Trash2 size={13} /><span>Xóa</span>
        </button>

        <div ref={dropdownRef} className={styles.dropdownWrap} style={{ marginLeft: 8 }}>
          <button type="button" className={styles.toolbarBtn} onClick={() => setDropdownXuat((v) => !v)}>
            <ChevronDown size={12} /><span>Gửi</span>
          </button>
          {dropdownXuat && (
            <div className={styles.dropdownMenu}>
              <button type="button" className={styles.dropdownItem} onClick={() => { toast?.showToast('Đã gửi email báo giá.', 'success'); setDropdownXuat(false) }}>
                <Mail size={13} /> Gửi Email
              </button>
              <button type="button" className={styles.dropdownItem} onClick={() => { toast?.showToast('Đã gửi Zalo báo giá.', 'success'); setDropdownXuat(false) }}>
                <MessageCircle size={13} /> Gửi Zalo
              </button>
            </div>
          )}
        </div>

        <div className={styles.filterWrap} style={{ marginLeft: 8 }}>
          <span className={styles.filterLabel}>Kỳ</span>
          <select className={styles.filterInput} value={filter.ky} onChange={(e) => setFilter((f) => ({ ...f, ky: e.target.value as BanHangKyValue }))}>
            {KY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        <input
          type="text"
          className={styles.searchInput}
          placeholder="Tìm kiếm mã, tên KH, diễn giải..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Grid */}
      <div className={styles.contentArea}>
        <div className={styles.gridWrap}>
          <DataGrid<BaoGiaRecord>
            columns={columns}
            data={filtered}
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
              { label: 'Tổng thanh toán', value: formatNumberDisplay(tongTien, 0) },
              { label: 'Số dòng', value: `= ${filtered.length}` },
            ]}
          />
        </div>

        {/* Chi tiết dưới */}
        <div className={styles.detailWrap}>
          <div className={styles.detailTabBar}>
            <button type="button" className={styles.detailTabActive}>Chi tiết VTHH</button>
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
                { label: 'Số dòng', value: `= ${chiTiet.length}` },
                { label: 'Thành tiền', value: formatNumberDisplay(chiTiet.reduce((s, c) => s + c.thanh_tien, 0), 0) },
              ]}
            />
          </div>
        </div>
      </div>

      {/* Context menu */}
      {contextMenu.open && contextMenu.row && (
        <div
          className={styles.contextMenu}
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button type="button" className={styles.contextMenuItem} onClick={() => { moFormXem(contextMenu.row!); setContextMenu((m) => ({ ...m, open: false })) }}>
            <Eye size={13} /> Xem
          </button>
          <button type="button" className={styles.contextMenuItem} onClick={() => { moFormSua(contextMenu.row!); setContextMenu((m) => ({ ...m, open: false })) }}>
            <Plus size={13} /> Sửa
          </button>
          <hr className={styles.contextMenuSep} />
          <button type="button" className={styles.contextMenuItem} onClick={() => { toast?.showToast('Đã gửi email.', 'success'); setContextMenu((m) => ({ ...m, open: false })) }}>
            <Mail size={13} /> Gửi Email
          </button>
          <button type="button" className={styles.contextMenuItem} onClick={() => { toast?.showToast('Đã gửi Zalo.', 'success'); setContextMenu((m) => ({ ...m, open: false })) }}>
            <MessageCircle size={13} /> Gửi Zalo
          </button>
          <hr className={styles.contextMenuSep} />
          <button type="button" className={styles.contextMenuItem} style={{ color: '#dc2626' }} onClick={() => { setXoaModalRow(contextMenu.row!); setContextMenu((m) => ({ ...m, open: false })) }}>
            <Trash2 size={13} /> Xóa
          </button>
        </div>
      )}

      {/* Modal xóa */}
      <Modal open={xoaModalRow != null} onClose={() => setXoaModalRow(null)} title="Xác nhận xóa" size="sm"
        footer={
          <>
            <button type="button" className={styles.modalBtn} onClick={() => setXoaModalRow(null)}>Hủy bỏ</button>
            <button type="button" className={styles.modalBtnDanger} onClick={() => xoaModalRow && xacNhanXoa(xoaModalRow)}>Đồng ý xóa</button>
          </>
        }
      >
        {xoaModalRow && (
          <p style={{ margin: 0, fontSize: 12, lineHeight: 1.6, color: 'var(--text-primary)' }}>
            Xóa báo giá <strong>{xoaModalRow.so_bao_gia}</strong> — <strong>{xoaModalRow.khach_hang}</strong>?<br />
            <span style={{ color: '#dc2626' }}>Thao tác này không thể hoàn tác.</span>
          </p>
        )}
      </Modal>

      {/* Modal form */}
      {showForm && (
        <div className={styles.modalOverlay} onClick={() => setShowForm(false)}>
          <div className={styles.modalBoxLarge} style={{ height: '88vh' }} onClick={(e) => e.stopPropagation()}>
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
