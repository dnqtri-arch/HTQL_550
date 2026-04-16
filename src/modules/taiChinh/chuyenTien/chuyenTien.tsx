/**
 * Chuyển tiền — danh sách + form (một lưới, không chi tiết dòng).
 */
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import {
  Plus, Trash2, Eye, Mail, MessageCircle, ChevronDown,
  ChevronLeft, ChevronRight, Search, BookOpen, BookX,
} from 'lucide-react'
import DatePicker, { registerLocale } from 'react-datepicker'
import { vi } from 'date-fns/locale'
import 'react-datepicker/dist/react-datepicker.css'
import { DataGrid, type DataGridColumn } from '../../../components/common/dataGrid'
import { useToastOptional } from '../../../context/toastContext'
import { matchSearchKeyword } from '../../../utils/stringUtils'
import { formatNumberDisplay } from '../../../utils/numberFormat'
import { htqlDatePickerPopperTop } from '../../../constants/datePickerPlacement'
import { DatePickerCustomHeader } from '../../../components/datePickerCustomHeader'
import { useDraggable } from '../../../hooks/useDraggable'
import { ConfirmXoaCaptchaModal } from '../../../components/common/confirmXoaCaptchaModal'

import {
  chuyenTienBangGetAll,
  chuyenTienBangDelete,
  getDefaultChuyenTienBangFilter,
  getDateRangeForKy,
  KY_OPTIONS,
  HTQL_CHUYEN_TIEN_BANG_RELOAD_EVENT,
  type ChuyenTienBangRecord,
  type ChuyenTienBangFilter,
  type ChuyenTienBangKyValue,
  chuyenTienBangPatch,
} from './chuyenTienBangApi'
import { ChuyenTienForm } from './chuyenTienForm'
import styles from '../chiTien/banHangDetailMirror.module.css'
import { daGhiSoPhieuThu } from '../thuTien/ghiSoTaiChinhApi'
import { taoPhieuThuChiVaGhiSoTuChuyenTien } from './taoPhieuThuChiTuChuyenTien'
import { huyGhiSoVaXoaPhieuThuChiTuChuyenTien } from './huyPhieuLienKetChuyenTien'
import { taiKhoanGetAll } from '../taiKhoan/taiKhoanApi'
import { hopLeCapTkChuyenTien } from './chuyenTienTkHopLe'
import type { TaiKhoanRecord } from '../../../types/taiKhoan'

registerLocale('vi', vi)

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

const FormattedDateInput = React.forwardRef<HTMLInputElement, FormattedDateInputProps>(function FormattedDateInput(props, ref) {
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

function formatNgay(iso: string | null | undefined): string {
  if (!iso) return ''
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/)
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso
}

const PAGE_SIZE = 50

const Pagination = React.memo(({ page, total, onChange }: { page: number; total: number; onChange: (p: number) => void }) => {
  if (total <= 1) return null
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        padding: '3px 8px',
        borderTop: '1px solid var(--border)',
        background: 'var(--bg-secondary)',
        fontSize: 11,
      }}
    >
      <button
        type="button"
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        style={{
          background: 'transparent',
          border: 'none',
          cursor: page > 1 ? 'pointer' : 'default',
          color: page > 1 ? 'var(--accent)' : 'var(--text-muted)',
          padding: '1px 4px',
        }}
      >
        <ChevronLeft size={13} />
      </button>
      <span style={{ color: 'var(--text-muted)' }}>
        Trang {page}/{total}
      </span>
      <button
        type="button"
        onClick={() => onChange(page + 1)}
        disabled={page >= total}
        style={{
          background: 'transparent',
          border: 'none',
          cursor: page < total ? 'pointer' : 'default',
          color: page < total ? 'var(--accent)' : 'var(--text-muted)',
          padding: '1px 4px',
        }}
      >
        <ChevronRight size={13} />
      </button>
    </div>
  )
})

function tkHienThi(id: string, cache: Map<string, TaiKhoanRecord>): string {
  const tk = cache.get(id.trim())
  if (!tk) return id || '—'
  const stk = (tk.so_tai_khoan ?? '').trim()
  const nh = (tk.ten_ngan_hang ?? '').trim()
  if (stk && nh) return `${stk} — ${nh}`
  return stk || nh || tk.id
}

function daGhiSoChuyenTien(row: ChuyenTienBangRecord): boolean {
  const tid = row.phieu_thu_tu_chuyen_id?.trim()
  return Boolean(tid && daGhiSoPhieuThu(tid))
}

function ChuyenTienBangContent({ onNavigate: _onNavigate }: { onNavigate?: (tab: string) => void }) {
  const toast = useToastOptional()
  const [filter, setFilter] = useState<ChuyenTienBangFilter>(getDefaultChuyenTienBangFilter)
  const [danhSach, setDanhSach] = useState<ChuyenTienBangRecord[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [formMode, setFormMode] = useState<'add' | 'edit' | 'view'>('add')
  const [formRecord, setFormRecord] = useState<ChuyenTienBangRecord | null>(null)
  const [xoaModalRow, setXoaModalRow] = useState<ChuyenTienBangRecord | null>(null)
  const [contextMenu, setContextMenu] = useState<{
    open: boolean
    x: number
    y: number
    row: ChuyenTienBangRecord | null
  }>({ open: false, x: 0, y: 0, row: null })
  const [formKey, setFormKey] = useState(0)
  const [dropdownGui, setDropdownGui] = useState(false)
  const dropdownGuiRef = useRef<HTMLDivElement>(null)
  const hoverGuiTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [page, setPage] = useState(1)
  const ChuyenTienFormDrag = useDraggable()

  const tkCache = useMemo(() => {
    const m = new Map<string, TaiKhoanRecord>()
    for (const t of taiKhoanGetAll()) m.set(t.id, t)
    return m
  }, [danhSach])

  const loadData = useCallback(() => {
    setDanhSach(chuyenTienBangGetAll())
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    const handler = () => loadData()
    window.addEventListener(HTQL_CHUYEN_TIEN_BANG_RELOAD_EVENT, handler)
    return () => window.removeEventListener(HTQL_CHUYEN_TIEN_BANG_RELOAD_EVENT, handler)
  }, [loadData])

  useEffect(() => {
    function close() {
      setContextMenu((m) => ({ ...m, open: false }))
    }
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [])

  useEffect(() => {
    function onDoc(ev: MouseEvent) {
      const el = dropdownGuiRef.current
      if (!el || !dropdownGui) return
      if (!el.contains(ev.target as Node)) setDropdownGui(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [dropdownGui])

  const filtered = useMemo(() => {
    const tu = filter.tu?.trim()
    const den = filter.den?.trim()
    const kw = search.trim().toLowerCase()
    return danhSach.filter((r) => {
      if (tu && r.ngay_chuyen && r.ngay_chuyen < tu) return false
      if (den && r.ngay_chuyen && r.ngay_chuyen > den) return false
      if (!kw) return true
      return matchSearchKeyword(
        `${r.so_chuyen_tien_bang} ${r.ly_do_chuyen} ${tkHienThi(r.tk_nguon_id, tkCache)} ${tkHienThi(r.tk_den_id, tkCache)}`,
        kw,
      )
    })
  }, [danhSach, filter.tu, filter.den, search, tkCache])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageSafe = Math.min(page, totalPages)
  const paginated = useMemo(() => {
    const start = (pageSafe - 1) * PAGE_SIZE
    return filtered.slice(start, start + PAGE_SIZE)
  }, [filtered, pageSafe])

  useEffect(() => {
    setPage(1)
  }, [filter.ky, filter.tu, filter.den, search])

  const selectedRow = useMemo(() => danhSach.find((r) => r.id === selectedId) ?? null, [danhSach, selectedId])
  const tongTien = useMemo(() => filtered.reduce((s, r) => s + Math.round(Number(r.so_tien) || 0), 0), [filtered])

  const columns = useMemo((): DataGridColumn<ChuyenTienBangRecord>[] => {
    return [
      { key: 'so_chuyen_tien_bang', label: 'Mã phiếu CT', width: 100, align: 'right' },
      { key: 'ngay_chuyen', label: 'Ngày CT', width: 88, align: 'right', renderCell: (v) => formatNgay(v as string) },
      {
        key: 'ly_do_chuyen',
        label: 'Lý do',
        width: '22%',
        renderCell: (v) => {
          const t = String(v ?? '')
          return t.length > 60 ? `${t.slice(0, 60)}…` : t
        },
      },
      {
        key: 'tk_nguon_id',
        label: 'TK nguồn',
        width: '16%',
        renderCell: (_v, row) => tkHienThi((row as ChuyenTienBangRecord).tk_nguon_id, tkCache),
      },
      {
        key: 'tk_den_id',
        label: 'TK đến',
        width: '16%',
        renderCell: (_v, row) => tkHienThi((row as ChuyenTienBangRecord).tk_den_id, tkCache),
      },
      {
        key: 'so_tien',
        label: 'Số tiền',
        width: 100,
        align: 'right',
        renderCell: (v) => formatNumberDisplay(Number(v), 0),
      },
      {
        key: 'tinh_trang',
        label: 'Trạng thái',
        width: 88,
        renderCell: (_v, row) =>
          daGhiSoChuyenTien(row as ChuyenTienBangRecord) ? (
            <span className={styles.badgeDaChot}>Ghi sổ</span>
          ) : (
            <span className={styles.badgeDefault}>{String((row as ChuyenTienBangRecord).tinh_trang)}</span>
          ),
      },
    ]
  }, [tkCache])

  const moFormThem = () => {
    setFormRecord(null)
    setFormMode('add')
    setFormKey((k) => k + 1)
    setShowForm(true)
  }
  const moFormXem = (row: ChuyenTienBangRecord) => {
    setFormRecord(row)
    setFormMode('view')
    setFormKey((k) => k + 1)
    setShowForm(true)
  }
  const moFormSua = (row: ChuyenTienBangRecord) => {
    setFormRecord(row)
    setFormMode('edit')
    setFormKey((k) => k + 1)
    setShowForm(true)
  }

  const xacNhanXoa = (row: ChuyenTienBangRecord) => {
    if (daGhiSoChuyenTien(row)) {
      huyGhiSoVaXoaPhieuThuChiTuChuyenTien(row)
    }
    chuyenTienBangDelete(row.id)
    loadData()
    if (selectedId === row.id) setSelectedId(null)
    toast?.showToast(`Đã xóa phiếu chuyển tiền ${row.so_chuyen_tien_bang}.`, 'info')
    setXoaModalRow(null)
  }

  return (
    <div className={styles.root}>
      <div className={styles.toolbarWrap}>
        <button type="button" className={styles.toolbarBtn} onClick={moFormThem}>
          <Plus size={13} />
          <span>Thêm</span>
        </button>
        <button
          type="button"
          className={styles.toolbarBtnDanger}
          disabled={!selectedId || (selectedRow != null && daGhiSoChuyenTien(selectedRow))}
          onClick={() => selectedRow && setXoaModalRow(selectedRow)}
        >
          <Trash2 size={13} />
          <span>Xóa</span>
        </button>
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
            <ChevronDown size={12} />
            <span>Gửi</span>
          </button>
          {dropdownGui && (
            <div className={styles.dropdownMenu}>
              <button
                type="button"
                className={styles.dropdownItem}
                onClick={() => {
                  toast?.showToast('Đã gửi email.', 'success')
                  setDropdownGui(false)
                }}
              >
                <Mail size={13} /> Gửi Email
              </button>
              <button
                type="button"
                className={styles.dropdownItem}
                onClick={() => {
                  toast?.showToast('Đã gửi Zalo.', 'success')
                  setDropdownGui(false)
                }}
              >
                <MessageCircle size={13} /> Gửi Zalo
              </button>
            </div>
          )}
        </div>
        <div className={styles.filterWrap} style={{ marginLeft: 8 }}>
          <span className={styles.filterLabel}>Kỳ</span>
          <select
            className={styles.filterInput}
            value={filter.ky}
            onChange={(e) => {
              const kyInner = e.target.value as ChuyenTienBangKyValue
              if (kyInner === 'tat-ca') {
                setFilter({ ky: kyInner, tu: '', den: '' })
                return
              }
              const range = getDateRangeForKy(kyInner)
              setFilter({ ky: kyInner, tu: range.tu, den: range.den })
            }}
          >
            {KY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
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
                const next: ChuyenTienBangFilter = { ...f, ky: 'tat-ca', tu: iso }
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
                      const next: ChuyenTienBangFilter = { ...f, ky: 'tat-ca', tu: iso }
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
                const next: ChuyenTienBangFilter = { ...f, ky: 'tat-ca', den: iso }
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
                      const next: ChuyenTienBangFilter = { ...f, ky: 'tat-ca', den: iso }
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
          <Search
            size={14}
            style={{
              position: 'absolute',
              left: 10,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
              pointerEvents: 'none',
            }}
          />
          <input
            type="text"
            className={styles.searchInput}
            style={{ paddingLeft: 32, width: '100%' }}
            placeholder="Tìm mã phiếu, lý do, tài khoản…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-muted)' }}>
          {filtered.length} bản ghi · trang {pageSafe}/{totalPages}
        </span>
      </div>

      <div className={styles.contentArea}>
        <div className={styles.gridWrap} style={{ display: 'flex', flexDirection: 'column', maxWidth: '100%' }}>
          <div style={{ flex: 1, overflow: 'hidden', minHeight: 280 }}>
            <DataGrid<ChuyenTienBangRecord>
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
              summary={
                filtered.length > 0
                  ? [{ label: 'Tổng chuyển', value: formatNumberDisplay(tongTien, 0) }]
                  : []
              }
            />
          </div>
          <Pagination page={pageSafe} total={totalPages} onChange={setPage} />
        </div>
      </div>

      {contextMenu.open && contextMenu.row && (
        <div
          className={styles.contextMenu}
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className={styles.contextMenuItem}
            onClick={() => {
              moFormXem(contextMenu.row!)
              setContextMenu((m) => ({ ...m, open: false }))
            }}
          >
            <Eye size={13} /> Xem
          </button>
          <button
            type="button"
            className={styles.contextMenuItem}
            disabled={daGhiSoChuyenTien(contextMenu.row!)}
            style={{
              opacity: daGhiSoChuyenTien(contextMenu.row!) ? 0.45 : 1,
              cursor: daGhiSoChuyenTien(contextMenu.row!) ? 'default' : 'pointer',
            }}
            onClick={() => {
              const r = contextMenu.row!
              if (daGhiSoChuyenTien(r)) return
              moFormSua(r)
              setContextMenu((m) => ({ ...m, open: false }))
            }}
          >
            <Plus size={13} /> Sửa
          </button>
          <hr className={styles.contextMenuSep} />
          <button
            type="button"
            className={styles.contextMenuItem}
            disabled={daGhiSoChuyenTien(contextMenu.row!)}
            style={{
              opacity: daGhiSoChuyenTien(contextMenu.row!) ? 0.45 : 1,
              cursor: daGhiSoChuyenTien(contextMenu.row!) ? 'default' : 'pointer',
            }}
            onClick={async () => {
              const r = contextMenu.row!
              if (daGhiSoChuyenTien(r)) return
              const nguon = taiKhoanGetAll().find((t) => t.id === r.tk_nguon_id)
              const den = taiKhoanGetAll().find((t) => t.id === r.tk_den_id)
              if (!nguon || !den) {
                toast?.showToast('Không tìm thấy tài khoản nguồn/đích.', 'error')
                setContextMenu((m) => ({ ...m, open: false }))
                return
              }
              const tien = Math.round(Number(r.so_tien) || 0)
              if (!Number.isFinite(tien) || tien <= 0) {
                toast?.showToast('Số tiền chuyển không hợp lệ.', 'error')
                setContextMenu((m) => ({ ...m, open: false }))
                return
              }
              if (!hopLeCapTkChuyenTien(r.ly_do_chuyen, nguon, den)) {
                toast?.showToast('Lý do chuyển không khớp cặp tài khoản (NH / tiền mặt).', 'error')
                setContextMenu((m) => ({ ...m, open: false }))
                return
              }
              const duNguon = nguon.so_du_hien_tai
              if (duNguon !== undefined && Number.isFinite(duNguon) && tien > Math.round(duNguon)) {
                toast?.showToast('Số tiền chuyển vượt quá số dư tài khoản nguồn.', 'error')
                setContextMenu((m) => ({ ...m, open: false }))
                return
              }
              try {
                const { phieuThuId, phieuChiId } = await taoPhieuThuChiVaGhiSoTuChuyenTien({
                  ngay: r.ngay_chuyen.trim(),
                  soChuyen: r.so_chuyen_tien_bang.trim(),
                  lyDoUser: r.ly_do_chuyen.trim(),
                  tkNguon: nguon,
                  tkDen: den,
                  soTien: tien,
                })
                chuyenTienBangPatch(r.id, {
                  phieu_thu_tu_chuyen_id: phieuThuId,
                  phieu_chi_tu_chuyen_id: phieuChiId,
                })
                loadData()
                toast?.showToast('Đã ghi sổ — đã tạo phiếu thu và phiếu chi nội bộ.', 'success')
              } catch (err) {
                toast?.showToast(err instanceof Error ? err.message : 'Không tạo được phiếu.', 'error')
              }
              setContextMenu((m) => ({ ...m, open: false }))
            }}
          >
            <BookOpen size={13} /> Ghi sổ
          </button>
          <button
            type="button"
            className={styles.contextMenuItem}
            disabled={!daGhiSoChuyenTien(contextMenu.row!)}
            style={{
              opacity: !daGhiSoChuyenTien(contextMenu.row!) ? 0.45 : 1,
              cursor: !daGhiSoChuyenTien(contextMenu.row!) ? 'default' : 'pointer',
            }}
            onClick={() => {
              const r = contextMenu.row!
              if (!daGhiSoChuyenTien(r)) return
              huyGhiSoVaXoaPhieuThuChiTuChuyenTien(r)
              chuyenTienBangPatch(r.id, {
                phieu_thu_tu_chuyen_id: undefined,
                phieu_chi_tu_chuyen_id: undefined,
              })
              loadData()
              toast?.showToast('Đã hủy ghi sổ — đã xóa phiếu thu/chi liên quan.', 'info')
              setContextMenu((m) => ({ ...m, open: false }))
            }}
          >
            <BookX size={13} /> Hủy ghi
          </button>
          <hr className={styles.contextMenuSep} />
          <button
            type="button"
            className={styles.contextMenuItem}
            onClick={() => {
              toast?.showToast('Đã gửi email.', 'success')
              setContextMenu((m) => ({ ...m, open: false }))
            }}
          >
            <Mail size={13} /> Gửi Email
          </button>
          <button
            type="button"
            className={styles.contextMenuItem}
            onClick={() => {
              toast?.showToast('Đã gửi Zalo.', 'success')
              setContextMenu((m) => ({ ...m, open: false }))
            }}
          >
            <MessageCircle size={13} /> Gửi Zalo
          </button>
          <hr className={styles.contextMenuSep} />
          <button
            type="button"
            className={styles.contextMenuItem}
            style={{ color: '#dc2626' }}
            disabled={daGhiSoChuyenTien(contextMenu.row!)}
            onClick={() => {
              const r = contextMenu.row!
              if (daGhiSoChuyenTien(r)) return
              setXoaModalRow(r)
              setContextMenu((m) => ({ ...m, open: false }))
            }}
          >
            <Trash2 size={13} /> Xóa
          </button>
        </div>
      )}

      <ConfirmXoaCaptchaModal
        open={xoaModalRow != null}
        onClose={() => setXoaModalRow(null)}
        onConfirm={() => xoaModalRow && xacNhanXoa(xoaModalRow)}
        message={
          xoaModalRow ? (
            <>
              Xóa phiếu chuyển tiền <strong>{xoaModalRow.so_chuyen_tien_bang}</strong>?
              <br />
              <span style={{ color: '#dc2626' }}>Thao tác này không thể hoàn tác.</span>
            </>
          ) : null
        }
      />

      {showForm && (
        <div className={styles.modalOverlay}>
          <div
            ref={ChuyenTienFormDrag.containerRef}
            className={styles.modalBox}
            style={{
              ...ChuyenTienFormDrag.containerStyle,
              maxWidth: 560,
              width: '96%',
              height: 'auto',
              maxHeight: 'min(92vh, 720px)',
              minHeight: 0,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <ChuyenTienForm
              key={formKey}
              mode={formMode}
              initial={formMode === 'add' ? null : formRecord}
              onClose={() => setShowForm(false)}
              onSaved={loadData}
              onHeaderMouseDown={ChuyenTienFormDrag.dragHandleProps.onMouseDown}
              headerDragStyle={ChuyenTienFormDrag.dragHandleProps.style}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export function ChuyenTien({ onNavigate }: { onNavigate?: (tab: string) => void }) {
  return <ChuyenTienBangContent onNavigate={onNavigate} />
}
