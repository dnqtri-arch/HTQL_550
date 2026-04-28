/**
 * Đơn hàng bán — danh sách + form.
 * Phân nhánh: "Lập từ báo giá" — tự động copy 100% chi tiết + khách hàng.
 * Nút "Lập phiếu xuất kho" tích hợp liên kết module xuatkho.
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Plus, Trash2, Eye, Mail, MessageCircle, FileText, ChevronDown, ChevronRight, ListChecks, Package } from 'lucide-react'
import { DataGrid, type DataGridColumn, type DataGridSortState } from '../../../../components/common/dataGrid'
import { useToastOptional } from '../../../../context/toastContext'
import { matchSearchKeyword } from '../../../../utils/stringUtils'
import { formatNumberDisplay, formatSoThapPhan } from '../../../../utils/numberFormat'
import {
  donHangBanGetAll,
  donHangBanGetChiTiet,
  donHangBanDelete,
  getDefaultDonHangBanChungTuFilter,
  getDateRangeForKy as donHangBanGetDateRangeForKy,
  KY_OPTIONS as DON_HANG_BAN_KY_OPTIONS,
  donHangBanSoDonHangTiepTheo,
  donHangBanChungTuApiImpl,
  donHangBanSetTinhTrang,
  TINH_TRANG_DON_HANG_BAN_DA_NHAN_HANG,
  TINH_TRANG_DON_HANG_BAN_DA_THU_TIEN,
  donHangBanGanKetThuTienTuPhieu,
  donHangBanGanKetChiTienTuPhieu,
  donHangBanQuetThuTienOrphanVaHoanTac,
  donHangBanQuetChiTienOrphanVaHoanTac,
  donHangBanThuTienBangIdsLinked,
  donHangBanChiTienBangIdsLinked,
  donHangBanChungTuFetchBundleAndApply,
  DON_HANG_BAN_CHUNG_TU_BUNDLE_QUERY_KEY,
  type DonHangBanChungTuRecord,
  type DonHangBanChungTuChiTiet,
  type DonHangBanChungTuKyValue,
} from './donHangBanChungTuApi'
import {
  baoGiaGetAll,
  baoGiaGetChiTiet,
  baoGiaDelete,
  baoGiaPost,
  baoGiaPut,
  baoGiaSoDonHangTiepTheo,
  clearBaoGiaDraft,
  getBaoGiaDraft,
  getDateRangeForKy as baoGiaGetDateRangeForKy,
  getDefaultBaoGiaFilter,
  KY_OPTIONS as BAO_GIA_KY_OPTIONS,
  setBaoGiaDraft,
} from '../baoGia/baoGiaApi'
import { BaoGiaApiProvider, type BaoGiaApi } from '../baoGia/baoGiaApiContext'
import { BaoGiaForm } from '../baoGia/baoGiaForm'
import type { BaoGiaRecord } from '../../../../types/baoGia'
import type { DonHangBanChungTuFilter } from '../../../../types/donHangBanChungTu'
import { buildDonHangBanChungTuPrefillFromBaoGia } from './baoGiaToDonHangBanChungTuPrefill'
import { DonHangBanForm } from './donHangBanForm'
import { DonHangBanChungTuApiProvider } from './donHangBanChungTuApiContext'
import { donViTinhGetAll } from '../../../kho/donViTinhApi'
import { dvtHienThiLabel, type DvtListItem } from '../../../../utils/dvtHienThiLabel'
import { ConfirmXoaCaptchaModal } from '../../../../components/common/confirmXoaCaptchaModal'
import { useDraggable } from '../../../../hooks/useDraggable'
import { HTQL_BAN_HANG_TAB_EVENT, HTQL_DON_HANG_BAN_LIST_REFRESH_EVENT } from '../banHangTabEvent'
import { HTQL_HOP_DONG_BAN_LIST_REFRESH_EVENT, HTQL_PHU_LUC_HOP_DONG_BAN_LIST_REFRESH_EVENT } from '../banHangTabEvent'
import { HTQL_NVTHH_SYNC_DHM_TINH_TRANG_EVENT } from '../../muaHang/muaHangTabEvent'
import { ghiNhanDoanhThuGetAll, getDefaultGhiNhanDoanhThuFilter } from '../ghiNhanDoanhThu/ghiNhanDoanhThuApi'
import styles from '../BanHang.module.css'
import { ThuTienForm } from '../../../taiChinh/thuTien/thuTienForm'
import { ThuTienBangApiProvider } from '../../../taiChinh/thuTien/thuTienBangApiContext'
import { thuTienBangApiImpl } from '../../../taiChinh/thuTien/thuTienBangApi'
import { buildThuTienBangPrefillFromDonHangBan } from '../../../taiChinh/thuTien/donHangBanToThuTienBangPrefill'
import { tinhDaThuVaConLaiChoDonHangBan } from '../../../taiChinh/thuTien/chungTuCongNoKhach'
import type { ThuTienBangChiTiet, ThuTienBangRecord } from '../../../../types/thuTienBang'
import { HTQL_THU_TIEN_BANG_RELOAD_EVENT, thuTienBangGetAll } from '../../../taiChinh/thuTien/thuTienBangApi'
import { daGhiSoPhieuThu } from '../../../taiChinh/thuTien/ghiSoTaiChinhApi'
import { daGhiSoPhieuChi } from '../../../taiChinh/chiTien/ghiSoChiTienApi'
import { ChiTienForm } from '../../../taiChinh/chiTien/chiTienForm'
import { ChiTienBangApiProvider } from '../../../taiChinh/chiTien/chiTienBangApiContext'
import {
  ChiTienBangApiImpl,
  HTQL_CHI_TIEN_BANG_RELOAD_EVENT,
  chiTienBangGetAll,
} from '../../../taiChinh/chiTien/chiTienBangApi'
import { buildChiTienBangPrefillFromDonHangBan } from '../../../taiChinh/chiTien/donHangBanToChiTienBangPrefill'
import { tinhDaThuVaConLaiChoDonHangBan as tinhDaChiVaConLaiChoDonHangBan } from '../../../taiChinh/chiTien/chungTuCongNoChiTien'
import type { ChiTienBangChiTiet, ChiTienBangRecord } from '../../../../types/chiTienBang'
import { parseTrailingIntFromMa } from '../../../../utils/parseMaChungTuSuffix'
import { KV_POLL_INTERVAL_MS } from '../../../../utils/htqlKvSync'
import { hopDongBanChungTuGetAll, getDefaultHopDongBanChungTuFilter } from '../hopDongBan/hopDongBanChungTuApi'
import { phuLucHopDongBanChungTuGetAll, getDefaultPhuLucHopDongBanChungTuFilter } from '../phuLucHopDongBan/phuLucHopDongBanChungTuApi'
import { lockReasonDonHangBanByChain } from '../chungTuChainLocks'

const baoGiaApiModal: BaoGiaApi = {
  getAll: baoGiaGetAll,
  getChiTiet: baoGiaGetChiTiet,
  delete: baoGiaDelete,
  getDefaultFilter: getDefaultBaoGiaFilter,
  getDateRangeForKy: baoGiaGetDateRangeForKy,
  KY_OPTIONS: BAO_GIA_KY_OPTIONS,
  post: baoGiaPost,
  put: baoGiaPut,
  soDonHangTiepTheo: baoGiaSoDonHangTiepTheo,
  getDraft: getBaoGiaDraft,
  setDraft: setBaoGiaDraft,
  clearDraft: clearBaoGiaDraft,
}

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

function BadgeLapPhieuThu() {
  return <span className={styles.badgeChoXuLy}>Lập phiếu thu</span>
}

function BadgeLapPhieuChi() {
  return <span className={styles.badgeChoXuLy}>Lập phiếu chi</span>
}

function BadgeHoanThanhThu() {
  return <span className={styles.badgeDaThanhToan}>Hoàn thành</span>
}

/** Khóa sửa/xóa đơn khi đã có phiếu thu hoặc phiếu chi còn tồn tại (dù chưa ghi sổ). */
function donHangBanKhoaViDaTaoPhieuThuHoacChi(
  row: DonHangBanChungTuRecord,
  phieuThuTonTai: Set<string>,
  phieuChiTonTai: Set<string>,
): boolean {
  const coThu = donHangBanThuTienBangIdsLinked(row).some((tid) => tid && phieuThuTonTai.has(tid))
  const coChi = donHangBanChiTienBangIdsLinked(row).some((cid) => cid && phieuChiTonTai.has(cid))
  return coThu || coChi
}

function formatNgay(iso: string | null | undefined): string {
  if (!iso) return ''
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/)
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso
}

// ─── Danh sách ───────────────────────────────────────────────────────────

function DonHangBanContent({ onNavigate: _onNavigate }: { onNavigate?: (tab: string) => void } = {}) {
  const dhbBundleQ = useQuery({
    queryKey: DON_HANG_BAN_CHUNG_TU_BUNDLE_QUERY_KEY,
    queryFn: donHangBanChungTuFetchBundleAndApply,
    refetchInterval: KV_POLL_INTERVAL_MS,
  })
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
  const chiTienLinkDonHangBanIdRef = useRef<string | null>(null)
  const [showChiTienModal, setShowChiTienModal] = useState(false)
  const [chiTienPrefill, setChiTienPrefill] = useState<{
    prefillDon: Partial<ChiTienBangRecord>
    prefillChiTiet: ChiTienBangChiTiet[]
  } | null>(null)
  const [chiTienFormKey, setChiTienFormKey] = useState(0)
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
  const chiTienModalDrag = useDraggable()
  const donHangBanFormDrag = useDraggable()
  const [baoGiaXemTuDhb, setBaoGiaXemTuDhb] = useState<BaoGiaRecord | null>(null)
  const [baoGiaXemKey, setBaoGiaXemKey] = useState(0)
  const [listSortState, setListSortState] = useState<DataGridSortState[]>([])
  const [tinhTrangFilterSelected, setTinhTrangFilterSelected] = useState<string[]>([])

  const selectedRow = selectedId ? danhSach.find((r) => r.id === selectedId) ?? null : null
  const allHopDongBanRows = useMemo(
    () => hopDongBanChungTuGetAll({ ...getDefaultHopDongBanChungTuFilter(), tu: '', den: '' }),
    [danhSach],
  )
  const allPhuLucRows = useMemo(
    () => phuLucHopDongBanChungTuGetAll({ ...getDefaultPhuLucHopDongBanChungTuFilter(), tu: '', den: '' }),
    [danhSach],
  )
  const donHangBanChainLockReasonById = useMemo(() => {
    const m = new Map<string, string>()
    for (const row of danhSach) {
      const reason = lockReasonDonHangBanByChain(row, allHopDongBanRows, allPhuLucRows)
      if (reason) m.set(row.id, reason)
    }
    return m
  }, [danhSach, allHopDongBanRows, allPhuLucRows])
  const chiTietHienThiCoVat = selectedRow == null || selectedRow.ap_dung_vat_gtgt !== false

  const thuCongNoById = useMemo(() => {
    const m = new Map<string, { da_thu: number; con_lai: number; tong_da_lap: number }>()
    for (const r of danhSach) {
      m.set(r.id, tinhDaThuVaConLaiChoDonHangBan(r))
    }
    return m
  }, [danhSach])

  const chiCongNoById = useMemo(() => {
    const m = new Map<string, { da_thu: number; con_lai: number; tong_da_lap: number }>()
    for (const r of danhSach) {
      m.set(r.id, tinhDaChiVaConLaiChoDonHangBan(r))
    }
    return m
  }, [danhSach])

  const [phieuThuEpoch, setPhieuThuEpoch] = useState(0)
  const phieuThuTonTai = useMemo(() => {
    void phieuThuEpoch
    return new Set(thuTienBangGetAll({ ky: 'tat-ca', tu: '', den: '' }).map((p) => p.id))
  }, [phieuThuEpoch, danhSach])

  const [phieuChiEpoch, setPhieuChiEpoch] = useState(0)
  const phieuChiTonTai = useMemo(() => {
    void phieuChiEpoch
    return new Set(chiTienBangGetAll({ ky: 'tat-ca', tu: '', den: '' }).map((p) => p.id))
  }, [phieuChiEpoch, danhSach])

  const choPhepThuTienDonHang = (row: DonHangBanChungTuRecord) => {
    const tong = Number(row.tong_thanh_toan) || 0
    if (tong <= 0) return false
    const ids = donHangBanThuTienBangIdsLinked(row)
    if (ids.some((tid) => tid && !phieuThuTonTai.has(tid))) return true
    const cn = thuCongNoById.get(row.id) ?? { da_thu: 0, con_lai: 0, tong_da_lap: 0 }
    return tong - cn.tong_da_lap > 0
  }

  const choPhepChiTienDonHang = (row: DonHangBanChungTuRecord) => {
    const tong = Number(row.tong_thanh_toan) || 0
    if (tong <= 0) return false
    const ids = donHangBanChiTienBangIdsLinked(row)
    if (ids.some((cid) => cid && !phieuChiTonTai.has(cid))) return true
    const cn = chiCongNoById.get(row.id) ?? { da_thu: 0, con_lai: 0, tong_da_lap: 0 }
    return tong - cn.tong_da_lap > 0
  }

  const coTheXoaDonHangBan = (row: DonHangBanChungTuRecord) => {
    const chainReason = donHangBanChainLockReasonById.get(row.id)
    if (chainReason) return false
    const thuIds = donHangBanThuTienBangIdsLinked(row).filter((tid) => tid && phieuThuTonTai.has(tid))
    const chiIds = donHangBanChiTienBangIdsLinked(row).filter((cid) => cid && phieuChiTonTai.has(cid))
    return thuIds.length === 0 && chiIds.length === 0
  }
  const donHangBanLockReasonForActions = (row: DonHangBanChungTuRecord): string | null => {
    const chainReason = donHangBanChainLockReasonById.get(row.id)
    if (chainReason) return chainReason
    if (donHangBanKhoaViDaTaoPhieuThuHoacChi(row, phieuThuTonTai, phieuChiTonTai)) {
      return 'Đơn hàng bán đã có phiếu thu/chi liên kết nên không thể sửa hoặc xóa.'
    }
    return null
  }

  /** Nhãn hiển thị cột Tình trạng — dùng đồng bộ cho lọc Excel (YC82). */
  const getDhbTinhTrangLabel = useCallback(
    (row: DonHangBanChungTuRecord): string => {
      const idsThu = donHangBanThuTienBangIdsLinked(row).filter((tid) => tid && phieuThuTonTai.has(tid))
      if (idsThu.length > 0) {
        const cl = thuCongNoById.get(row.id)?.con_lai ?? 0
        const allNotGhiSo = idsThu.every((tid) => !daGhiSoPhieuThu(tid))
        const anyGhiSo = idsThu.some((tid) => daGhiSoPhieuThu(tid))
        if (allNotGhiSo) return 'Lập phiếu thu'
        const allGhiSo = idsThu.every((tid) => daGhiSoPhieuThu(tid))
        if (allGhiSo && cl <= 0) return 'Hoàn thành'
        if (anyGhiSo) return 'Công nợ'
        return (row.tinh_trang ?? '').trim() || 'Chưa thực hiện'
      }
      const idsChi = donHangBanChiTienBangIdsLinked(row).filter((cid) => cid && phieuChiTonTai.has(cid))
      if (idsChi.length > 0) {
        const cl = chiCongNoById.get(row.id)?.con_lai ?? 0
        const allNotGhiSo = idsChi.every((cid) => !daGhiSoPhieuChi(cid))
        const anyGhiSo = idsChi.some((cid) => daGhiSoPhieuChi(cid))
        if (allNotGhiSo) return 'Lập phiếu chi'
        const allGhiSo = idsChi.every((cid) => daGhiSoPhieuChi(cid))
        if (allGhiSo && cl <= 0) return 'Hoàn thành'
        if (anyGhiSo) return 'Công nợ'
        return (row.tinh_trang ?? '').trim() || 'Chưa thực hiện'
      }
      return (row.tinh_trang ?? '').trim() || 'Chưa thực hiện'
    },
    [thuCongNoById, chiCongNoById, phieuThuTonTai, phieuChiTonTai],
  )

  const columns = useMemo((): DataGridColumn<DonHangBanChungTuRecord>[] => {
    return [
      { key: 'so_don_hang', label: 'Mã ĐHB', width: 88 },
      { key: 'nv_ban_hang', label: 'NV bán hàng', width: '10%' },
      { key: 'so_chung_tu_cukcuk', label: 'Đơn hàng bán', width: 160, renderCell: (v) => (v != null && String(v).trim() ? String(v) : '') },
      { key: 'ngay_giao_hang', label: 'Ngày GH', width: 76, align: 'right', renderCell: (v) => formatNgay(v as string | null) },
      { key: 'khach_hang', label: 'Khách hàng', width: '28%' },
      {
        key: 'so_bao_gia_goc',
        label: 'Từ BG',
        width: 90,
        renderCell: (v) => {
          const ma = v != null && String(v).trim() ? String(v) : ''
          if (!ma) return ''
          return (
            <button
              type="button"
              className={styles.linkMaChungTu}
              onClick={(e) => {
                e.stopPropagation()
                const bg = baoGiaGetAll(getDefaultBaoGiaFilter()).find((r) => (r.so_bao_gia ?? '').trim() === ma)
                if (!bg) {
                  toast?.showToast('Không tìm thấy báo giá tương ứng mã.', 'error')
                  return
                }
                setBaoGiaXemTuDhb(bg)
                setBaoGiaXemKey((k) => k + 1)
              }}
            >
              {ma}
            </button>
          )
        },
      },
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
        label: 'Tình trạng',
        width: 110,
        filterable: true,
        renderCell: (_v, row) => {
          const idsThu = donHangBanThuTienBangIdsLinked(row).filter((tid) => tid && phieuThuTonTai.has(tid))
          if (idsThu.length > 0) {
            const cl = thuCongNoById.get(row.id)?.con_lai ?? 0
            const allNotGhiSo = idsThu.every((tid) => !daGhiSoPhieuThu(tid))
            const anyGhiSo = idsThu.some((tid) => daGhiSoPhieuThu(tid))
            if (allNotGhiSo) return <BadgeLapPhieuThu />
            const allGhiSo = idsThu.every((tid) => daGhiSoPhieuThu(tid))
            if (allGhiSo && cl <= 0) return <BadgeHoanThanhThu />
            if (anyGhiSo) return <BadgeCongNo />
            return <Badge value={(row.tinh_trang ?? '').trim() || 'Chưa thực hiện'} />
          }
          const idsChi = donHangBanChiTienBangIdsLinked(row).filter((cid) => cid && phieuChiTonTai.has(cid))
          if (idsChi.length > 0) {
            const cl = chiCongNoById.get(row.id)?.con_lai ?? 0
            const allNotGhiSo = idsChi.every((cid) => !daGhiSoPhieuChi(cid))
            const anyGhiSo = idsChi.some((cid) => daGhiSoPhieuChi(cid))
            if (allNotGhiSo) return <BadgeLapPhieuChi />
            const allGhiSo = idsChi.every((cid) => daGhiSoPhieuChi(cid))
            if (allGhiSo && cl <= 0) return <BadgeHoanThanhThu />
            if (anyGhiSo) return <BadgeCongNo />
            return <Badge value={(row.tinh_trang ?? '').trim() || 'Chưa thực hiện'} />
          }
          return <Badge value={(row.tinh_trang ?? '').trim() || 'Chưa thực hiện'} />
        },
      },
      { key: 'dien_giai', label: 'Ghi chú', width: '18%' },
    ]
  }, [thuCongNoById, chiCongNoById, phieuThuTonTai, phieuChiTonTai, toast])

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
    const tatCaPhieuThu = thuTienBangGetAll({ ky: 'tat-ca', tu: '', den: '' })
    const idPhieuThuConTonTai = new Set(tatCaPhieuThu.map((p) => p.id))
    donHangBanQuetThuTienOrphanVaHoanTac(idPhieuThuConTonTai)
    const tatCaPhieuChi = chiTienBangGetAll({ ky: 'tat-ca', tu: '', den: '' })
    const idPhieuChiConTonTai = new Set(tatCaPhieuChi.map((p) => p.id))
    donHangBanQuetChiTienOrphanVaHoanTac(idPhieuChiConTonTai)
    setDanhSach(donHangBanGetAll(filter))
  }, [filter])
  useEffect(() => {
    if (!dhbBundleQ.isSuccess) return
    loadData()
  }, [dhbBundleQ.isSuccess, dhbBundleQ.dataUpdatedAt, loadData])
  useEffect(() => {
    if (selectedId) setChiTiet(donHangBanGetChiTiet(selectedId))
    else setChiTiet([])
  }, [selectedId])

  useEffect(() => {
    try {
      const raw = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('htql_don_hang_ban_from_baogia') : null
      if (!raw) return
      sessionStorage.removeItem('htql_don_hang_ban_from_baogia')
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
    const onRefreshChain = () => loadData()
    window.addEventListener(HTQL_HOP_DONG_BAN_LIST_REFRESH_EVENT, onRefreshChain)
    window.addEventListener(HTQL_PHU_LUC_HOP_DONG_BAN_LIST_REFRESH_EVENT, onRefreshChain)
    return () => {
      window.removeEventListener(HTQL_HOP_DONG_BAN_LIST_REFRESH_EVENT, onRefreshChain)
      window.removeEventListener(HTQL_PHU_LUC_HOP_DONG_BAN_LIST_REFRESH_EVENT, onRefreshChain)
    }
  }, [loadData])

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

  const tinhTrangOptionsDhb = useMemo(() => {
    const set = new Set<string>()
    for (const r of filtered) {
      set.add(getDhbTinhTrangLabel(r))
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'vi'))
  }, [filtered, getDhbTinhTrangLabel])

  const filteredByTinhTrangDhb = useMemo(() => {
    if (tinhTrangFilterSelected.length === 0) return filtered
    if (
      tinhTrangOptionsDhb.length > 0 &&
      tinhTrangFilterSelected.length >= tinhTrangOptionsDhb.length
    ) {
      return filtered
    }
    return filtered.filter((r) => tinhTrangFilterSelected.includes(getDhbTinhTrangLabel(r)))
  }, [filtered, tinhTrangFilterSelected, tinhTrangOptionsDhb, getDhbTinhTrangLabel])

  const sortedListDhb = useMemo(() => {
    const sort = listSortState.find((s) => s.key === 'so_don_hang')
    const arr = [...filteredByTinhTrangDhb]
    if (!sort) return arr
    arr.sort((a, b) => {
      const na = parseTrailingIntFromMa(a.so_don_hang)
      const nb = parseTrailingIntFromMa(b.so_don_hang)
      const c = na - nb
      return sort.direction === 'asc' ? c : -c
    })
    return arr
  }, [filteredByTinhTrangDhb, listSortState])

  const dhbTinhTrangColumnFilter = useMemo(
    () => ({
      tinh_trang: {
        options: tinhTrangOptionsDhb,
        selected: tinhTrangFilterSelected,
        onChange: setTinhTrangFilterSelected,
      },
    }),
    [tinhTrangOptionsDhb, tinhTrangFilterSelected],
  )

  const coLocTinhTrangDhbHieuLuc =
    tinhTrangOptionsDhb.length > 0 &&
    tinhTrangFilterSelected.length > 0 &&
    tinhTrangFilterSelected.length < tinhTrangOptionsDhb.length

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (dropdownTaoGdRef.current && !dropdownTaoGdRef.current.contains(e.target as Node)) setDropdownTaoGd(false)
      setContextMenu((m) => (m.open ? { ...m, open: false } : m))
    }
    window.addEventListener('click', h)
    return () => window.removeEventListener('click', h)
  }, [])

  const tongTien = filteredByTinhTrangDhb.reduce((s, r) => s + r.tong_thanh_toan, 0)

  const chungTuDongBoChoForm = useMemo(() => {
    if (!formRecord) return null
    return danhSach.find((d) => d.id === formRecord.id) ?? formRecord
  }, [formRecord, danhSach])

  const resetFormPrefill = () => {
    setPrefillTuBaoGia(undefined)
    setPrefillCloneTuDonHangBan(undefined)
  }

  const moThuTienTuDonHang = (row: DonHangBanChungTuRecord) => {
    if (!choPhepThuTienDonHang(row)) return
    const ct = donHangBanGetChiTiet(row.id)
    const { prefillDon, prefillChiTiet } = buildThuTienBangPrefillFromDonHangBan(row, ct)
    thuTienLinkDonHangBanIdRef.current = row.id
    setThuTienPrefill({ prefillDon, prefillChiTiet })
    setThuTienFormKey((k) => k + 1)
    setShowThuTienModal(true)
  }

  const moChiTienTuDonHang = (row: DonHangBanChungTuRecord) => {
    if (!choPhepChiTienDonHang(row)) return
    const ct = donHangBanGetChiTiet(row.id)
    const { prefillDon, prefillChiTiet } = buildChiTienBangPrefillFromDonHangBan(row, ct)
    chiTienLinkDonHangBanIdRef.current = row.id
    setChiTienPrefill({ prefillDon, prefillChiTiet })
    setChiTienFormKey((k) => k + 1)
    setShowChiTienModal(true)
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
          disabled={!selectedId || !selectedRow || !coTheXoaDonHangBan(selectedRow)}
          onClick={() => {
            if (!selectedRow) return
            const reason = donHangBanLockReasonForActions(selectedRow)
            if (reason) {
              toast?.showToast(reason, 'error')
              return
            }
            setXoaModal(selectedRow)
          }}
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
            <FileText size={13} /><span>Thanh toán</span><ChevronDown size={12} style={{ marginLeft: 2 }} />
          </button>
          {dropdownTaoGd && selectedRow && (
            <div className={styles.dropdownMenu}>
              <button
                type="button"
                className={styles.dropdownItem}
                disabled={!choPhepThuTienDonHang(selectedRow)}
                style={{
                  opacity: !choPhepThuTienDonHang(selectedRow) ? 0.55 : 1,
                  cursor: !choPhepThuTienDonHang(selectedRow) ? 'not-allowed' : 'pointer',
                }}
                onClick={() => {
                  if (!choPhepThuTienDonHang(selectedRow)) return
                  moThuTienTuDonHang(selectedRow)
                  setDropdownTaoGd(false)
                }}
              >
                <FileText size={13} /> Thu tiền
              </button>
              <button
                type="button"
                className={styles.dropdownItem}
                disabled={!selectedRow || !choPhepChiTienDonHang(selectedRow)}
                style={{
                  opacity: !selectedRow || !choPhepChiTienDonHang(selectedRow) ? 0.55 : 1,
                  cursor: !selectedRow || !choPhepChiTienDonHang(selectedRow) ? 'not-allowed' : 'pointer',
                }}
                onClick={() => {
                  if (!selectedRow || !choPhepChiTienDonHang(selectedRow)) return
                  moChiTienTuDonHang(selectedRow)
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
              const ky = e.target.value as DonHangBanChungTuKyValue
              if (ky === 'tat-ca') {
                setFilter({ ky, tu: '', den: '' })
                return
              }
              const range = donHangBanGetDateRangeForKy(ky)
              setFilter({ ky, tu: range.tu, den: range.den })
            }}
          >
            {DON_HANG_BAN_KY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        <input type="text" className={styles.searchInput} placeholder="Tìm mã đơn, KH, ghi chú, BG..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className={styles.contentArea}>
        <div className={styles.gridWrap}>
          <DataGrid<DonHangBanChungTuRecord>
            columns={columns}
            data={sortedListDhb}
            keyField="id"
            stripedRows
            compact
            height="100%"
            sortableColumns={['so_don_hang']}
            sortState={listSortState}
            onSortChange={setListSortState}
            columnFilterConfig={dhbTinhTrangColumnFilter}
            emptyDueToFilter={sortedListDhb.length === 0 && filtered.length > 0 && coLocTinhTrangDhbHieuLuc}
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
              { label: 'Số dòng', value: `= ${sortedListDhb.length}` },
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
            disabled={!!donHangBanLockReasonForActions(contextMenu.row!)}
            style={{
              opacity: donHangBanLockReasonForActions(contextMenu.row!) ? 0.55 : 1,
              cursor: donHangBanLockReasonForActions(contextMenu.row!) ? 'not-allowed' : 'pointer',
            }}
            onClick={() => {
              const reason = donHangBanLockReasonForActions(contextMenu.row!)
              if (reason) {
                toast?.showToast(reason, 'error')
                return
              }
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
                  disabled={!choPhepThuTienDonHang(contextMenu.row!)}
                  style={{
                    opacity: !choPhepThuTienDonHang(contextMenu.row!) ? 0.55 : 1,
                    cursor: !choPhepThuTienDonHang(contextMenu.row!) ? 'not-allowed' : 'pointer',
                  }}
                  onClick={() => {
                    const row = contextMenu.row
                    if (!row || !choPhepThuTienDonHang(row)) return
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
                  disabled={!choPhepChiTienDonHang(contextMenu.row!)}
                  style={{
                    opacity: !choPhepChiTienDonHang(contextMenu.row!) ? 0.55 : 1,
                    cursor: !choPhepChiTienDonHang(contextMenu.row!) ? 'not-allowed' : 'pointer',
                  }}
                  onClick={() => {
                    const row = contextMenu.row
                    if (!row || !choPhepChiTienDonHang(row)) return
                    moChiTienTuDonHang(row)
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
              opacity: donHangBanLockReasonForActions(contextMenu.row!) ? 0.55 : 1,
              cursor: donHangBanLockReasonForActions(contextMenu.row!) ? 'not-allowed' : 'pointer',
            }}
            disabled={!!donHangBanLockReasonForActions(contextMenu.row!)}
            onClick={() => {
              const reason = donHangBanLockReasonForActions(contextMenu.row!)
              if (reason) {
                toast?.showToast(reason, 'error')
                return
              }
              setXoaModal(contextMenu.row!)
              setContextMenu((m) => ({ ...m, open: false }))
            }}
          >
            <Trash2 size={13} /> Xóa
          </button>
        </div>
      )}

      {showThuTienModal && thuTienPrefill && (
        <div className={`${styles.modalOverlay} ${styles.modalOverlayTaiChinhPop}`}>
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
                    toast?.showToast('Đã lưu phiếu thu — đơn chuyển «Đã thu tiền» sau khi ghi sổ phiếu tại Thu tiền.', 'success')
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
                  chiTienLinkDonHangBanIdRef.current = null
                }}
                onSaved={(saved) => {
                  setShowChiTienModal(false)
                  setChiTienPrefill(null)
                  const linkId = chiTienLinkDonHangBanIdRef.current
                  chiTienLinkDonHangBanIdRef.current = null
                  if (saved && linkId) {
                    donHangBanGanKetChiTienTuPhieu(linkId, saved.id)
                    loadData()
                    toast?.showToast('Đã lưu phiếu chi — đơn chuyển «Đã chi tiền» sau khi ghi sổ phiếu tại Chi tiền.', 'success')
                  }
                }}
              />
            </ChiTienBangApiProvider>
          </div>
        </div>
      )}

      <ConfirmXoaCaptchaModal
        open={xoaModal != null}
        onClose={() => setXoaModal(null)}
        onConfirm={() => {
          if (!xoaModal) return
          const reason = donHangBanLockReasonForActions(xoaModal)
          if (reason) {
            toast?.showToast(reason, 'error')
            setXoaModal(null)
            return
          }
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
        <div className={styles.modalOverlay}>
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
              onMoPhieuThuTuForm={
                chungTuDongBoChoForm
                  ? () => {
                      moThuTienTuDonHang(chungTuDongBoChoForm)
                    }
                  : undefined
              }
              onMoPhieuChiTuForm={
                chungTuDongBoChoForm
                  ? () => {
                      moChiTienTuDonHang(chungTuDongBoChoForm)
                    }
                  : undefined
              }
              choPhepMoPhieuThuTuForm={chungTuDongBoChoForm ? choPhepThuTienDonHang(chungTuDongBoChoForm) : false}
              choPhepMoPhieuChiTuForm={chungTuDongBoChoForm ? choPhepChiTienDonHang(chungTuDongBoChoForm) : false}
            />
          </div>
        </div>
      )}

      {baoGiaXemTuDhb && (
        <div className={styles.modalOverlay}>
          <div
            className={styles.modalBoxLarge}
            style={{ height: '90vh', width: 'min(99vw, 1580px)', maxWidth: 'min(99vw, 1580px)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <BaoGiaApiProvider api={baoGiaApiModal}>
              <BaoGiaForm
                key={baoGiaXemKey}
                readOnly
                initialDon={baoGiaXemTuDhb}
                initialChiTiet={baoGiaGetChiTiet(baoGiaXemTuDhb.id)}
                onClose={() => setBaoGiaXemTuDhb(null)}
                onSaved={() => setBaoGiaXemTuDhb(null)}
              />
            </BaoGiaApiProvider>
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
