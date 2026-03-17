import { useState, useEffect, useRef } from 'react'
import { Plus, Eye, Trash2, Mail, Download, ChevronDown, FileText, Paperclip } from 'lucide-react'
import { DataGrid, type DataGridColumn, type DataGridSortState } from '../../components/DataGrid'
import {
  type DeXuatMuaHangRecord,
  type DeXuatMuaHangChiTiet,
  type DeXuatMuaHangFilter,
  type KyValue,
  KY_OPTIONS,
  getDateRangeForKy,
  deXuatMuaHangGetAll,
  deXuatMuaHangGetChiTiet,
  deXuatMuaHangDelete,
  getDefaultFilter,
  deXuatMuaHangPost,
  deXuatMuaHangPut,
  getDeXuatDraft,
  setDeXuatDraft,
  clearDeXuatDraft,
  deXuatMuaHangSoDonHangTiepTheo,
  deXuatMuaHangSoDonHangExists,
} from './deXuatMuaHangApi'
import { DeXuatMuaHangApiProvider, useDeXuatMuaHangApi, type DeXuatMuaHangApi } from './DeXuatMuaHangApiContext'
import { Modal } from '../../components/Modal'
import { DeXuatMuaHangForm } from './DeXuatMuaHangForm'
import { DonMuaHangForm } from './DonMuaHangForm'
import { MuaHangApiProvider, type MuaHangApi } from './MuaHangApiContext'
import {
  type DonMuaHangRecord,
  type DonMuaHangChiTiet,
  donMuaHangGetAll,
  donMuaHangGetChiTiet,
  donMuaHangDelete,
  getDefaultDonMuaHangFilter,
  getDateRangeForKy as getDateRangeForKyDon,
  KY_OPTIONS as KY_OPTIONS_DON,
  donMuaHangPost,
  donMuaHangPut,
  getDonMuaHangDraft,
  setDonMuaHangDraft,
  clearDonMuaHangDraft,
  donMuaHangSoDonHangTiepTheo,
} from './donMuaHangApi'
import { donViTinhGetAll } from '../kho/donViTinhApi'
import { formatSoThapPhan } from '../../utils/numberFormat'
import { exportCsv } from '../../utils/exportCsv'

/** Hiển thị ĐVT theo nguyên tắc ĐVT chính: ky_hieu || ten_dvt, không hiển thị mã */
function dvtHienThiLabel(
  value: string | null | undefined,
  dvtList: { ma_dvt: string; ten_dvt: string; ky_hieu?: string }[]
): string {
  if (value == null || value === '') return ''
  const v = String(value).trim()
  const d = dvtList.find((x) => x.ma_dvt === v || x.ten_dvt === v || (x.ky_hieu != null && x.ky_hieu === v))
  return d ? (d.ky_hieu || d.ten_dvt || d.ma_dvt) : v
}

function formatIsoToDdMmYyyy(iso: string | null): string {
  if (!iso) return ''
  const m = iso.trim().match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return iso
  return `${m[3]}/${m[2]}/${m[1]}`
}

const toolbarWrap: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '8px',
  padding: '4px 0 6px',
  borderBottom: '1px solid var(--border-strong)',
  marginBottom: '6px',
  flexWrap: 'wrap',
}

const toolbarBtn: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  padding: '4px 10px',
  background: 'transparent',
  border: '1px solid var(--border)',
  color: 'var(--text-primary)',
  cursor: 'pointer',
  borderRadius: '4px',
  fontSize: '11px',
  fontFamily: 'inherit',
}

const filterWrap: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  marginBottom: '8px',
  flexWrap: 'wrap',
}

const filterLabel: React.CSSProperties = {
  fontSize: '11px',
  color: 'var(--text-muted)',
}

const filterInput: React.CSSProperties = {
  padding: '4px 8px',
  fontSize: '11px',
  background: 'var(--bg-primary)',
  border: '1px solid var(--border)',
  borderRadius: '4px',
  color: 'var(--text-primary)',
}

const modalOverlay: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'transparent',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
  pointerEvents: 'none',
}

const modalBox: React.CSSProperties = {
  background: 'var(--bg-secondary)',
  border: '1px solid var(--border-strong)',
  borderRadius: '6px',
  width: '95vw',
  maxWidth: 1100,
  height: '85vh',
  maxHeight: '85vh',
  display: 'flex',
  flexDirection: 'column',
  boxShadow: '0 8px 40px rgba(0,0,0,0.4)',
  overflow: 'hidden',
  pointerEvents: 'auto',
}

const columnsDeXuat: DataGridColumn<DeXuatMuaHangRecord>[] = [
  // Thứ tự: Mã ĐX, Tên đề xuất, Ngày đề xuất, Ngày giao hàng, Nhà cung cấp, Tình trạng, Ghi chú
  { key: 'so_don_hang', label: 'Mã ĐX', width: 80 },
  { key: 'de_xuat_tu_ten', label: 'Tên đề xuất', width: 180 },
  { key: 'ngay_don_hang', label: 'Ngày đề xuất', width: '11%', renderCell: (v) => formatIsoToDdMmYyyy(v as string) },
  { key: 'ngay_giao_hang', label: 'Ngày giao hàng', width: '11%', renderCell: (v) => formatIsoToDdMmYyyy(v as string | null) },
  { key: 'nha_cung_cap', label: 'Nhà cung cấp', width: '18%' },
  { key: 'tinh_trang', label: 'Tình trạng', width: '14%' },
  { key: 'ghi_chu', label: 'Ghi chú', width: '22%', renderCell: (_v, row) => (row.ghi_chu ?? row.dien_giai ?? '') },
]


const apiDeXuat: DeXuatMuaHangApi = {
  getAll: deXuatMuaHangGetAll,
  getChiTiet: deXuatMuaHangGetChiTiet,
  delete: deXuatMuaHangDelete,
  getDefaultFilter: getDefaultFilter,
  getDateRangeForKy,
  KY_OPTIONS,
  post: deXuatMuaHangPost,
  put: deXuatMuaHangPut,
  soDonHangTiepTheo: deXuatMuaHangSoDonHangTiepTheo,
  soDonHangExists: deXuatMuaHangSoDonHangExists,
  getDraft: getDeXuatDraft,
  setDraft: setDeXuatDraft,
  clearDraft: clearDeXuatDraft,
}

const apiDon: MuaHangApi = {
  getAll: donMuaHangGetAll,
  getChiTiet: donMuaHangGetChiTiet,
  delete: donMuaHangDelete,
  getDefaultFilter: getDefaultDonMuaHangFilter,
  getDateRangeForKy: getDateRangeForKyDon,
  KY_OPTIONS: KY_OPTIONS_DON,
  post: donMuaHangPost,
  put: donMuaHangPut,
  soDonHangTiepTheo: donMuaHangSoDonHangTiepTheo,
  getDraft: getDonMuaHangDraft,
  setDraft: setDonMuaHangDraft,
  clearDraft: clearDonMuaHangDraft,
}

function DeXuatMuaHangContent() {
  const api = useDeXuatMuaHangApi()
  const [filter, setFilter] = useState<DeXuatMuaHangFilter>(api.getDefaultFilter)
  const [danhSach, setDanhSach] = useState<DeXuatMuaHangRecord[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [chiTiet, setChiTiet] = useState<DeXuatMuaHangChiTiet[]>([])
  const [dropdownEmail, setDropdownEmail] = useState(false)
  const [dropdownXuatKhau, setDropdownXuatKhau] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [viewDon, setViewDon] = useState<DeXuatMuaHangRecord | null>(null)
  const [addFormKey, setAddFormKey] = useState(0)
  const [deleteTarget, setDeleteTarget] = useState<DeXuatMuaHangRecord | null>(null)
  const refEmail = useRef<HTMLDivElement>(null)
  const refXuatKhau = useRef<HTMLDivElement>(null)
  const modalBoxRef = useRef<HTMLDivElement>(null)
  const [modalPosition, setModalPosition] = useState<{ x: number; y: number } | null>(null)
  const [dragStart, setDragStart] = useState<{ clientX: number; clientY: number; startX: number; startY: number } | null>(null)
  const [formMinimized, setFormMinimized] = useState(false)
  const [formMaximized, setFormMaximized] = useState(false)
  const [dvtList, setDvtList] = useState<{ ma_dvt: string; ten_dvt: string; ky_hieu?: string }[]>([])
  const [sortState, setSortState] = useState<DataGridSortState[]>([])
  const [contextMenu, setContextMenu] = useState<{ open: boolean; x: number; y: number; row: DeXuatMuaHangRecord | null }>({ open: false, x: 0, y: 0, row: null })
  const [showDonForm, setShowDonForm] = useState(false)
  const [donFormKey, setDonFormKey] = useState(0)
  const [prefillDon, setPrefillDon] = useState<Partial<DonMuaHangRecord> | null>(null)
  const [prefillChiTiet, setPrefillChiTiet] = useState<DonMuaHangChiTiet[] | null>(null)
  const donBoxRef = useRef<HTMLDivElement>(null)
  const [donModalPosition, setDonModalPosition] = useState<{ x: number; y: number } | null>(null)
  const [donDragStart, setDonDragStart] = useState<{ clientX: number; clientY: number; startX: number; startY: number } | null>(null)

  const loadData = () => setDanhSach(api.getAll(filter))

  /** Cột bảng chi tiết — giống form nhập đề xuất: Mã, Tên VTHH, ĐVT (hiển thị theo nguyên tắc), Số lượng, Ghi chú */
  const columnsChiTietDeXuat: DataGridColumn<DeXuatMuaHangChiTiet>[] = [
    { key: 'ma_hang', label: 'Mã', width: 64 },
    { key: 'ten_hang', label: 'Tên VTHH', width: 220 },
    { key: 'dvt', label: 'ĐVT', width: 64, renderCell: (v) => dvtHienThiLabel(v as string, dvtList) },
    { key: 'so_luong', label: 'Số lượng', width: 68, align: 'right', renderCell: (v) => formatSoThapPhan(Number(v), 2) },
    { key: 'ghi_chu', label: 'Ghi chú', width: 260 },
  ]

  useEffect(() => {
    donViTinhGetAll().then(setDvtList)
  }, [])

  useEffect(() => {
    setDanhSach(api.getAll(filter))
  }, [filter, api])

  useEffect(() => {
    if (selectedId) setChiTiet(api.getChiTiet(selectedId))
    else setChiTiet([])
  }, [selectedId, api])

  useEffect(() => {
    if (!refEmail.current) return
    const h = (e: MouseEvent) => {
      if (refEmail.current && !refEmail.current.contains(e.target as Node)) setDropdownEmail(false)
    }
    document.addEventListener('click', h)
    return () => document.removeEventListener('click', h)
  }, [])

  useEffect(() => {
    if (!refXuatKhau.current) return
    const h = (e: MouseEvent) => {
      if (refXuatKhau.current && !refXuatKhau.current.contains(e.target as Node)) setDropdownXuatKhau(false)
    }
    document.addEventListener('click', h)
    return () => document.removeEventListener('click', h)
  }, [])

  useEffect(() => {
    const onClick = () => setContextMenu((m) => (m.open ? { ...m, open: false, row: null } : m))
    window.addEventListener('click', onClick)
    return () => window.removeEventListener('click', onClick)
  }, [])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showForm) setShowForm(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [showForm])

  useEffect(() => {
    if (showForm) {
      setModalPosition(null)
      setFormMinimized(false)
      setFormMaximized(false)
    }
  }, [showForm])

  useEffect(() => {
    if (!dragStart) return
    const onMove = (e: MouseEvent) => {
      setModalPosition({
        x: dragStart.startX + (e.clientX - dragStart.clientX),
        y: dragStart.startY + (e.clientY - dragStart.clientY),
      })
    }
    const onUp = () => setDragStart(null)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [dragStart])

  const handleHeaderPointerDown = (e: React.MouseEvent) => {
    if (!modalBoxRef.current) return
    const rect = modalBoxRef.current.getBoundingClientRect()
    setModalPosition({ x: rect.left, y: rect.top })
    setDragStart({ clientX: e.clientX, clientY: e.clientY, startX: rect.left, startY: rect.top })
  }

  useEffect(() => {
    if (!donDragStart) return
    const onMove = (e: MouseEvent) => {
      if (!donDragStart) return
      setDonModalPosition({ x: donDragStart.startX + e.clientX - donDragStart.clientX, y: donDragStart.startY + e.clientY - donDragStart.clientY })
    }
    const onUp = () => setDonDragStart(null)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [donDragStart])

  const handleDonHeaderPointerDown = (e: React.MouseEvent) => {
    if (!donBoxRef.current) return
    const rect = donBoxRef.current.getBoundingClientRect()
    setDonModalPosition({ x: rect.left, y: rect.top })
    setDonDragStart({ clientX: e.clientX, clientY: e.clientY, startX: rect.left, startY: rect.top })
  }

  const dongModal = () => setShowForm(false)

  const onKyChange = (ky: KyValue) => {
    const { tu, den } = api.getDateRangeForKy(ky)
    setFilter((f) => ({ ...f, ky, tu, den }))
  }

  const tongChiTiet = { so_luong: chiTiet.reduce((s, c) => s + c.so_luong, 0) }

  const sortedDanhSach = [...danhSach].sort((a, b) => {
    if (!sortState || sortState.length === 0) return 0
    for (const s of sortState) {
      const key = s.key as keyof DeXuatMuaHangRecord
      const va = a[key]
      const vb = b[key]
      if (va == null && vb == null) continue
      if (va == null) return 1
      if (vb == null) return -1
      let cmp = 0
      if (key === 'ngay_don_hang' || key === 'ngay_giao_hang') {
        cmp = String(va).localeCompare(String(vb))
      } else {
        cmp = String(va).localeCompare(String(vb), 'vi')
      }
      if (cmp !== 0) return s.direction === 'asc' ? cmp : -cmp
    }
    return 0
  })

  const openDonMuaHangFromDeXuat = (dx: DeXuatMuaHangRecord) => {
    const ct = api.getChiTiet(dx.id)
    const mappedCt: DonMuaHangChiTiet[] = ct.map((c, i) => ({
      id: `dx-${dx.id}-${i}`,
      don_mua_hang_id: '',
      ma_hang: c.ma_hang,
      ten_hang: c.ten_hang,
      ma_quy_cach: '',
      dvt: c.dvt,
      chieu_dai: 0,
      chieu_rong: 0,
      chieu_cao: 0,
      ban_kinh: 0,
      luong: 0,
      so_luong: c.so_luong,
      so_luong_nhan: 0,
      don_gia: c.don_gia ?? 0,
      thanh_tien: c.thanh_tien ?? 0,
      pt_thue_gtgt: c.pt_thue_gtgt ?? null,
      tien_thue_gtgt: c.tien_thue_gtgt ?? null,
      lenh_san_xuat: '',
      ghi_chu: c.ghi_chu ?? '',
    }))

    const loai = (dx.so_chung_tu_cukcuk ?? '').trim()
    const ten = (dx.de_xuat_tu_ten ?? '').trim()
    const doiChieuLabel = loai && ten ? `${loai}: ${ten}` : loai || ten || ''
    const newPrefillDon: Partial<DonMuaHangRecord> = {
      tinh_trang: 'Chưa thực hiện',
      ngay_don_hang: dx.ngay_don_hang,
      ngay_giao_hang: dx.ngay_giao_hang,
      nha_cung_cap: dx.nha_cung_cap,
      dia_chi: dx.dia_chi ?? '',
      ma_so_thue: dx.ma_so_thue ?? '',
      dien_giai: (dx.ghi_chu ?? dx.dien_giai ?? '').trim(),
      nv_mua_hang: dx.nv_mua_hang ?? '',
      dieu_khoan_tt: dx.dieu_khoan_tt ?? '',
      so_ngay_duoc_no: dx.so_ngay_duoc_no ?? '0',
      dia_diem_giao_hang: dx.dia_diem_giao_hang ?? '',
      dieu_khoan_khac: dx.dieu_khoan_khac ?? '',
      so_chung_tu_cukcuk: doiChieuLabel,
      de_xuat_id: dx.id,
    }
    setPrefillDon(newPrefillDon)
    setPrefillChiTiet(mappedCt)
    setDonFormKey((k) => k + 1)
    setShowDonForm(true)
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div style={toolbarWrap}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
          <button type="button" className="htql-toolbar-btn" style={toolbarBtn} onClick={() => { api.clearDraft(); setViewDon(null); setAddFormKey((k) => k + 1); setShowForm(true); }}>
            <Plus size={14} />
            <span>Thêm</span>
          </button>
          <button
            type="button"
            className="htql-toolbar-btn"
            style={toolbarBtn}
            disabled={!selectedId}
            title={selectedId ? 'Xem đề xuất đang chọn' : 'Chọn đề xuất cần xem'}
            onClick={() => {
              if (selectedId) {
                const d = danhSach.find((r) => r.id === selectedId)
                if (d) {
                  setViewDon(d)
                  setShowForm(true)
                }
              }
            }}
          >
            <Eye size={14} />
            <span>Xem</span>
          </button>
          <button
            type="button"
            className="htql-toolbar-btn"
            style={toolbarBtn}
            disabled={!selectedId}
            title={selectedId ? 'Xóa đề xuất đang chọn' : 'Chọn đề xuất cần xóa'}
            onClick={() => {
              const d = selectedId ? danhSach.find((r) => r.id === selectedId) : null
              if (d) setDeleteTarget(d)
            }}
          >
            <Trash2 size={14} />
            <span>Xóa</span>
          </button>
          <div ref={refEmail} style={{ position: 'relative' }}>
            <button type="button" className="htql-toolbar-btn" style={toolbarBtn} onClick={() => setDropdownEmail((v) => !v)}>
              <Mail size={14} />
              <span>Gửi email, Zalo</span>
              <ChevronDown size={12} />
            </button>
            {dropdownEmail && (
              <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: 2, background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 4, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 10, minWidth: 140 }}>
                <button type="button" style={{ ...toolbarBtn, width: '100%', justifyContent: 'flex-start', border: 'none', borderRadius: 0 }}>Email</button>
                <button type="button" style={{ ...toolbarBtn, width: '100%', justifyContent: 'flex-start', border: 'none', borderRadius: 0 }}>Zalo</button>
              </div>
            )}
          </div>
          <div ref={refXuatKhau} style={{ position: 'relative' }}>
            <button type="button" className="htql-toolbar-btn" style={toolbarBtn} onClick={() => setDropdownXuatKhau((v) => !v)}>
              <Download size={14} />
              <span>Xuất khẩu</span>
              <ChevronDown size={12} />
            </button>
            {dropdownXuatKhau && (
              <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: 2, background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 4, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 10, minWidth: 160 }}>
                <button
                  type="button"
                  style={{ ...toolbarBtn, width: '100%', justifyContent: 'flex-start', border: 'none', borderRadius: 0 }}
                  onClick={() => {
                    const header = columnsDeXuat.map((c) => c.label)
                  const dataRows = sortedDanhSach.map((d) =>
                      columnsDeXuat.map((col) => {
                        const v = d[col.key as keyof DeXuatMuaHangRecord]
                        if (col.key === 'ngay_don_hang' || col.key === 'ngay_giao_hang') return formatIsoToDdMmYyyy(v as string | null)
                        return String(v ?? '')
                      })
                    )
                    exportCsv([header, ...dataRows], 'De_xuat_mua_hang.csv')
                    setDropdownXuatKhau(false)
                  }}
                >
                  Excel (danh sách đề xuất)
                </button>
                <button
                  type="button"
                  style={{ ...toolbarBtn, width: '100%', justifyContent: 'flex-start', border: 'none', borderRadius: 0 }}
                  onClick={() => {
                    const header = columnsDeXuat.map((c) => c.label)
                  const dataRows = sortedDanhSach.map((d) =>
                      columnsDeXuat.map((col) => {
                        const v = d[col.key as keyof DeXuatMuaHangRecord]
                        if (col.key === 'ngay_don_hang' || col.key === 'ngay_giao_hang') return formatIsoToDdMmYyyy(v as string | null)
                        return String(v ?? '')
                      })
                    )
                    exportCsv([header, ...dataRows], 'De_xuat_mua_hang.csv')
                    setDropdownXuatKhau(false)
                  }}
                >
                  CSV (danh sách đề xuất)
                </button>
                <button
                  type="button"
                  style={{ ...toolbarBtn, width: '100%', justifyContent: 'flex-start', border: 'none', borderRadius: 0 }}
                  disabled={chiTiet.length === 0}
                  title={chiTiet.length === 0 ? 'Chọn đề xuất để xem chi tiết' : 'Xuất chi tiết đề xuất đang chọn'}
                  onClick={() => {
                    if (chiTiet.length === 0) return
                    const header = columnsChiTietDeXuat.map((c) => c.label)
                    const dataRows = chiTiet.map((row) =>
                      columnsChiTietDeXuat.map((col) => {
                        const v = row[col.key as keyof DeXuatMuaHangChiTiet]
                        if (col.key === 'dvt') return dvtHienThiLabel(v as string, dvtList)
                        if (col.key === 'so_luong') return formatSoThapPhan(Number(v), 2)
                        return String(v ?? '')
                      })
                    )
                    const soDon = selectedId ? danhSach.find((d) => d.id === selectedId)?.so_don_hang ?? 'chi-tiet' : 'chi-tiet'
                    exportCsv([header, ...dataRows], `De_xuat_mua_hang_${soDon}_chi_tiet.csv`)
                    setDropdownXuatKhau(false)
                  }}
                >
                  CSV (chi tiết đề xuất chọn)
                </button>
              </div>
            )}
          </div>
        </div>
        <div style={filterWrap}>
          <span style={filterLabel}>Kỳ</span>
          <select style={filterInput} value={filter.ky} onChange={(e) => onKyChange(e.target.value as KyValue)}>
            {api.KY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <span style={filterLabel}>Từ</span>
          <input type="date" style={filterInput} value={filter.tu} onChange={(e) => setFilter((f) => ({ ...f, tu: e.target.value }))} />
          <span style={filterLabel}>Đến</span>
          <input type="date" style={filterInput} value={filter.den} onChange={(e) => setFilter((f) => ({ ...f, den: e.target.value }))} />
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <DataGrid<DeXuatMuaHangRecord>
            columns={columnsDeXuat}
            data={sortedDanhSach}
            keyField="id"
            selectedRowId={selectedId}
            onRowSelect={(r) => setSelectedId(r.id)}
            onRowContextMenu={(r, e) => {
              e.preventDefault()
              setSelectedId(r.id)
              setContextMenu({ open: true, x: e.clientX, y: e.clientY, row: r })
            }}
            onRowDoubleClick={(r) => {
              setViewDon(r)
              setShowForm(true)
            }}
            summary={[
              { label: 'Số dòng', value: `= ${danhSach.length}` },
            ]}
            sortableColumns={['ngay_don_hang', 'tinh_trang']}
            sortState={sortState}
            onSortChange={setSortState}
            height="100%"
            compact
          />
        </div>
        <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', height: 260, minHeight: 260 }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Chi tiết</div>
            <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
              <DataGrid<DeXuatMuaHangChiTiet>
                columns={columnsChiTietDeXuat}
                data={chiTiet}
                keyField="id"
                summary={[
                  { label: 'Số lượng', value: formatSoThapPhan(tongChiTiet.so_luong, 2) },
                  { label: 'Số dòng', value: `= ${chiTiet.length}` },
                ]}
                height="100%"
                compact
              />
            </div>
        </div>
      </div>

      {contextMenu.open && contextMenu.row && (
        <div
          style={{
            position: 'fixed',
            left: contextMenu.x,
            top: contextMenu.y,
            background: 'var(--bg-primary)',
            border: '1px solid var(--border-strong)',
            borderRadius: 4,
            boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
            zIndex: 2000,
            minWidth: 180,
            padding: 4,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            style={{
              width: '100%',
              textAlign: 'left',
              padding: '6px 10px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              fontSize: 12,
              color: 'var(--text-primary)',
              borderRadius: 3,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
            onMouseEnter={(e) => ((e.currentTarget.style.background = 'var(--bg-secondary)'))}
            onMouseLeave={(e) => ((e.currentTarget.style.background = 'transparent'))}
            onClick={() => {
              const dx = contextMenu.row
              if (!dx) return
              setContextMenu((m) => ({ ...m, open: false, row: null }))
              openDonMuaHangFromDeXuat(dx)
            }}
          >
            <FileText size={14} />
            <span>Chuyển đơn mua hàng</span>
          </button>
          <div
            style={{
              margin: '4px 0',
              borderTop: '1px solid var(--border)',
            }}
          />
          <button
            type="button"
            style={{
              width: '100%',
              textAlign: 'left',
              padding: '6px 10px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              fontSize: 12,
              color: 'var(--text-primary)',
              borderRadius: 3,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
            onMouseEnter={(e) => ((e.currentTarget.style.background = 'var(--bg-secondary)'))}
            onMouseLeave={(e) => ((e.currentTarget.style.background = 'transparent'))}
            onClick={() => {
              // TODO: mở biểu mẫu in đề xuất (hiện tại chưa gắn logic)
              setContextMenu((m) => ({ ...m, open: false, row: null }))
            }}
          >
            <FileText size={14} />
            <span>Biểu mẫu</span>
          </button>
          <button
            type="button"
            style={{
              width: '100%',
              textAlign: 'left',
              padding: '6px 10px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              fontSize: 12,
              color: 'var(--text-primary)',
              borderRadius: 3,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
            onMouseEnter={(e) => ((e.currentTarget.style.background = 'var(--bg-secondary)'))}
            onMouseLeave={(e) => ((e.currentTarget.style.background = 'transparent'))}
            onClick={() => {
              // TODO: mở màn hình đính kèm chứng từ (hiện tại chưa gắn logic)
              setContextMenu((m) => ({ ...m, open: false, row: null }))
            }}
          >
            <Paperclip size={14} />
            <span>Đính kèm</span>
          </button>
        </div>
      )}

      <Modal
        open={deleteTarget != null}
        onClose={() => setDeleteTarget(null)}
        title="Xác nhận xóa"
        size="sm"
        footer={
          <>
            <button type="button" style={{ ...toolbarBtn, marginRight: 8 }} onClick={() => setDeleteTarget(null)}>Hủy</button>
            <button
              type="button"
              style={{ ...toolbarBtn, background: 'var(--accent)', color: 'var(--accent-text)', borderColor: 'var(--accent)' }}
              onClick={() => {
                if (deleteTarget) {
                  api.delete(deleteTarget.id)
                  loadData()
                  setSelectedId(null)
                  setDeleteTarget(null)
                }
              }}
            >
              Đồng ý
            </button>
          </>
        }
      >
        {deleteTarget ? (
          <p style={{ margin: 0, fontSize: 12, color: 'var(--text-primary)' }}>
            Bạn có chắc chắn muốn xóa đề xuất <strong>{deleteTarget.so_don_hang}</strong> – {deleteTarget.nha_cung_cap}?
          </p>
        ) : null}
      </Modal>

      {showForm && (
        <div style={modalOverlay}>
          <div
            ref={modalBoxRef}
            style={{
              ...modalBox,
              ...(formMaximized ? { width: '100vw', maxWidth: '100vw', height: '100vh', maxHeight: '100vh', borderRadius: 0 } : {}),
              ...(formMinimized ? { height: 'auto', maxHeight: 40, minHeight: 40 } : {}),
              ...(modalPosition != null ? { position: 'fixed' as const, left: modalPosition.x, top: modalPosition.y } : {}),
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <DeXuatMuaHangForm
              key={viewDon ? viewDon.id : `add-${addFormKey}`}
              onClose={() => { setViewDon(null); dongModal() }}
              onSaved={() => { setViewDon(null); dongModal(); loadData(); }}
              onSavedAndContinue={() => loadData()}
              onSavedAndView={(don) => { setViewDon(don); loadData(); }}
              onHeaderPointerDown={handleHeaderPointerDown}
              dragging={dragStart != null}
              readOnly={viewDon != null}
              initialDon={viewDon ?? undefined}
              initialChiTiet={viewDon ? api.getChiTiet(viewDon.id) : undefined}
              formTitle="Đề xuất mua hàng"
              soDonLabel="Mã ĐX"
              onMinimize={() => setFormMinimized((v) => !v)}
              onMaximize={() => setFormMaximized((v) => !v)}
            />
          </div>
        </div>
      )}

      {showDonForm && (
        <div style={modalOverlay}>
          <div
            ref={donBoxRef}
            style={{
              ...modalBox,
              ...(donModalPosition != null ? { position: 'fixed' as const, left: donModalPosition.x, top: donModalPosition.y } : {}),
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <MuaHangApiProvider api={apiDon}>
              <DonMuaHangForm
                key={`don-form-${donFormKey}`}
                onClose={() => { setShowDonForm(false); setPrefillDon(null); setPrefillChiTiet(null); setDonModalPosition(null) }}
                onSaved={() => { setShowDonForm(false); setPrefillDon(null); setPrefillChiTiet(null); setDonModalPosition(null) }}
                onSavedAndView={() => { setShowDonForm(false); setPrefillDon(null); setPrefillChiTiet(null); setDonModalPosition(null) }}
                readOnly={false}
                prefillDon={prefillDon}
                prefillChiTiet={prefillChiTiet}
                fromDeXuat={true}
                onHeaderPointerDown={handleDonHeaderPointerDown}
                dragging={donDragStart != null}
                formTitle="Đơn mua hàng"
              />
            </MuaHangApiProvider>
          </div>
        </div>
      )}
    </div>
  )
}

export function DeXuatMuaHang() {
  return (
    <DeXuatMuaHangApiProvider api={apiDeXuat}>
      <DeXuatMuaHangContent />
    </DeXuatMuaHangApiProvider>
  )
}
