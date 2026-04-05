/**
 * Phụ lục hợp đồng bán (PL HĐB) — danh sách + form.
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Plus, Trash2, Eye, Mail, MessageCircle, FileText, ChevronDown, ChevronRight, ListChecks, Package } from 'lucide-react'
import { DataGrid, type DataGridColumn, type DataGridSortState } from '../../../../components/common/dataGrid'
import { useToastOptional } from '../../../../context/toastContext'
import { matchSearchKeyword } from '../../../../utils/stringUtils'
import { formatNumberDisplay, formatSoThapPhan } from '../../../../utils/numberFormat'
import {
  phuLucHopDongBanChungTuGetAll,
  phuLucHopDongBanChungTuGetChiTiet,
  phuLucHopDongBanChungTuDelete,
  getDefaultPhuLucHopDongBanChungTuFilter,
  getDateRangeForKy,
  KY_OPTIONS,
  phuLucHopDongBanSoHopDongTiepTheo,
  phuLucHopDongBanChungTuApiImpl,
  phuLucHopDongBanChungTuSetTinhTrang,
  phuLucHopDongBanGanKetThuTienTuPhieu,
  phuLucHopDongBanGanKetChiTienTuPhieu,
  phuLucHopDongBanQuetThuTienOrphanVaHoanTac,
  phuLucHopDongBanQuetChiTienOrphanVaHoanTac,
  phuLucHopDongBanThuTienBangIdsLinked,
  phuLucHopDongBanChiTienBangIdsLinked,
  TINH_TRANG_HOP_DONG_BAN_CHUNG_TU_DA_NHAN_HANG,
  type PhuLucHopDongBanChungTuRecord,
  type PhuLucHopDongBanChungTuChiTiet,
  type PhuLucHopDongBanChungTuKyValue,
} from './phuLucHopDongBanChungTuApi'
import {
  baoGiaGetAll,
  baoGiaGetChiTiet,
  getDefaultBaoGiaFilter,
} from '../baoGia/baoGiaApi'
import type { PhuLucHopDongBanChungTuFilter } from '../../../../types/phuLucHopDongBanChungTu'
import { buildPhuLucHopDongBanChungTuPrefillFromBaoGia } from './baoGiaToPhuLucHopDongBanChungTuPrefill'
import { PhuLucHopDongBanForm } from './phuLucHopDongBanForm'
import { PhuLucHopDongBanChungTuApiProvider } from './phuLucHopDongBanChungTuApiContext'
import { donViTinhGetAll } from '../../../kho/khoHang/donViTinhApi'
import { dvtHienThiLabel, type DvtListItem } from '../../../../utils/dvtHienThiLabel'
import { ConfirmXoaCaptchaModal } from '../../../../components/common/confirmXoaCaptchaModal'
import { HTQL_BAN_HANG_TAB_EVENT, HTQL_HOP_DONG_BAN_LIST_REFRESH_EVENT, HTQL_PHU_LUC_HOP_DONG_BAN_LIST_REFRESH_EVENT } from '../banHangTabEvent'
import { HTQL_THU_TIEN_BANG_RELOAD_EVENT, thuTienBangGetAll } from '../../../taiChinh/thuTien/thuTienBangApi'
import { ThuTienForm } from '../../../taiChinh/thuTien/thuTienForm'
import { ThuTienBangApiProvider } from '../../../taiChinh/thuTien/thuTienBangApiContext'
import { thuTienBangApiImpl } from '../../../taiChinh/thuTien/thuTienBangApi'
import { buildThuTienBangPrefillFromPhuLucHopDongBan } from '../../../taiChinh/thuTien/hopDongBanToThuTienBangPrefill'
import type { ThuTienBangChiTiet, ThuTienBangRecord } from '../../../../types/thuTienBang'
import { useDraggable } from '../../../../hooks/useDraggable'
import { tinhDaThuVaConLaiChoPhuLucHopDongBan } from '../../../taiChinh/thuTien/chungTuCongNoKhach'
import { tinhDaThuVaConLaiChoPhuLucHopDongBan as tinhDaChiVaConLaiChoPhuLucHopDongBan } from '../../../taiChinh/chiTien/chungTuCongNoChiTien'
import { ChiTienForm } from '../../../taiChinh/chiTien/chiTienForm'
import { ChiTienBangApiProvider } from '../../../taiChinh/chiTien/chiTienBangApiContext'
import {
  ChiTienBangApiImpl,
  HTQL_CHI_TIEN_BANG_RELOAD_EVENT,
  chiTienBangGetAll,
} from '../../../taiChinh/chiTien/chiTienBangApi'
import { buildChiTienBangPrefillFromPhuLucHopDongBan } from '../../../taiChinh/chiTien/hopDongBanToChiTienBangPrefill'
import type { ChiTienBangChiTiet, ChiTienBangRecord } from '../../../../types/chiTienBang'
import { HTQL_NVTHH_SYNC_DHM_TINH_TRANG_EVENT } from '../../muaHang/muaHangTabEvent'
import { ghiNhanDoanhThuGetAll, getDefaultGhiNhanDoanhThuFilter } from '../ghiNhanDoanhThu/ghiNhanDoanhThuApi'
import styles from '../BanHang.module.css'
import { parseTrailingIntFromMa } from '../../../../utils/parseMaChungTuSuffix'
import { hopDongBanChungTuGetAll } from '../hopDongBan/hopDongBanChungTuApi'

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

function phuLucHopDongBanKhoaViDaTaoPhieuThuHoacChi(
  row: PhuLucHopDongBanChungTuRecord,
  phieuThuTonTai: Set<string>,
  phieuChiTonTai: Set<string>,
): boolean {
  const coThu = phuLucHopDongBanThuTienBangIdsLinked(row).some((tid) => tid && phieuThuTonTai.has(tid))
  const coChi = phuLucHopDongBanChiTienBangIdsLinked(row).some((cid) => cid && phieuChiTonTai.has(cid))
  return coThu || coChi
}

// ─── Danh sách ───────────────────────────────────────────────────────────

function PhuLucHopDongBanContent({ onNavigate: _onNavigate }: { onNavigate?: (tab: string) => void } = {}) {
  const toast = useToastOptional()
  const [filter, setFilter] = useState<PhuLucHopDongBanChungTuFilter>(getDefaultPhuLucHopDongBanChungTuFilter)
  const [danhSach, setDanhSach] = useState<PhuLucHopDongBanChungTuRecord[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [chiTiet, setChiTiet] = useState<PhuLucHopDongBanChungTuChiTiet[]>([])
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [formMode, setFormMode] = useState<'add' | 'edit' | 'view'>('add')
  const [formRecord, setFormRecord] = useState<PhuLucHopDongBanChungTuRecord | null>(null)
  const [prefillTuBaoGiaHdb, setPrefillTuBaoGiaHdb] = useState<
    { prefillHdbCt: Partial<PhuLucHopDongBanChungTuRecord>; prefillChiTiet: PhuLucHopDongBanChungTuChiTiet[] } | undefined
  >(undefined)
  const [prefillCloneTuPhuLucHopDongBanChungTu, setPrefillCloneTuPhuLucHopDongBanChungTu] = useState<
    { prefillHdbCt: Partial<PhuLucHopDongBanChungTuRecord>; prefillChiTiet: PhuLucHopDongBanChungTuChiTiet[] } | undefined
  >(undefined)
  const [xoaModal, setXoaModal] = useState<PhuLucHopDongBanChungTuRecord | null>(null)
  const [contextMenu, setContextMenu] = useState<{ open: boolean; x: number; y: number; row: PhuLucHopDongBanChungTuRecord | null }>({ open: false, x: 0, y: 0, row: null })
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
  const [phieuThuEpoch, setPhieuThuEpoch] = useState(0)
  const [phieuChiEpoch, setPhieuChiEpoch] = useState(0)
  const thuTienLinkPhuLucIdRef = useRef<string | null>(null)
  const [showThuTienModal, setShowThuTienModal] = useState(false)
  const [thuTienPrefill, setThuTienPrefill] = useState<{
    prefillDon: Partial<ThuTienBangRecord>
    prefillChiTiet: ThuTienBangChiTiet[]
  } | null>(null)
  const [thuTienFormKey, setThuTienFormKey] = useState(0)
  const chiTienLinkPhuLucIdRef = useRef<string | null>(null)
  const [showChiTienModal, setShowChiTienModal] = useState(false)
  const [chiTienPrefill, setChiTienPrefill] = useState<{
    prefillDon: Partial<ChiTienBangRecord>
    prefillChiTiet: ChiTienBangChiTiet[]
  } | null>(null)
  const [chiTienFormKey, setChiTienFormKey] = useState(0)
  const thuTienModalDrag = useDraggable()
  const chiTienModalDrag = useDraggable()
  const [listSortState, setListSortState] = useState<DataGridSortState[]>([])
  const [tinhTrangFilterSelected, setTinhTrangFilterSelected] = useState<string[]>([])

  const selectedRow = selectedId ? danhSach.find((r) => r.id === selectedId) ?? null : null

  const thuCongNoHdbById = useMemo(() => {
    const m = new Map<string, { da_thu: number; con_lai: number; tong_da_lap: number }>()
    for (const r of danhSach) {
      const x = tinhDaThuVaConLaiChoPhuLucHopDongBan(r)
      m.set(r.id, { da_thu: x.da_thu, con_lai: x.con_lai, tong_da_lap: x.tong_da_lap })
    }
    return m
  }, [danhSach, phieuThuEpoch])

  const phieuThuTonTai = useMemo(() => {
    void phieuThuEpoch
    return new Set(thuTienBangGetAll({ ky: 'tat-ca', tu: '', den: '' }).map((p) => p.id))
  }, [phieuThuEpoch, danhSach])

  const chiCongNoHdbById = useMemo(() => {
    const m = new Map<string, { da_thu: number; con_lai: number; tong_da_lap: number }>()
    for (const r of danhSach) {
      const x = tinhDaChiVaConLaiChoPhuLucHopDongBan(r)
      m.set(r.id, { da_thu: x.da_thu, con_lai: x.con_lai, tong_da_lap: x.tong_da_lap })
    }
    return m
  }, [danhSach, phieuChiEpoch])

  const phieuChiTonTai = useMemo(() => {
    void phieuChiEpoch
    return new Set(chiTienBangGetAll({ ky: 'tat-ca', tu: '', den: '' }).map((p) => p.id))
  }, [phieuChiEpoch, danhSach])

  const choPhepThuTienPhuLuc = (row: PhuLucHopDongBanChungTuRecord) => {
    const tong = Number(row.tong_thanh_toan) || 0
    if (tong <= 0) return false
    const ids = phuLucHopDongBanThuTienBangIdsLinked(row)
    if (ids.some((tid) => tid && !phieuThuTonTai.has(tid))) return true
    const cn = thuCongNoHdbById.get(row.id) ?? { da_thu: 0, con_lai: 0, tong_da_lap: 0 }
    return tong - cn.tong_da_lap > 0
  }

  const moThuTienTuPhuLuc = (row: PhuLucHopDongBanChungTuRecord) => {
    if (!choPhepThuTienPhuLuc(row)) return
    const ct = phuLucHopDongBanChungTuGetChiTiet(row.id)
    const { prefillDon, prefillChiTiet } = buildThuTienBangPrefillFromPhuLucHopDongBan(row, ct)
    thuTienLinkPhuLucIdRef.current = row.id
    setThuTienPrefill({ prefillDon, prefillChiTiet })
    setThuTienFormKey((k) => k + 1)
    setShowThuTienModal(true)
  }

  const choPhepChiTienPhuLuc = (row: PhuLucHopDongBanChungTuRecord) => {
    const tong = Number(row.tong_thanh_toan) || 0
    if (tong <= 0) return false
    const ids = phuLucHopDongBanChiTienBangIdsLinked(row)
    if (ids.some((cid) => cid && !phieuChiTonTai.has(cid))) return true
    const cn = chiCongNoHdbById.get(row.id) ?? { da_thu: 0, con_lai: 0, tong_da_lap: 0 }
    return tong - cn.tong_da_lap > 0
  }

  const coTheXoaPhuLucHopDongBan = (row: PhuLucHopDongBanChungTuRecord) => {
    const thuIds = phuLucHopDongBanThuTienBangIdsLinked(row).filter((tid) => tid && phieuThuTonTai.has(tid))
    const chiIds = phuLucHopDongBanChiTienBangIdsLinked(row).filter((cid) => cid && phieuChiTonTai.has(cid))
    return thuIds.length === 0 && chiIds.length === 0
  }

  const moChiTienTuPhuLuc = (row: PhuLucHopDongBanChungTuRecord) => {
    if (!choPhepChiTienPhuLuc(row)) return
    const ct = phuLucHopDongBanChungTuGetChiTiet(row.id)
    const { prefillDon, prefillChiTiet } = buildChiTienBangPrefillFromPhuLucHopDongBan(row, ct)
    chiTienLinkPhuLucIdRef.current = row.id
    setChiTienPrefill({ prefillDon, prefillChiTiet })
    setChiTienFormKey((k) => k + 1)
    setShowChiTienModal(true)
  }

  const hopDongSoTheoId = useMemo(() => {
    void phieuThuEpoch
    const m = new Map<string, string>()
    for (const h of hopDongBanChungTuGetAll({ ky: 'tat-ca', tu: '', den: '' })) {
      m.set(h.id, (h.so_hop_dong ?? '').trim())
    }
    return m
  }, [phieuThuEpoch])

  const columns = useMemo((): DataGridColumn<PhuLucHopDongBanChungTuRecord>[] => [
    { key: 'so_hop_dong', label: 'Mã PL', width: 88 },
    { key: 'hop_dong_goc', label: 'Số HĐ gốc', width: 92, renderCell: (_v, row) => {
      const idGoc = (row.hop_dong_ban_chung_tu_goc_id ?? '').trim()
      return idGoc ? (hopDongSoTheoId.get(idGoc) || '—') : ''
    } },
    { key: 'nv_ban_hang', label: 'NV bán hàng', width: '10%' },
    { key: 'so_chung_tu_cukcuk', label: 'PL HĐB thay đổi', width: 130, renderCell: (v) => (v != null && String(v).trim() ? String(v) : '') },
    { key: 'ngay_lap_hop_dong', label: 'Ngày lập PL', width: 76, align: 'right', renderCell: (v) => formatNgay(v as string) },
    { key: 'khach_hang', label: 'Khách hàng', width: '16%' },
    {
      key: 'ten_nguoi_lien_he',
      label: 'Người liên hệ',
      width: '12%',
      renderCell: (_v, row) => (row.ten_nguoi_lien_he != null && String(row.ten_nguoi_lien_he).trim() ? String(row.ten_nguoi_lien_he).trim() : ''),
    },
    {
      key: 'so_dien_thoai_lien_he',
      label: 'SĐT liên hệ',
      width: 100,
      renderCell: (_v, row) =>
        row.so_dien_thoai_lien_he != null && String(row.so_dien_thoai_lien_he).trim() ? String(row.so_dien_thoai_lien_he).trim() : '',
    },
    { key: 'so_bao_gia_goc', label: 'Từ BG', width: 90, renderCell: (v) => v ? <span className={styles.sourceBadge}>{String(v)}</span> : '' },
    { key: 'tong_thanh_toan', label: 'Tổng tiền', width: 110, align: 'right', renderCell: (v) => formatNumberDisplay(Number(v), 0) },
    {
      key: 'da_thu',
      label: 'Đã thu',
      width: 100,
      align: 'right',
      renderCell: (_v, row) => formatNumberDisplay(thuCongNoHdbById.get(row.id)?.da_thu ?? 0, 0),
    },
    {
      key: 'con_lai',
      label: 'Còn lại',
      width: 100,
      align: 'right',
      renderCell: (_v, row) => formatNumberDisplay(thuCongNoHdbById.get(row.id)?.con_lai ?? 0, 0),
    },
    {
      key: 'tinh_trang',
      label: 'Tình trạng',
      width: 110,
      filterable: true,
      renderCell: (v) => <Badge value={String(v)} />,
    },
    { key: 'dien_giai', label: 'Diễn giải PL', width: '18%' },
  ], [thuCongNoHdbById, hopDongSoTheoId])
  const chiTietHienThiCoVat = selectedRow == null || selectedRow.ap_dung_vat_gtgt !== false

  const columnsChiTiet = useMemo((): DataGridColumn<PhuLucHopDongBanChungTuChiTiet>[] => {
    const coBan: DataGridColumn<PhuLucHopDongBanChungTuChiTiet>[] = [
      { key: 'stt', label: 'STT', width: 36, align: 'center', renderCell: (_v, _r, idx) => String((idx ?? 0) + 1) },
      { key: 'ma_hang', label: 'Mã SPHH', width: 88 },
      { key: 'ten_hang', label: 'Tên sản phẩm, hàng hóa', width: 200 },
      { key: 'noi_dung', label: 'Nội dung', width: 140, renderCell: (v) => (v != null && String(v).trim() ? String(v) : '') },
      { key: 'dvt', label: 'ĐVT', width: 68, renderCell: (v) => dvtHienThiLabel(v as string, dvtList) },
      { key: 'so_luong', label: 'Số lượng', width: 68, align: 'right', renderCell: (v) => formatSoThapPhan(Number(v), 2) },
      { key: 'don_gia', label: 'Đơn giá', width: 100, align: 'right', renderCell: (v) => formatNumberDisplay(Number(v), 0) },
      { key: 'thanh_tien', label: 'Thành tiền', width: 100, align: 'right', renderCell: (v) => formatNumberDisplay(Number(v), 0) },
    ]
    const cotThue: DataGridColumn<PhuLucHopDongBanChungTuChiTiet>[] = chiTietHienThiCoVat
      ? [
          { key: 'pt_thue_gtgt', label: '% GTGT', width: 72, align: 'right', renderCell: (v) => v != null ? formatSoThapPhan(Number(v), 0) : '' },
          { key: 'tien_thue_gtgt', label: 'Tiền GTGT', width: 100, align: 'right', renderCell: (v) => v != null ? formatNumberDisplay(Number(v), 0) : '' },
        ]
      : []
    return [...coBan, ...cotThue, { key: 'ghi_chu', label: 'Ghi chú', width: 160 }]
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
    const idPhieuThu = new Set(thuTienBangGetAll({ ky: 'tat-ca', tu: '', den: '' }).map((p) => p.id))
    phuLucHopDongBanQuetThuTienOrphanVaHoanTac(idPhieuThu)
    const idPhieuChi = new Set(chiTienBangGetAll({ ky: 'tat-ca', tu: '', den: '' }).map((p) => p.id))
    phuLucHopDongBanQuetChiTienOrphanVaHoanTac(idPhieuChi)
    setDanhSach(phuLucHopDongBanChungTuGetAll(filter))
  }, [filter])
  useEffect(() => { loadData() }, [loadData])
  useEffect(() => {
    const h = () => {
      setPhieuThuEpoch((e) => e + 1)
      loadData()
    }
    window.addEventListener(HTQL_THU_TIEN_BANG_RELOAD_EVENT, h)
    return () => window.removeEventListener(HTQL_THU_TIEN_BANG_RELOAD_EVENT, h)
  }, [loadData])

  useEffect(() => {
    const h = () => {
      setPhieuChiEpoch((e) => e + 1)
      loadData()
    }
    window.addEventListener(HTQL_CHI_TIEN_BANG_RELOAD_EVENT, h)
    return () => window.removeEventListener(HTQL_CHI_TIEN_BANG_RELOAD_EVENT, h)
  }, [loadData])

  useEffect(() => {
    const h = () => loadData()
    window.addEventListener(HTQL_PHU_LUC_HOP_DONG_BAN_LIST_REFRESH_EVENT, h)
    return () => window.removeEventListener(HTQL_PHU_LUC_HOP_DONG_BAN_LIST_REFRESH_EVENT, h)
  }, [loadData])
  useEffect(() => {
    const bumpHopDongMap = () => setPhieuThuEpoch((e) => e + 1)
    window.addEventListener(HTQL_HOP_DONG_BAN_LIST_REFRESH_EVENT, bumpHopDongMap)
    return () => window.removeEventListener(HTQL_HOP_DONG_BAN_LIST_REFRESH_EVENT, bumpHopDongMap)
  }, [])
  useEffect(() => {
    if (selectedId) setChiTiet(phuLucHopDongBanChungTuGetChiTiet(selectedId))
    else setChiTiet([])
  }, [selectedId])

  useEffect(() => {
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('htql_phu_luc_hop_dong_ban_from_baogia') : null
      if (!raw) return
      localStorage.removeItem('htql_phu_luc_hop_dong_ban_from_baogia')
      const d = JSON.parse(raw) as { bao_gia_id?: string }
      if (!d?.bao_gia_id) return
      const bg = baoGiaGetAll(getDefaultBaoGiaFilter()).find((r) => r.id === d.bao_gia_id)
      if (!bg) {
        toast?.showToast('Không tìm thấy báo giá nguồn cho nháp phụ lục.', 'error')
        return
      }
      const ctBg = baoGiaGetChiTiet(bg.id)
      const so = phuLucHopDongBanSoHopDongTiepTheo()
      const { prefillHdbCt, prefillChiTiet } = buildPhuLucHopDongBanChungTuPrefillFromBaoGia(bg, ctBg, so)
      setPrefillTuBaoGiaHdb({ prefillHdbCt, prefillChiTiet })
      setPrefillCloneTuPhuLucHopDongBanChungTu(undefined)
      setFormRecord(null)
      setFormMode('add')
      setFormKey((k) => k + 1)
      setShowForm(true)
      toast?.showToast('Đã mở nháp phụ lục HĐ bán từ báo giá.', 'success')
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
      const coDhb = phuLucHopDongBanChungTuGetAll({ ky: 'tat-ca', tu: '', den: '' }).some((d) => d.id === id)
      if (!coDhb) return
      phuLucHopDongBanChungTuSetTinhTrang(id, TINH_TRANG_HOP_DONG_BAN_CHUNG_TU_DA_NHAN_HANG)
      loadData()
    }
    window.addEventListener(HTQL_NVTHH_SYNC_DHM_TINH_TRANG_EVENT, onSyncNvthh)
    return () => window.removeEventListener(HTQL_NVTHH_SYNC_DHM_TINH_TRANG_EVENT, onSyncNvthh)
  }, [loadData])

  const filtered = search.trim()
    ? danhSach.filter((r) => matchSearchKeyword(`${r.so_hop_dong} ${r.khach_hang} ${r.dien_giai ?? ''} ${r.tinh_trang} ${r.so_bao_gia_goc ?? ''}`, search))
    : danhSach

  const tinhTrangOptionsHdb = useMemo(() => {
    const set = new Set<string>()
    for (const r of filtered) {
      const t = (r.tinh_trang ?? '').trim()
      set.add(t || '(Trống)')
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'vi'))
  }, [filtered])

  const filteredByTinhTrangHdb = useMemo(() => {
    if (tinhTrangFilterSelected.length === 0) return filtered
    if (
      tinhTrangOptionsHdb.length > 0 &&
      tinhTrangFilterSelected.length >= tinhTrangOptionsHdb.length
    ) {
      return filtered
    }
    return filtered.filter((r) => {
      const t = (r.tinh_trang ?? '').trim() || '(Trống)'
      return tinhTrangFilterSelected.includes(t)
    })
  }, [filtered, tinhTrangFilterSelected, tinhTrangOptionsHdb])

  const sortedListHdb = useMemo(() => {
    const sort = listSortState.find((s) => s.key === 'so_hop_dong')
    const arr = [...filteredByTinhTrangHdb]
    if (!sort) return arr
    arr.sort((a, b) => {
      const na = parseTrailingIntFromMa(a.so_hop_dong)
      const nb = parseTrailingIntFromMa(b.so_hop_dong)
      const c = na - nb
      return sort.direction === 'asc' ? c : -c
    })
    return arr
  }, [filteredByTinhTrangHdb, listSortState])

  const chungTuDongBoChoFormPl = useMemo(() => {
    if (!formRecord) return null
    return danhSach.find((d) => d.id === formRecord.id) ?? formRecord
  }, [formRecord, danhSach])

  const hdbTinhTrangColumnFilter = useMemo(
    () => ({
      tinh_trang: {
        options: tinhTrangOptionsHdb,
        selected: tinhTrangFilterSelected,
        onChange: setTinhTrangFilterSelected,
      },
    }),
    [tinhTrangOptionsHdb, tinhTrangFilterSelected],
  )

  const coLocTinhTrangHdbHieuLuc =
    tinhTrangOptionsHdb.length > 0 &&
    tinhTrangFilterSelected.length > 0 &&
    tinhTrangFilterSelected.length < tinhTrangOptionsHdb.length

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (dropdownTaoGdRef.current && !dropdownTaoGdRef.current.contains(e.target as Node)) setDropdownTaoGd(false)
      setContextMenu((m) => (m.open ? { ...m, open: false } : m))
    }
    window.addEventListener('click', h)
    return () => window.removeEventListener('click', h)
  }, [])

  const tongTien = filteredByTinhTrangHdb.reduce((s, r) => s + r.tong_thanh_toan, 0)

  const resetFormPrefill = () => {
    setPrefillTuBaoGiaHdb(undefined)
    setPrefillCloneTuPhuLucHopDongBanChungTu(undefined)
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
        <button type="button" className={styles.toolbarBtnDanger} disabled={!selectedId || !selectedRow || !coTheXoaPhuLucHopDongBan(selectedRow)}
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
              <button
                type="button"
                className={styles.dropdownItem}
                disabled={!choPhepThuTienPhuLuc(selectedRow)}
                style={{
                  opacity: !choPhepThuTienPhuLuc(selectedRow) ? 0.55 : 1,
                  cursor: !choPhepThuTienPhuLuc(selectedRow) ? 'not-allowed' : 'pointer',
                }}
                onClick={() => {
                  if (!choPhepThuTienPhuLuc(selectedRow)) return
                  moThuTienTuPhuLuc(selectedRow)
                  setDropdownTaoGd(false)
                }}
              >
                <FileText size={13} /> Thu tiền
              </button>
              <button
                type="button"
                className={styles.dropdownItem}
                disabled={!selectedRow || !choPhepChiTienPhuLuc(selectedRow)}
                style={{
                  opacity: !selectedRow || !choPhepChiTienPhuLuc(selectedRow) ? 0.55 : 1,
                  cursor: !selectedRow || !choPhepChiTienPhuLuc(selectedRow) ? 'not-allowed' : 'pointer',
                }}
                onClick={() => {
                  if (!selectedRow || !choPhepChiTienPhuLuc(selectedRow)) return
                  moChiTienTuPhuLuc(selectedRow)
                  setDropdownTaoGd(false)
                }}
              >
                <FileText size={13} /> Chi tiền
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
              const ky = e.target.value as PhuLucHopDongBanChungTuKyValue
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

        <input type="text" className={styles.searchInput} placeholder="Tìm mã PL, KH, diễn giải, BG..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className={styles.contentArea}>
        <div className={styles.gridWrap}>
          <DataGrid<PhuLucHopDongBanChungTuRecord>
            columns={columns}
            data={sortedListHdb}
            keyField="id"
            stripedRows
            compact
            height="100%"
            sortableColumns={['so_hop_dong']}
            sortState={listSortState}
            onSortChange={setListSortState}
            columnFilterConfig={hdbTinhTrangColumnFilter}
            emptyDueToFilter={sortedListHdb.length === 0 && filtered.length > 0 && coLocTinhTrangHdbHieuLuc}
            onClearAllFilters={() => setTinhTrangFilterSelected([])}
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
              { label: 'Số dòng', value: `= ${sortedListHdb.length}` },
            ]}
          />
        </div>
        <div className={styles.detailWrap}>
          <div className={styles.detailTabBar}>
            <button type="button" className={styles.detailTabActive}>Chi tiết SPHH</button>
          </div>
          <div className={styles.detailTabPanel}>
            <DataGrid<PhuLucHopDongBanChungTuChiTiet>
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
            disabled={phuLucHopDongBanKhoaViDaTaoPhieuThuHoacChi(contextMenu.row!, phieuThuTonTai, phieuChiTonTai)}
            style={{
              opacity: phuLucHopDongBanKhoaViDaTaoPhieuThuHoacChi(contextMenu.row!, phieuThuTonTai, phieuChiTonTai) ? 0.55 : 1,
              cursor: phuLucHopDongBanKhoaViDaTaoPhieuThuHoacChi(contextMenu.row!, phieuThuTonTai, phieuChiTonTai) ? 'not-allowed' : 'pointer',
            }}
            onClick={() => {
              if (phuLucHopDongBanKhoaViDaTaoPhieuThuHoacChi(contextMenu.row!, phieuThuTonTai, phieuChiTonTai)) return
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
                  disabled={!choPhepThuTienPhuLuc(contextMenu.row!)}
                  style={{
                    opacity: !choPhepThuTienPhuLuc(contextMenu.row!) ? 0.55 : 1,
                    cursor: !choPhepThuTienPhuLuc(contextMenu.row!) ? 'not-allowed' : 'pointer',
                  }}
                  onClick={() => {
                    const row = contextMenu.row
                    if (!row || !choPhepThuTienPhuLuc(row)) return
                    moThuTienTuPhuLuc(row)
                    setCtxSubmenuTaoGd(false)
                    setContextMenu((m) => ({ ...m, open: false }))
                  }}
                >
                  <FileText size={13} /> Thu tiền
                </button>
                <button
                  type="button"
                  className={styles.contextMenuItem}
                  disabled={!choPhepChiTienPhuLuc(contextMenu.row!)}
                  style={{
                    opacity: !choPhepChiTienPhuLuc(contextMenu.row!) ? 0.55 : 1,
                    cursor: !choPhepChiTienPhuLuc(contextMenu.row!) ? 'not-allowed' : 'pointer',
                  }}
                  onClick={() => {
                    const row = contextMenu.row
                    if (!row || !choPhepChiTienPhuLuc(row)) return
                    moChiTienTuPhuLuc(row)
                    setCtxSubmenuTaoGd(false)
                    setContextMenu((m) => ({ ...m, open: false }))
                  }}
                >
                  <FileText size={13} /> Chi tiền
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
                            ghiNhanTuDonBan: { don: row, chiTiet: phuLucHopDongBanChungTuGetChiTiet(row.id) },
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
              opacity: phuLucHopDongBanKhoaViDaTaoPhieuThuHoacChi(contextMenu.row!, phieuThuTonTai, phieuChiTonTai) ? 0.55 : 1,
              cursor: phuLucHopDongBanKhoaViDaTaoPhieuThuHoacChi(contextMenu.row!, phieuThuTonTai, phieuChiTonTai) ? 'not-allowed' : 'pointer',
            }}
            disabled={phuLucHopDongBanKhoaViDaTaoPhieuThuHoacChi(contextMenu.row!, phieuThuTonTai, phieuChiTonTai)}
            onClick={() => {
              if (phuLucHopDongBanKhoaViDaTaoPhieuThuHoacChi(contextMenu.row!, phieuThuTonTai, phieuChiTonTai)) return
              setXoaModal(contextMenu.row!)
              setContextMenu((m) => ({ ...m, open: false }))
            }}
          >
            <Trash2 size={13} /> Xóa
          </button>
        </div>
      )}

      <ConfirmXoaCaptchaModal
        open={xoaModal != null}
        onClose={() => setXoaModal(null)}
        onConfirm={() => {
          if (!xoaModal) return
          phuLucHopDongBanChungTuDelete(xoaModal.id)
          loadData()
          if (selectedId === xoaModal.id) setSelectedId(null)
          toast?.showToast(`Đã xóa ${xoaModal.so_hop_dong}.`, 'info')
          setXoaModal(null)
        }}
        message={
          xoaModal ? (
            <>
              Xóa phụ lục HĐ bán <strong>{xoaModal.so_hop_dong}</strong> — <strong>{xoaModal.khach_hang}</strong>?<br />
              <span style={{ color: '#dc2626' }}>Thao tác này không thể hoàn tác.</span>
            </>
          ) : null
        }
      />

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
                phieuThuTuMenuBanHang
                soDonLabel="Mã phiếu thu"
                prefillDon={thuTienPrefill.prefillDon}
                prefillChiTiet={thuTienPrefill.prefillChiTiet}
                readOnly={false}
                onHeaderPointerDown={thuTienModalDrag.dragHandleProps.onMouseDown}
                headerDragStyle={thuTienModalDrag.dragHandleProps.style}
                onClose={() => {
                  setShowThuTienModal(false)
                  setThuTienPrefill(null)
                  thuTienLinkPhuLucIdRef.current = null
                }}
                onSaved={(saved) => {
                  setShowThuTienModal(false)
                  setThuTienPrefill(null)
                  const linkId = thuTienLinkPhuLucIdRef.current
                  thuTienLinkPhuLucIdRef.current = null
                  if (saved && linkId) {
                    phuLucHopDongBanGanKetThuTienTuPhieu(linkId, saved.id)
                    loadData()
                    toast?.showToast('Đã lưu phiếu thu — PL chuyển «Đã thu tiền» sau khi ghi sổ phiếu tại Thu tiền.', 'success')
                  }
                }}
              />
            </ThuTienBangApiProvider>
          </div>
        </div>
      )}

      {showChiTienModal && chiTienPrefill && (
        <div className={`${styles.modalOverlay} ${styles.modalOverlayTaiChinhPop}`}>
          <div
            ref={chiTienModalDrag.containerRef}
            className={styles.modalBox}
            style={chiTienModalDrag.containerStyle}
            onClick={(e) => e.stopPropagation()}
          >
            <ChiTienBangApiProvider api={ChiTienBangApiImpl}>
              <ChiTienForm
                key={chiTienFormKey}
                formTitle="Phiếu chi tiền"
                chiTienPhieu
                phieuChiTuMenuBanHang
                soDonLabel="Mã phiếu chi"
                prefillDon={chiTienPrefill.prefillDon}
                prefillChiTiet={chiTienPrefill.prefillChiTiet}
                readOnly={false}
                onHeaderPointerDown={chiTienModalDrag.dragHandleProps.onMouseDown}
                headerDragStyle={chiTienModalDrag.dragHandleProps.style}
                onClose={() => {
                  setShowChiTienModal(false)
                  setChiTienPrefill(null)
                  chiTienLinkPhuLucIdRef.current = null
                }}
                onSaved={(saved) => {
                  setShowChiTienModal(false)
                  setChiTienPrefill(null)
                  const linkId = chiTienLinkPhuLucIdRef.current
                  chiTienLinkPhuLucIdRef.current = null
                  if (saved && linkId) {
                    phuLucHopDongBanGanKetChiTienTuPhieu(linkId, saved.id)
                    loadData()
                    toast?.showToast('Đã lưu phiếu chi — PL chuyển «Đã chi tiền» sau khi ghi sổ phiếu tại Chi tiền.', 'success')
                  }
                }}
              />
            </ChiTienBangApiProvider>
          </div>
        </div>
      )}

      {showForm && (
        <div className={styles.modalOverlay} onClick={() => { resetFormPrefill(); setShowForm(false) }}>
          <div
            className={styles.modalBoxLarge}
            style={{ height: '90vh', width: 'min(99vw, 1580px)', maxWidth: 'min(99vw, 1580px)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <PhuLucHopDongBanForm
              key={formKey}
              readOnly={formMode === 'view'}
              initialHdbCt={formMode === 'view' || formMode === 'edit' ? (formRecord ?? undefined) : null}
              initialChiTiet={formRecord ? phuLucHopDongBanChungTuGetChiTiet(formRecord.id) : undefined}
              prefillHdbCt={formMode === 'add' ? (prefillTuBaoGiaHdb?.prefillHdbCt ?? prefillCloneTuPhuLucHopDongBanChungTu?.prefillHdbCt) : undefined}
              prefillChiTiet={formMode === 'add' ? (prefillTuBaoGiaHdb?.prefillChiTiet ?? prefillCloneTuPhuLucHopDongBanChungTu?.prefillChiTiet) : undefined}
              onClose={() => { resetFormPrefill(); setShowForm(false) }}
              onSaved={() => { resetFormPrefill(); setShowForm(false); loadData() }}
              onMoPhieuThuTuForm={
                chungTuDongBoChoFormPl ? () => moThuTienTuPhuLuc(chungTuDongBoChoFormPl) : undefined
              }
              onMoPhieuChiTuForm={
                chungTuDongBoChoFormPl ? () => moChiTienTuPhuLuc(chungTuDongBoChoFormPl) : undefined
              }
              choPhepMoPhieuThuTuForm={chungTuDongBoChoFormPl ? choPhepThuTienPhuLuc(chungTuDongBoChoFormPl) : false}
              choPhepMoPhieuChiTuForm={chungTuDongBoChoFormPl ? choPhepChiTienPhuLuc(chungTuDongBoChoFormPl) : false}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export function PhuLucHopDongBan(props: { onNavigate?: (tab: string) => void } = {}) {
  return (
    <PhuLucHopDongBanChungTuApiProvider api={phuLucHopDongBanChungTuApiImpl}>
      <PhuLucHopDongBanContent {...props} />
    </PhuLucHopDongBanChungTuApiProvider>
  )
}

export { PhuLucHopDongBanForm } from './phuLucHopDongBanForm'
export type { PhuLucHopDongBanFormProps } from './phuLucHopDongBanForm'
