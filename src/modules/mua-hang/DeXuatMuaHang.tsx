import { useState, useEffect, useRef } from 'react'
import { Plus, Eye, Trash2, Mail, Download, MessageCircle, HelpCircle, ChevronDown } from 'lucide-react'
import { DataGrid, type DataGridColumn } from '../../components/DataGrid'
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
} from './deXuatMuaHangApi'
import { DeXuatMuaHangApiProvider, useDeXuatMuaHangApi, type DeXuatMuaHangApi } from './DeXuatMuaHangApiContext'
import { Modal } from '../../components/Modal'
import { DeXuatMuaHangForm } from './DeXuatMuaHangForm'
import { formatNumberDisplay, formatSoThapPhan } from '../../utils/numberFormat'
import { exportCsv } from '../../utils/exportCsv'

function formatIsoToDdMmYyyy(iso: string | null): string {
  if (!iso) return ''
  const m = iso.trim().match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return iso
  return `${m[3]}/${m[2]}/${m[1]}`
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
  background: 'rgba(0,0,0,0.7)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
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
  boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
  overflow: 'hidden',
}

const columnsDeXuat: DataGridColumn<DeXuatMuaHangRecord>[] = [
  { key: 'tinh_trang', label: 'Tình trạng', width: '14%' },
  { key: 'ngay_don_hang', label: 'Ngày đề xuất', width: '11%', renderCell: (v) => formatIsoToDdMmYyyy(v as string) },
  { key: 'so_don_hang', label: 'Số đề xuất', width: 100 },
  { key: 'ngay_giao_hang', label: 'Ngày giao hàng', width: '11%', renderCell: (v) => formatIsoToDdMmYyyy(v as string | null) },
  { key: 'nha_cung_cap', label: 'Nhà cung cấp', width: '18%' },
  { key: 'dien_giai', label: 'Diễn giải', width: '12%' },
  { key: 'gia_tri_don_hang', label: 'Giá trị đề xuất', width: '12%', align: 'right', renderCell: (v) => formatNumberDisplay(Number(v), 0) },
  { key: 'so_chung_tu_cukcuk', label: 'Số chứng từ CUKCUK', width: '14%' },
]

const columnsChiTietDeXuat: DataGridColumn<DeXuatMuaHangChiTiet>[] = [
  { key: 'ma_hang', label: 'Mã hàng', width: 90 },
  { key: 'ten_hang', label: 'Tên hàng', width: 140 },
  { key: 'ma_quy_cach', label: 'Mã quy cách', width: 90 },
  { key: 'dvt', label: 'ĐVT', width: 60 },
  { key: 'chieu_dai', label: 'Chiều dài', width: 80, align: 'right', renderCell: (v) => formatSoThapPhan(Number(v), 2) },
  { key: 'chieu_rong', label: 'Chiều rộng', width: 80, align: 'right', renderCell: (v) => formatSoThapPhan(Number(v), 2) },
  { key: 'chieu_cao', label: 'Chiều cao', width: 80, align: 'right', renderCell: (v) => formatSoThapPhan(Number(v), 2) },
  { key: 'ban_kinh', label: 'Bán kính', width: 80, align: 'right', renderCell: (v) => formatSoThapPhan(Number(v), 2) },
  { key: 'luong', label: 'Lượng', width: 70, align: 'right', renderCell: (v) => formatSoThapPhan(Number(v), 2) },
  { key: 'so_luong', label: 'Số lượng', width: 75, align: 'right', renderCell: (v) => formatSoThapPhan(Number(v), 2) },
  { key: 'so_luong_nhan', label: 'Số lượng nhận', width: 95, align: 'right', renderCell: (v) => formatSoThapPhan(Number(v), 2) },
  { key: 'don_gia', label: 'Đơn giá', width: 100, align: 'right', renderCell: (v) => formatSoThapPhan(Number(v), 2) },
  { key: 'thanh_tien', label: 'Thành tiền', width: 100, align: 'right', renderCell: (v) => formatNumberDisplay(Number(v), 0) },
  { key: 'pt_thue_gtgt', label: '% thuế GTGT', width: 90, align: 'right', renderCell: (v) => (v != null ? formatSoThapPhan(Number(v), 2) : '') },
  { key: 'tien_thue_gtgt', label: 'Tiền thuế GTGT', width: 100, align: 'right', renderCell: (v) => (v != null ? formatNumberDisplay(Number(v), 0) : '') },
  { key: 'lenh_san_xuat', label: 'Lệnh sản xuất', width: 100 },
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
  getDraft: getDeXuatDraft,
  setDraft: setDeXuatDraft,
  clearDraft: clearDeXuatDraft,
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

  const loadData = () => setDanhSach(api.getAll(filter))

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

  const dongModal = () => setShowForm(false)

  const onKyChange = (ky: KyValue) => {
    const { tu, den } = api.getDateRangeForKy(ky)
    setFilter((f) => ({ ...f, ky, tu, den }))
  }

  const tongGiaTri = danhSach.reduce((s, d) => s + d.gia_tri_don_hang, 0)
  const tongChiTiet = {
    luong: chiTiet.reduce((s, c) => s + c.luong, 0),
    so_luong: chiTiet.reduce((s, c) => s + c.so_luong, 0),
    so_luong_nhan: chiTiet.reduce((s, c) => s + c.so_luong_nhan, 0),
    thanh_tien: chiTiet.reduce((s, c) => s + c.thanh_tien, 0),
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div style={toolbarWrap}>
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
                  const dataRows = danhSach.map((d) =>
                    columnsDeXuat.map((col) => {
                      const v = d[col.key as keyof DeXuatMuaHangRecord]
                      if (col.key === 'ngay_don_hang' || col.key === 'ngay_giao_hang') return formatIsoToDdMmYyyy(v as string | null)
                      if (col.key === 'gia_tri_don_hang') return formatNumberDisplay(Number(v), 0)
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
                  const dataRows = danhSach.map((d) =>
                    columnsDeXuat.map((col) => {
                      const v = d[col.key as keyof DeXuatMuaHangRecord]
                      if (col.key === 'ngay_don_hang' || col.key === 'ngay_giao_hang') return formatIsoToDdMmYyyy(v as string | null)
                      if (col.key === 'gia_tri_don_hang') return formatNumberDisplay(Number(v), 0)
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
                      if (['chieu_dai', 'chieu_rong', 'chieu_cao', 'ban_kinh', 'luong', 'so_luong', 'so_luong_nhan'].includes(col.key)) return formatSoThapPhan(Number(v), 2)
                      if (['don_gia', 'thanh_tien', 'tien_thue_gtgt'].includes(col.key)) return formatNumberDisplay(Number(v), 0)
                      if (col.key === 'pt_thue_gtgt') return v != null ? formatSoThapPhan(Number(v), 2) : ''
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
        <button type="button" className="htql-toolbar-btn" style={toolbarBtn} onClick={() => {}}>
          <MessageCircle size={14} />
          <span>Góp ý</span>
        </button>
        <button type="button" className="htql-toolbar-btn" style={toolbarBtn} onClick={() => {}}>
          <HelpCircle size={14} />
          <span>Giúp</span>
        </button>
      </div>

      <div style={filterWrap}>
        <span style={filterLabel}>Kỳ</span>
        <select style={{ ...filterInput, minWidth: 180 }} value={filter.ky} onChange={(e) => onKyChange(e.target.value as KyValue)}>
          {api.KY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <span style={filterLabel}>Từ</span>
        <input type="date" style={filterInput} value={filter.tu} onChange={(e) => setFilter((f) => ({ ...f, tu: e.target.value }))} />
        <span style={filterLabel}>Đến</span>
        <input type="date" style={filterInput} value={filter.den} onChange={(e) => setFilter((f) => ({ ...f, den: e.target.value }))} />
        <button type="button" className="htql-toolbar-btn" style={toolbarBtn} onClick={loadData}>Lấy dữ liệu</button>
      </div>

      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <DataGrid<DeXuatMuaHangRecord>
          columns={columnsDeXuat}
          data={danhSach}
          keyField="id"
          selectedRowId={selectedId}
          onRowSelect={(r) => setSelectedId(r.id)}
          onRowDoubleClick={(r) => {
            setViewDon(r)
            setShowForm(true)
          }}
          summary={[
            { label: 'Giá trị đề xuất', value: formatNumberDisplay(tongGiaTri, 0) },
            { label: 'Số dòng', value: `= ${danhSach.length}` },
          ]}
          maxHeight={280}
          compact
        />
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1 }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Chi tiết</div>
          <DataGrid<DeXuatMuaHangChiTiet>
            columns={columnsChiTietDeXuat}
            data={chiTiet}
            keyField="id"
            summary={[
              { label: 'Lượng', value: formatSoThapPhan(tongChiTiet.luong, 2) },
              { label: 'Số lượng', value: formatSoThapPhan(tongChiTiet.so_luong, 2) },
              { label: 'Số lượng nhận', value: formatSoThapPhan(tongChiTiet.so_luong_nhan, 2) },
              { label: 'Thành tiền', value: formatNumberDisplay(tongChiTiet.thanh_tien, 0) },
              { label: 'Số dòng', value: `= ${chiTiet.length}` },
            ]}
            maxHeight={220}
            compact
          />
        </div>
      </div>

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
              onSavedAndView={(don) => { setViewDon(don); loadData(); }}
              onHeaderPointerDown={handleHeaderPointerDown}
              dragging={dragStart != null}
              readOnly={viewDon != null}
              initialDon={viewDon ?? undefined}
              initialChiTiet={viewDon ? api.getChiTiet(viewDon.id) : undefined}
              formTitle="Đề xuất mua hàng"
              soDonLabel="Số đề xuất"
              onMinimize={() => setFormMinimized((v) => !v)}
              onMaximize={() => setFormMaximized((v) => !v)}
            />
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
