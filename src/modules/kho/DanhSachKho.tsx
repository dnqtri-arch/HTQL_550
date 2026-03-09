import { useState, useCallback, useMemo } from 'react'
import { Plus, Pencil, Trash2, RefreshCw, Download } from 'lucide-react'
import { DataGrid } from '../../components/DataGrid'
import { loadKhoListFromStorage, saveKhoListToStorage, type KhoStorageItem } from './khoStorage'
import { ThemKhoModal, MapsScriptPreloader } from './ThemKhoModal'

/** Dữ liệu lưới: đảm bảo mọi cột đều có giá trị (tránh cột Địa chỉ không hiển thị) */
type KhoRowDisplay = Record<'id' | 'label' | 'tk_kho' | 'dia_chi', string>

const COT: { key: keyof KhoRowDisplay; label: string; width?: string }[] = [
  { key: 'id', label: 'Mã kho', width: '12%' },
  { key: 'label', label: 'Tên kho', width: '25%' },
  { key: 'tk_kho', label: 'TK kho', width: '13%' },
  { key: 'dia_chi', label: 'Địa chỉ', width: '50%' },
]

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

interface DanhSachKhoProps {
  onQuayLai: () => void
}

export function DanhSachKho({ onQuayLai }: DanhSachKhoProps) {
  const [danhSach, setDanhSach] = useState<KhoStorageItem[]>(loadKhoListFromStorage)
  const [dongChon, setDongChon] = useState<KhoStorageItem | null>(null)
  const [modalThem, setModalThem] = useState(false)
  const [modalSua, setModalSua] = useState(false)

  const napLai = useCallback(() => {
    setDanhSach(loadKhoListFromStorage())
    if (dongChon) {
      const capNhat = loadKhoListFromStorage().find((r) => r.id === dongChon.id)
      setDongChon(capNhat ?? null)
    } else {
      setDongChon(null)
    }
  }, [dongChon])

  const handleThem = useCallback(
    (item: KhoStorageItem) => {
      const next = [...danhSach, item]
      setDanhSach(next)
      saveKhoListToStorage(next)
      setModalThem(false)
    },
    [danhSach]
  )

  const handleThemVaTiepTuc = useCallback(
    (item: KhoStorageItem) => {
      const next = [...danhSach, item]
      setDanhSach(next)
      saveKhoListToStorage(next)
      setModalThem(true)
    },
    [danhSach]
  )

  const xoa = useCallback(() => {
    if (!dongChon) return
    if (!window.confirm(`Xóa kho "${dongChon.label}" (${dongChon.id})?`)) return
    const next = danhSach.filter((r) => r.id !== dongChon.id)
    setDanhSach(next)
    saveKhoListToStorage(next)
    setDongChon(next[0] ?? null)
  }, [dongChon, danhSach])

  const handleSua = useCallback(
    (item: KhoStorageItem) => {
      const next = danhSach.map((r) => (r.id === item.id ? item : r))
      setDanhSach(next)
      saveKhoListToStorage(next)
      setDongChon(item)
      setModalSua(false)
    },
    [danhSach]
  )

  const xuatKhau = useCallback(() => {
    const header = ['Mã kho', 'Tên kho', 'TK kho', 'Địa chỉ']
    const rows = danhSach.map((r) => [r.id, r.label, r.tk_kho ?? '', r.dia_chi ?? ''])
    const csv = [header.join(';'), ...rows.map((row) => row.join(';'))].join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'Danh_sach_kho.csv'
    a.click()
    URL.revokeObjectURL(url)
  }, [danhSach])

  const columns = COT.map((c) => ({
    key: c.key,
    label: c.label,
    width: c.width,
    filterable: false,
  }))

  /** Chuẩn hóa từng dòng để lưới luôn có đủ cột id, label, tk_kho, dia_chi */
  const displayData = useMemo<KhoRowDisplay[]>(
    () =>
      danhSach.map((r) => ({
        id: r.id,
        label: r.label,
        tk_kho: r.tk_kho ?? '',
        dia_chi: r.dia_chi ?? '',
      })),
    [danhSach]
  )

  const moSuaDong = useCallback((row: KhoRowDisplay) => {
    const item = danhSach.find((r) => r.id === row.id)
    if (item) {
      setDongChon(item)
      setModalSua(true)
    }
  }, [danhSach])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, background: '#1a1a1a' }}>
      <MapsScriptPreloader />
      <div style={toolbarWrap}>
        <button type="button" className="htql-toolbar-btn" style={toolbarBtn} title="Thêm" onClick={() => setModalThem(true)}>
          <Plus size={14} />
          <span>Thêm</span>
        </button>
        <button type="button" className="htql-toolbar-btn" style={toolbarBtn} title="Sửa" onClick={() => setModalSua(true)} disabled={!dongChon}>
          <Pencil size={14} />
          <span>Sửa</span>
        </button>
        <button type="button" className="htql-toolbar-btn" style={toolbarBtn} title="Xóa" onClick={xoa} disabled={!dongChon}>
          <Trash2 size={14} />
          <span>Xóa</span>
        </button>
        <button type="button" className="htql-toolbar-btn" style={toolbarBtn} title="Làm mới lại dữ liệu danh sách kho" onClick={napLai}>
          <RefreshCw size={14} />
          <span>Làm mới</span>
        </button>
        <button type="button" className="htql-toolbar-btn" style={toolbarBtn} title="Xuất khẩu" onClick={xuatKhau}>
          <Download size={14} />
          <span>Xuất khẩu</span>
        </button>
        <button type="button" className="htql-toolbar-btn" onClick={onQuayLai} style={{ ...toolbarBtn, marginLeft: 'auto' }}>
          <span>← Quay lại Quy trình</span>
        </button>
      </div>
      <DataGrid<KhoRowDisplay>
        columns={columns}
        data={displayData}
        keyField="id"
        selectedRowId={dongChon?.id ?? null}
        onRowSelect={(row) => setDongChon(danhSach.find((r) => r.id === row.id) ?? null)}
        onRowDoubleClick={moSuaDong}
        summary={[{ label: 'Số dòng', value: danhSach.length }]}
        maxHeight={400}
        compact
      />
      {modalThem && (
        <ThemKhoModal
          existingItems={danhSach}
          onClose={() => setModalThem(false)}
          onSave={handleThem}
          onSaveAndAdd={handleThemVaTiepTuc}
        />
      )}
      {modalSua && dongChon && (
        <ThemKhoModal
          existingItems={danhSach}
          initialData={dongChon}
          onClose={() => setModalSua(false)}
          onSave={handleSua}
        />
      )}
    </div>
  )
}
