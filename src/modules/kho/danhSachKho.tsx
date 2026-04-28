import { useState, useCallback, useMemo } from 'react'
import { ConfirmXoaCaptchaModal } from '../../components/common/confirmXoaCaptchaModal'
import { Plus, Pencil, Trash2, RefreshCw, Download } from 'lucide-react'
import { DataGrid } from '../../components/common/dataGrid'
import { ListPageToolbar } from '../../components/listPageToolbar'
import { exportCsv } from '../../utils/exportCsv'
import { loadKhoListFromStorage, saveKhoListToStorage, type KhoStorageItem } from './khoStorage'
import { ThemKhoModal, MapsScriptPreloader } from './themKhoModal'

/** Dữ liệu lưới: đảm bảo mọi cột đều có giá trị (tránh cột Địa chỉ không hiển thị) */
type KhoRowDisplay = Record<'id' | 'label' | 'tk_kho' | 'dia_chi', string>

const COT: { key: keyof KhoRowDisplay; label: string; width?: string }[] = [
  { key: 'id', label: 'Mã kho', width: '12%' },
  { key: 'label', label: 'Tên kho', width: '25%' },
  { key: 'tk_kho', label: 'TK kho', width: '13%' },
  { key: 'dia_chi', label: 'Địa chỉ', width: '50%' },
]

interface DanhSachKhoProps {
  onQuayLai: () => void
}

export function DanhSachKho({ onQuayLai }: DanhSachKhoProps) {
  const [danhSach, setDanhSach] = useState<KhoStorageItem[]>(loadKhoListFromStorage)
  const [dongChon, setDongChon] = useState<KhoStorageItem | null>(null)
  const [modalThem, setModalThem] = useState(false)
  const [modalSua, setModalSua] = useState(false)
  const [deleteCaptchaOpen, setDeleteCaptchaOpen] = useState(false)

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

  const moXoa = useCallback(() => {
    if (!dongChon) return
    setDeleteCaptchaOpen(true)
  }, [dongChon])

  const xoaSauCaptcha = useCallback(() => {
    if (!dongChon) return
    const next = danhSach.filter((r) => r.id !== dongChon.id)
    setDanhSach(next)
    saveKhoListToStorage(next)
    setDongChon(next[0] ?? null)
    setDeleteCaptchaOpen(false)
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
    exportCsv([header, ...rows], 'Danh_sach_kho.csv')
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
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, background: 'var(--bg-secondary)' }}>
      <MapsScriptPreloader />
      <ListPageToolbar
        onQuayLai={onQuayLai}
        buttons={[
          { icon: <Plus size={14} />, label: 'Thêm', onClick: () => setModalThem(true) },
          { icon: <Pencil size={14} />, label: 'Sửa', onClick: () => setModalSua(true), disabled: !dongChon },
          { icon: <Trash2 size={14} />, label: 'Xóa', onClick: moXoa, disabled: !dongChon },
          { icon: <RefreshCw size={14} />, label: 'Làm mới', onClick: napLai, title: 'Làm mới lại dữ liệu danh sách kho' },
          { icon: <Download size={14} />, label: 'Xuất khẩu', onClick: xuatKhau },
        ]}
      />
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
      <ConfirmXoaCaptchaModal
        open={deleteCaptchaOpen}
        onClose={() => setDeleteCaptchaOpen(false)}
        onConfirm={xoaSauCaptcha}
        title="Xóa kho"
        message={
          <div>
            Bạn sắp xóa kho <strong>{dongChon?.label}</strong> (mã <strong>{dongChon?.id}</strong>).
            <br />
            Thao tác không hoàn tác.
          </div>
        }
      />
    </div>
  )
}
