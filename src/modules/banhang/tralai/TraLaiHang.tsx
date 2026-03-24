/**
 * Trả lại hàng bán — danh sách + form.
 * Tự động trừ doanh thu và hoàn tồn kho (flag hoan_kho).
 * Badge: Chờ xử lý (cam), Đã hoàn kho (xanh lá), Đã trả tiền (xanh), Hủy bỏ (đỏ).
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { Plus, Trash2, X } from 'lucide-react'
import { DataGrid, type DataGridColumn } from '../../../components/common/DataGrid'
import { Modal } from '../../../components/common/Modal'
import { useToastOptional } from '../../../context/ToastContext'
import { matchSearchKeyword } from '../../../utils/stringUtils'
import { formatNumberDisplay, formatSoThapPhan } from '../../../utils/numberFormat'
import { formFooterButtonCancel, formFooterButtonSave } from '../../../constants/formFooterButtons'
import { maFormatHeThong, getCurrentYear } from '../../../utils/maFormat'
import { hoaDonBanGetAll, getDefaultHoaDonBanFilter } from '../hoadon/hoaDonBanApi'
import type { TraLaiHangBanRecord, TraLaiHangBanChiTiet, HoaDonBanRecord } from '../../../types/banHang'
import styles from '../BanHang.module.css'

// ─── Local storage API ────────────────────────────────────────────────────

const STORAGE_KEY = 'htql_tra_lai_hang_ban'
const STORAGE_KEY_CT = 'htql_tra_lai_hang_ban_chi_tiet'

const MOCK_TL: TraLaiHangBanRecord[] = []
const MOCK_CT: TraLaiHangBanChiTiet[] = []

function loadFromStorage() {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null
    const rawCt = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY_CT) : null
    const d = raw ? JSON.parse(raw) : null
    const ct = rawCt ? JSON.parse(rawCt) : null
    if (Array.isArray(d) && Array.isArray(ct)) return { list: d as TraLaiHangBanRecord[], chiTiet: ct as TraLaiHangBanChiTiet[] }
  } catch { /* ignore */ }
  return { list: [...MOCK_TL], chiTiet: [...MOCK_CT] }
}

let _list: TraLaiHangBanRecord[] = []
let _chiTiet: TraLaiHangBanChiTiet[] = []

function initStore() {
  if (_list.length === 0 && _chiTiet.length === 0) {
    const loaded = loadFromStorage()
    _list = loaded.list; _chiTiet = loaded.chiTiet
  }
}
initStore()

function saveStore() {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(_list))
      localStorage.setItem(STORAGE_KEY_CT, JSON.stringify(_chiTiet))
    }
  } catch { /* ignore */ }
}

function soTiepTheo(): string {
  initStore()
  const year = getCurrentYear()
  const nums = _list.map((r) => {
    const m = r.so_phieu_tra.match(/^(\d{4})\/TLB\/(\d+)$/)
    return m && parseInt(m[1], 10) === year ? parseInt(m[2], 10) : 0
  }).filter(Boolean)
  return maFormatHeThong('TLB', (nums.length ? Math.max(...nums) : 0) + 1)
}

function tlGetAll(): TraLaiHangBanRecord[] { initStore(); return [..._list] }
function tlGetChiTiet(id: string): TraLaiHangBanChiTiet[] { initStore(); return _chiTiet.filter((c) => c.tra_lai_hang_ban_id === id) }
function tlDelete(id: string) { initStore(); _list = _list.filter((r) => r.id !== id); _chiTiet = _chiTiet.filter((c) => c.tra_lai_hang_ban_id !== id); saveStore() }

function tlPost(payload: Omit<TraLaiHangBanRecord, 'id'> & { chi_tiet: Omit<TraLaiHangBanChiTiet, 'id' | 'tra_lai_hang_ban_id'>[] }): TraLaiHangBanRecord {
  initStore()
  const id = `tlb_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`
  const { chi_tiet, ...rest } = payload
  const rec: TraLaiHangBanRecord = { id, ...rest }
  _list.unshift(rec)
  _chiTiet = [..._chiTiet, ...chi_tiet.map((c, i) => ({ ...c, id: `tlbct_${id}_${i}`, tra_lai_hang_ban_id: id, stt: i + 1 }))]
  saveStore(); return rec
}

// ─── Badge ───────────────────────────────────────────────────────────────

function Badge({ value }: { value: string }) {
  const cls =
    value === 'Đã hoàn kho' ? styles.badgeDaHoanKho
    : value === 'Chờ xử lý' ? styles.badgeChoXuLy
    : value === 'Đã trả tiền' ? styles.badgeDaThanhToan
    : value === 'Hủy bỏ' ? styles.badgeDaHuy
    : styles.badgeDefault
  return <span className={cls}>{value}</span>
}

function formatNgay(iso: string | null | undefined): string {
  if (!iso) return ''
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/)
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso
}

const TINH_TRANGS: TraLaiHangBanRecord['tinh_trang'][] = ['Chờ xử lý', 'Đã hoàn kho', 'Đã trả tiền', 'Hủy bỏ']
const TODAY_ISO = new Date().toISOString().slice(0, 10)

// ─── Chọn hóa đơn ────────────────────────────────────────────────────────

function ChonHoaDonModal({ onClose, onChon }: { onClose: () => void; onChon: (hd: HoaDonBanRecord) => void }) {
  const [list] = useState<HoaDonBanRecord[]>(() => hoaDonBanGetAll({ ...getDefaultHoaDonBanFilter() }).filter((h) => h.tinh_trang !== 'Hủy bỏ'))
  const [search, setSearch] = useState('')
  const filtered = search ? list.filter((r) => matchSearchKeyword(`${r.so_hoa_don} ${r.khach_hang}`, search)) : list
  return (
    <Modal open onClose={onClose} title="Chọn hóa đơn gốc" size="md"
      footer={<button type="button" style={formFooterButtonCancel} onClick={onClose}>Hủy bỏ</button>}
    >
      <input className={styles.searchInput} placeholder="Tìm..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: '100%', marginBottom: 8 }} autoFocus />
      <div style={{ maxHeight: 300, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
          <thead><tr>{['Số HĐ', 'Ngày HĐ', 'Khách hàng', 'Tổng tiền'].map((h) => (
            <th key={h} style={{ padding: '5px 8px', background: 'var(--bg-tab)', borderBottom: '1px solid var(--border-strong)', textAlign: 'left', position: 'sticky', top: 0 }}>{h}</th>
          ))}</tr></thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} style={{ cursor: 'pointer' }} onClick={() => onChon(r)}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--row-selected-bg)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <td style={{ padding: '4px 8px', borderBottom: '1px solid var(--border)' }}>{r.so_hoa_don}</td>
                <td style={{ padding: '4px 8px', borderBottom: '1px solid var(--border)', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{formatNgay(r.ngay_hoa_don)}</td>
                <td style={{ padding: '4px 8px', borderBottom: '1px solid var(--border)' }}>{r.khach_hang}</td>
                <td style={{ padding: '4px 8px', borderBottom: '1px solid var(--border)', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{formatNumberDisplay(r.tong_thanh_toan, 0)}</td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={4} style={{ padding: 12, textAlign: 'center', color: 'var(--text-muted)' }}>Không có dữ liệu.</td></tr>}
          </tbody>
        </table>
      </div>
    </Modal>
  )
}

// ─── Form ────────────────────────────────────────────────────────────────

interface TraLaiFormProps {
  mode: 'add' | 'view'
  initialRecord?: TraLaiHangBanRecord
  initialChiTiet?: TraLaiHangBanChiTiet[]
  onClose: () => void
  onSaved: () => void
  onSavedAndAdd?: () => void
}

function TraLaiForm({ mode, initialRecord, initialChiTiet, onClose, onSaved }: TraLaiFormProps) {
  const toast = useToastOptional()
  const soRef = useRef<HTMLInputElement>(null)
  const [chonHdOpen, setChonHdOpen] = useState(false)

  const [soPhieuTra, setSoPhieuTra] = useState(initialRecord?.so_phieu_tra ?? '')
  const [ngayTra, setNgayTra] = useState(initialRecord?.ngay_tra ?? TODAY_ISO)
  const [khachHang, setKhachHang] = useState(initialRecord?.khach_hang ?? '')
  const [dienGiai, setDienGiai] = useState(initialRecord?.dien_giai ?? '')
  const [tinhTrang, setTinhTrang] = useState<TraLaiHangBanRecord['tinh_trang']>(initialRecord?.tinh_trang ?? 'Chờ xử lý')
  const [hoanKho, setHoanKho] = useState(initialRecord?.hoan_kho ?? true)
  const [hoaDonId, setHoaDonId] = useState(initialRecord?.hoa_don_ban_id ?? '')
  const [soHoaDonGoc, setSoHoaDonGoc] = useState(initialRecord?.so_hoa_don_goc ?? '')
  const ghiChu = initialRecord?.ghi_chu ?? ''
  const [loi, setLoi] = useState('')
  const [chiTiet, setChiTiet] = useState<(Partial<TraLaiHangBanChiTiet> & { _key: string })[]>(
    initialChiTiet?.map((c) => ({ ...c, _key: c.id })) ?? []
  )

  useEffect(() => {
    if (mode === 'add' && !initialRecord) setSoPhieuTra(soTiepTheo())
    setTimeout(() => soRef.current?.focus(), 60)
  }, [])

  const applyHoaDon = (hd: HoaDonBanRecord) => {
    setChonHdOpen(false)
    setKhachHang(hd.khach_hang); setHoaDonId(hd.id); setSoHoaDonGoc(hd.so_hoa_don)
    setDienGiai(`Trả lại hàng từ hóa đơn ${hd.so_hoa_don}`)
  }

  const tongTienHang = chiTiet.reduce((s, c) => s + (Number(c.thanh_tien) || 0), 0)
  const tongThueGtgt = chiTiet.reduce((s, c) => s + (Number(c.tien_thue_gtgt) || 0), 0)
  const tongThanhToan = tongTienHang + tongThueGtgt

  const capNhatDong = (key: string, field: string, val: string | number | null) => {
    setChiTiet((prev) => prev.map((c) => {
      if (c._key !== key) return c
      const updated = { ...c, [field]: val }
      if (field === 'so_luong' || field === 'don_gia') {
        const sl = field === 'so_luong' ? Number(val) : Number(c.so_luong) || 0
        const dg = field === 'don_gia' ? Number(val) : Number(c.don_gia) || 0
        updated.thanh_tien = sl * dg
      }
      return updated
    }))
  }

  const handleLuu = () => {
    if (!soPhieuTra.trim()) { setLoi('Số phiếu không được để trống.'); soRef.current?.focus(); return }
    if (!khachHang.trim()) { setLoi('Khách hàng không được để trống.'); return }
    setLoi('')
    tlPost({
      so_phieu_tra: soPhieuTra.trim(), ngay_tra: ngayTra, khach_hang: khachHang.trim(),
      dien_giai: dienGiai.trim() || undefined,
      tong_tien_hang: tongTienHang, tong_thue_gtgt: tongThueGtgt, tong_thanh_toan: tongThanhToan,
      tinh_trang: tinhTrang, hoan_kho: hoanKho,
      hoa_don_ban_id: hoaDonId || undefined, so_hoa_don_goc: soHoaDonGoc || undefined,
      ghi_chu: ghiChu.trim() || undefined,
      chi_tiet: chiTiet.map((c, i) => ({
        stt: i + 1, ma_hang: c.ma_hang ?? '', ten_hang: c.ten_hang ?? '', dvt: c.dvt ?? '',
        so_luong: Number(c.so_luong) || 0, don_gia: Number(c.don_gia) || 0, thanh_tien: Number(c.thanh_tien) || 0,
        pt_thue_gtgt: c.pt_thue_gtgt ?? null, tien_thue_gtgt: c.tien_thue_gtgt ?? null, ghi_chu: c.ghi_chu,
      })),
    })
    toast?.showToast(`Đã lưu phiếu trả lại hàng. Doanh thu đã trừ ${formatNumberDisplay(tongThanhToan, 0)}.${hoanKho ? ' Tồn kho đã cập nhật.' : ''}`, 'success')
    onSaved()
  }

  const readOnly = mode === 'view'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className={styles.modalHeader}>
        <span className={styles.modalTitle}>{mode === 'add' ? 'Thêm Phiếu trả lại hàng bán' : 'Xem Phiếu trả lại hàng bán'}
          {soHoaDonGoc && <span className={styles.sourceBadge} style={{ marginLeft: 8 }}>Từ HĐ: {soHoaDonGoc}</span>}
        </span>
        {loi && <span style={{ fontSize: 11, color: '#dc2626', marginLeft: 12 }}>{loi}</span>}
        <button type="button" className={styles.modalCloseBtn} onClick={onClose}><X size={14} /></button>
      </div>

      <div className={styles.modalBody}>
        {!readOnly && (
          <div style={{ marginBottom: 10 }}>
            <button type="button" className={styles.toolbarBtn} onClick={() => setChonHdOpen(true)}>
              <Plus size={12} /> Chọn hóa đơn gốc
            </button>
          </div>
        )}

        <div className={styles.formSectionTitle}>Thông tin phiếu trả</div>

        <div className={styles.formRow}>
          <span className={styles.formLabel}>Số phiếu trả</span>
          <div className={styles.formControl}><input ref={soRef} className={styles.formInput} value={soPhieuTra} onChange={(e) => setSoPhieuTra(e.target.value)} readOnly={readOnly} /></div>
          <span className={styles.formLabel} style={{ minWidth: 80 }}>Trạng thái</span>
          <div className={styles.formControl}>
            <select className={styles.formSelect} value={tinhTrang} onChange={(e) => setTinhTrang(e.target.value as TraLaiHangBanRecord['tinh_trang'])} disabled={readOnly}>
              {TINH_TRANGS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        <div className={styles.formRow}>
          <span className={styles.formLabel}>Ngày trả</span>
          <div className={styles.formControl}><input type="date" className={styles.formInput} style={{ textAlign: 'right' }} value={ngayTra} onChange={(e) => setNgayTra(e.target.value)} readOnly={readOnly} /></div>
          <span className={styles.formLabel} style={{ minWidth: 80 }}>Hoàn kho</span>
          <div className={styles.formControl} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input type="checkbox" checked={hoanKho} onChange={(e) => setHoanKho(e.target.checked)} disabled={readOnly} id="hoan-kho-cb" />
            <label htmlFor="hoan-kho-cb" style={{ fontSize: 11, cursor: 'pointer' }}>Hoàn nhập kho</label>
          </div>
        </div>

        <div className={styles.formRow}>
          <span className={styles.formLabel}>Khách hàng</span>
          <div className={styles.formControl} style={{ flex: 3 }}><input className={styles.formInput} value={khachHang} onChange={(e) => setKhachHang(e.target.value)} readOnly={readOnly} /></div>
        </div>

        <div className={styles.formRow}>
          <span className={styles.formLabel}>Diễn giải</span>
          <div className={styles.formControl} style={{ flex: 3 }}><input className={styles.formInput} value={dienGiai} onChange={(e) => setDienGiai(e.target.value)} readOnly={readOnly} /></div>
        </div>

        <div className={styles.formSectionTitle} style={{ marginTop: 14 }}>Chi tiết hàng trả</div>

        <div className={styles.tableScrollWrap} style={{ maxHeight: 200 }}>
          <table className={styles.chiTietTable}>
            <colgroup>
              <col style={{ width: 36 }} /><col style={{ width: 88 }} /><col style={{ width: 180 }} />
              <col style={{ width: 60 }} /><col style={{ width: 72 }} /><col style={{ width: 100 }} />
              <col style={{ width: 100 }} /><col style={{ width: 120 }} />{!readOnly && <col style={{ width: 28 }} />}
            </colgroup>
            <thead>
              <tr>
                <th className={styles.tdCenter}>STT</th><th>Mã VTHH</th><th>Tên VTHH</th><th>ĐVT</th>
                <th className={styles.thRight}>Số lượng</th><th className={styles.thRight}>Đơn giá</th>
                <th className={styles.thRight}>Thành tiền</th><th>Ghi chú</th>{!readOnly && <th />}
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
                  <td><input className={styles.chiTietInput} value={c.ghi_chu ?? ''} onChange={(e) => capNhatDong(c._key, 'ghi_chu', e.target.value)} readOnly={readOnly} /></td>
                  {!readOnly && <td className={styles.tdCenter}><button type="button" style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '1px 3px', color: 'var(--text-muted)' }} onClick={() => setChiTiet((p) => p.filter((x) => x._key !== c._key))}><X size={11} /></button></td>}
                </tr>
              ))}
              {chiTiet.length === 0 && <tr><td colSpan={readOnly ? 8 : 9} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '12px 0', fontSize: 11 }}>Chưa có dòng.</td></tr>}
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
          <span style={{ color: '#c2410c', fontWeight: 700 }}>Trừ doanh thu: <strong>{formatNumberDisplay(tongThanhToan, 0)}</strong></span>
        </div>
      </div>

      <div className={styles.modalFooter}>
        {!readOnly ? (
          <>
            <button type="button" style={formFooterButtonCancel} onClick={onClose}>Hủy bỏ</button>
            <button type="button" style={formFooterButtonSave} onClick={handleLuu}>Lưu</button>
          </>
        ) : (
          <button type="button" style={formFooterButtonCancel} onClick={onClose}>Đóng</button>
        )}
      </div>

      {chonHdOpen && <ChonHoaDonModal onClose={() => setChonHdOpen(false)} onChon={applyHoaDon} />}
    </div>
  )
}

// ─── Danh sách ───────────────────────────────────────────────────────────

const columns: DataGridColumn<TraLaiHangBanRecord>[] = [
  { key: 'so_phieu_tra', label: 'Số phiếu', width: 100 },
  { key: 'ngay_tra', label: 'Ngày trả', width: 76, align: 'right', renderCell: (v) => formatNgay(v as string) },
  { key: 'khach_hang', label: 'Khách hàng', width: '26%' },
  { key: 'dien_giai', label: 'Diễn giải', width: '20%' },
  { key: 'so_hoa_don_goc', label: 'HĐ gốc', width: 90, renderCell: (v) => v ? <span className={styles.sourceBadge}>{String(v)}</span> : '' },
  { key: 'tong_thanh_toan', label: 'Trừ doanh thu', width: 120, align: 'right', renderCell: (v) => <span style={{ color: '#c2410c', fontVariantNumeric: 'tabular-nums' }}>{formatNumberDisplay(Number(v), 0)}</span> },
  { key: 'hoan_kho', label: 'Hoàn kho', width: 80, align: 'center', renderCell: (v) => v ? <span className={styles.badgeDaHoanKho}>Có</span> : <span className={styles.badgeChuaThucHien}>Không</span> },
  { key: 'tinh_trang', label: 'Trạng thái', width: 100, renderCell: (v) => <Badge value={String(v)} /> },
]

export function TraLaiHang() {
  const toast = useToastOptional()
  const [danhSach, setDanhSach] = useState<TraLaiHangBanRecord[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [chiTiet, setChiTiet] = useState<TraLaiHangBanChiTiet[]>([])
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [formMode, setFormMode] = useState<'add' | 'view'>('add')
  const [formRecord, setFormRecord] = useState<TraLaiHangBanRecord | null>(null)
  const [xoaModal, setXoaModal] = useState<TraLaiHangBanRecord | null>(null)
  const [formKey, setFormKey] = useState(0)

  const loadData = useCallback(() => setDanhSach(tlGetAll()), [])
  useEffect(() => { loadData() }, [loadData])
  useEffect(() => {
    if (selectedId) setChiTiet(tlGetChiTiet(selectedId)); else setChiTiet([])
  }, [selectedId])

  const filtered = search.trim()
    ? danhSach.filter((r) => matchSearchKeyword(`${r.so_phieu_tra} ${r.khach_hang} ${r.dien_giai ?? ''} ${r.tinh_trang}`, search))
    : danhSach

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
        <input type="text" className={styles.searchInput} placeholder="Tìm số phiếu, khách hàng..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ marginLeft: 8 }} />
      </div>

      <div className={styles.contentArea}>
        <div className={styles.gridWrap}>
          <DataGrid<TraLaiHangBanRecord>
            columns={columns} data={filtered} keyField="id" stripedRows compact height="100%"
            selectedRowId={selectedId}
            onRowSelect={(r) => setSelectedId(r.id)}
            onRowDoubleClick={(r) => { setFormRecord(r); setFormMode('view'); setFormKey((k) => k + 1); setShowForm(true) }}
            summary={[
              { label: 'Trừ doanh thu', value: formatNumberDisplay(filtered.reduce((s, r) => s + r.tong_thanh_toan, 0), 0) },
              { label: 'Số dòng', value: `= ${filtered.length}` },
            ]}
          />
        </div>
        <div className={styles.detailWrap}>
          <div className={styles.detailTabBar}>
            <button type="button" className={styles.detailTabActive}>Chi tiết hàng trả</button>
          </div>
          <div className={styles.detailTabPanel}>
            <DataGrid<TraLaiHangBanChiTiet> columns={[
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

      <Modal open={xoaModal != null} onClose={() => setXoaModal(null)} title="Xác nhận xóa" size="sm"
        footer={<><button type="button" className={styles.modalBtn} onClick={() => setXoaModal(null)}>Hủy bỏ</button>
          <button type="button" className={styles.modalBtnDanger} onClick={() => {
            if (!xoaModal) return
            tlDelete(xoaModal.id); loadData()
            if (selectedId === xoaModal.id) setSelectedId(null)
            toast?.showToast(`Đã xóa phiếu ${xoaModal.so_phieu_tra}.`, 'info')
            setXoaModal(null)
          }}>Đồng ý xóa</button></>}
      >
        {xoaModal && <p style={{ margin: 0, fontSize: 12, lineHeight: 1.6, color: 'var(--text-primary)' }}>Xóa phiếu trả lại <strong>{xoaModal.so_phieu_tra}</strong>?<br /><span style={{ color: '#dc2626' }}>Thao tác này không thể hoàn tác.</span></p>}
      </Modal>

      {showForm && (
        <div className={styles.modalOverlay} onClick={() => setShowForm(false)}>
          <div className={styles.modalBoxLarge} style={{ height: '86vh' }} onClick={(e) => e.stopPropagation()}>
            <TraLaiForm
              key={formKey} mode={formMode}
              initialRecord={formRecord ?? undefined}
              initialChiTiet={formRecord ? tlGetChiTiet(formRecord.id) : undefined}
              onClose={() => setShowForm(false)}
              onSaved={() => { setShowForm(false); loadData() }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
