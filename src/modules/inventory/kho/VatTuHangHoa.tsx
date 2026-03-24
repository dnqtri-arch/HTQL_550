import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { Plus, Copy, Pencil, Trash2, RefreshCw, Upload, Download, Printer } from 'lucide-react'
import { DataGrid } from '../../../components/common/DataGrid'
import { ListPageToolbar } from '../../../components/ListPageToolbar'
import {
  type VatTuHangHoaRecord,
  vatTuHangHoaGetAll,
  vatTuHangHoaPost,
  vatTuHangHoaPut,
  vatTuHangHoaDelete,
  vatTuHangHoaNapLai,
  vatTuHangHoaTrungMa,
  vatTuHangHoaMaTuDong,
  VATTU_IMAGE_BASE,
} from './vatTuHangHoaApi'
import { formatNumberDisplay, formatSoTienHienThi, parseFloatVN, parseDecimalFlex } from '../../../utils/numberFormat'
import { exportCsv } from '../../../utils/exportCsv'
import { useToastOptional } from '../../../context/ToastContext'
import { Modal } from '../../../components/common/Modal'
import { VatTuHangHoaForm } from './VatTuHangHoaForm'
import { donViTinhGetAll } from './donViTinhApi'

const COT: { key: keyof VatTuHangHoaRecord; label: string; width?: string; align?: 'left' | 'right' }[] = [
  { key: 'ma', label: 'Mã VTHH', width: '12%' },
  { key: 'ten', label: 'Tên VTHH', width: '22%' },
  { key: 'tinh_chat', label: 'Tính chất', width: '14%' },
  { key: 'nhom_vthh', label: 'Nhóm VTHH', width: '14%' },
  { key: 'dvt_chinh', label: 'ĐVT', width: '10%' },
  { key: 'so_luong_ton', label: 'Số lượng tồn', width: '12%', align: 'right' },
  { key: 'gia_tri_ton', label: 'Giá trị tồn', width: '14%', align: 'right' },
]

/** Hiển thị cột ĐVT theo nguyên tắc ĐVT chính: hiển thị ký hiệu/tên (ky_hieu || ten_dvt), không hiển thị mã */
function dvtHienThiLabel(
  value: string | null | undefined,
  dvtList: { ma_dvt: string; ten_dvt: string; ky_hieu?: string }[]
): string {
  if (value == null || value === '') return ''
  const v = String(value).trim()
  const d = dvtList.find(
    (x) => x.ma_dvt === v || x.ten_dvt === v || (x.ky_hieu != null && x.ky_hieu === v)
  )
  return d ? (d.ky_hieu || d.ten_dvt || d.ma_dvt) : v
}

/** Giống form: lấy ĐG bán gốc để tính theo tỉ lệ — không có bậc giá thì dùng ĐG bán tab 1; có bậc giá thì tìm dòng chứa tỉ lệ. */
function getBaseDgBanForDonViQuyDoiView(record: VatTuHangHoaRecord, tiLeNum: number): number {
  const bangGia = record.bang_chiet_khau ?? []
  const hasBangGiaRows = bangGia.some((r) => {
    const tu = (r.so_luong_tu ?? '').trim()
    const den = (r.so_luong_den ?? '').trim()
    const gia = (r.ty_le_chiet_khau ?? '').trim()
    return tu !== '' || den !== '' || gia !== ''
  })
  const donGiaBanTab1 = String(record.don_gia_ban ?? '')
  if (!hasBangGiaRows) return parseFloatVN(donGiaBanTab1) || 0
  const matchingRow = bangGia.find((r) => {
    const tu = parseFloatVN(r.so_luong_tu ?? '')
    const denStr = (r.so_luong_den ?? '').trim()
    const den = parseFloatVN(r.so_luong_den ?? '')
    if (denStr === '') return tiLeNum >= tu
    return tiLeNum >= tu && tiLeNum <= den
  })
  if (!matchingRow) return parseFloatVN(donGiaBanTab1) || 0
  const rowIdx = bangGia.indexOf(matchingRow)
  const useDgBanTab1 = rowIdx === 0 || parseFloatVN(matchingRow.so_luong_tu ?? '') === 0
  const baseNum = useDgBanTab1 ? parseFloatVN(donGiaBanTab1) : parseFloatVN(matchingRow.ty_le_chiet_khau ?? '')
  return baseNum || parseFloatVN(donGiaBanTab1) || 0
}

const panelChiTiet: React.CSSProperties = {
  marginTop: '8px',
  border: '1px solid var(--border-strong)',
  borderRadius: '4px',
  background: 'var(--bg-secondary)',
  overflow: 'hidden',
}

const truongChiTiet: React.CSSProperties = {
  display: 'flex',
  gap: '8px',
  padding: '3px 0',
}

const nhan: React.CSSProperties = {
  color: 'var(--text-secondary)',
  minWidth: '140px',
  fontWeight: 500,
}

const giaTri: React.CSSProperties = {
  color: 'var(--text-primary)',
  fontWeight: 500,
}

const thStyle: React.CSSProperties = {
  padding: '6px 8px',
  textAlign: 'left',
  fontWeight: 600,
  color: 'var(--text-primary)',
  borderBottom: '1px solid var(--border)',
  borderRight: '1px solid var(--border)',
  background: 'var(--bg-tab)',
}
const tdStyle: React.CSSProperties = {
  padding: '6px 8px',
  borderBottom: '1px solid var(--border)',
  borderRight: '1px solid var(--border)',
  color: 'var(--text-primary)',
}

const vungHinhAnh: React.CSSProperties = {
  border: '1px dashed var(--border-strong)',
  borderRadius: '4px',
  minHeight: '120px',
  maxWidth: '160px',
  maxHeight: '160px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'var(--text-muted)',
  fontSize: '10px',
  background: 'var(--bg-primary)',
  overflow: 'hidden',
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
  width: '94vw',
  maxWidth: 1000,
  height: '85vh',
  maxHeight: '85vh',
  display: 'flex',
  flexDirection: 'column',
  boxShadow: '0 8px 40px rgba(0,0,0,0.4)',
  userSelect: 'none',
  pointerEvents: 'auto',
}

export function VatTuHangHoa({ onQuayLai }: { onQuayLai?: () => void }) {
  const toastApi = useToastOptional()
  const showError = toastApi ? (msg: string) => toastApi.showToast(msg, 'error') : (msg: string) => alert(msg)

  const [danhSach, setDanhSach] = useState<VatTuHangHoaRecord[]>([])
  const [dongChon, setDongChon] = useState<VatTuHangHoaRecord | null>(null)
  const [modalOpen, setModalOpen] = useState<'add' | 'edit' | null>(null)
  const [addPrefill, setAddPrefill] = useState<Partial<VatTuHangHoaRecord> | null>(null)
  /** Tăng mỗi lần bấm Thêm để form remount → reset các tab và nội dung phía dưới. */
  const [addFormKey, setAddFormKey] = useState(0)
  const [dvtList, setDvtList] = useState<{ id: number; ma_dvt: string; ten_dvt: string; ky_hieu?: string }[]>([])
  const [dangTai, setDangTai] = useState(true)
  const [imageLoadError, setImageLoadError] = useState(false)
  const [imageMeta, setImageMeta] = useState<{ width: number; height: number; sizeMB: number } | null>(null)
  const [detailTab, setDetailTab] = useState<'ngam_dinh' | 'chiet_khau' | 'don_vi_quy_doi' | 'dinh_muc_nvl' | 'dac_tinh'>('ngam_dinh')
  const modalBoxRef = useRef<HTMLDivElement>(null)
  const [modalPosition, setModalPosition] = useState<{ x: number; y: number } | null>(null)
  const [dragStart, setDragStart] = useState<{ clientX: number; clientY: number; startX: number; startY: number } | null>(null)
  const overlayMouseDownRef = useRef(false)
  /** Dòng đang mở form cảnh báo xóa (null = đóng form) */
  const [deleteTarget, setDeleteTarget] = useState<VatTuHangHoaRecord | null>(null)


  const napLai = useCallback(async () => {
    setDangTai(true)
    vatTuHangHoaNapLai()
    try {
      const [data, dvt] = await (async () => {
        const d = await vatTuHangHoaGetAll()
        const dv = await donViTinhGetAll()
        return [d, dv] as const
      })()
      setDanhSach(data)
      setDvtList(dvt.map((r) => ({ id: r.id, ma_dvt: r.ma_dvt, ten_dvt: r.ten_dvt, ky_hieu: r.ky_hieu })))
      if (!dongChon && data.length > 0) setDongChon(data[0])
      else if (dongChon) {
        const capNhat = data.find((r) => r.id === dongChon.id)
        setDongChon(capNhat ?? data[0] ?? null)
      }
    } finally {
      setDangTai(false)
    }
  }, [dongChon])

  const refreshDvtList = useCallback(async () => {
    const dv = await donViTinhGetAll()
    setDvtList(dv.map((r) => ({ id: r.id, ma_dvt: r.ma_dvt, ten_dvt: r.ten_dvt, ky_hieu: r.ky_hieu })))
  }, [])

  /** Dữ liệu lưới: cột ĐVT hiển thị theo ĐVT chính (ky_hieu hoặc ten_dvt), không hiển thị mã */
  const displayData = useMemo(() => {
    return danhSach.map((r) => ({
      ...r,
      dvt_chinh: dvtHienThiLabel(r.dvt_chinh, dvtList),
    }))
  }, [danhSach, dvtList])

  useEffect(() => {
    napLai()
  }, [])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (deleteTarget) setDeleteTarget(null)
      else if (modalOpen) setModalOpen(null)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [modalOpen, deleteTarget])

  useEffect(() => {
    setImageLoadError(false)
    setImageMeta(null)
  }, [dongChon?.id, dongChon?.duong_dan_hinh_anh])

  useEffect(() => {
    setDetailTab('ngam_dinh')
  }, [dongChon?.id])

  const detailTabs = useMemo(() => {
    const tabs: { id: typeof detailTab; label: string }[] = [
      { id: 'ngam_dinh', label: 'Ngầm định' },
    ]
    if (dongChon) {
      const hasChietKhau = Array.isArray(dongChon.bang_chiet_khau) && dongChon.bang_chiet_khau.some((r) => r.so_luong_tu || r.so_luong_den || r.ty_le_chiet_khau)
      if (hasChietKhau) tabs.push({ id: 'chiet_khau', label: 'Bậc giá' })
      const hasDonViQuyDoi = Array.isArray(dongChon.don_vi_quy_doi) && dongChon.don_vi_quy_doi.some((r) => (r.dvt ?? '').trim() || (r.ti_le_quy_doi ?? '1') !== '1' || (r.mo_ta ?? '').trim() || (r.gia_ban ?? '').trim())
      if (hasDonViQuyDoi) tabs.push({ id: 'don_vi_quy_doi', label: 'Đơn vị quy đổi' })
      const hasDinhMucNvl = dongChon.tinh_chat === 'Sản phẩm' && Array.isArray(dongChon.dinh_muc_nvl) && dongChon.dinh_muc_nvl.some((r) => r.ma || r.ten || r.so_luong)
      if (hasDinhMucNvl) tabs.push({ id: 'dinh_muc_nvl', label: 'Định mức nguyên vật liệu' })
      const hasDacTinh = (dongChon.dac_tinh ?? '').trim() || (dongChon.duong_dan_hinh_anh ?? '').trim()
      if (hasDacTinh) tabs.push({ id: 'dac_tinh', label: 'Đặc tính, hình ảnh' })
    }
    return tabs
  }, [dongChon])

  const activeDetailTab = detailTabs.some((t) => t.id === detailTab) ? detailTab : 'ngam_dinh'

  useEffect(() => {
    if (modalOpen) setModalPosition(null)
  }, [modalOpen])

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

  const handleHeaderPointerDown = useCallback((e: React.MouseEvent) => {
    if (!modalBoxRef.current) return
    const rect = modalBoxRef.current.getBoundingClientRect()
    setModalPosition({ x: rect.left, y: rect.top })
    setDragStart({ clientX: e.clientX, clientY: e.clientY, startX: rect.left, startY: rect.top })
  }, [])

  const moThem = () => {
    setAddPrefill(null)
    setAddFormKey((k) => k + 1)
    setModalOpen('add')
  }

  const moSua = () => {
    if (!dongChon) return
    setAddPrefill(null)
    setModalOpen('edit')
  }

  const nhanBan = () => {
    if (!dongChon) return
    setAddPrefill({ ...dongChon, ma: '' })
    setModalOpen('add')
  }

  const dongModal = () => {
    setModalOpen(null)
    setAddPrefill(null)
  }

  const handleSubmitForm = async (payload: Omit<VatTuHangHoaRecord, 'id'>) => {
    if (vatTuHangHoaTrungMa(payload.ma, modalOpen === 'edit' ? dongChon?.id : undefined)) {
      throw new Error('Mã VTHH đã tồn tại.')
    }
    if (modalOpen === 'add') {
      await vatTuHangHoaPost(payload)
    } else if (modalOpen === 'edit' && dongChon) {
      await vatTuHangHoaPut(dongChon.id, { ...payload, so_luong_ton: dongChon.so_luong_ton, gia_tri_ton: dongChon.gia_tri_ton })
    }
    await napLai()
  }

  const handleSubmitAndAdd = async (payload: Omit<VatTuHangHoaRecord, 'id'>) => {
    if (vatTuHangHoaTrungMa(payload.ma)) {
      throw new Error('Mã VTHH đã tồn tại.')
    }
    await vatTuHangHoaPost(payload)
    await napLai()
  }

  const moFormXoa = () => {
    if (!dongChon) return
    setDeleteTarget(dongChon)
  }

  const thucHienXoa = async () => {
    if (!deleteTarget) return
    const idXoa = deleteTarget.id
    setDeleteTarget(null)
    try {
      await vatTuHangHoaDelete(idXoa)
      setDanhSach((prev) => prev.filter((r) => r.id !== idXoa))
      setDongChon((prev) => (prev?.id === idXoa ? null : prev))
      await napLai()
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Có lỗi xảy ra.')
    }
  }

  const xuatKhau = () => {
    const header = ['Mã', 'Tên', 'Tính chất', 'Nhóm VTHH', 'ĐVT', 'Số lượng tồn', 'Giá trị tồn']
    const rows = danhSach.map((r) => [
      r.ma,
      r.ten,
      r.tinh_chat,
      r.nhom_vthh,
      dvtHienThiLabel(r.dvt_chinh, dvtList),
      String(r.so_luong_ton ?? ''),
      String(r.gia_tri_ton ?? ''),
    ])
    exportCsv([header, ...rows], 'Vat_tu_hang_hoa.csv')
  }

  const columns = COT.map((c) => ({
    key: c.key,
    label: c.label,
    width: c.width,
    align: c.align,
    filterable: false,
  }))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, background: 'var(--bg-secondary)' }}>
      <ListPageToolbar
        onQuayLai={onQuayLai}
        buttons={[
          { icon: <Plus size={14} />, label: 'Thêm', onClick: moThem },
          { icon: <Copy size={14} />, label: 'Nhân bản', onClick: nhanBan, disabled: !dongChon },
          { icon: <Pencil size={14} />, label: 'Sửa', onClick: moSua, disabled: !dongChon },
          { icon: <Trash2 size={14} />, label: 'Xóa', onClick: moFormXoa, disabled: !dongChon },
          { icon: <RefreshCw size={14} />, label: 'Làm mới', onClick: () => napLai(), disabled: dangTai, title: 'Làm mới lại dữ liệu vật tư hàng hóa' },
          { icon: <Upload size={14} />, label: 'Nhập khẩu' },
          { icon: <Download size={14} />, label: 'Xuất khẩu', onClick: xuatKhau },
          { icon: <Printer size={14} />, label: 'In' },
        ]}
      />

      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
          <DataGrid<VatTuHangHoaRecord>
            columns={columns}
            data={displayData}
            keyField="id"
            selectedRowId={dongChon?.id ?? null}
            onRowSelect={(row) => {
              const original = danhSach.find((r) => r.id === row.id) ?? null
              setDongChon(original)
            }}
            onRowDoubleClick={(row) => {
              const original = danhSach.find((r) => r.id === row.id) ?? null
              setDongChon(original ?? null)
              setAddPrefill(null)
              setModalOpen('edit')
            }}
            summary={[
              { label: 'Số dòng', value: danhSach.length },
              {
                label: 'Tổng giá trị',
                value: formatNumberDisplay(danhSach.reduce((s, r) => s + r.gia_tri_ton, 0), 0),
              },
            ]}
            maxHeight={240}
          />
        </div>

        <div style={{ ...panelChiTiet, flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap', marginBottom: 8, flexShrink: 0, minHeight: 28 }}>
            {detailTabs.map((t, i) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setDetailTab(t.id)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                  padding: '4px 8px',
                  height: 26,
                  boxSizing: 'border-box',
                  fontSize: 11,
                  fontWeight: activeDetailTab === t.id ? 700 : 600,
                  background: activeDetailTab === t.id ? 'var(--accent)' : 'var(--bg-primary)',
                  color: activeDetailTab === t.id ? 'var(--accent-text)' : 'var(--text-primary)',
                  border: '1px solid ' + (activeDetailTab === t.id ? 'var(--accent)' : 'var(--border-strong)'),
                  borderRadius: 4,
                  cursor: 'pointer',
                  boxShadow: activeDetailTab === t.id ? 'none' : '0 1px 2px rgba(0,0,0,0.06)',
                }}
              >
                {i + 1}. {t.label}
              </button>
            ))}
          </div>
          <div style={{ minHeight: 220, overflow: 'auto', flex: 1 }}>
          {activeDetailTab === 'ngam_dinh' && (
            <div style={{ padding: 10, fontSize: 11 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(100px, 1fr) minmax(120px, 1fr) minmax(100px, 1fr) minmax(120px, 1fr)', gap: '8px 16px', alignItems: 'center' }}>
                <span style={nhan}>Kho ngầm định</span>
                <span style={giaTri}>{dongChon?.kho_ngam_dinh ?? '—'}</span>
                <span style={nhan}>ĐG mua cố định</span>
                <span style={giaTri}>{dongChon?.don_gia_mua_co_dinh != null ? formatNumberDisplay(dongChon.don_gia_mua_co_dinh) : '—'}</span>
                <span style={nhan}>TK kho</span>
                <span style={giaTri}>{dongChon?.tai_khoan_kho ?? '—'}</span>
                <span style={nhan}>ĐG mua gần nhất</span>
                <span style={giaTri}>{dongChon?.gia_mua_gan_nhat != null ? formatNumberDisplay(dongChon.gia_mua_gan_nhat) : (dongChon?.don_gia_mua != null ? formatNumberDisplay(dongChon.don_gia_mua) : '—')}</span>
                <span style={nhan}>TK doanh thu</span>
                <span style={giaTri}>{dongChon?.tk_doanh_thu ?? '5111'}</span>
                <span style={nhan}>ĐG bán</span>
                <span style={giaTri}>{dongChon?.don_gia_ban != null ? formatNumberDisplay(dongChon.don_gia_ban) : '—'}</span>
                <span style={nhan}>TK chiết khấu</span>
                <span style={giaTri}>{dongChon?.tk_chiet_khau ?? '—'}</span>
                <span style={nhan}>Thuế GTGT (%)</span>
                <span style={giaTri}>{dongChon?.thue_suat_gtgt ?? 'Chưa xác định'}%</span>
                <span style={nhan}>TK giảm giá</span>
                <span style={giaTri}>{dongChon?.tk_giam_gia ?? '—'}</span>
                <span style={nhan}>Là hàng khuyến mại</span>
                <span style={giaTri}>{dongChon?.la_hang_khuyen_mai ? 'Có' : 'Không'}</span>
                <span style={nhan}>TK trả lại</span>
                <span style={giaTri}>{dongChon?.tk_tra_lai ?? '—'}</span>
                <span style={nhan}>TK chi phí</span>
                <span style={giaTri}>{dongChon?.tk_chi_phi ?? '—'}</span>
              </div>
              {(dongChon?.cong_thuc_tinh_so_luong ?? '').trim() && (
                <div style={{ ...truongChiTiet, marginTop: 10 }}>
                  <span style={nhan}>Công thức tính số lượng:</span>
                  <span style={{ ...giaTri, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{dongChon?.cong_thuc_tinh_so_luong}</span>
                </div>
              )}
            </div>
          )}
          {activeDetailTab === 'chiet_khau' && dongChon?.bang_chiet_khau && (
            <div style={{ border: '1px solid var(--border)', borderRadius: 4, overflow: 'hidden', background: 'var(--bg-tab)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, tableLayout: 'fixed' }}>
                <colgroup>
                  <col style={{ width: 36 }} />
                  <col style={{ width: 72 }} />
                  <col style={{ width: 72 }} />
                  <col style={{ width: 72 }} />
                  <col />
                </colgroup>
                <thead>
                  <tr>
                    <th style={{ ...thStyle, width: 36, textAlign: 'center' }}>STT</th>
                    <th style={{ ...thStyle, width: 72 }}>Số lượng từ</th>
                    <th style={{ ...thStyle, width: 72 }}>Số lượng đến</th>
                    <th style={{ ...thStyle, width: 72 }}>Đơn giá</th>
                    <th style={thStyle}>Mô tả</th>
                  </tr>
                </thead>
                <tbody>
                  {dongChon.bang_chiet_khau.filter((r) => r.so_luong_tu || r.so_luong_den || r.ty_le_chiet_khau).map((r, i) => (
                    <tr key={i}>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>{i + 1}</td>
                      <td style={tdStyle}>{r.so_luong_tu || '—'}</td>
                      <td style={tdStyle}>{r.so_luong_den || '—'}</td>
                      <td style={tdStyle}>{r.ty_le_chiet_khau || '—'}</td>
                      <td style={tdStyle}>{r.mo_ta || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {activeDetailTab === 'don_vi_quy_doi' && dongChon?.don_vi_quy_doi && (
            <div style={{ border: '1px solid var(--border)', borderRadius: 4, overflowX: 'auto', background: 'var(--bg-tab)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, tableLayout: 'fixed' }}>
                <colgroup>
                  <col style={{ width: 36 }} />
                  <col style={{ width: 92 }} />
                  <col style={{ width: 72 }} />
                  <col style={{ width: 90 }} />
                  <col style={{ width: 90 }} />
                  <col style={{ width: 90 }} />
                  <col />
                </colgroup>
                <thead>
                  <tr>
                    <th style={{ ...thStyle, width: 36, textAlign: 'center' }}>STT</th>
                    <th style={{ ...thStyle, width: 92 }}>ĐV quy đổi</th>
                    <th style={{ ...thStyle, width: 72, textAlign: 'left' }}>Tỉ lệ</th>
                    <th style={{ ...thStyle, width: 90 }} title="Phép nhân = nhân toán học, Phép chia = chia toán học">Phép tính</th>
                    <th style={{ ...thStyle, width: 90, textAlign: 'right' }}>ĐG mua</th>
                    <th style={{ ...thStyle, width: 90, textAlign: 'right' }}>ĐG bán</th>
                    <th style={thStyle}>Mô tả</th>
                  </tr>
                </thead>
                <tbody>
                  {dongChon.don_vi_quy_doi
                    .filter((r) => (r.dvt ?? '').trim() || (r.ti_le_quy_doi ?? '1') !== '1' || (r.mo_ta ?? '').trim() || (r.gia_ban ?? '').trim() || (r.gia_mua ?? '').trim())
                    .map((r, i) => {
                      const tiLe = parseDecimalFlex(r.ti_le_quy_doi ?? '1')
                      const phepTinh = r.phep_tinh === 'chia' ? 'chia' : r.phep_tinh === 'nhan' ? 'nhan' : null
                      const baseDgMua = (dongChon.gia_mua_gan_nhat ?? 0) > 0 ? (dongChon.gia_mua_gan_nhat ?? 0) : (dongChon.don_gia_mua_co_dinh ?? dongChon.don_gia_mua ?? 0)
                      let calculatedDgMua = baseDgMua
                      if (phepTinh === 'nhan' && tiLe > 0) calculatedDgMua = baseDgMua * tiLe
                      else if (phepTinh === 'chia' && tiLe > 0) calculatedDgMua = baseDgMua / tiLe
                      const hasGiaMuaInput = r.gia_mua != null && String(r.gia_mua).trim() !== ''
                      const dgMuaDisplay = hasGiaMuaInput ? parseFloatVN(String(r.gia_mua)) : calculatedDgMua
                      const baseDgBan = getBaseDgBanForDonViQuyDoiView(dongChon, tiLe)
                      let calculatedDgBan = baseDgBan
                      if (phepTinh === 'nhan' && tiLe > 0) calculatedDgBan = baseDgBan * tiLe
                      else if (phepTinh === 'chia' && tiLe > 0) calculatedDgBan = baseDgBan / tiLe
                      const hasGiaBanInput = r.gia_ban != null && String(r.gia_ban).trim() !== ''
                      const dgBanDisplay = hasGiaBanInput ? parseFloatVN(String(r.gia_ban)) : calculatedDgBan
                      return (
                        <tr key={i}>
                          <td style={{ ...tdStyle, textAlign: 'center' }}>{i + 1}</td>
                          <td style={tdStyle}>{dvtHienThiLabel(r.dvt ?? '', dvtList) || '—'}</td>
                          <td style={tdStyle}>{formatSoTienHienThi(parseDecimalFlex(r.ti_le_quy_doi ?? '1')) || '1'}</td>
                          <td style={tdStyle}>{r.phep_tinh === 'chia' ? 'Phép chia' : 'Phép nhân'}</td>
                          <td style={{ ...tdStyle, textAlign: 'right' }}>{dgMuaDisplay > 0 || hasGiaMuaInput ? formatNumberDisplay(dgMuaDisplay) : '—'}</td>
                          <td style={{ ...tdStyle, textAlign: 'right' }}>{dgBanDisplay > 0 || hasGiaBanInput ? formatNumberDisplay(dgBanDisplay) : '—'}</td>
                          <td style={tdStyle}>{r.mo_ta || '—'}</td>
                        </tr>
                      )
                    })}
                </tbody>
              </table>
            </div>
          )}
          {activeDetailTab === 'dinh_muc_nvl' && dongChon?.dinh_muc_nvl && (
            <div style={{ border: '1px solid var(--border)', borderRadius: 4, overflow: 'hidden', background: 'var(--bg-tab)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, tableLayout: 'fixed' }}>
                <colgroup>
                  <col style={{ width: 36 }} />
                  <col style={{ width: 72 }} />
                  <col />
                  <col style={{ width: 56 }} />
                  <col style={{ width: 72 }} />
                  <col style={{ width: 64 }} />
                </colgroup>
                <thead>
                  <tr>
                    <th style={{ ...thStyle, width: 36, textAlign: 'center' }}>STT</th>
                    <th style={{ ...thStyle, width: 72 }}>Mã NVL</th>
                    <th style={thStyle}>Nguyên vật liệu</th>
                    <th style={{ ...thStyle, width: 56 }}>ĐVT</th>
                    <th style={{ ...thStyle, width: 72 }}>Số lượng</th>
                    <th style={{ ...thStyle, width: 64 }}>Hao hụt (%)</th>
                  </tr>
                </thead>
                <tbody>
                  {dongChon.dinh_muc_nvl.filter((r) => r.ma || r.ten || r.so_luong).map((r, i) => (
                    <tr key={i}>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>{i + 1}</td>
                      <td style={tdStyle}>{r.ma || '—'}</td>
                      <td style={tdStyle}>{r.ten || '—'}</td>
                      <td style={tdStyle}>{dvtHienThiLabel(r.dvt ?? '', dvtList) || '—'}</td>
                      <td style={tdStyle}>{r.so_luong || '—'}</td>
                      <td style={tdStyle}>{r.hao_hut || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {activeDetailTab === 'dac_tinh' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gridTemplateRows: 'auto minmax(120px, 1fr)', gap: '6px 16px', padding: 10, alignItems: 'stretch' }}>
              <div style={{ minWidth: 0 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>Đặc tính</label>
              </div>
              <div />
              <div style={{ ...giaTri, whiteSpace: 'pre-wrap', wordBreak: 'break-word', minHeight: 120, padding: 8, background: 'var(--bg-tab)', border: '1px solid var(--border)', borderRadius: 4 }}>
                {(dongChon?.dac_tinh ?? '').trim() || '—'}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: 0 }}>
                <div style={{ display: 'flex', flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                <div style={vungHinhAnh}>
                    {dongChon?.duong_dan_hinh_anh && !imageLoadError ? (
                      (() => {
                        const src = dongChon.duong_dan_hinh_anh.startsWith('data:')
                          ? dongChon.duong_dan_hinh_anh
                          : VATTU_IMAGE_BASE + dongChon.duong_dan_hinh_anh
                        const isDataUrl = dongChon.duong_dan_hinh_anh.startsWith('data:')
                        const sizeBytes = isDataUrl
                          ? Math.floor((dongChon.duong_dan_hinh_anh.length - (dongChon.duong_dan_hinh_anh.indexOf(',') + 1)) * 0.75)
                          : 0
                        return (
                          <img
                            src={src}
                            alt={dongChon.ten ?? 'Hình ảnh VTHH'}
                            title={dongChon.ten ?? undefined}
                            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                            onLoad={(e) => {
                              setImageLoadError(false)
                              const img = e.currentTarget
                              setImageMeta({
                                width: img.naturalWidth,
                                height: img.naturalHeight,
                                sizeMB: isDataUrl ? sizeBytes / (1024 * 1024) : 0,
                              })
                            }}
                            onError={() => setImageLoadError(true)}
                          />
                        )
                      })()
                    ) : null}
                    <span style={{ display: dongChon?.duong_dan_hinh_anh && !imageLoadError ? 'none' : 'block', textAlign: 'center', padding: 8 }}>
                      Hình ảnh
                      <br />
                      <span style={{ fontSize: '9px' }}>{VATTU_IMAGE_BASE}</span>
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 10, color: 'var(--text-muted)', minWidth: 0 }}>
                    <div><span style={{ color: 'var(--text-primary)' }}>{dongChon?.duong_dan_hinh_anh ? (dongChon.duong_dan_hinh_anh.startsWith('data:') ? 'Ảnh nhúng (Base64)' : (dongChon.duong_dan_hinh_anh.split(/[/\\]/).pop() ?? '—')) : '—'}</span></div>
                    <div><span style={{ color: 'var(--text-primary)' }}>{imageMeta ? `${imageMeta.width}×${imageMeta.height}` : '—'}</span></div>
                    <div><span style={{ color: 'var(--text-primary)' }}>{imageMeta && imageMeta.sizeMB > 0 ? `${imageMeta.sizeMB.toFixed(2)} MB` : '—'}</span></div>
                    <div style={{ minWidth: 0 }}>
                      <span style={{ color: 'var(--text-primary)', wordBreak: 'break-word', whiteSpace: 'normal', display: 'block' }}>{dongChon?.duong_dan_hinh_anh ? (dongChon.duong_dan_hinh_anh.startsWith('data:') ? 'Base64' : (VATTU_IMAGE_BASE + dongChon.duong_dan_hinh_anh)) : '—'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          </div>
        </div>
      </div>

      {modalOpen && (
        <div
          style={modalOverlay}
          onMouseDown={(e) => { if (e.target === e.currentTarget) overlayMouseDownRef.current = true }}
          onClick={(e) => { if (e.target === e.currentTarget && overlayMouseDownRef.current) dongModal(); overlayMouseDownRef.current = false }}
        >
          <div
            ref={modalBoxRef}
            onMouseDown={() => { overlayMouseDownRef.current = false }}
            style={{
              ...modalBox,
              ...(modalPosition != null
                ? { position: 'fixed' as const, left: modalPosition.x, top: modalPosition.y }
                : {}),
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <VatTuHangHoaForm
              key={modalOpen === 'edit' ? `edit-${dongChon?.id ?? ''}` : `add-${addFormKey}`}
              mode={modalOpen}
              initialData={modalOpen === 'edit' ? dongChon ?? undefined : addPrefill ? { ...addPrefill, id: addPrefill.id ?? 0, so_luong_ton: addPrefill.so_luong_ton ?? 0, gia_tri_ton: addPrefill.gia_tri_ton ?? 0 } as VatTuHangHoaRecord : undefined}
              dvtList={dvtList}
              vatTuList={danhSach}
              onClose={dongModal}
              onSubmit={handleSubmitForm}
              onSubmitAndAdd={handleSubmitAndAdd}
              onMaTuDong={(tinhChat) => vatTuHangHoaMaTuDong(tinhChat)}
              onRefreshDvtList={refreshDvtList}
              onHeaderPointerDown={handleHeaderPointerDown}
              dragging={dragStart != null}
            />
          </div>
        </div>
      )}

      <Modal
        open={deleteTarget != null}
        onClose={() => setDeleteTarget(null)}
        title={deleteTarget?.vt_chinh ? 'Cảnh báo' : 'Xác nhận xóa'}
        size="sm"
        closeOnOverlayClick={false}
        footer={
          deleteTarget?.vt_chinh ? (
            <button type="button" onClick={() => setDeleteTarget(null)} style={{ padding: '4px 12px', background: 'var(--accent)', color: 'var(--accent-text)', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>
              Đóng
            </button>
          ) : (
            <>
              <button type="button" onClick={() => setDeleteTarget(null)} style={{ padding: '4px 12px', background: 'var(--bg-tab)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>
                Đóng
              </button>
              <button type="button" onClick={thucHienXoa} style={{ padding: '4px 12px', background: 'var(--accent)', color: 'var(--accent-text)', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>
                Xóa
              </button>
            </>
          )
        }
      >
        {deleteTarget?.vt_chinh ? (
          <p style={{ margin: 0, fontSize: 12, color: 'var(--text-primary)' }}>
            Không được phép xóa vật tư cấp cha. Vật tư hàng hóa này đã được đánh dấu VT cấp cha.
          </p>
        ) : deleteTarget ? (
          <p style={{ margin: 0, fontSize: 12, color: 'var(--text-primary)' }}>
            Bạn có chắc chắn muốn xóa &quot;{deleteTarget.ten}&quot; (Mã: {deleteTarget.ma})?
          </p>
        ) : null}
      </Modal>
    </div>
  )
}
