/**
 * Hợp đồng bán (Nguyên tắc) — danh sách + form.
 * Fields: so_hop_dong, han_muc_gia_tri, ngay_hieu_luc, ngay_het_han
 * NutGui: Zalo/Email; Badge: Đang hiệu lực (xanh lá), Hết hạn (đỏ), Chưa hiệu lực (xám), Hủy bỏ (đỏ)
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { Plus, Trash2, Eye, Mail, MessageCircle, X } from 'lucide-react'
import { DataGrid, type DataGridColumn } from '../../../../components/common/dataGrid'
import { Modal } from '../../../../components/common/modal'
import { useToastOptional } from '../../../../context/toastContext'
import { matchSearchKeyword } from '../../../../utils/stringUtils'
import { formatNumberDisplay, formatSoThapPhan } from '../../../../utils/numberFormat'
import {
  formFooterButtonCancel,
  formFooterButtonSave,
  formFooterButtonSaveAndAdd,
} from '../../../../constants/formFooterButtons'
import {
  hopDongBanGetAll,
  hopDongBanGetChiTiet,
  hopDongBanDelete,
  hopDongBanPost,
  hopDongBanPut,
  hopDongBanSoTiepTheo,
  getDefaultHopDongBanFilter,
  KY_OPTIONS,
  type HopDongBanRecord,
  type HopDongBanChiTiet,
  type BanHangKyValue,
} from './hopDongBanApi'
import type { HopDongBanCreatePayload, BanHangFilter } from '../../../../types/banHang'
import styles from '../BanHang.module.css'

function Badge({ value }: { value: string }) {
  const cls =
    value === 'Đang hiệu lực' ? styles.badgeDangHieuLuc
    : value === 'Hết hạn' ? styles.badgeHetHan
    : value === 'Hủy bỏ' ? styles.badgeDaHuy
    : value === 'Chưa hiệu lực' ? styles.badgeChuaHieuLuc
    : styles.badgeDefault
  return <span className={cls}>{value}</span>
}

function formatNgay(iso: string | null | undefined): string {
  if (!iso) return ''
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/)
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso
}

const TINH_TRANGS: HopDongBanRecord['tinh_trang'][] = ['Chưa hiệu lực', 'Đang hiệu lực', 'Hết hạn', 'Hủy bỏ']
const TODAY_ISO = new Date().toISOString().slice(0, 10)

// ─── Form ────────────────────────────────────────────────────────────────

interface HopDongBanFormProps {
  mode: 'add' | 'edit' | 'view'
  initialRecord?: HopDongBanRecord
  initialChiTiet?: HopDongBanChiTiet[]
  onClose: () => void
  onSaved: () => void
  onSavedAndAdd?: () => void
}

function HopDongBanForm({ mode, initialRecord, initialChiTiet, onClose, onSaved, onSavedAndAdd }: HopDongBanFormProps) {
  const toast = useToastOptional()
  const soRef = useRef<HTMLInputElement>(null)

  const [soHopDong, setSoHopDong] = useState(initialRecord?.so_hop_dong ?? '')
  const [ngayKy, setNgayKy] = useState(initialRecord?.ngay_ky ?? TODAY_ISO)
  const [ngayHieuLuc, setNgayHieuLuc] = useState(initialRecord?.ngay_hieu_luc ?? TODAY_ISO)
  const [ngayHetHan, setNgayHetHan] = useState(initialRecord?.ngay_het_han ?? '')
  const [khachHang, setKhachHang] = useState(initialRecord?.khach_hang ?? '')
  const [hanMucGiaTri, setHanMucGiaTri] = useState(String(initialRecord?.han_muc_gia_tri ?? ''))
  const [giaTriDaSuDung, setGiaTriDaSuDung] = useState(String(initialRecord?.gia_tri_da_su_dung ?? '0'))
  const [dienGiai, setDienGiai] = useState(initialRecord?.dien_giai ?? '')
  const [tinhTrang, setTinhTrang] = useState<HopDongBanRecord['tinh_trang']>(initialRecord?.tinh_trang ?? 'Chưa hiệu lực')
  const [nvBanHang, setNvBanHang] = useState(initialRecord?.nv_ban_hang ?? '')
  const [ghiChu, setGhiChu] = useState(initialRecord?.ghi_chu ?? '')
  const [loi, setLoi] = useState('')
  const [chiTiet, setChiTiet] = useState<(Partial<HopDongBanChiTiet> & { _key: string })[]>(
    initialChiTiet?.map((c) => ({ ...c, _key: c.id })) ?? []
  )

  useEffect(() => {
    if (mode === 'add' && !initialRecord) setSoHopDong(hopDongBanSoTiepTheo())
    setTimeout(() => soRef.current?.focus(), 60)
  }, [])

  const tongTienHang = chiTiet.reduce((s, c) => s + (Number(c.thanh_tien) || 0), 0)
  const tongThueGtgt = chiTiet.reduce((s, c) => s + (Number(c.tien_thue_gtgt) || 0), 0)

  const capNhatDong = (key: string, field: string, val: string | number | null) => {
    setChiTiet((prev) => prev.map((c) => {
      if (c._key !== key) return c
      const updated = { ...c, [field]: val }
      if (field === 'so_luong' || field === 'don_gia') {
        const sl = field === 'so_luong' ? Number(val) : Number(c.so_luong) || 0
        const dg = field === 'don_gia' ? Number(val) : Number(c.don_gia) || 0
        updated.thanh_tien = sl * dg
        if (c.pt_thue_gtgt != null) updated.tien_thue_gtgt = Math.round(updated.thanh_tien * Number(c.pt_thue_gtgt) / 100)
      }
      if (field === 'pt_thue_gtgt') {
        const pct = val == null || val === '' ? null : Number(val)
        updated.pt_thue_gtgt = pct
        updated.tien_thue_gtgt = pct == null ? null : Math.round((Number(c.thanh_tien) || 0) * pct / 100)
      }
      return updated
    }))
  }

  const validate = () => {
    if (!soHopDong.trim()) { setLoi('Số hợp đồng không được để trống.'); soRef.current?.focus(); return false }
    if (!khachHang.trim()) { setLoi('Khách hàng không được để trống.'); return false }
    if (!ngayHieuLuc) { setLoi('Ngày hiệu lực không được để trống.'); return false }
    if (!ngayHetHan) { setLoi('Ngày hết hạn không được để trống.'); return false }
    setLoi(''); return true
  }

  const buildPayload = (): HopDongBanCreatePayload => ({
    so_hop_dong: soHopDong.trim(),
    ngay_ky: ngayKy,
    ngay_hieu_luc: ngayHieuLuc,
    ngay_het_han: ngayHetHan,
    khach_hang: khachHang.trim(),
    han_muc_gia_tri: Number(hanMucGiaTri.replace(/[.,\s]/g, '')) || 0,
    gia_tri_da_su_dung: Number(giaTriDaSuDung.replace(/[.,\s]/g, '')) || 0,
    dien_giai: dienGiai.trim() || undefined,
    tinh_trang: tinhTrang,
    ghi_chu: ghiChu.trim() || undefined,
    nv_ban_hang: nvBanHang.trim() || undefined,
    chi_tiet: chiTiet.map((c, i) => ({
      stt: i + 1, ma_hang: c.ma_hang ?? '', ten_hang: c.ten_hang ?? '', dvt: c.dvt ?? '',
      so_luong: Number(c.so_luong) || 0, don_gia: Number(c.don_gia) || 0,
      thanh_tien: Number(c.thanh_tien) || 0,
      pt_thue_gtgt: c.pt_thue_gtgt ?? null, tien_thue_gtgt: c.tien_thue_gtgt ?? null, ghi_chu: c.ghi_chu,
    })),
  })

  const handleLuu = () => {
    if (!validate()) return
    if (mode === 'edit' && initialRecord) {
      hopDongBanPut(initialRecord.id, buildPayload())
      toast?.showToast('Đã lưu hợp đồng.', 'success')
    } else {
      hopDongBanPost(buildPayload())
      toast?.showToast('Đã thêm hợp đồng.', 'success')
    }
    onSaved()
  }

  const handleLuuVaTiepTuc = () => {
    if (!validate()) return
    hopDongBanPost(buildPayload())
    toast?.showToast('Đã lưu. Tiếp tục thêm mới.', 'success')
    setSoHopDong(hopDongBanSoTiepTheo()); setKhachHang(''); setHanMucGiaTri('')
    setGiaTriDaSuDung('0'); setDienGiai(''); setTinhTrang('Chưa hiệu lực')
    setNvBanHang(''); setGhiChu(''); setChiTiet([]); setLoi('')
    onSavedAndAdd?.()
  }

  const readOnly = mode === 'view'
  const conLaiHanMuc = (Number(hanMucGiaTri.replace(/[.,\s]/g, '')) || 0) - (Number(giaTriDaSuDung.replace(/[.,\s]/g, '')) || 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className={styles.modalHeader}>
        <span className={styles.modalTitle}>
          {mode === 'add' ? 'Thêm Hợp đồng' : mode === 'edit' ? 'Sửa Hợp đồng' : 'Xem Hợp đồng'}
        </span>
        {loi && <span style={{ fontSize: 11, color: '#dc2626', marginLeft: 12 }}>{loi}</span>}
        <button type="button" className={styles.modalCloseBtn} onClick={onClose}><X size={14} /></button>
      </div>

      <div className={styles.modalBody}>
        <div className={styles.formSectionTitle}>Thông tin hợp đồng</div>

        <div className={styles.formRow}>
          <span className={styles.formLabel}>Số hợp đồng</span>
          <div className={styles.formControl}>
            <input ref={soRef} className={styles.formInput} value={soHopDong} onChange={(e) => setSoHopDong(e.target.value)} readOnly={readOnly} />
          </div>
          <span className={styles.formLabel} style={{ minWidth: 80 }}>Trạng thái</span>
          <div className={styles.formControl}>
            <select className={styles.formSelect} value={tinhTrang} onChange={(e) => setTinhTrang(e.target.value as HopDongBanRecord['tinh_trang'])} disabled={readOnly}>
              {TINH_TRANGS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        <div className={styles.formRow}>
          <span className={styles.formLabel}>Ngày ký</span>
          <div className={styles.formControl}>
            <input type="date" className={styles.formInput} style={{ textAlign: 'right' }} value={ngayKy} onChange={(e) => setNgayKy(e.target.value)} readOnly={readOnly} />
          </div>
          <span className={styles.formLabel} style={{ minWidth: 80 }}>Ngày hiệu lực</span>
          <div className={styles.formControl}>
            <input type="date" className={styles.formInput} style={{ textAlign: 'right' }} value={ngayHieuLuc} onChange={(e) => setNgayHieuLuc(e.target.value)} readOnly={readOnly} />
          </div>
        </div>

        <div className={styles.formRow}>
          <span className={styles.formLabel}>Ngày hết hạn</span>
          <div className={styles.formControl}>
            <input type="date" className={styles.formInput} style={{ textAlign: 'right' }} value={ngayHetHan} onChange={(e) => setNgayHetHan(e.target.value)} readOnly={readOnly} />
          </div>
          <span className={styles.formLabel} style={{ minWidth: 80 }}>NV bán hàng</span>
          <div className={styles.formControl}>
            <input className={styles.formInput} value={nvBanHang} onChange={(e) => setNvBanHang(e.target.value)} readOnly={readOnly} />
          </div>
        </div>

        <div className={styles.formRow}>
          <span className={styles.formLabel}>Khách hàng</span>
          <div className={styles.formControl} style={{ flex: 3 }}>
            <input className={styles.formInput} value={khachHang} onChange={(e) => setKhachHang(e.target.value)} readOnly={readOnly} placeholder="Tên khách hàng" />
          </div>
        </div>

        <div className={styles.formRow}>
          <span className={styles.formLabel}>Hạn mức giá trị</span>
          <div className={styles.formControl}>
            <input className={styles.formInput} style={{ textAlign: 'right' }} value={hanMucGiaTri} onChange={(e) => setHanMucGiaTri(e.target.value)} readOnly={readOnly} placeholder="0" />
          </div>
          <span className={styles.formLabel} style={{ minWidth: 80 }}>Đã sử dụng</span>
          <div className={styles.formControl}>
            <input className={styles.formInput} style={{ textAlign: 'right' }} value={giaTriDaSuDung} onChange={(e) => setGiaTriDaSuDung(e.target.value)} readOnly={readOnly} />
          </div>
        </div>

        {/* Còn lại hạn mức */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: 11, marginBottom: 8, gap: 16 }}>
          <span>Còn lại hạn mức: <strong style={{ color: conLaiHanMuc >= 0 ? '#15803d' : '#dc2626', fontVariantNumeric: 'tabular-nums' }}>{formatNumberDisplay(conLaiHanMuc, 0)}</strong></span>
        </div>

        <div className={styles.formRow}>
          <span className={styles.formLabel}>Diễn giải</span>
          <div className={styles.formControl} style={{ flex: 3 }}>
            <input className={styles.formInput} value={dienGiai} onChange={(e) => setDienGiai(e.target.value)} readOnly={readOnly} />
          </div>
        </div>

        <div className={styles.formSectionTitle} style={{ marginTop: 14 }}>Chi tiết hàng hóa</div>

        <div className={styles.tableScrollWrap} style={{ maxHeight: 200 }}>
          <table className={styles.chiTietTable}>
            <colgroup>
              <col style={{ width: 36 }} /><col style={{ width: 88 }} /><col style={{ width: 180 }} />
              <col style={{ width: 60 }} /><col style={{ width: 72 }} /><col style={{ width: 100 }} />
              <col style={{ width: 100 }} /><col style={{ width: 72 }} /><col style={{ width: 100 }} />
              <col style={{ width: 120 }} />{!readOnly && <col style={{ width: 28 }} />}
            </colgroup>
            <thead>
              <tr>
                <th className={styles.tdCenter}>STT</th>
                <th>Mã VTHH</th><th>Tên VTHH</th><th>ĐVT</th>
                <th className={styles.thRight}>Số lượng</th><th className={styles.thRight}>Đơn giá</th>
                <th className={styles.thRight}>Thành tiền</th><th className={styles.thRight}>% GTGT</th>
                <th className={styles.thRight}>Tiền GTGT</th><th>Ghi chú</th>
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
                  <td><input className={styles.chiTietInput} style={{ textAlign: 'right' }} value={c.so_luong ?? ''} onChange={(e) => capNhatDong(c._key, 'so_luong', e.target.value)} readOnly={readOnly} /></td>
                  <td><input className={styles.chiTietInput} style={{ textAlign: 'right' }} value={c.don_gia ?? ''} onChange={(e) => capNhatDong(c._key, 'don_gia', e.target.value)} readOnly={readOnly} /></td>
                  <td className={styles.tdRight} style={{ fontVariantNumeric: 'tabular-nums' }}>{formatNumberDisplay(Number(c.thanh_tien) || 0, 0)}</td>
                  <td><input className={styles.chiTietInput} style={{ textAlign: 'right' }} value={c.pt_thue_gtgt ?? ''} onChange={(e) => capNhatDong(c._key, 'pt_thue_gtgt', e.target.value === '' ? null : e.target.value)} readOnly={readOnly} /></td>
                  <td className={styles.tdRight} style={{ fontVariantNumeric: 'tabular-nums' }}>{c.tien_thue_gtgt != null ? formatNumberDisplay(Number(c.tien_thue_gtgt), 0) : ''}</td>
                  <td><input className={styles.chiTietInput} value={c.ghi_chu ?? ''} onChange={(e) => capNhatDong(c._key, 'ghi_chu', e.target.value)} readOnly={readOnly} /></td>
                  {!readOnly && <td className={styles.tdCenter}><button type="button" style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '1px 3px', color: 'var(--text-muted)' }} onClick={() => setChiTiet((p) => p.filter((x) => x._key !== c._key))}><X size={11} /></button></td>}
                </tr>
              ))}
              {chiTiet.length === 0 && (
                <tr><td colSpan={readOnly ? 10 : 11} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '12px 0', fontSize: 11 }}>Chưa có dòng.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {!readOnly && (
          <div className={styles.chiTietAddRow}>
            <button type="button" className={styles.toolbarBtn} onClick={() => setChiTiet((p) => [...p, { _key: `new_${Date.now()}`, ma_hang: '', ten_hang: '', dvt: '', so_luong: 1, don_gia: 0, thanh_tien: 0, pt_thue_gtgt: null, tien_thue_gtgt: null, ghi_chu: '' }])}>
              <Plus size={12} /> Thêm dòng
            </button>
          </div>
        )}

        <div style={{ display: 'flex', gap: 24, justifyContent: 'flex-end', marginTop: 10, fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>
          <span>Tiền hàng: <strong>{formatNumberDisplay(tongTienHang, 0)}</strong></span>
          <span>Thuế GTGT: <strong>{formatNumberDisplay(tongThueGtgt, 0)}</strong></span>
        </div>

        <div className={styles.formRow} style={{ marginTop: 10 }}>
          <span className={styles.formLabel}>Ghi chú</span>
          <div className={styles.formControl}><textarea className={styles.formTextarea} value={ghiChu} onChange={(e) => setGhiChu(e.target.value)} readOnly={readOnly} rows={2} /></div>
        </div>
      </div>

      <div className={styles.modalFooter}>
        {!readOnly ? (
          <>
            <button type="button" style={formFooterButtonCancel} onClick={onClose}>Hủy bỏ</button>
            <button type="button" style={formFooterButtonSave} onClick={handleLuu}>Lưu</button>
            {mode === 'add' && <button type="button" style={formFooterButtonSaveAndAdd} onClick={handleLuuVaTiepTuc}>Lưu và tiếp tục</button>}
          </>
        ) : (
          <button type="button" style={formFooterButtonCancel} onClick={onClose}>Đóng</button>
        )}
      </div>
    </div>
  )
}

// ─── Danh sách ───────────────────────────────────────────────────────────

const columns: DataGridColumn<HopDongBanRecord>[] = [
  { key: 'so_hop_dong', label: 'Số HĐ', width: 100 },
  { key: 'ngay_ky', label: 'Ngày ký', width: 76, align: 'right', renderCell: (v) => formatNgay(v as string) },
  { key: 'ngay_hieu_luc', label: 'Hiệu lực', width: 76, align: 'right', renderCell: (v) => formatNgay(v as string) },
  { key: 'ngay_het_han', label: 'Hết hạn', width: 76, align: 'right', renderCell: (v) => formatNgay(v as string) },
  { key: 'khach_hang', label: 'Khách hàng', width: '24%' },
  { key: 'han_muc_gia_tri', label: 'Hạn mức', width: 110, align: 'right', renderCell: (v) => formatNumberDisplay(Number(v), 0) },
  { key: 'gia_tri_da_su_dung', label: 'Đã sử dụng', width: 110, align: 'right', renderCell: (v) => formatNumberDisplay(Number(v), 0) },
  { key: 'tinh_trang', label: 'Trạng thái', width: 110, renderCell: (v) => <Badge value={String(v)} /> },
  { key: 'nv_ban_hang', label: 'NV bán hàng', width: '10%' },
]

export function HopDongBan() {
  const toast = useToastOptional()
  const [filter, setFilter] = useState<BanHangFilter>(getDefaultHopDongBanFilter)
  const [danhSach, setDanhSach] = useState<HopDongBanRecord[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [chiTiet, setChiTiet] = useState<HopDongBanChiTiet[]>([])
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [formMode, setFormMode] = useState<'add' | 'edit' | 'view'>('add')
  const [formRecord, setFormRecord] = useState<HopDongBanRecord | null>(null)
  const [xoaModal, setXoaModal] = useState<HopDongBanRecord | null>(null)
  const [contextMenu, setContextMenu] = useState<{ open: boolean; x: number; y: number; row: HopDongBanRecord | null }>({ open: false, x: 0, y: 0, row: null })
  const [formKey, setFormKey] = useState(0)

  const loadData = useCallback(() => setDanhSach(hopDongBanGetAll(filter)), [filter])
  useEffect(() => { loadData() }, [loadData])
  useEffect(() => {
    if (selectedId) setChiTiet(hopDongBanGetChiTiet(selectedId))
    else setChiTiet([])
  }, [selectedId])

  const filtered = search.trim()
    ? danhSach.filter((r) => matchSearchKeyword(`${r.so_hop_dong} ${r.khach_hang} ${r.dien_giai ?? ''} ${r.tinh_trang}`, search))
    : danhSach

  useEffect(() => {
    const h = () => setContextMenu((m) => m.open ? { ...m, open: false } : m)
    window.addEventListener('click', h)
    return () => window.removeEventListener('click', h)
  }, [])

  const selectedRow = selectedId ? danhSach.find((r) => r.id === selectedId) ?? null : null

  return (
    <div className={styles.root}>
      <div className={styles.toolbarWrap}>
        <button type="button" className={styles.toolbarBtn} onClick={() => { setFormRecord(null); setFormMode('add'); setFormKey((k) => k + 1); setShowForm(true) }}>
          <Plus size={13} /><span>Thêm</span>
        </button>
        <button type="button" className={styles.toolbarBtnDanger} disabled={!selectedId} onClick={() => selectedRow && setXoaModal(selectedRow)}>
          <Trash2 size={13} /><span>Xóa</span>
        </button>
        <button type="button" className={styles.toolbarBtn} disabled={!selectedId} onClick={() => toast?.showToast('Đã gửi Zalo hợp đồng.', 'success')}>
          <MessageCircle size={13} /><span>Gửi Zalo</span>
        </button>
        <button type="button" className={styles.toolbarBtn} disabled={!selectedId} onClick={() => toast?.showToast('Đã gửi Email hợp đồng.', 'success')}>
          <Mail size={13} /><span>Gửi Email</span>
        </button>

        <div className={styles.filterWrap} style={{ marginLeft: 8 }}>
          <span className={styles.filterLabel}>Kỳ</span>
          <select className={styles.filterInput} value={filter.ky} onChange={(e) => setFilter((f) => ({ ...f, ky: e.target.value as BanHangKyValue }))}>
            {KY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <input type="text" className={styles.searchInput} placeholder="Tìm số HĐ, khách hàng..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className={styles.contentArea}>
        <div className={styles.gridWrap}>
          <DataGrid<HopDongBanRecord>
            columns={columns} data={filtered} keyField="id" stripedRows compact height="100%"
            selectedRowId={selectedId}
            onRowSelect={(r) => setSelectedId(r.id)}
            onRowDoubleClick={(r) => { setFormRecord(r); setFormMode('view'); setFormKey((k) => k + 1); setShowForm(true) }}
            onRowContextMenu={(row, e) => { e.preventDefault(); setSelectedId(row.id); setContextMenu({ open: true, x: e.clientX, y: e.clientY, row }) }}
            summary={[{ label: 'Tổng hạn mức', value: formatNumberDisplay(filtered.reduce((s, r) => s + r.han_muc_gia_tri, 0), 0) }, { label: 'Số dòng', value: `= ${filtered.length}` }]}
          />
        </div>
        <div className={styles.detailWrap}>
          <div className={styles.detailTabBar}>
            <button type="button" className={styles.detailTabActive}>Chi tiết hàng hóa</button>
          </div>
          <div className={styles.detailTabPanel}>
            <DataGrid<HopDongBanChiTiet> columns={[
              { key: 'stt', label: 'STT', width: 36, align: 'center', renderCell: (_v, _r, idx) => String((idx ?? 0) + 1) },
              { key: 'ma_hang', label: 'Mã VTHH', width: 88 },
              { key: 'ten_hang', label: 'Tên VTHH', width: 220 },
              { key: 'dvt', label: 'ĐVT', width: 60 },
              { key: 'so_luong', label: 'Số lượng', width: 68, align: 'right', renderCell: (v) => formatSoThapPhan(Number(v), 2) },
              { key: 'don_gia', label: 'Đơn giá', width: 100, align: 'right', renderCell: (v) => formatNumberDisplay(Number(v), 0) },
              { key: 'thanh_tien', label: 'Thành tiền', width: 110, align: 'right', renderCell: (v) => formatNumberDisplay(Number(v), 0) },
            ]} data={chiTiet} keyField="id" stripedRows compact height="100%" />
          </div>
        </div>
      </div>

      {contextMenu.open && contextMenu.row && (
        <div className={styles.contextMenu} style={{ left: contextMenu.x, top: contextMenu.y }} onClick={(e) => e.stopPropagation()}>
          <button type="button" className={styles.contextMenuItem} onClick={() => { setFormRecord(contextMenu.row!); setFormMode('view'); setFormKey((k) => k + 1); setShowForm(true); setContextMenu((m) => ({ ...m, open: false })) }}><Eye size={13} /> Xem</button>
          <button type="button" className={styles.contextMenuItem} onClick={() => { setFormRecord(contextMenu.row!); setFormMode('edit'); setFormKey((k) => k + 1); setShowForm(true); setContextMenu((m) => ({ ...m, open: false })) }}><Plus size={13} /> Sửa</button>
          <hr className={styles.contextMenuSep} />
          <button type="button" className={styles.contextMenuItem} onClick={() => { toast?.showToast('Đã gửi Email.', 'success'); setContextMenu((m) => ({ ...m, open: false })) }}><Mail size={13} /> Gửi Email</button>
          <button type="button" className={styles.contextMenuItem} onClick={() => { toast?.showToast('Đã gửi Zalo.', 'success'); setContextMenu((m) => ({ ...m, open: false })) }}><MessageCircle size={13} /> Gửi Zalo</button>
          <hr className={styles.contextMenuSep} />
          <button type="button" className={styles.contextMenuItem} style={{ color: '#dc2626' }} onClick={() => { setXoaModal(contextMenu.row!); setContextMenu((m) => ({ ...m, open: false })) }}><Trash2 size={13} /> Xóa</button>
        </div>
      )}

      <Modal open={xoaModal != null} onClose={() => setXoaModal(null)} title="Xác nhận xóa" size="sm"
        footer={<><button type="button" className={styles.modalBtn} onClick={() => setXoaModal(null)}>Hủy bỏ</button>
          <button type="button" className={styles.modalBtnDanger} onClick={() => {
            if (!xoaModal) return
            hopDongBanDelete(xoaModal.id); loadData()
            if (selectedId === xoaModal.id) setSelectedId(null)
            toast?.showToast(`Đã xóa hợp đồng ${xoaModal.so_hop_dong}.`, 'info')
            setXoaModal(null)
          }}>Đồng ý xóa</button></>}
      >
        {xoaModal && <p style={{ margin: 0, fontSize: 12, lineHeight: 1.6, color: 'var(--text-primary)' }}>Xóa hợp đồng <strong>{xoaModal.so_hop_dong}</strong>?<br /><span style={{ color: '#dc2626' }}>Thao tác này không thể hoàn tác.</span></p>}
      </Modal>

      {showForm && (
        <div className={styles.modalOverlay} onClick={() => setShowForm(false)}>
          <div className={styles.modalBoxLarge} style={{ height: '88vh' }} onClick={(e) => e.stopPropagation()}>
            <HopDongBanForm
              key={formKey}
              mode={formMode}
              initialRecord={formRecord ?? undefined}
              initialChiTiet={formRecord ? hopDongBanGetChiTiet(formRecord.id) : undefined}
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
