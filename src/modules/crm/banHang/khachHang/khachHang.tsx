/**
 * Danh sách Khách hàng — YC83: Form tách sang khachHangForm.tsx
 */

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Plus, Copy, Pencil, Trash2, RefreshCw, Download, Upload } from 'lucide-react'
import { DataGrid } from '../../../../components/common/dataGrid'
import { ListPageToolbar } from '../../../../components/listPageToolbar'
import { exportCsv } from '../../../../utils/exportCsv'
import { useToastOptional } from '../../../../context/toastContext'
import {
  type KhachHangRecord,
  type NhomKhachHangItem,
  khachHangGetAll,
  khachHangDelete,
  khachHangNapLai,
  loadNhomKhachHang,
} from './khachHangApi'
import { LOOKUP_CONTROL_HEIGHT } from '../../../../constants/lookupControlStyles'
import { KhachHangForm } from './khachHangForm'
import { DANH_MUC_POLL_INTERVAL_MS } from '../../../../constants/danhMucPoll'

/** Chuẩn hóa chuỗi tiếng Việt để lọc (bỏ dấu, lowercase). */
function normalizeForFilter(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
}

const COT: { key: keyof KhachHangRecord | string; label: string; width?: string; filterable?: boolean; renderCell?: (v: unknown, r: KhachHangRecord) => React.ReactNode }[] = [
  { key: 'ma_kh', label: 'Mã khách hàng', width: '12%', filterable: false },
  { key: 'ten_kh', label: 'Tên khách hàng', width: '20%', filterable: false },
  { key: 'dia_chi', label: 'Địa chỉ', width: '22%', filterable: false },
  { key: 'nhom_kh', label: 'Nhóm khách hàng', width: '12%', filterable: false },
  { key: 'ma_so_thue', label: 'Mã số thuế', width: '11%', filterable: false },
  { key: 'dien_thoai', label: 'Điện thoại', width: '11%', filterable: false },
  { key: 'ngung_theo_doi', label: 'Ngừng theo dõi', width: '10%', filterable: false, renderCell: (v) => (v ? '✓' : '') },
]

const FORM_FIELD_HEIGHT = LOOKUP_CONTROL_HEIGHT
const FORM_ROW_GAP = 8
const FORM_SECTION_GAP = 8

const inputStyle: React.CSSProperties = {
  padding: '4px 6px',
  fontSize: '11px',
  background: 'var(--bg-primary)',
  border: '1px solid var(--border)',
  borderRadius: '4px',
  color: 'var(--text-primary)',
  height: FORM_FIELD_HEIGHT,
  minHeight: FORM_FIELD_HEIGHT,
  boxSizing: 'border-box',
}

const panelChiTiet: React.CSSProperties = {
  marginTop: '8px',
  border: '1px solid var(--border-strong)',
  borderRadius: '4px',
  background: 'var(--bg-secondary)',
  overflow: 'hidden',
}

const nhanChiTiet: React.CSSProperties = {
  color: 'var(--text-muted)',
  minWidth: '140px',
}

const giaTriChiTiet: React.CSSProperties = {
  color: 'var(--text-primary)',
  fontWeight: 500,
}

const loaiCheckboxStyle: React.CSSProperties = {
  width: 14,
  height: 14,
  margin: 0,
  flexShrink: 0,
  cursor: 'pointer',
  accentColor: 'var(--accent, #d97706)',
}

export type KhachHangEmbeddedProps = {
  embeddedAddMode?: boolean
  onAddSuccess?: (ncc: KhachHangRecord) => void
  onClose?: () => void
}

export function KhachHang({ onQuayLai, embeddedAddMode, onAddSuccess, onClose }: { onQuayLai?: () => void } & KhachHangEmbeddedProps) {
  const toastApi = useToastOptional()
  const showError = toastApi ? (m: string) => toastApi.showToast(m, 'error') : (m: string) => alert(m)

  const [danhSach, setDanhSach] = useState<KhachHangRecord[]>([])
  const [dongChon, setDongChon] = useState<KhachHangRecord | null>(null)
  const [dangTai, setDangTai] = useState(true)
  const [locToChuc, setLocToChuc] = useState(true)
  const [locCaNhan, setLocCaNhan] = useState(true)
  const [nhomLoc, setNhomLoc] = useState('')
  const [danhSachNhom, setDanhSachNhom] = useState<NhomKhachHangItem[]>(() => loadNhomKhachHang())
  const [modalOpen, setModalOpen] = useState<'add' | 'edit' | 'clone' | null>(() => (embeddedAddMode ? 'add' : null))

  const napLai = async () => {
    setDangTai(true)
    khachHangNapLai()
    try {
      const data = await khachHangGetAll()
      setDanhSach(data)
      if (!dongChon && data.length > 0) setDongChon(data[0])
      else if (dongChon) {
        const capNhat = data.find((r) => r.id === dongChon.id)
        setDongChon(capNhat ?? data[0] ?? null)
      }
    } finally {
      setDangTai(false)
    }
  }

  useEffect(() => {
    napLai()
  }, [])

  const loaiLoc = useMemo<'to_chuc' | 'ca_nhan' | 'ca_hai'>(() => {
    if (locToChuc && locCaNhan) return 'ca_hai'
    if (locToChuc) return 'to_chuc'
    if (locCaNhan) return 'ca_nhan'
    return 'ca_hai'
  }, [locToChuc, locCaNhan])

  const refreshBangLang = useCallback(() => {
    khachHangNapLai()
    void khachHangGetAll().then((data) => {
      setDanhSach(data)
      setDongChon((prev) => {
        if (!prev) return data[0] ?? null
        const capNhat = data.find((r) => r.id === prev.id)
        return capNhat ?? data[0] ?? null
      })
    })
  }, [])

  useEffect(() => {
    const id = window.setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return
      refreshBangLang()
    }, DANH_MUC_POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [refreshBangLang])

  useEffect(() => {
    const run = () => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return
      refreshBangLang()
    }
    window.addEventListener('focus', run)
    document.addEventListener('visibilitychange', run)
    return () => {
      window.removeEventListener('focus', run)
      document.removeEventListener('visibilitychange', run)
    }
  }, [refreshBangLang])

  const danhSachLoc = useMemo(
    () =>
      danhSach.filter((r) => {
        if (loaiLoc !== 'ca_hai' && r.loai_kh !== loaiLoc) return false
        if (nhomLoc) {
          const rowVal = normalizeForFilter(r.nhom_kh ?? '')
          const filterVal = normalizeForFilter(nhomLoc)
          if (!rowVal.includes(filterVal)) return false
        }
        return true
      }),
    [danhSach, loaiLoc, nhomLoc]
  )

  const moThem = () => {
    setModalOpen('add')
  }

  const moSua = () => {
    if (!dongChon) return
    setModalOpen('edit')
  }

  const moNhanBan = () => {
    if (!dongChon) return
    setModalOpen('clone')
  }

  const moSuaDoubleClick = (row: KhachHangRecord) => {
    setDongChon(row)
    setModalOpen('edit')
  }

  const dongModalForm = () => {
    setModalOpen(null)
    if (embeddedAddMode) onClose?.()
  }

  const xoa = async () => {
    if (!dongChon) return
    if (!window.confirm('Bạn có chắc chắn muốn xóa khách hàng này?')) return
    const idXoa = dongChon.id
    try {
      await khachHangDelete(idXoa)
      setDanhSach((prev) => prev.filter((r) => r.id !== idXoa))
      setDongChon(null)
      await napLai()
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Có lỗi xảy ra.')
    }
  }

  const xuatKhau = () => {
    const header = ['Mã', 'Tên', 'Loại', 'Địa chỉ', 'Nhóm KH,NCC', 'Mã số thuế', 'Điện thoại', 'Fax', 'Email', 'Website', 'TK Ngân hàng', 'Tên ngân hàng', 'Người liên hệ', 'Ngừng theo dõi']
    const rows = danhSachLoc.map((r) => [
      r.ma_kh,
      r.ten_kh,
      r.loai_kh === 'to_chuc' ? 'Tổ chức' : 'Cá nhân',
      r.dia_chi ?? '',
      r.nhom_kh ?? '',
      r.ma_so_thue ?? '',
      r.dien_thoai ?? '',
      r.fax ?? '',
      r.email ?? '',
      r.website ?? '',
      r.tk_ngan_hang ?? '',
      r.ten_ngan_hang ?? '',
      r.nguoi_lien_he ?? '',
      r.ngung_theo_doi ? 'Có' : '',
    ])
    exportCsv([header, ...rows], 'Nha_cung_cap.csv')
  }

  const columns = COT.map((c) => ({
    key: c.key,
    label: c.label,
    width: c.width,
    filterable: c.filterable !== false,
    renderCell: c.renderCell,
  }))

  return (
    <>
      {!embeddedAddMode ? (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <ListPageToolbar
            onQuayLai={onQuayLai}
            buttons={[
              { icon: <Plus size={14} />, label: 'Thêm', onClick: moThem },
              { icon: <Copy size={14} />, label: 'Nhân bản', onClick: moNhanBan, disabled: !dongChon },
              { icon: <Pencil size={14} />, label: 'Sửa', onClick: moSua, disabled: !dongChon },
              { icon: <Trash2 size={14} />, label: 'Xóa', onClick: xoa, disabled: !dongChon },
              { icon: <RefreshCw size={14} />, label: 'Nạp', onClick: napLai, disabled: dangTai, title: 'Nạp lại dữ liệu' },
              { icon: <Upload size={14} />, label: 'Nhập khẩu', onClick: () => {}, title: 'Chức năng đang phát triển' },
              { icon: <Download size={14} />, label: 'Xuất khẩu', onClick: xuatKhau },
            ]}
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Loại:</span>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '11px', cursor: 'pointer', userSelect: 'none' }}>
              <input
                type="checkbox"
                checked={locToChuc}
                onChange={(e) => {
                  const v = e.target.checked
                  if (!v && !locCaNhan) setLocCaNhan(true)
                  setLocToChuc(v)
                }}
                style={loaiCheckboxStyle}
              />
              Tổ chức
            </label>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '11px', cursor: 'pointer', userSelect: 'none' }}>
              <input
                type="checkbox"
                checked={locCaNhan}
                onChange={(e) => {
                  const v = e.target.checked
                  if (!v && !locToChuc) setLocToChuc(true)
                  setLocCaNhan(v)
                }}
                style={loaiCheckboxStyle}
              />
              Cá nhân
            </label>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>(hai ô đều chọn = hiện cả hai loại)</span>
            <span style={{ marginLeft: '8px', fontSize: '11px', color: 'var(--text-muted)' }}>Nhóm khách hàng:</span>
            <select value={nhomLoc} onChange={(e) => setNhomLoc(e.target.value)} style={{ ...inputStyle, minWidth: 160 }}>
              <option value="">-- Tất cả --</option>
              {danhSachNhom.map((n) => (
                <option key={n.ma} value={n.ten}>
                  {n.ten}
                </option>
              ))}
            </select>
          </div>

          <div style={{ flex: 1, minHeight: 0, width: '100%', minWidth: 0 }}>
            <DataGrid<KhachHangRecord>
              columns={columns}
              data={danhSachLoc}
              keyField="id"
              selectedRowId={dongChon?.id ?? null}
              onRowSelect={setDongChon}
              onRowDoubleClick={moSuaDoubleClick}
              summary={[{ label: 'Số dòng', value: danhSachLoc.length }]}
              height="100%"
              compact
            />
          </div>

          <div style={{ ...panelChiTiet, flexShrink: 0, marginTop: 4, height: 200, maxHeight: 220, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap', marginBottom: FORM_SECTION_GAP, flexShrink: 0, minHeight: FORM_FIELD_HEIGHT, padding: `${FORM_ROW_GAP}px 8px 0` }}>
              <button
                type="button"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                  padding: '4px 8px',
                  height: 26,
                  boxSizing: 'border-box',
                  fontSize: 11,
                  fontWeight: 'bold',
                  background: 'var(--accent)',
                  color: 'var(--accent-text)',
                  border: '1px solid var(--accent)',
                  borderRadius: 4,
                  cursor: 'default',
                }}
              >
                1. Thông tin chung
              </button>
            </div>
            <div style={{ minHeight: 0, overflow: 'auto', flex: 1, padding: 10 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(100px, 1fr) minmax(140px, 1.5fr) minmax(100px, 1fr) minmax(140px, 1.5fr)', gap: '8px 16px', alignItems: 'center', fontSize: 11 }}>
                <span style={nhanChiTiet}>Mã</span>
                <span style={giaTriChiTiet}>{dongChon?.ma_kh ?? '—'}</span>
                <span style={nhanChiTiet}>Tên</span>
                <span style={giaTriChiTiet}>{dongChon?.ten_kh ?? '—'}</span>
                <span style={nhanChiTiet}>Địa chỉ</span>
                <span style={giaTriChiTiet}>{dongChon?.dia_chi ?? '—'}</span>
                <span style={nhanChiTiet}>Mã số thuế</span>
                <span style={giaTriChiTiet}>{dongChon?.ma_so_thue ?? '—'}</span>
                <span style={nhanChiTiet}>Điện thoại</span>
                <span style={giaTriChiTiet}>{dongChon?.dien_thoai ?? '—'}</span>
                <span style={nhanChiTiet}>Fax</span>
                <span style={giaTriChiTiet}>{dongChon?.fax ?? '—'}</span>
                <span style={nhanChiTiet}>Email</span>
                <span style={giaTriChiTiet}>{dongChon?.email ?? '—'}</span>
                <span style={nhanChiTiet}>Website</span>
                <span style={giaTriChiTiet}>{dongChon?.website ?? '—'}</span>
                <span style={nhanChiTiet}>TK Ngân hàng</span>
                <span style={giaTriChiTiet}>{dongChon?.tk_ngan_hang ?? '—'}</span>
                <span style={nhanChiTiet}>Tên ngân hàng</span>
                <span style={giaTriChiTiet}>{dongChon?.ten_ngan_hang ?? '—'}</span>
                <span style={nhanChiTiet}>Người liên hệ</span>
                <span style={giaTriChiTiet}>{dongChon?.nguoi_lien_he ?? '—'}</span>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <KhachHangForm
        modalOpen={modalOpen}
        sourceRow={modalOpen === 'add' ? null : dongChon}
        danhSachNhom={danhSachNhom}
        setDanhSachNhom={setDanhSachNhom}
        embeddedAddMode={embeddedAddMode}
        onAddSuccess={onAddSuccess}
        onClose={dongModalForm}
        onSaved={async () => {
          if (!embeddedAddMode) await napLai()
        }}
      />
    </>
  )
}
