import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { Plus, Copy, Pencil, Trash2, RefreshCw, Upload, Download, Printer, Percent, ArrowLeftRight, Package, FileText } from 'lucide-react'
import { DataGrid } from '../../components/DataGrid'
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
import { formatNumberDisplay } from '../../utils/numberFormat'
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

const toolbarWrap: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
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

const panelChiTiet: React.CSSProperties = {
  marginTop: '8px',
  border: '1px solid var(--border-strong)',
  borderRadius: '4px',
  background: '#1a1a1a',
  overflow: 'hidden',
}

const truongChiTiet: React.CSSProperties = {
  display: 'flex',
  gap: '8px',
  padding: '3px 0',
}

const nhan: React.CSSProperties = {
  color: 'var(--text-muted)',
  minWidth: '140px',
}

const giaTri: React.CSSProperties = {
  color: '#e5e7eb',
}

const thStyle: React.CSSProperties = {
  padding: '6px 8px',
  textAlign: 'left',
  fontWeight: 600,
  color: 'var(--text-muted)',
  borderBottom: '1px solid var(--border)',
  background: 'var(--bg-tab)',
}
const tdStyle: React.CSSProperties = {
  padding: '6px 8px',
  borderBottom: '1px solid var(--border)',
  color: 'var(--text-primary)',
}

const vungHinhAnh: React.CSSProperties = {
  border: '1px dashed var(--border-strong)',
  borderRadius: '4px',
  minHeight: '120px',
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
  background: 'rgba(0,0,0,0.7)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
}

const modalBox: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid #4b5563',
  borderRadius: '6px',
  width: '90vw',
  maxWidth: 820,
  height: '85vh',
  maxHeight: '85vh',
  display: 'flex',
  flexDirection: 'column',
  boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
  userSelect: 'none',
}

export function VatTuHangHoa({ onQuayLai }: { onQuayLai?: () => void }) {
  const [danhSach, setDanhSach] = useState<VatTuHangHoaRecord[]>([])
  const [dongChon, setDongChon] = useState<VatTuHangHoaRecord | null>(null)
  const [modalOpen, setModalOpen] = useState<'add' | 'edit' | null>(null)
  const [addPrefill, setAddPrefill] = useState<Partial<VatTuHangHoaRecord> | null>(null)
  const [dvtList, setDvtList] = useState<{ id: number; ma_dvt: string; ten_dvt: string; ky_hieu?: string }[]>([])
  const [dangTai, setDangTai] = useState(true)
  const [imageLoadError, setImageLoadError] = useState(false)
  const [imageMeta, setImageMeta] = useState<{ width: number; height: number; sizeMB: number } | null>(null)
  const [detailTab, setDetailTab] = useState<'ngam_dinh' | 'chiet_khau' | 'don_vi_quy_doi' | 'dinh_muc_nvl' | 'dac_tinh'>('ngam_dinh')
  const modalBoxRef = useRef<HTMLDivElement>(null)
  const [modalPosition, setModalPosition] = useState<{ x: number; y: number } | null>(null)
  const [dragStart, setDragStart] = useState<{ clientX: number; clientY: number; startX: number; startY: number } | null>(null)


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
      if (e.key === 'Escape' && modalOpen) setModalOpen(null)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [modalOpen])

  useEffect(() => {
    setImageLoadError(false)
    setImageMeta(null)
  }, [dongChon?.id, dongChon?.duong_dan_hinh_anh])

  useEffect(() => {
    setDetailTab('ngam_dinh')
  }, [dongChon?.id])

  const detailTabs = useMemo(() => {
    const tabs: { id: typeof detailTab; label: string; icon?: React.ReactNode }[] = [
      { id: 'ngam_dinh', label: '1. Ngầm định' },
    ]
    if (dongChon) {
      const hasChietKhau = Array.isArray(dongChon.bang_chiet_khau) && dongChon.bang_chiet_khau.some((r) => r.so_luong_tu || r.so_luong_den || r.ty_le_chiet_khau)
      if (hasChietKhau) tabs.push({ id: 'chiet_khau', label: '2. Bậc giá', icon: <Percent size={12} /> })
      const hasDonViQuyDoi = Array.isArray(dongChon.don_vi_quy_doi) && dongChon.don_vi_quy_doi.some((r) => (r.dvt ?? '').trim() || (r.ti_le_quy_doi ?? '1') !== '1' || (r.mo_ta ?? '').trim() || (r.gia_ban ?? '').trim())
      if (hasDonViQuyDoi) tabs.push({ id: 'don_vi_quy_doi', label: '3. Đơn vị quy đổi', icon: <ArrowLeftRight size={12} /> })
      const hasDinhMucNvl = dongChon.tinh_chat === 'Sản phẩm' && Array.isArray(dongChon.dinh_muc_nvl) && dongChon.dinh_muc_nvl.some((r) => r.ma || r.ten || r.so_luong)
      if (hasDinhMucNvl) tabs.push({ id: 'dinh_muc_nvl', label: '4. Định mức nguyên vật liệu', icon: <Package size={12} /> })
      const hasDacTinh = (dongChon.dac_tinh ?? '').trim() || (dongChon.duong_dan_hinh_anh ?? '').trim()
      if (hasDacTinh) tabs.push({ id: 'dac_tinh', label: '6. Đặc tính, hình ảnh', icon: <FileText size={12} /> })
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

  const xoa = async () => {
    if (!dongChon) return
    if (!window.confirm('Bạn có chắc chắn muốn xóa?')) return
    const idXoa = dongChon.id
    try {
      await vatTuHangHoaDelete(idXoa)
      setDanhSach((prev) => prev.filter((r) => r.id !== idXoa))
      setDongChon((prev) => (prev?.id === idXoa ? null : prev))
      await napLai()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Có lỗi xảy ra.')
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
      r.so_luong_ton,
      r.gia_tri_ton,
    ])
    const csv = [header.join(';'), ...rows.map((row) => row.join(';'))].join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'Vat_tu_hang_hoa.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const columns = COT.map((c) => ({
    key: c.key,
    label: c.label,
    width: c.width,
    align: c.align,
    filterable: false,
  }))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, background: '#1a1a1a' }}>
      <div style={toolbarWrap}>
        <button type="button" className="htql-toolbar-btn" style={toolbarBtn} title="Thêm" onClick={moThem}>
          <Plus size={14} />
          <span>Thêm</span>
        </button>
        <button type="button" className="htql-toolbar-btn" style={toolbarBtn} title="Nhân bản" onClick={nhanBan} disabled={!dongChon}>
          <Copy size={14} />
          <span>Nhân bản</span>
        </button>
        <button type="button" className="htql-toolbar-btn" style={toolbarBtn} title="Sửa" onClick={moSua} disabled={!dongChon}>
          <Pencil size={14} />
          <span>Sửa</span>
        </button>
        <button type="button" className="htql-toolbar-btn" style={toolbarBtn} title="Xóa" onClick={xoa} disabled={!dongChon}>
          <Trash2 size={14} />
          <span>Xóa</span>
        </button>
        <button type="button" className="htql-toolbar-btn" style={toolbarBtn} title="Làm mới lại dữ liệu vật tư hàng hóa" onClick={() => napLai()} disabled={dangTai}>
          <RefreshCw size={14} />
          <span>Làm mới</span>
        </button>
        <button type="button" className="htql-toolbar-btn" style={toolbarBtn} title="Nhập khẩu">
          <Upload size={14} />
          <span>Nhập khẩu</span>
        </button>
        <button type="button" className="htql-toolbar-btn" style={toolbarBtn} title="Xuất khẩu" onClick={xuatKhau}>
          <Download size={14} />
          <span>Xuất khẩu</span>
        </button>
        <button type="button" className="htql-toolbar-btn" style={toolbarBtn} title="In">
          <Printer size={14} />
          <span>In</span>
        </button>
        {onQuayLai && (
          <button type="button" className="htql-toolbar-btn" onClick={onQuayLai} style={{ ...toolbarBtn, marginLeft: 'auto' }}>
            ← Quay lại Quy trình
          </button>
        )}
      </div>

      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
          <DataGrid
            columns={columns}
            data={displayData as unknown as Record<string, unknown>[]}
            keyField="id"
            selectedRowId={dongChon?.id ?? null}
            onRowSelect={(row) => {
              const id = (row as Record<string, unknown>).id
              const original = danhSach.find((r) => r.id === id) ?? null
              setDongChon(original)
            }}
            onRowDoubleClick={(row) => {
              const id = (row as Record<string, unknown>).id
              const original = danhSach.find((r) => r.id === id) ?? null
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

        <div style={{ ...panelChiTiet, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
            {detailTabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setDetailTab(t.id)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '4px 8px',
                  fontSize: 11,
                  background: activeDetailTab === t.id ? 'var(--accent)' : 'transparent',
                  color: activeDetailTab === t.id ? '#0d0d0d' : 'var(--text-muted)',
                  border: '1px solid ' + (activeDetailTab === t.id ? 'var(--accent)' : 'var(--border)'),
                  borderRadius: 4,
                  cursor: 'pointer',
                }}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>
          {activeDetailTab === 'ngam_dinh' && (
            <div style={{ padding: 10, fontSize: 11 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(100px, 1fr) minmax(120px, 1fr) minmax(100px, 1fr) minmax(120px, 1fr)', gap: '8px 16px', alignItems: 'center' }}>
                <span style={nhan}>Kho ngầm định</span>
                <span style={giaTri}>{dongChon?.kho_ngam_dinh ?? '—'}</span>
                <span style={nhan}>ĐG mua cố định</span>
                <span style={giaTri}>{dongChon?.don_gia_mua_co_dinh != null ? formatNumberDisplay(dongChon.don_gia_mua_co_dinh) : '—'}</span>
                <span style={nhan}>Tài khoản kho</span>
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
                <span style={nhan}>Có giảm thuế</span>
                <span style={giaTri}>{dongChon?.co_giam_thue ?? '—'}</span>
                <span style={nhan}>TK trả lại</span>
                <span style={giaTri}>{dongChon?.tk_tra_lai ?? '—'}</span>
                <span style={nhan}>Thuế NK (%)</span>
                <span style={giaTri}>{dongChon?.thue_suat_nk ?? '—'}</span>
                <span style={nhan}>Thuế XK (%)</span>
                <span style={giaTri}>{dongChon?.thue_suat_xk ?? '—'}</span>
                <span style={nhan}>Tỷ lệ CKMH (%)</span>
                <span style={giaTri}>{dongChon?.ty_le_ckmh ?? '—'}</span>
                <span style={nhan}>HHDV chịu thuế TTĐB</span>
                <span style={giaTri}>{dongChon?.nhom_hhdv_ttdb ?? '—'}</span>
                <span style={nhan}>Loại HH đặc trưng</span>
                <span style={giaTri}>{dongChon?.loai_hh_dac_trung ?? '—'}</span>
                <span style={nhan}>Là hàng khuyến mại</span>
                <span style={giaTri}>{dongChon?.la_hang_khuyen_mai ? 'Có' : 'Không'}</span>
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
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                <thead>
                  <tr>
                    <th style={{ ...thStyle, width: '30%' }}>Số lượng từ</th>
                    <th style={{ ...thStyle, width: '30%' }}>Số lượng đến</th>
                    <th style={{ ...thStyle, width: '40%' }}>Tỷ lệ CK (%)</th>
                  </tr>
                </thead>
                <tbody>
                  {dongChon.bang_chiet_khau.filter((r) => r.so_luong_tu || r.so_luong_den || r.ty_le_chiet_khau).map((r, i) => (
                    <tr key={i}>
                      <td style={tdStyle}>{r.so_luong_tu || '—'}</td>
                      <td style={tdStyle}>{r.so_luong_den || '—'}</td>
                      <td style={tdStyle}>{r.ty_le_chiet_khau || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {activeDetailTab === 'don_vi_quy_doi' && dongChon?.don_vi_quy_doi && (
            <div style={{ border: '1px solid var(--border)', borderRadius: 4, overflowX: 'auto', background: 'var(--bg-tab)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                <thead>
                  <tr>
                    <th style={{ ...thStyle, width: 36, textAlign: 'center' }}>STT</th>
                    <th style={thStyle}>ĐV quy đổi</th>
                    <th style={thStyle}>Tỉ lệ</th>
                    <th style={thStyle}>Phép tính</th>
                    <th style={thStyle}>Mô tả</th>
                  </tr>
                </thead>
                <tbody>
                  {dongChon.don_vi_quy_doi
                    .filter((r) => (r.dvt ?? '').trim() || (r.ti_le_quy_doi ?? '1') !== '1' || (r.mo_ta ?? '').trim() || (r.gia_ban ?? '').trim())
                    .map((r, i) => (
                      <tr key={i}>
                        <td style={{ ...tdStyle, textAlign: 'center' }}>{i + 1}</td>
                        <td style={tdStyle}>{dvtHienThiLabel(r.dvt ?? '', dvtList) || '—'}</td>
                        <td style={tdStyle}>{r.ti_le_quy_doi ?? '1'}</td>
                        <td style={tdStyle}>{r.phep_tinh === 'chia' ? 'Phép chia' : 'Phép nhân'}</td>
                        <td style={tdStyle}>{r.mo_ta || '—'}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
          {activeDetailTab === 'dinh_muc_nvl' && dongChon?.dinh_muc_nvl && (
            <div style={{ border: '1px solid var(--border)', borderRadius: 4, overflow: 'hidden', background: 'var(--bg-tab)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                <thead>
                  <tr>
                    <th style={{ ...thStyle, width: '15%' }}>Mã</th>
                    <th style={{ ...thStyle, width: '35%' }}>Tên</th>
                    <th style={{ ...thStyle, width: '12%' }}>ĐVT</th>
                    <th style={{ ...thStyle, width: '18%' }}>Số lượng</th>
                    <th style={{ ...thStyle, width: '20%' }}>Hao hụt</th>
                  </tr>
                </thead>
                <tbody>
                  {dongChon.dinh_muc_nvl.filter((r) => r.ma || r.ten || r.so_luong).map((r, i) => (
                    <tr key={i}>
                      <td style={tdStyle}>{r.ma || '—'}</td>
                      <td style={tdStyle}>{r.ten || '—'}</td>
                      <td style={tdStyle}>{r.dvt || '—'}</td>
                      <td style={tdStyle}>{r.so_luong || '—'}</td>
                      <td style={tdStyle}>{r.hao_hut || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {activeDetailTab === 'dac_tinh' && (
            <div style={{ display: 'flex', flexDirection: 'row', gap: 16, padding: 10, alignItems: 'flex-start' }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>Đặc tính</label>
                <div style={{ ...giaTri, whiteSpace: 'pre-wrap', wordBreak: 'break-word', minHeight: 120, padding: 8, background: 'var(--bg-tab)', border: '1px solid var(--border)', borderRadius: 4 }}>
                  {(dongChon?.dac_tinh ?? '').trim() || '—'}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>Hình ảnh (tối đa 5MB)</label>
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
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                  {dongChon?.duong_dan_hinh_anh
                    ? (dongChon.duong_dan_hinh_anh.startsWith('data:') ? 'Ảnh nhúng (Base64)' : (dongChon.duong_dan_hinh_anh.split(/[/\\]/).pop() ?? ''))
                    : '—'}
                  {imageMeta ? ` • ${imageMeta.width}×${imageMeta.height}` + (imageMeta.sizeMB > 0 ? `, ${imageMeta.sizeMB.toFixed(2)} MB` : '') : ''}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {modalOpen && (
        <div style={modalOverlay} onClick={dongModal}>
          <div
            ref={modalBoxRef}
            style={{
              ...modalBox,
              ...(modalPosition != null
                ? { position: 'fixed' as const, left: modalPosition.x, top: modalPosition.y }
                : {}),
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <VatTuHangHoaForm
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
    </div>
  )
}
