import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { Plus, Copy, Pencil, Trash2, RefreshCw, Upload, Download, Printer } from 'lucide-react'
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

const panelTieuDe: React.CSSProperties = {
  padding: '6px 10px',
  background: 'var(--bg-tab)',
  borderBottom: '1px solid var(--border-strong)',
  fontSize: '11px',
  fontWeight: 600,
  color: '#f59e0b',
}

const grid2cot: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 200px',
  gap: '12px',
  padding: '10px',
  fontSize: '11px',
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
          <div style={panelTieuDe}>1. Thông tin ngầm định</div>
          <div style={grid2cot}>
            <div>
              <div style={truongChiTiet}>
                <span style={nhan}>Kho ngầm định:</span>
                <span style={giaTri}>{dongChon?.kho_ngam_dinh ?? '—'}</span>
              </div>
              <div style={truongChiTiet}>
                <span style={nhan}>Tài khoản kho:</span>
                <span style={giaTri}>{dongChon?.tai_khoan_kho ?? '—'}</span>
              </div>
              <div style={truongChiTiet}>
                <span style={nhan}>TK doanh thu:</span>
                <span style={giaTri}>{dongChon?.tk_doanh_thu ?? '5111'}</span>
              </div>
              <div style={truongChiTiet}>
                <span style={nhan}>TK chi phí:</span>
                <span style={giaTri}>{dongChon?.tk_chi_phi ?? '632'}</span>
              </div>
              <div style={truongChiTiet}>
                <span style={nhan}>Thuế GTGT (%):</span>
                <span style={giaTri}>{dongChon?.thue_suat_gtgt ?? '0'}%</span>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
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
                        style={{
                          maxWidth: '100%',
                          maxHeight: '100%',
                          objectFit: 'contain',
                        }}
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
                <span
                  style={{
                    display: dongChon?.duong_dan_hinh_anh && !imageLoadError ? 'none' : 'block',
                    textAlign: 'center',
                    padding: 8,
                  }}
                  title={dongChon?.duong_dan_hinh_anh ? VATTU_IMAGE_BASE + dongChon.duong_dan_hinh_anh : undefined}
                >
                  Hình ảnh
                  <br />
                  <span style={{ fontSize: '9px' }}>{VATTU_IMAGE_BASE}</span>
                </span>
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: 4, textAlign: 'left' }}>
                <div style={{ ...giaTri, wordBreak: 'break-all' }} title={dongChon?.duong_dan_hinh_anh?.startsWith('data:') ? 'Ảnh nhúng (Base64)' : (dongChon?.duong_dan_hinh_anh ?? '')}>
                  {dongChon?.duong_dan_hinh_anh
                    ? (dongChon.duong_dan_hinh_anh.startsWith('data:') ? 'Ảnh nhúng (Base64)' : (dongChon.duong_dan_hinh_anh.split(/[/\\]/).pop() ?? dongChon.duong_dan_hinh_anh))
                    : '—'}
                </div>
                <div style={{ ...giaTri, wordBreak: 'break-all', fontSize: 9 }}>
                  {imageMeta ? `${imageMeta.width}×${imageMeta.height}` + (imageMeta.sizeMB > 0 ? `, ${imageMeta.sizeMB.toFixed(2)} MB` : '') : (dongChon?.duong_dan_hinh_anh ? '—' : '')}
                </div>
                <div style={{ ...giaTri, wordBreak: 'break-all', fontSize: 9 }} title={dongChon?.duong_dan_hinh_anh && !dongChon.duong_dan_hinh_anh.startsWith('data:') ? VATTU_IMAGE_BASE + dongChon.duong_dan_hinh_anh : undefined}>
                  {dongChon?.duong_dan_hinh_anh && !dongChon.duong_dan_hinh_anh.startsWith('data:')
                    ? VATTU_IMAGE_BASE + dongChon.duong_dan_hinh_anh
                    : dongChon?.duong_dan_hinh_anh ? '(Base64)' : '—'}
                </div>
              </div>
            </div>
          </div>
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
