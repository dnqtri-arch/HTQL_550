/**
 * Hợp đồng bán — danh sách + form.
 * Phân nhánh: "Lập từ báo giá" — tự động copy 100% chi tiết + khách hàng.
 * Nút "Lập phiếu xuất kho" tích hợp liên kết module xuatkho.
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Plus, Trash2, Eye, Mail, MessageCircle, FileText, ChevronDown, ChevronRight, ListChecks, Package } from 'lucide-react'
import { DataGrid, type DataGridColumn } from '../../../../components/common/dataGrid'
import { useToastOptional } from '../../../../context/toastContext'
import { matchSearchKeyword } from '../../../../utils/stringUtils'
import { formatNumberDisplay, formatSoThapPhan } from '../../../../utils/numberFormat'
import {
  hopDongBanChungTuGetAll,
  hopDongBanChungTuGetChiTiet,
  hopDongBanChungTuDelete,
  getDefaultHopDongBanChungTuFilter,
  getDateRangeForKy,
  KY_OPTIONS,
  hopDongBanSoHopDongTiepTheo,
  hopDongBanChungTuApiImpl,
  hopDongBanChungTuSetTinhTrang,
  TINH_TRANG_HOP_DONG_BAN_CHUNG_TU_DA_NHAN_HANG,
  type HopDongBanChungTuRecord,
  type HopDongBanChungTuChiTiet,
  type HopDongBanChungTuKyValue,
} from './hopDongBanChungTuApi'
import {
  baoGiaGetAll,
  baoGiaGetChiTiet,
  getDefaultBaoGiaFilter,
} from '../baoGia/baoGiaApi'
import type { HopDongBanChungTuFilter } from '../../../../types/hopDongBanChungTu'
import { buildHopDongBanChungTuPrefillFromBaoGia } from './baoGiaToHopDongBanChungTuPrefill'
import { HopDongBanForm } from './hopDongBanForm'
import { HopDongBanChungTuApiProvider } from './hopDongBanChungTuApiContext'
import { donViTinhGetAll } from '../../../kho/khoHang/donViTinhApi'
import { dvtHienThiLabel, type DvtListItem } from '../../../../utils/dvtHienThiLabel'
import { ConfirmXoaCaptchaModal } from '../../../../components/common/confirmXoaCaptchaModal'
import { HTQL_BAN_HANG_TAB_EVENT } from '../banHangTabEvent'
import { HTQL_NVTHH_SYNC_DHM_TINH_TRANG_EVENT } from '../../muaHang/muaHangTabEvent'
import { ghiNhanDoanhThuGetAll, getDefaultGhiNhanDoanhThuFilter } from '../ghiNhanDoanhThu/ghiNhanDoanhThuApi'
import styles from '../BanHang.module.css'

function Badge({ value }: { value: string }) {
  const cls =
    value === 'Đã xuất kho' ? styles.badgeDaXuatKho
    : value === TINH_TRANG_HOP_DONG_BAN_CHUNG_TU_DA_NHAN_HANG ? styles.badgeDaNhanHang
    : value === 'Đang thực hiện' ? styles.badgeDangThucHien
    : value === 'Hủy bỏ' ? styles.badgeDaHuy
    : value === 'Chưa thực hiện' ? styles.badgeChuaThucHien
    : styles.badgeDefault
  return <span className={cls}>{value}</span>
}

function formatNgay(iso: string | null | undefined): string {
  if (!iso) return ''
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/)
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso
}

// ─── Danh sách ───────────────────────────────────────────────────────────

const columns: DataGridColumn<HopDongBanChungTuRecord>[] = [
  { key: 'so_hop_dong', label: 'Mã HĐ', width: 88 },
  { key: 'nv_ban_hang', label: 'NV bán hàng', width: '10%' },
  { key: 'so_chung_tu_cukcuk', label: 'Hợp đồng bán', width: 160, renderCell: (v) => (v != null && String(v).trim() ? String(v) : '') },
  { key: 'ngay_lap_hop_dong', label: 'Ngày lập HĐ', width: 76, align: 'right', renderCell: (v) => formatNgay(v as string) },
  { key: 'ngay_cam_ket_giao', label: 'Ngày GH', width: 76, align: 'right', renderCell: (v) => formatNgay(v as string | null) },
  { key: 'khach_hang', label: 'Khách hàng', width: '20%' },
  { key: 'so_bao_gia_goc', label: 'Từ BG', width: 90, renderCell: (v) => v ? <span className={styles.sourceBadge}>{String(v)}</span> : '' },
  { key: 'tong_thanh_toan', label: 'Tổng tiền', width: 110, align: 'right', renderCell: (v) => formatNumberDisplay(Number(v), 0) },
  { key: 'tinh_trang', label: 'Trạng thái', width: 110, renderCell: (v) => <Badge value={String(v)} /> },
  { key: 'dien_giai', label: 'Ghi chú', width: '18%' },
]

function HopDongBanContent({ onNavigate: _onNavigate }: { onNavigate?: (tab: string) => void } = {}) {
  const toast = useToastOptional()
  const [filter, setFilter] = useState<HopDongBanChungTuFilter>(getDefaultHopDongBanChungTuFilter)
  const [danhSach, setDanhSach] = useState<HopDongBanChungTuRecord[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [chiTiet, setChiTiet] = useState<HopDongBanChungTuChiTiet[]>([])
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [formMode, setFormMode] = useState<'add' | 'edit' | 'view'>('add')
  const [formRecord, setFormRecord] = useState<HopDongBanChungTuRecord | null>(null)
  const [prefillTuBaoGiaHdb, setPrefillTuBaoGiaHdb] = useState<
    { prefillHdbCt: Partial<HopDongBanChungTuRecord>; prefillChiTiet: HopDongBanChungTuChiTiet[] } | undefined
  >(undefined)
  const [prefillCloneTuHopDongBanChungTu, setPrefillCloneTuHopDongBanChungTu] = useState<
    { prefillHdbCt: Partial<HopDongBanChungTuRecord>; prefillChiTiet: HopDongBanChungTuChiTiet[] } | undefined
  >(undefined)
  const [xoaModal, setXoaModal] = useState<HopDongBanChungTuRecord | null>(null)
  const [contextMenu, setContextMenu] = useState<{ open: boolean; x: number; y: number; row: HopDongBanChungTuRecord | null }>({ open: false, x: 0, y: 0, row: null })
  const [ctxSubmenuTaoGd, setCtxSubmenuTaoGd] = useState(false)
  const [formKey, setFormKey] = useState(0)
  const [dropdownTaoGd, setDropdownTaoGd] = useState(false)
  const dropdownTaoGdRef = useRef<HTMLDivElement>(null)
  const hoverTaoGdTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hoverCtxSubTaoGdRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [ctxThaoTacSubOpen, setCtxThaoTacSubOpen] = useState(false)
  const hoverCtxThaoTacRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const closeCtxThaoTacRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const SUBMENU_HOVER_DELAY_MS = 200
  const [dvtList, setDvtList] = useState<DvtListItem[]>([])

  const selectedRow = selectedId ? danhSach.find((r) => r.id === selectedId) ?? null : null
  const chiTietHienThiCoVat = selectedRow == null || selectedRow.ap_dung_vat_gtgt !== false

  const columnsChiTiet = useMemo((): DataGridColumn<HopDongBanChungTuChiTiet>[] => {
    const coBan: DataGridColumn<HopDongBanChungTuChiTiet>[] = [
      { key: 'stt', label: 'STT', width: 36, align: 'center', renderCell: (_v, _r, idx) => String((idx ?? 0) + 1) },
      { key: 'ma_hang', label: 'Mã SPHH', width: 88 },
      { key: 'ten_hang', label: 'Tên sản phẩm, hàng hóa', width: 200 },
      { key: 'noi_dung', label: 'Nội dung', width: 140, renderCell: (v) => (v != null && String(v).trim() ? String(v) : '') },
      { key: 'dvt', label: 'ĐVT', width: 68, renderCell: (v) => dvtHienThiLabel(v as string, dvtList) },
      { key: 'so_luong', label: 'Số lượng', width: 68, align: 'right', renderCell: (v) => formatSoThapPhan(Number(v), 2) },
      { key: 'don_gia', label: 'Đơn giá', width: 100, align: 'right', renderCell: (v) => formatNumberDisplay(Number(v), 0) },
      { key: 'thanh_tien', label: 'Thành tiền', width: 100, align: 'right', renderCell: (v) => formatNumberDisplay(Number(v), 0) },
    ]
    const cotThue: DataGridColumn<HopDongBanChungTuChiTiet>[] = chiTietHienThiCoVat
      ? [
          { key: 'pt_thue_gtgt', label: '% GTGT', width: 72, align: 'right', renderCell: (v) => v != null ? formatSoThapPhan(Number(v), 0) : '' },
          { key: 'tien_thue_gtgt', label: 'Tiền GTGT', width: 100, align: 'right', renderCell: (v) => v != null ? formatNumberDisplay(Number(v), 0) : '' },
        ]
      : []
    const cotDd: DataGridColumn<HopDongBanChungTuChiTiet> = {
      key: 'dd_th_index',
      label: 'ĐĐTH',
      width: 72,
      align: 'center',
      renderCell: (_v, row) => {
        const n = Number(row?.dd_th_index ?? 0)
        return Number.isFinite(n) ? `ĐĐTH ${n + 1}` : 'ĐĐTH 1'
      },
    }
    return [...coBan, ...cotThue, cotDd, { key: 'ghi_chu', label: 'Ghi chú', width: 160 }]
  }, [dvtList, chiTietHienThiCoVat])

  useEffect(() => {
    let c = false
    donViTinhGetAll().then((list) => {
      if (c || !Array.isArray(list)) return
      setDvtList(list)
    })
    return () => { c = true }
  }, [])

  const loadData = useCallback(() => setDanhSach(hopDongBanChungTuGetAll(filter)), [filter])
  useEffect(() => { loadData() }, [loadData])
  useEffect(() => {
    if (selectedId) setChiTiet(hopDongBanChungTuGetChiTiet(selectedId))
    else setChiTiet([])
  }, [selectedId])

  useEffect(() => {
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('htql_hop_dong_ban_from_baogia') : null
      if (!raw) return
      localStorage.removeItem('htql_hop_dong_ban_from_baogia')
      const d = JSON.parse(raw) as { bao_gia_id?: string }
      if (!d?.bao_gia_id) return
      const bg = baoGiaGetAll(getDefaultBaoGiaFilter()).find((r) => r.id === d.bao_gia_id)
      if (!bg) {
        toast?.showToast('Không tìm thấy báo giá nguồn cho nháp hợp đồng.', 'error')
        return
      }
      const ctBg = baoGiaGetChiTiet(bg.id)
      const so = hopDongBanSoHopDongTiepTheo()
      const { prefillHdbCt, prefillChiTiet } = buildHopDongBanChungTuPrefillFromBaoGia(bg, ctBg, so)
      setPrefillTuBaoGiaHdb({ prefillHdbCt, prefillChiTiet })
      setPrefillCloneTuHopDongBanChungTu(undefined)
      setFormRecord(null)
      setFormMode('add')
      setFormKey((k) => k + 1)
      setShowForm(true)
      toast?.showToast('Đã mở nháp hợp đồng bán từ báo giá.', 'success')
    } catch {
      /* ignore */
    }
  }, [toast])

  useEffect(() => {
    if (!contextMenu.open) {
      setCtxSubmenuTaoGd(false)
      setCtxThaoTacSubOpen(false)
    }
  }, [contextMenu.open])

  useEffect(() => {
    const onSyncNvthh = (e: Event) => {
      const id = (e as CustomEvent<{ doi_chieu_don_mua_id?: string }>).detail?.doi_chieu_don_mua_id?.trim()
      if (!id) return
      const coDhb = hopDongBanChungTuGetAll({ ky: 'tat-ca', tu: '', den: '' }).some((d) => d.id === id)
      if (!coDhb) return
      hopDongBanChungTuSetTinhTrang(id, TINH_TRANG_HOP_DONG_BAN_CHUNG_TU_DA_NHAN_HANG)
      loadData()
    }
    window.addEventListener(HTQL_NVTHH_SYNC_DHM_TINH_TRANG_EVENT, onSyncNvthh)
    return () => window.removeEventListener(HTQL_NVTHH_SYNC_DHM_TINH_TRANG_EVENT, onSyncNvthh)
  }, [loadData])

  const filtered = search.trim()
    ? danhSach.filter((r) => matchSearchKeyword(`${r.so_hop_dong} ${r.khach_hang} ${r.dien_giai ?? ''} ${r.tinh_trang} ${r.so_bao_gia_goc ?? ''}`, search))
    : danhSach

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (dropdownTaoGdRef.current && !dropdownTaoGdRef.current.contains(e.target as Node)) setDropdownTaoGd(false)
      setContextMenu((m) => (m.open ? { ...m, open: false } : m))
    }
    window.addEventListener('click', h)
    return () => window.removeEventListener('click', h)
  }, [])

  const tongTien = filtered.reduce((s, r) => s + r.tong_thanh_toan, 0)

  const resetFormPrefill = () => {
    setPrefillTuBaoGiaHdb(undefined)
    setPrefillCloneTuHopDongBanChungTu(undefined)
  }

  return (
    <div className={styles.root}>
      <div className={styles.toolbarWrap}>
        <button
          type="button"
          className={styles.toolbarBtn}
          onClick={() => {
            resetFormPrefill()
            setFormRecord(null)
            setFormMode('add')
            setFormKey((k) => k + 1)
            setShowForm(true)
          }}
        >
          <Plus size={13} /><span>Thêm</span>
        </button>
        <button type="button" className={styles.toolbarBtnDanger} disabled={!selectedId}
          onClick={() => selectedRow && setXoaModal(selectedRow)}>
          <Trash2 size={13} /><span>Xóa</span>
        </button>
        <div
          ref={dropdownTaoGdRef}
          className={styles.dropdownWrap}
          style={{ marginLeft: 0 }}
          onMouseEnter={() => {
            if (!selectedId) return
            if (hoverTaoGdTimeoutRef.current) clearTimeout(hoverTaoGdTimeoutRef.current)
            hoverTaoGdTimeoutRef.current = setTimeout(() => setDropdownTaoGd(true), 200)
          }}
          onMouseLeave={() => {
            if (hoverTaoGdTimeoutRef.current) clearTimeout(hoverTaoGdTimeoutRef.current)
            hoverTaoGdTimeoutRef.current = setTimeout(() => setDropdownTaoGd(false), 200)
          }}
        >
          <button type="button" className={styles.toolbarBtn} disabled={!selectedId}
            onClick={() => setDropdownTaoGd((v) => !v)}>
            <FileText size={13} /><span>Thanh toán</span><ChevronDown size={12} style={{ marginLeft: 2 }} />
          </button>
          {dropdownTaoGd && selectedRow && (
            <div className={styles.dropdownMenu}>
              <button type="button" className={styles.dropdownItem}
                onClick={() => {
                  toast?.showToast('Phiếu thu: tính năng đang phát triển, chưa gán module.', 'info')
                  setDropdownTaoGd(false)
                }}>
                <FileText size={13} /> Phiếu thu
              </button>
              <button type="button" className={styles.dropdownItem}
                onClick={() => {
                  toast?.showToast('Phiếu chi: tính năng đang phát triển, chưa gán module.', 'info')
                  setDropdownTaoGd(false)
                }}>
                <FileText size={13} /> Phiếu chi
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
              const ky = e.target.value as HopDongBanChungTuKyValue
              if (ky === 'tat-ca') {
                setFilter({ ky, tu: '', den: '' })
                return
              }
              const range = getDateRangeForKy(ky)
              setFilter({ ky, tu: range.tu, den: range.den })
            }}
          >
            {KY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        <input type="text" className={styles.searchInput} placeholder="Tìm mã đơn, KH, ghi chú, BG..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className={styles.contentArea}>
        <div className={styles.gridWrap}>
          <DataGrid<HopDongBanChungTuRecord>
            columns={columns} data={filtered} keyField="id" stripedRows compact height="100%"
            selectedRowId={selectedId}
            onRowSelect={(r) => setSelectedId(r.id)}
            onRowDoubleClick={(r) => {
              resetFormPrefill()
              setFormRecord(r)
              setFormMode('view')
              setFormKey((k) => k + 1)
              setShowForm(true)
            }}
            onRowContextMenu={(row, e) => { e.preventDefault(); setSelectedId(row.id); setContextMenu({ open: true, x: e.clientX, y: e.clientY, row }) }}
            summary={[
              { label: 'Tổng thanh toán', value: formatNumberDisplay(tongTien, 0) },
              { label: 'Số dòng', value: `= ${filtered.length}` },
            ]}
          />
        </div>
        <div className={styles.detailWrap}>
          <div className={styles.detailTabBar}>
            <button type="button" className={styles.detailTabActive}>Chi tiết SPHH</button>
          </div>
          <div className={styles.detailTabPanel}>
            <DataGrid<HopDongBanChungTuChiTiet>
              columns={columnsChiTiet} data={chiTiet} keyField="id" stripedRows compact height="100%"
              summary={[{ label: 'Thành tiền', value: formatNumberDisplay(chiTiet.reduce((s, c) => s + c.thanh_tien, 0), 0) }]}
            />
          </div>
        </div>
      </div>

      {contextMenu.open && contextMenu.row && (
        <div className={styles.contextMenu} style={{ left: contextMenu.x, top: contextMenu.y }} onClick={(e) => e.stopPropagation()}>
          <button type="button" className={styles.contextMenuItem} onClick={() => {
            resetFormPrefill()
            setFormRecord(contextMenu.row!)
            setFormMode('view')
            setFormKey((k) => k + 1)
            setShowForm(true)
            setContextMenu((m) => ({ ...m, open: false }))
          }}><Eye size={13} /> Xem</button>
          <button type="button" className={styles.contextMenuItem} onClick={() => {
            resetFormPrefill()
            setFormRecord(contextMenu.row!)
            setFormMode('edit')
            setFormKey((k) => k + 1)
            setShowForm(true)
            setContextMenu((m) => ({ ...m, open: false }))
          }}><Plus size={13} /> Sửa</button>
          <hr className={styles.contextMenuSep} />
          <div
            style={{ position: 'relative' }}
            onMouseEnter={() => {
              if (hoverCtxSubTaoGdRef.current) clearTimeout(hoverCtxSubTaoGdRef.current)
              hoverCtxSubTaoGdRef.current = setTimeout(() => setCtxSubmenuTaoGd(true), 200)
            }}
            onMouseLeave={() => {
              if (hoverCtxSubTaoGdRef.current) clearTimeout(hoverCtxSubTaoGdRef.current)
              hoverCtxSubTaoGdRef.current = setTimeout(() => setCtxSubmenuTaoGd(false), 200)
            }}
          >
            <div className={styles.contextMenuItem} style={{ cursor: 'default', justifyContent: 'space-between' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <FileText size={13} /> Thanh toán
              </span>
              <ChevronRight size={12} style={{ flexShrink: 0, opacity: 0.85 }} />
            </div>
            {ctxSubmenuTaoGd && contextMenu.row && (
              <div
                style={{
                  position: 'absolute',
                  left: '100%',
                  top: 0,
                  marginLeft: 4,
                  minWidth: 176,
                  zIndex: 4101,
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-strong)',
                  borderRadius: 4,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.22)',
                  padding: 4,
                }}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  className={styles.contextMenuItem}
                  onClick={() => {
                    toast?.showToast('Phiếu thu: tính năng đang phát triển, chưa gán module.', 'info')
                    setCtxSubmenuTaoGd(false)
                    setContextMenu((m) => ({ ...m, open: false }))
                  }}
                >
                  <FileText size={13} /> Phiếu thu
                </button>
                <button
                  type="button"
                  className={styles.contextMenuItem}
                  onClick={() => {
                    toast?.showToast('Phiếu chi: tính năng đang phát triển, chưa gán module.', 'info')
                    setCtxSubmenuTaoGd(false)
                    setContextMenu((m) => ({ ...m, open: false }))
                  }}
                >
                  <FileText size={13} /> Phiếu chi
                </button>
              </div>
            )}
          </div>
          <hr className={styles.contextMenuSep} />
          <div
            style={{ position: 'relative' }}
            onMouseEnter={() => {
              if (closeCtxThaoTacRef.current) {
                clearTimeout(closeCtxThaoTacRef.current)
                closeCtxThaoTacRef.current = null
              }
              if (hoverCtxThaoTacRef.current) clearTimeout(hoverCtxThaoTacRef.current)
              hoverCtxThaoTacRef.current = setTimeout(() => setCtxThaoTacSubOpen(true), SUBMENU_HOVER_DELAY_MS)
            }}
            onMouseLeave={() => {
              if (hoverCtxThaoTacRef.current) {
                clearTimeout(hoverCtxThaoTacRef.current)
                hoverCtxThaoTacRef.current = null
              }
              if (closeCtxThaoTacRef.current) clearTimeout(closeCtxThaoTacRef.current)
              closeCtxThaoTacRef.current = setTimeout(() => setCtxThaoTacSubOpen(false), SUBMENU_HOVER_DELAY_MS)
            }}
          >
            <div className={styles.contextMenuItem} style={{ cursor: 'default', justifyContent: 'space-between' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <ListChecks size={13} /> Thao tác
              </span>
              <ChevronRight size={12} style={{ flexShrink: 0, opacity: 0.85 }} />
            </div>
            {ctxThaoTacSubOpen && contextMenu.row && (() => {
              const w = typeof window !== 'undefined' ? window.innerWidth : 9999
              const SUBMENU_WIDTH = 200
              const GAP = 2
              const PAD = 16
              const submenuRightEdge = contextMenu.x + 180 + GAP + SUBMENU_WIDTH
              const submenuOnLeft = submenuRightEdge > (w - PAD)
              const row = contextMenu.row
              const isKhongDongY = row.tinh_trang === 'KH không đồng ý'
              const isDaNhan = row.tinh_trang === TINH_TRANG_HOP_DONG_BAN_CHUNG_TU_DA_NHAN_HANG
              const allPhieu = ghiNhanDoanhThuGetAll({ ...getDefaultGhiNhanDoanhThuFilter(), tu: '', den: '' })
              const coPhieu = allPhieu.some((p) => (p.doi_chieu_don_mua_id ?? '').trim() === row.id)
              const disNhan = isKhongDongY || isDaNhan || coPhieu
              return (
                <div
                  style={{
                    position: 'absolute',
                    ...(submenuOnLeft
                      ? { right: '100%', left: 'auto', marginRight: GAP, marginLeft: 0, top: 0 }
                      : { left: '100%', right: 'auto', marginLeft: GAP, marginRight: 0, top: 0 }),
                    minWidth: SUBMENU_WIDTH,
                    zIndex: 4100,
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-strong)',
                    borderRadius: 4,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.22)',
                    padding: 4,
                  }}
                  onMouseEnter={() => {
                    if (closeCtxThaoTacRef.current) {
                      clearTimeout(closeCtxThaoTacRef.current)
                      closeCtxThaoTacRef.current = null
                    }
                  }}
                  onMouseLeave={() => {
                    if (closeCtxThaoTacRef.current) clearTimeout(closeCtxThaoTacRef.current)
                    closeCtxThaoTacRef.current = setTimeout(() => setCtxThaoTacSubOpen(false), SUBMENU_HOVER_DELAY_MS)
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    className={styles.contextMenuItem}
                    style={{
                      opacity: disNhan ? 0.6 : 1,
                      color: disNhan ? 'var(--text-muted)' : undefined,
                      cursor: disNhan ? 'not-allowed' : 'pointer',
                    }}
                    disabled={disNhan}
                    title={
                      disNhan
                        ? coPhieu
                          ? 'Đơn đã có phiếu ghi nhận doanh thu'
                          : isDaNhan
                            ? 'Đơn đã nhận hàng'
                            : 'Trạng thái không cho phép'
                        : undefined
                    }
                    onClick={() => {
                      if (!row || disNhan) return
                      setCtxThaoTacSubOpen(false)
                      setContextMenu((m) => ({ ...m, open: false }))
                      window.dispatchEvent(
                        new CustomEvent(HTQL_BAN_HANG_TAB_EVENT, {
                          detail: {
                            tab: 'ghinhandoanhthu',
                            ghiNhanTuDonBan: { don: row, chiTiet: hopDongBanChungTuGetChiTiet(row.id) },
                          },
                        })
                      )
                    }}
                  >
                    <Package size={13} /> Nhận vật tư hàng hóa
                  </button>
                </div>
              )
            })()}
          </div>
          <hr className={styles.contextMenuSep} />
          <button
            type="button"
            className={styles.contextMenuItem}
            onClick={() => {
              toast?.showToast('Lệnh sản xuất: tính năng đang phát triển.', 'info')
              setContextMenu((m) => ({ ...m, open: false }))
            }}
          >
            <FileText size={13} /> Lệnh sản xuất
          </button>
          <hr className={styles.contextMenuSep} />
          <button type="button" className={styles.contextMenuItem} onClick={() => { toast?.showToast('Đã gửi Email.', 'success'); setContextMenu((m) => ({ ...m, open: false })) }}><Mail size={13} /> Gửi Email</button>
          <button type="button" className={styles.contextMenuItem} onClick={() => { toast?.showToast('Đã gửi Zalo.', 'success'); setContextMenu((m) => ({ ...m, open: false })) }}><MessageCircle size={13} /> Gửi Zalo</button>
          <hr className={styles.contextMenuSep} />
          <button type="button" className={styles.contextMenuItem} style={{ color: '#dc2626' }} onClick={() => { setXoaModal(contextMenu.row!); setContextMenu((m) => ({ ...m, open: false })) }}><Trash2 size={13} /> Xóa</button>
        </div>
      )}

      <ConfirmXoaCaptchaModal
        open={xoaModal != null}
        onClose={() => setXoaModal(null)}
        onConfirm={() => {
          if (!xoaModal) return
          hopDongBanChungTuDelete(xoaModal.id)
          loadData()
          if (selectedId === xoaModal.id) setSelectedId(null)
          toast?.showToast(`Đã xóa ${xoaModal.so_hop_dong}.`, 'info')
          setXoaModal(null)
        }}
        message={
          xoaModal ? (
            <>
              Xóa hợp đồng bán <strong>{xoaModal.so_hop_dong}</strong> — <strong>{xoaModal.khach_hang}</strong>?<br />
              <span style={{ color: '#dc2626' }}>Thao tác này không thể hoàn tác.</span>
            </>
          ) : null
        }
      />

      {showForm && (
        <div className={styles.modalOverlay} onClick={() => { resetFormPrefill(); setShowForm(false) }}>
          <div
            className={styles.modalBoxLarge}
            style={{ height: '90vh', width: 'min(99vw, 1580px)', maxWidth: 'min(99vw, 1580px)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <HopDongBanForm
              key={formKey}
              readOnly={formMode === 'view'}
              initialHdbCt={formMode === 'view' || formMode === 'edit' ? (formRecord ?? undefined) : null}
              initialChiTiet={formRecord ? hopDongBanChungTuGetChiTiet(formRecord.id) : undefined}
              prefillHdbCt={formMode === 'add' ? (prefillTuBaoGiaHdb?.prefillHdbCt ?? prefillCloneTuHopDongBanChungTu?.prefillHdbCt) : undefined}
              prefillChiTiet={formMode === 'add' ? (prefillTuBaoGiaHdb?.prefillChiTiet ?? prefillCloneTuHopDongBanChungTu?.prefillChiTiet) : undefined}
              onClose={() => { resetFormPrefill(); setShowForm(false) }}
              onSaved={() => { resetFormPrefill(); setShowForm(false); loadData() }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export function HopDongBan(props: { onNavigate?: (tab: string) => void } = {}) {
  return (
    <HopDongBanChungTuApiProvider api={hopDongBanChungTuApiImpl}>
      <HopDongBanContent {...props} />
    </HopDongBanChungTuApiProvider>
  )
}

export { HopDongBanForm } from './hopDongBanForm'
export type { HopDongBanFormProps } from './hopDongBanForm'
