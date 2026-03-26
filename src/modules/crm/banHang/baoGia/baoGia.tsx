/**
 * Danh sách Báo giá — YC23: Tách file, chỉ giữ logic List
 * Form được tách sang baoGiaForm.tsx
 */

import React, { useState, useEffect, useRef, useCallback, useMemo, forwardRef } from 'react'
import {
  Plus, Trash2, Eye, Mail, MessageCircle, ChevronDown,
  ChevronLeft, ChevronRight, FileText, Search,
} from 'lucide-react'
import DatePicker, { registerLocale } from 'react-datepicker'
import { vi } from 'date-fns/locale'
import 'react-datepicker/dist/react-datepicker.css'
import { DataGrid, type DataGridColumn } from '../../../../components/common/dataGrid'
import { Modal } from '../../../../components/common/modal'
import { useToastOptional } from '../../../../context/toastContext'
import { matchSearchKeyword } from '../../../../utils/stringUtils'
import { formatNumberDisplay } from '../../../../utils/numberFormat'
import { htqlDatePickerPopperTop } from '../../../../constants/datePickerPlacement'
import { DatePickerCustomHeader } from '../../../../components/datePickerCustomHeader'

import {
  baoGiaGetAll,
  baoGiaGetChiTiet,
  baoGiaDelete,
  getDefaultBaoGiaFilter,
  getDateRangeForKy,
  KY_OPTIONS,
  type BaoGiaRecord,
  type BaoGiaChiTiet,
  type BaoGiaKyValue,
  type BaoGiaFilter,
  baoGiaPost,
  baoGiaPut,
  getBaoGiaDraft,
  setBaoGiaDraft,
  clearBaoGiaDraft,
  baoGiaSoDonHangTiepTheo,
} from './baoGiaApi'
import { BaoGiaApiProvider, type BaoGiaApi } from './baoGiaApiContext'
import { BaoGiaForm } from './baoGiaForm'
import styles from '../BanHang.module.css'

registerLocale('vi', vi)

/** Tự chèn "/" thành dd/mm/yyyy khi gõ (đồng bộ Đơn hàng mua — YC34). */
function formatDdMmYyyyInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8)
  if (digits.length <= 2) return digits
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`
}

function parseDdMmYyyyToIso(s: string): string {
  const m = s.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (!m) return ''
  const d = parseInt(m[1], 10)
  const mo = parseInt(m[2], 10)
  const y = parseInt(m[3], 10)
  if (d < 1 || d > 31 || mo < 1 || mo > 12 || y < 1900 || y > 2100) return ''
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

function isoToDate(iso: string | null): Date | null {
  if (!iso || !iso.trim()) return null
  const d = new Date(iso.trim())
  return Number.isNaN(d.getTime()) ? null : d
}

function toIsoDate(d: Date | null): string {
  if (!d) return ''
  const y = d.getFullYear()
  const m = d.getMonth() + 1
  const day = d.getDate()
  return `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

interface FormattedDateInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onBlurCommit?: (value: string) => void
}

const FormattedDateInput = forwardRef<HTMLInputElement, FormattedDateInputProps>(function FormattedDateInput(props, ref) {
  const { onChange, onBlur, onBlurCommit, ...rest } = props
  return (
    <input
      ref={ref}
      {...rest}
      onChange={(e) => {
        const formatted = formatDdMmYyyyInput(e.target.value)
        e.target.value = formatted
        onChange?.(e)
      }}
      onBlur={(e) => {
        const raw = e.target.value
        const iso = parseDdMmYyyyToIso(raw)
        if (iso) onBlurCommit?.(raw)
        onBlur?.(e)
      }}
    />
  )
})

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

// ─── Cột danh sách ───────────────────────────────────────────────────────────
const columns: DataGridColumn<BaoGiaRecord>[] = [
  { key: 'so_bao_gia',      label: 'Số BG',       width: 100, align: 'right' },
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
  { key: 'stt',              label: 'STT',             width: 36, align: 'center', renderCell: (_v, _r, idx) => String((idx ?? 0) + 1) },
  { key: 'ma_hang',          label: 'Mã SPHH',         width: 88 },
  { key: 'ten_hang',         label: 'Tên Sản phẩm, Hàng hóa', width: 200 },
  { key: 'dvt',              label: 'ĐVT',             width: 52 },
  { key: 'so_luong',         label: 'Số lượng',        width: 70, align: 'right',
    renderCell: (v) => formatNumberDisplay(Number(v), 2) },
  { key: 'don_gia',          label: 'Đơn giá',         width: 100, align: 'right',
    renderCell: (v) => formatNumberDisplay(Number(v), 0) },
  { key: 'thanh_tien',       label: 'Thành tiền',      width: 100, align: 'right',
    renderCell: (v) => formatNumberDisplay(Math.round(Number(v)), 0) },
  { key: 'pt_thue_gtgt',     label: '% Thuế GTGT',     width: 70, align: 'right',
    renderCell: (v) => v != null ? formatNumberDisplay(Number(v), 0) : '' },
  { key: 'tien_thue_gtgt',   label: 'Tiền thuế GTGT',  width: 100, align: 'right',
    renderCell: (v) => v != null ? formatNumberDisplay(Math.round(Number(v)), 0) : '' },
  {
    key: 'tong_tien',
    label: 'Tổng tiền',
    width: 100,
    align: 'right',
    renderCell: (_v, row) => {
      const tong = Math.round((Number(row.thanh_tien) || 0) + (Number(row.tien_thue_gtgt) || 0))
      return <span style={{ fontWeight: 600, color: '#1e40af' }}>{formatNumberDisplay(tong, 0)}</span>
    },
  },
  { key: 'ghi_chu',          label: 'Ghi chú',         width: 140 },
]

// ─── [YC23] Phân trang ──────────────────────────────────────────────────────
const PAGE_SIZE = 50

const Pagination = React.memo(({ page, total, onChange }: { page: number; total: number; onChange: (p: number) => void }) => {
  if (total <= 1) return null
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px',
      borderTop: '1px solid var(--border)', background: 'var(--bg-secondary)', fontSize: 11,
    }}>
      <button type="button" onClick={() => onChange(page - 1)} disabled={page <= 1}
        style={{
          background: 'transparent', border: 'none',
          cursor: page > 1 ? 'pointer' : 'default',
          color: page > 1 ? 'var(--accent)' : 'var(--text-muted)', padding: '1px 4px',
        }}>
        <ChevronLeft size={13} />
      </button>
      <span style={{ color: 'var(--text-muted)' }}>Trang {page}/{total}</span>
      <button type="button" onClick={() => onChange(page + 1)} disabled={page >= total}
        style={{
          background: 'transparent', border: 'none',
          cursor: page < total ? 'pointer' : 'default',
          color: page < total ? 'var(--accent)' : 'var(--text-muted)', padding: '1px 4px',
        }}>
        <ChevronRight size={13} />
      </button>
    </div>
  )
})

// ─── API instance cho Provider ──────────────────────────────────────────────
const apiBaoGia: BaoGiaApi = {
  getAll: baoGiaGetAll,
  getChiTiet: baoGiaGetChiTiet,
  delete: baoGiaDelete,
  getDefaultFilter: getDefaultBaoGiaFilter,
  getDateRangeForKy: getDateRangeForKy,
  KY_OPTIONS: KY_OPTIONS,
  post: baoGiaPost,
  put: baoGiaPut,
  soDonHangTiepTheo: baoGiaSoDonHangTiepTheo,
  getDraft: getBaoGiaDraft,
  setDraft: setBaoGiaDraft,
  clearDraft: clearBaoGiaDraft,
}

// ─── Màn hình danh sách Báo giá (Content) ────────────────────────────────────
function BaoGiaContent() {
  const toast = useToastOptional()
  const [filter,      setFilter]      = useState<BaoGiaFilter>(getDefaultBaoGiaFilter)
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
  const [dropdownGui, setDropdownGui] = useState(false)
  const [dropdownTaoGd, setDropdownTaoGd] = useState(false)
  const dropdownGuiRef = useRef<HTMLDivElement>(null)
  const dropdownTaoGdRef = useRef<HTMLDivElement>(null)
  const hoverTaoGdTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hoverGuiTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [page, setPage] = useState(1)

  const loadData = useCallback(() => {
    setDanhSach(baoGiaGetAll(filter))
  }, [filter])

  useEffect(() => { loadData() }, [loadData])
  useEffect(() => {
    if (selectedId) setChiTiet(baoGiaGetChiTiet(selectedId))
    else setChiTiet([])
  }, [selectedId])

  const filtered = useMemo(() => {
    let result = danhSach
    if (search.trim()) {
      result = result.filter((r) =>
        matchSearchKeyword(`${r.so_bao_gia} ${r.khach_hang} ${r.dien_giai ?? ''} ${r.tinh_trang}`, search)
      )
    }
    return result
  }, [danhSach, search])

  useEffect(() => { setPage(1) }, [filter, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated  = useMemo(() => 
    filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page]
  )

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (dropdownGuiRef.current && !dropdownGuiRef.current.contains(e.target as Node)) setDropdownGui(false)
      if (dropdownTaoGdRef.current && !dropdownTaoGdRef.current.contains(e.target as Node)) setDropdownTaoGd(false)
      setContextMenu((m) => m.open ? { ...m, open: false } : m)
    }
    window.addEventListener('click', h)
    return () => window.removeEventListener('click', h)
  }, [])

  const tongTien   = useMemo(() => filtered.reduce((s, r) => s + r.tong_thanh_toan, 0), [filtered])
  const selectedRow = useMemo(() => selectedId ? danhSach.find((r) => r.id === selectedId) ?? null : null, [selectedId, danhSach])

  const moFormThem = () => {
    clearBaoGiaDraft()
    setFormRecord(null)
    setFormMode('add')
    setFormKey((k) => k + 1)
    setShowForm(true)
  }
  const moFormXem  = (row: BaoGiaRecord) => { setFormRecord(row); setFormMode('view'); setFormKey((k) => k + 1); setShowForm(true) }
  const moFormSua  = (row: BaoGiaRecord) => { setFormRecord(row); setFormMode('edit'); setFormKey((k) => k + 1); setShowForm(true) }

  const xacNhanXoa = (row: BaoGiaRecord) => {
    baoGiaDelete(row.id)
    loadData()
    if (selectedId === row.id) setSelectedId(null)
    toast?.showToast(`Đã xóa báo giá ${row.so_bao_gia}.`, 'info')
    setXoaModalRow(null)
  }

  // [YC23 Mục 8] Lập đơn hàng
  const lapDonHang = () => {
    if (!selectedRow) return
    const ct = baoGiaGetChiTiet(selectedRow.id)
    const draft = {
      khach_hang:      selectedRow.khach_hang,
      dia_chi:         selectedRow.dia_chi,
      ma_so_thue:      selectedRow.ma_so_thue,
      dien_giai:       selectedRow.dien_giai ?? '',
      nv_ban_hang:     selectedRow.nv_ban_hang,
      bao_gia_ref:     selectedRow.so_bao_gia,
      bao_gia_id:      selectedRow.id,
      tong_thanh_toan: selectedRow.tong_thanh_toan,
      chiTiet: ct.map((c) => ({
        ma_hang:        c.ma_hang,
        ten_hang:       c.ten_hang,
        dvt:            c.dvt,
        so_luong:       c.so_luong,
        don_gia:        c.don_gia,
        thanh_tien:     Math.round(c.thanh_tien),
        pt_thue_gtgt:   c.pt_thue_gtgt,
        tien_thue_gtgt: c.tien_thue_gtgt != null ? Math.round(c.tien_thue_gtgt) : null,
        ghi_chu:        c.ghi_chu,
      })),
    }
    try {
      localStorage.setItem('htql_don_hang_ban_from_baogia', JSON.stringify(draft))
      toast?.showToast(`Đã tạo nháp đơn hàng từ ${selectedRow.so_bao_gia}. Chuyển sang tab Đơn hàng bán.`, 'success')
    } catch {
      toast?.showToast('Lỗi khi tạo nháp đơn hàng.', 'error')
    }
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
        <div ref={dropdownTaoGdRef} className={styles.dropdownWrap} style={{ marginLeft: 0 }}
          onMouseEnter={() => {
            if (!selectedId) return
            if (hoverTaoGdTimeoutRef.current) clearTimeout(hoverTaoGdTimeoutRef.current)
            hoverTaoGdTimeoutRef.current = setTimeout(() => setDropdownTaoGd(true), 200)
          }}
          onMouseLeave={() => {
            if (hoverTaoGdTimeoutRef.current) clearTimeout(hoverTaoGdTimeoutRef.current)
            hoverTaoGdTimeoutRef.current = setTimeout(() => setDropdownTaoGd(false), 200)
          }}>
          <button type="button" className={styles.toolbarBtn} disabled={!selectedId}
            onClick={() => setDropdownTaoGd((v) => !v)}>
            <FileText size={13} /><span>Tạo giao dịch</span><ChevronDown size={12} style={{ marginLeft: 2 }} />
          </button>
          {dropdownTaoGd && (
            <div className={styles.dropdownMenu}>
              <button type="button" className={styles.dropdownItem}
                onClick={() => {
                  lapDonHang()
                  setDropdownTaoGd(false)
                }}>
                <FileText size={13} /> Đơn hàng bán
              </button>
              <button type="button" className={styles.dropdownItem}
                onClick={() => {
                  toast?.showToast('Tính năng Hợp đồng bán đang phát triển.', 'info')
                  setDropdownTaoGd(false)
                }}>
                <FileText size={13} /> Hợp đồng bán
              </button>
            </div>
          )}
        </div>
        <div
          ref={dropdownGuiRef}
          className={styles.dropdownWrap}
          style={{ marginLeft: 8 }}
          onMouseEnter={() => {
            if (hoverGuiTimeoutRef.current) clearTimeout(hoverGuiTimeoutRef.current)
            hoverGuiTimeoutRef.current = setTimeout(() => setDropdownGui(true), 200)
          }}
          onMouseLeave={() => {
            if (hoverGuiTimeoutRef.current) clearTimeout(hoverGuiTimeoutRef.current)
            hoverGuiTimeoutRef.current = setTimeout(() => setDropdownGui(false), 200)
          }}
        >
          <button type="button" className={styles.toolbarBtn} onClick={() => setDropdownGui((v) => !v)}>
            <ChevronDown size={12} /><span>Gửi</span>
          </button>
          {dropdownGui && (
            <div className={styles.dropdownMenu}>
              <button type="button" className={styles.dropdownItem}
                onClick={() => { toast?.showToast('Đã gửi email báo giá.', 'success'); setDropdownGui(false) }}>
                <Mail size={13} /> Gửi Email
              </button>
              <button type="button" className={styles.dropdownItem}
                onClick={() => { toast?.showToast('Đã gửi Zalo báo giá.', 'success'); setDropdownGui(false) }}>
                <MessageCircle size={13} /> Gửi Zalo
              </button>
            </div>
          )}
        </div>
        <div className={styles.filterWrap} style={{ marginLeft: 8 }}>
          <span className={styles.filterLabel}>Kỳ</span>
          <select className={styles.filterInput} value={filter.ky}
            onChange={(e) => {
              const ky = e.target.value as BaoGiaKyValue
              if (ky === 'tat-ca') {
                setFilter({ ky, tu: '', den: '' })
                return
              }
              const range = getDateRangeForKy(ky)
              setFilter({ ky, tu: range.tu, den: range.den })
            }}>
            {KY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 8 }}>
          <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Từ</span>
          <DatePicker
            {...htqlDatePickerPopperTop}
            selected={isoToDate(filter.tu)}
            onChange={(d: Date | null) => {
              const iso = toIsoDate(d)
              setFilter((f) => {
                const next: BaoGiaFilter = { ...f, ky: 'tat-ca', tu: iso }
                if (iso && f.den && iso > f.den) next.den = iso
                if (iso && !f.den) next.den = iso
                return next
              })
            }}
            maxDate={filter.den ? isoToDate(filter.den) ?? undefined : undefined}
            dateFormat="dd/MM/yyyy"
            locale="vi"
            calendarClassName="htql-datepicker-ngay"
            renderCustomHeader={(p) => <DatePickerCustomHeader {...p} />}
            placeholderText="dd/mm/yyyy"
            className="htql-datepicker-inline"
            onFocus={(e) => (e.target as HTMLInputElement).select()}
            customInput={
              <FormattedDateInput
                className={styles.filterInput}
                style={{ textAlign: 'right' }}
                onBlurCommit={(v: string) => {
                  const iso = parseDdMmYyyyToIso(v)
                  if (iso) {
                    setFilter((f) => {
                      const next: BaoGiaFilter = { ...f, ky: 'tat-ca', tu: iso }
                      if (f.den && iso > f.den) next.den = iso
                      if (!f.den) next.den = iso
                      return next
                    })
                  }
                }}
              />
            }
          />
          <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Đến</span>
          <DatePicker
            {...htqlDatePickerPopperTop}
            selected={isoToDate(filter.den)}
            onChange={(d: Date | null) => {
              const iso = toIsoDate(d)
              setFilter((f) => {
                const next: BaoGiaFilter = { ...f, ky: 'tat-ca', den: iso }
                if (iso && f.tu && iso < f.tu) next.tu = iso
                return next
              })
            }}
            minDate={filter.tu ? isoToDate(filter.tu) ?? undefined : undefined}
            dateFormat="dd/MM/yyyy"
            locale="vi"
            calendarClassName="htql-datepicker-ngay"
            renderCustomHeader={(p) => <DatePickerCustomHeader {...p} />}
            placeholderText="dd/mm/yyyy"
            className="htql-datepicker-inline"
            onFocus={(e) => (e.target as HTMLInputElement).select()}
            customInput={
              <FormattedDateInput
                className={styles.filterInput}
                style={{ textAlign: 'right' }}
                onBlurCommit={(v: string) => {
                  let iso = parseDdMmYyyyToIso(v)
                  if (iso) {
                    const today = toIsoDate(new Date())
                    if (iso > today) iso = today
                    setFilter((f) => {
                      const next: BaoGiaFilter = { ...f, ky: 'tat-ca', den: iso }
                      if (f.tu && iso < f.tu) next.tu = iso
                      return next
                    })
                  }
                }}
              />
            }
          />
        </div>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={14} style={{
            position: 'absolute',
            left: 10,
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--text-muted)',
            pointerEvents: 'none',
          }} />
          <input type="text" className={styles.searchInput}
            style={{ paddingLeft: 32, width: '100%' }}
            placeholder="Tìm kiếm mã, tên KH, diễn giải..."
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
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
              summary={filtered.length > 0 ? [
                { label: 'Tổng báo giá', value: formatNumberDisplay(tongTien, 0) },
              ] : []}
            />
          </div>
          <Pagination page={page} total={totalPages} onChange={setPage} />
        </div>

        <div className={styles.detailWrap}>
          <div className={styles.detailTabBar}>
            <button type="button" className={styles.detailTabActive}>Chi tiết SPHH</button>
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

      {/* Modal form - maskClosable={false} */}
      {showForm && (
        <div className={styles.modalOverlay}>
          <div
            className={styles.modalBoxLarge}
            style={{ height: '90vh', width: 'min(99vw, 1580px)', maxWidth: 'min(99vw, 1580px)' }}
          >
            <BaoGiaForm
              key={formKey}
              readOnly={formMode === 'view'}
              initialDon={formMode === 'view' || formMode === 'edit' ? (formRecord ?? undefined) : null}
              initialChiTiet={formRecord ? baoGiaGetChiTiet(formRecord.id) : undefined}
              onClose={() => setShowForm(false)}
              onSaved={() => { setShowForm(false); loadData() }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Export chính với Provider wrapper ────────────────────────────────────────
export function BaoGia() {
  return (
    <BaoGiaApiProvider api={apiBaoGia}>
      <BaoGiaContent />
    </BaoGiaApiProvider>
  )
}
