/**
 * Đơn hàng bán — danh sách + form.
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
  donHangBanGetAll,
  donHangBanGetChiTiet,
  donHangBanDelete,
  getDefaultDonHangBanChungTuFilter,
  getDateRangeForKy,
  KY_OPTIONS,
  donHangBanSoDonHangTiepTheo,
  donHangBanChungTuApiImpl,
  donHangBanSetTinhTrang,
  TINH_TRANG_DON_HANG_BAN_DA_NHAN_HANG,
  TINH_TRANG_DON_HANG_BAN_DA_THU_TIEN,
  donHangBanGanKetThuTienTuPhieu,
  donHangBanQuetThuTienOrphanVaHoanTac,
  type DonHangBanChungTuRecord,
  type DonHangBanChungTuChiTiet,
  type DonHangBanChungTuKyValue,
} from './donHangBanChungTuApi'
import {
  baoGiaGetAll,
  baoGiaGetChiTiet,
  getDefaultBaoGiaFilter,
} from '../baoGia/baoGiaApi'
import type { DonHangBanChungTuFilter } from '../../../../types/donHangBanChungTu'
import { buildDonHangBanChungTuPrefillFromBaoGia } from './baoGiaToDonHangBanChungTuPrefill'
import { DonHangBanForm } from './donHangBanForm'
import { DonHangBanChungTuApiProvider } from './donHangBanChungTuApiContext'
import { donViTinhGetAll } from '../../../kho/khoHang/donViTinhApi'
import { dvtHienThiLabel, type DvtListItem } from '../../../../utils/dvtHienThiLabel'
import { ConfirmXoaCaptchaModal } from '../../../../components/common/confirmXoaCaptchaModal'
import { useDraggable } from '../../../../hooks/useDraggable'
import { HTQL_BAN_HANG_TAB_EVENT, HTQL_DON_HANG_BAN_LIST_REFRESH_EVENT } from '../banHangTabEvent'
import { HTQL_NVTHH_SYNC_DHM_TINH_TRANG_EVENT } from '../../muaHang/muaHangTabEvent'
import { ghiNhanDoanhThuGetAll, getDefaultGhiNhanDoanhThuFilter } from '../ghiNhanDoanhThu/ghiNhanDoanhThuApi'
import styles from '../BanHang.module.css'
import { ThuTienForm } from '../../../taiChinh/thuTien/thuTienForm'
import { ThuTienBangApiProvider } from '../../../taiChinh/thuTien/thuTienBangApiContext'
import { thuTienBangApiImpl } from '../../../taiChinh/thuTien/thuTienBangApi'
import { buildThuTienBangPrefillFromDonHangBan } from '../../../taiChinh/thuTien/donHangBanToThuTienBangPrefill'
import { tinhDaThuVaConLaiChoDonHangBan } from '../../../taiChinh/thuTien/chungTuCongNoKhach'
import type { ThuTienBangChiTiet, ThuTienBangRecord } from '../../../../types/thuTienBang'
import { thuTienBangGetAll } from '../../../taiChinh/thuTien/thuTienBangApi'

function Badge({ value }: { value: string }) {
  const cls =
    value === 'Đã xuất kho' ? styles.badgeDaXuatKho
    : value === TINH_TRANG_DON_HANG_BAN_DA_NHAN_HANG ? styles.badgeDaNhanHang
    : value === TINH_TRANG_DON_HANG_BAN_DA_THU_TIEN ? styles.badgeDaThuTien
    : value === 'Đang thực hiện' ? styles.badgeDangThucHien
    : value === 'Hủy bỏ' ? styles.badgeDaHuy
    : value === 'Chưa thực hiện' ? styles.badgeChuaThucHien
    : styles.badgeDefault
  return <span className={cls}>{value}</span>
}

function BadgeCongNo() {
  return <span className={styles.badgeDangThucHien}>Công nợ</span>
}

function formatNgay(iso: string | null | undefined): string {
  if (!iso) return ''
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/)
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso
}

// ─── Danh sách ───────────────────────────────────────────────────────────

function DonHangBanContent({ onNavigate: _onNavigate }: { onNavigate?: (tab: string) => void } = {}) {
  const toast = useToastOptional()
  const [filter, setFilter] = useState<DonHangBanChungTuFilter>(getDefaultDonHangBanChungTuFilter)
  const [danhSach, setDanhSach] = useState<DonHangBanChungTuRecord[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [chiTiet, setChiTiet] = useState<DonHangBanChungTuChiTiet[]>([])
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [formMode, setFormMode] = useState<'add' | 'edit' | 'view'>('add')
  const [formRecord, setFormRecord] = useState<DonHangBanChungTuRecord | null>(null)
  const [prefillTuBaoGia, setPrefillTuBaoGia] = useState<
    { prefillDhb: Partial<DonHangBanChungTuRecord>; prefillChiTiet: DonHangBanChungTuChiTiet[] } | undefined
  >(undefined)
  const [prefillCloneTuDonHangBan, setPrefillCloneTuDonHangBan] = useState<
    { prefillDhb: Partial<DonHangBanChungTuRecord>; prefillChiTiet: DonHangBanChungTuChiTiet[] } | undefined
  >(undefined)
  const [xoaModal, setXoaModal] = useState<DonHangBanChungTuRecord | null>(null)
  const [contextMenu, setContextMenu] = useState<{ open: boolean; x: number; y: number; row: DonHangBanChungTuRecord | null }>({ open: false, x: 0, y: 0, row: null })
  const [ctxSubmenuTaoGd, setCtxSubmenuTaoGd] = useState(false)
  const [formKey, setFormKey] = useState(0)
  const thuTienLinkDonHangBanIdRef = useRef<string | null>(null)
  const [showThuTienModal, setShowThuTienModal] = useState(false)
  const [thuTienPrefill, setThuTienPrefill] = useState<{
    prefillDon: Partial<ThuTienBangRecord>
    prefillChiTiet: ThuTienBangChiTiet[]
  } | null>(null)
  const [thuTienFormKey, setThuTienFormKey] = useState(0)
  const [dropdownTaoGd, setDropdownTaoGd] = useState(false)
  const dropdownTaoGdRef = useRef<HTMLDivElement>(null)
  const hoverTaoGdTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hoverCtxSubTaoGdRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [ctxThaoTacSubOpen, setCtxThaoTacSubOpen] = useState(false)
  const hoverCtxThaoTacRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const closeCtxThaoTacRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const SUBMENU_HOVER_DELAY_MS = 200
  const [dvtList, setDvtList] = useState<DvtListItem[]>([])
  const thuTienModalDrag = useDraggable()
  const donHangBanFormDrag = useDraggable()

  const selectedRow = selectedId ? danhSach.find((r) => r.id === selectedId) ?? null : null
  const chiTietHienThiCoVat = selectedRow == null || selectedRow.ap_dung_vat_gtgt !== false

  const thuCongNoById = useMemo(() => {
    const m = new Map<string, { da_thu: number; con_lai: number }>()
    for (const r of danhSach) {
      m.set(r.id, tinhDaThuVaConLaiChoDonHangBan(r))
    }
    return m
  }, [danhSach])

  const columns = useMemo((): DataGridColumn<DonHangBanChungTuRecord>[] => {
    return [
      { key: 'so_don_hang', label: 'Mã ĐHB', width: 88 },
      { key: 'nv_ban_hang', label: 'NV bán hàng', width: '10%' },
      { key: 'so_chung_tu_cukcuk', label: 'Đơn hàng bán', width: 160, renderCell: (v) => (v != null && String(v).trim() ? String(v) : '') },
      { key: 'ngay_don_hang', label: 'Ngày ĐH', width: 76, align: 'right', renderCell: (v) => formatNgay(v as string) },
      { key: 'ngay_giao_hang', label: 'Ngày GH', width: 76, align: 'right', renderCell: (v) => formatNgay(v as string | null) },
      { key: 'khach_hang', label: 'Khách hàng', width: '20%' },
      { key: 'so_bao_gia_goc', label: 'Từ BG', width: 90, renderCell: (v) => v ? <span className={styles.sourceBadge}>{String(v)}</span> : '' },
      { key: 'tong_thanh_toan', label: 'Tổng tiền', width: 120, align: 'right', renderCell: (v) => formatNumberDisplay(Number(v), 0) },
      {
        key: 'da_thu',
        label: 'Đã thu',
        width: 100,
        align: 'right',
        renderCell: (_v, row) => formatNumberDisplay(thuCongNoById.get(row.id)?.da_thu ?? 0, 0),
      },
      {
        key: 'con_lai',
        label: 'Còn lại',
        width: 100,
        align: 'right',
        renderCell: (_v, row) => formatNumberDisplay(thuCongNoById.get(row.id)?.con_lai ?? 0, 0),
      },
      {
        key: 'tinh_trang',
        label: 'Trạng thái',
        width: 110,
        renderCell: (v, row) => {
          const cl = thuCongNoById.get(row.id)?.con_lai ?? 0
          if (cl > 0) return <BadgeCongNo />
          return <Badge value={String(v)} />
        },
      },
      { key: 'dien_giai', label: 'Ghi chú', width: '18%' },
    ]
  }, [thuCongNoById])

  const columnsChiTiet = useMemo((): DataGridColumn<DonHangBanChungTuChiTiet>[] => {
    const coBan: DataGridColumn<DonHangBanChungTuChiTiet>[] = [
      { key: 'stt', label: 'STT', width: 36, align: 'center', renderCell: (_v, _r, idx) => String((idx ?? 0) + 1) },
      { key: 'ma_hang', label: 'Mã SPHH', width: 88 },
      { key: 'ten_hang', label: 'Tên sản phẩm, hàng hóa', width: 200 },
      { key: 'noi_dung', label: 'Nội dung', width: 140, renderCell: (v) => (v != null && String(v).trim() ? String(v) : '') },
      { key: 'dvt', label: 'ĐVT', width: 68, renderCell: (v) => dvtHienThiLabel(v as string, dvtList) },
      { key: 'so_luong', label: 'Số lượng', width: 68, align: 'right', renderCell: (v) => formatSoThapPhan(Number(v), 2) },
      { key: 'don_gia', label: 'Đơn giá', width: 100, align: 'right', renderCell: (v) => formatNumberDisplay(Number(v), 0) },
      { key: 'thanh_tien', label: 'Thành tiền', width: 100, align: 'right', renderCell: (v) => formatNumberDisplay(Number(v), 0) },
    ]
    const cotThue: DataGridColumn<DonHangBanChungTuChiTiet>[] = chiTietHienThiCoVat
      ? [
          { key: 'pt_thue_gtgt', label: '% GTGT', width: 72, align: 'right', renderCell: (v) => v != null ? formatSoThapPhan(Number(v), 0) : '' },
          { key: 'tien_thue_gtgt', label: 'Tiền GTGT', width: 100, align: 'right', renderCell: (v) => v != null ? formatNumberDisplay(Number(v), 0) : '' },
        ]
      : []
    const cotDd: DataGridColumn<DonHangBanChungTuChiTiet> = {
      key: 'dd_gh_index',
      label: 'ĐĐGH',
      width: 72,
      align: 'center',
      renderCell: (_v, row) => {
        const n = Number(row?.dd_gh_index ?? 0)
        return Number.isFinite(n) ? `ĐĐGH ${n + 1}` : 'ĐĐGH 1'
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

  const loadData = useCallback(() => {
    const tatCaPhieuThu = thuTienBangGetAll({ ky: 'tat-ca', tu: '', den: '' })
    const idPhieuThuConTonTai = new Set(tatCaPhieuThu.map((p) => p.id))
    donHangBanQuetThuTienOrphanVaHoanTac(idPhieuThuConTonTai)
    setDanhSach(donHangBanGetAll(filter))
  }, [filter])
  useEffect(() => { loadData() }, [loadData])
  useEffect(() => {
    if (selectedId) setChiTiet(donHangBanGetChiTiet(selectedId))
    else setChiTiet([])
  }, [selectedId])

  useEffect(() => {
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('htql_don_hang_ban_from_baogia') : null
      if (!raw) return
      localStorage.removeItem('htql_don_hang_ban_from_baogia')
      const d = JSON.parse(raw) as { bao_gia_id?: string }
      if (!d?.bao_gia_id) return
      const bg = baoGiaGetAll(getDefaultBaoGiaFilter()).find((r) => r.id === d.bao_gia_id)
      if (!bg) {
        toast?.showToast('Không tìm thấy báo giá nguồn cho nháp đơn hàng.', 'error')
        return
      }
      const ctBg = baoGiaGetChiTiet(bg.id)
      const so = donHangBanSoDonHangTiepTheo()
      const { prefillDhb, prefillChiTiet } = buildDonHangBanChungTuPrefillFromBaoGia(bg, ctBg, so)
      setPrefillTuBaoGia({ prefillDhb, prefillChiTiet })
      setPrefillCloneTuDonHangBan(undefined)
      setFormRecord(null)
      setFormMode('add')
      setFormKey((k) => k + 1)
      setShowForm(true)
      toast?.showToast('Đã mở nháp đơn hàng bán từ báo giá.', 'success')
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
    const onRefreshList = () => loadData()
    window.addEventListener(HTQL_DON_HANG_BAN_LIST_REFRESH_EVENT, onRefreshList)
    return () => window.removeEventListener(HTQL_DON_HANG_BAN_LIST_REFRESH_EVENT, onRefreshList)
  }, [loadData])

  useEffect(() => {
    const onSyncNvthh = (e: Event) => {
      const id = (e as CustomEvent<{ doi_chieu_don_mua_id?: string }>).detail?.doi_chieu_don_mua_id?.trim()
      if (!id) return
      const coDhb = donHangBanGetAll({ ky: 'tat-ca', tu: '', den: '' }).some((d) => d.id === id)
      if (!coDhb) return
      donHangBanSetTinhTrang(id, TINH_TRANG_DON_HANG_BAN_DA_NHAN_HANG)
      loadData()
    }
    window.addEventListener(HTQL_NVTHH_SYNC_DHM_TINH_TRANG_EVENT, onSyncNvthh)
    return () => window.removeEventListener(HTQL_NVTHH_SYNC_DHM_TINH_TRANG_EVENT, onSyncNvthh)
  }, [loadData])

  const filtered = search.trim()
    ? danhSach.filter((r) => matchSearchKeyword(`${r.so_don_hang} ${r.khach_hang} ${r.dien_giai ?? ''} ${r.tinh_trang} ${r.so_bao_gia_goc ?? ''}`, search))
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
    setPrefillTuBaoGia(undefined)
    setPrefillCloneTuDonHangBan(undefined)
  }

  const moThuTienTuDonHang = (row: DonHangBanChungTuRecord) => {
    if (row.tinh_trang === TINH_TRANG_DON_HANG_BAN_DA_THU_TIEN) return
    const ct = donHangBanGetChiTiet(row.id)
    const { prefillDon, prefillChiTiet } = buildThuTienBangPrefillFromDonHangBan(row, ct)
    thuTienLinkDonHangBanIdRef.current = row.id
    setThuTienPrefill({ prefillDon, prefillChiTiet })
    setThuTienFormKey((k) => k + 1)
    setShowThuTienModal(true)
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
        <button
          type="button"
          className={styles.toolbarBtnDanger}
          disabled={!selectedId || selectedRow?.tinh_trang === TINH_TRANG_DON_HANG_BAN_DA_THU_TIEN}
          onClick={() => selectedRow && setXoaModal(selectedRow)}
        >
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
            <FileText size={13} /><span>Tạo giao dịch</span><ChevronDown size={12} style={{ marginLeft: 2 }} />
          </button>
          {dropdownTaoGd && selectedRow && (
            <div className={styles.dropdownMenu}>
              <button
                type="button"
                className={styles.dropdownItem}
                disabled={selectedRow.tinh_trang === TINH_TRANG_DON_HANG_BAN_DA_THU_TIEN}
                style={{
                  opacity: selectedRow.tinh_trang === TINH_TRANG_DON_HANG_BAN_DA_THU_TIEN ? 0.55 : 1,
                  cursor: selectedRow.tinh_trang === TINH_TRANG_DON_HANG_BAN_DA_THU_TIEN ? 'not-allowed' : 'pointer',
                }}
                onClick={() => {
                  if (selectedRow.tinh_trang === TINH_TRANG_DON_HANG_BAN_DA_THU_TIEN) return
                  moThuTienTuDonHang(selectedRow)
                  setDropdownTaoGd(false)
                }}
              >
                <FileText size={13} /> Thu tiền
              </button>
              <button
                type="button"
                className={styles.dropdownItem}
                disabled={!selectedRow || (thuCongNoById.get(selectedRow.id)?.con_lai ?? 0) <= 0}
                style={{
                  opacity:
                    !selectedRow || (thuCongNoById.get(selectedRow.id)?.con_lai ?? 0) <= 0 ? 0.45 : 1,
                }}
                onClick={() => {
                  if (!selectedRow || (thuCongNoById.get(selectedRow.id)?.con_lai ?? 0) <= 0) return
                  toast?.showToast('Phiếu chi: tính năng đang phát triển, chưa gán module.', 'info')
                  setDropdownTaoGd(false)
                }}
              >
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
              const ky = e.target.value as DonHangBanChungTuKyValue
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
          <DataGrid<DonHangBanChungTuRecord>
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
            <DataGrid<DonHangBanChungTuChiTiet>
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
          <button
            type="button"
            className={styles.contextMenuItem}
            disabled={contextMenu.row!.tinh_trang === TINH_TRANG_DON_HANG_BAN_DA_THU_TIEN}
            style={{
              opacity: contextMenu.row!.tinh_trang === TINH_TRANG_DON_HANG_BAN_DA_THU_TIEN ? 0.55 : 1,
              cursor: contextMenu.row!.tinh_trang === TINH_TRANG_DON_HANG_BAN_DA_THU_TIEN ? 'not-allowed' : 'pointer',
            }}
            onClick={() => {
              if (contextMenu.row!.tinh_trang === TINH_TRANG_DON_HANG_BAN_DA_THU_TIEN) return
              resetFormPrefill()
              setFormRecord(contextMenu.row!)
              setFormMode('edit')
              setFormKey((k) => k + 1)
              setShowForm(true)
              setContextMenu((m) => ({ ...m, open: false }))
            }}
          >
            <Plus size={13} /> Sửa
          </button>
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
                <FileText size={13} /> Tạo giao dịch
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
                  disabled={contextMenu.row!.tinh_trang === TINH_TRANG_DON_HANG_BAN_DA_THU_TIEN}
                  style={{
                    opacity: contextMenu.row!.tinh_trang === TINH_TRANG_DON_HANG_BAN_DA_THU_TIEN ? 0.55 : 1,
                    cursor: contextMenu.row!.tinh_trang === TINH_TRANG_DON_HANG_BAN_DA_THU_TIEN ? 'not-allowed' : 'pointer',
                  }}
                  onClick={() => {
                    const row = contextMenu.row
                    if (!row || row.tinh_trang === TINH_TRANG_DON_HANG_BAN_DA_THU_TIEN) return
                    moThuTienTuDonHang(row)
                    setCtxSubmenuTaoGd(false)
                    setContextMenu((m) => ({ ...m, open: false }))
                  }}
                >
                  <FileText size={13} /> Thu tiền
                </button>
                <button
                  type="button"
                  className={styles.contextMenuItem}
                  disabled={(thuCongNoById.get(contextMenu.row!.id)?.con_lai ?? 0) <= 0}
                  style={{
                    opacity: (thuCongNoById.get(contextMenu.row!.id)?.con_lai ?? 0) <= 0 ? 0.45 : 1,
                    cursor: (thuCongNoById.get(contextMenu.row!.id)?.con_lai ?? 0) <= 0 ? 'not-allowed' : 'pointer',
                  }}
                  onClick={() => {
                    const row = contextMenu.row
                    if (!row || (thuCongNoById.get(row.id)?.con_lai ?? 0) <= 0) return
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
              const isDaNhan = row.tinh_trang === TINH_TRANG_DON_HANG_BAN_DA_NHAN_HANG
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
                            ghiNhanTuDonBan: { don: row, chiTiet: donHangBanGetChiTiet(row.id) },
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
          <button
            type="button"
            className={styles.contextMenuItem}
            style={{
              color: '#dc2626',
              opacity: contextMenu.row!.tinh_trang === TINH_TRANG_DON_HANG_BAN_DA_THU_TIEN ? 0.55 : 1,
              cursor: contextMenu.row!.tinh_trang === TINH_TRANG_DON_HANG_BAN_DA_THU_TIEN ? 'not-allowed' : 'pointer',
            }}
            disabled={contextMenu.row!.tinh_trang === TINH_TRANG_DON_HANG_BAN_DA_THU_TIEN}
            onClick={() => {
              if (contextMenu.row!.tinh_trang === TINH_TRANG_DON_HANG_BAN_DA_THU_TIEN) return
              setXoaModal(contextMenu.row!)
              setContextMenu((m) => ({ ...m, open: false }))
            }}
          >
            <Trash2 size={13} /> Xóa
          </button>
        </div>
      )}

      {showThuTienModal && thuTienPrefill && (
        <div className={styles.modalOverlay}>
          <div
            ref={thuTienModalDrag.containerRef}
            className={styles.modalBox}
            style={thuTienModalDrag.containerStyle}
            onClick={(e) => e.stopPropagation()}
          >
            <ThuTienBangApiProvider api={thuTienBangApiImpl}>
              <ThuTienForm
                key={thuTienFormKey}
                formTitle="Phiếu thu tiền"
                thuTienPhieu
                soDonLabel="Mã phiếu thu"
                prefillDon={thuTienPrefill.prefillDon}
                prefillChiTiet={thuTienPrefill.prefillChiTiet}
                readOnly={false}
                onHeaderPointerDown={thuTienModalDrag.dragHandleProps.onMouseDown}
                headerDragStyle={thuTienModalDrag.dragHandleProps.style}
                onClose={() => {
                  setShowThuTienModal(false)
                  setThuTienPrefill(null)
                  thuTienLinkDonHangBanIdRef.current = null
                }}
                onSaved={(saved) => {
                  setShowThuTienModal(false)
                  setThuTienPrefill(null)
                  const linkId = thuTienLinkDonHangBanIdRef.current
                  thuTienLinkDonHangBanIdRef.current = null
                  if (saved && linkId) {
                    donHangBanGanKetThuTienTuPhieu(linkId, saved.id)
                    loadData()
                    toast?.showToast('Đã lưu phiếu thu — trạng thái đơn: Đã thu tiền.', 'success')
                  }
                }}
              />
            </ThuTienBangApiProvider>
          </div>
        </div>
      )}

      <ConfirmXoaCaptchaModal
        open={xoaModal != null}
        onClose={() => setXoaModal(null)}
        onConfirm={() => {
          if (!xoaModal) return
          donHangBanDelete(xoaModal.id)
          loadData()
          if (selectedId === xoaModal.id) setSelectedId(null)
          toast?.showToast(`Đã xóa ${xoaModal.so_don_hang}.`, 'info')
          setXoaModal(null)
        }}
        message={
          xoaModal ? (
            <>
              Xóa đơn hàng bán <strong>{xoaModal.so_don_hang}</strong> — <strong>{xoaModal.khach_hang}</strong>?<br />
              <span style={{ color: '#dc2626' }}>Thao tác này không thể hoàn tác.</span>
            </>
          ) : null
        }
      />

      {showForm && (
        <div className={styles.modalOverlay} onClick={() => { resetFormPrefill(); setShowForm(false) }}>
          <div
            ref={donHangBanFormDrag.containerRef}
            className={styles.modalBoxLarge}
            style={{ ...donHangBanFormDrag.containerStyle, width: 'min(99vw, 1580px)', maxWidth: 'min(99vw, 1580px)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <DonHangBanForm
              key={formKey}
              readOnly={formMode === 'view'}
              viewOnlyLocked={formMode === 'view'}
              initialDhb={formMode === 'view' || formMode === 'edit' ? (formRecord ?? undefined) : null}
              initialChiTiet={formRecord ? donHangBanGetChiTiet(formRecord.id) : undefined}
              prefillDhb={formMode === 'add' ? (prefillTuBaoGia?.prefillDhb ?? prefillCloneTuDonHangBan?.prefillDhb) : undefined}
              prefillChiTiet={formMode === 'add' ? (prefillTuBaoGia?.prefillChiTiet ?? prefillCloneTuDonHangBan?.prefillChiTiet) : undefined}
              onHeaderPointerDown={donHangBanFormDrag.dragHandleProps.onMouseDown}
              headerDragStyle={donHangBanFormDrag.dragHandleProps.style}
              onClose={() => { resetFormPrefill(); setShowForm(false) }}
              onSaved={() => { resetFormPrefill(); setShowForm(false); loadData() }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export function DonHangBan(props: { onNavigate?: (tab: string) => void } = {}) {
  return (
    <DonHangBanChungTuApiProvider api={donHangBanChungTuApiImpl}>
      <DonHangBanContent {...props} />
    </DonHangBanChungTuApiProvider>
  )
}
