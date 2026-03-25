/**
 * Danh sách Báo giá — YC23: Tách file, chỉ giữ logic List
 * Form được tách sang baoGiaForm.tsx
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import {
  Plus, Trash2, Eye, Mail, MessageCircle, ChevronDown,
  ChevronLeft, ChevronRight, FileText,
} from 'lucide-react'
import { DataGrid, type DataGridColumn } from '../../../components/common/dataGrid'
import { Modal } from '../../../components/common/modal'
import { useToastOptional } from '../../../context/toastContext'
import { matchSearchKeyword } from '../../../utils/stringUtils'
import { formatNumberDisplay } from '../../../utils/numberFormat'
import {
  baoGiaGetAll,
  baoGiaGetChiTiet,
  baoGiaDelete,
  getDefaultBaoGiaFilter,
  KY_OPTIONS,
  type BaoGiaRecord,
  type BaoGiaChiTiet,
  type BaoGiaKyValue,
  type BaoGiaFilter,
} from './baoGiaApi'
import { BaoGiaForm } from './baoGiaForm'
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
  { key: 'stt',              label: 'STT',             width: 36, align: 'center', renderCell: (_v, _r, idx) => String((idx ?? 0) + 1) },
  { key: 'ma_hang',          label: 'Mã VTHH',         width: 88 },
  { key: 'ten_hang',         label: 'Tên VTHH',        width: 180 },
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

// ─── Màn hình danh sách Báo giá ──────────────────────────────────────────────
export function BaoGia() {
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
            onChange={(e) => setFilter((f) => ({ ...f, ky: e.target.value as BaoGiaKyValue }))}>
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
