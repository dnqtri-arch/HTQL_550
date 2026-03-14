import { useState, useEffect, useRef } from 'react'
import { Plus, Pencil, Trash2, RefreshCw, Download } from 'lucide-react'
import { DataGrid } from '../../components/DataGrid'
import { Modal } from '../../components/Modal'
import { ListPageToolbar } from '../../components/ListPageToolbar'
import { exportCsv } from '../../utils/exportCsv'
import { useToastOptional } from '../../context/ToastContext'
import {
  type DonViTinhRecord,
  donViTinhGetAll,
  donViTinhPost,
  donViTinhPut,
  donViTinhDelete,
  donViTinhNapLai,
  donViTinhMaTuDong,
  donViTinhDangDuongTrongVatTu,
} from './donViTinhApi'
import { formFooterButtonCancel, formFooterButtonSave, formFooterButtonSaveAndAdd } from '../../constants/formFooterButtons'

const COT: { key: keyof DonViTinhRecord | string; label: string; width?: number | string }[] = [
  { key: 'ma_dvt', label: 'Mã ĐVT', width: '12%' },
  { key: 'ten_dvt', label: 'Tên ĐVT', width: '22%' },
  { key: 'ky_hieu', label: 'Ký hiệu', width: '18%' },
  { key: 'dien_giai', label: 'Diễn giải', width: '48%' },
]

const fieldWrap: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
}

const labelStyle: React.CSSProperties = {
  fontSize: '11px',
  color: 'var(--text-muted)',
}

const inputStyle: React.CSSProperties = {
  padding: '6px 8px',
  fontSize: '11px',
  background: 'var(--bg-primary)',
  border: '1px solid var(--border)',
  borderRadius: '4px',
  color: 'var(--text-primary)',
}

export function DonViTinh({ onQuayLai }: { onQuayLai?: () => void }) {
  const toastApi = useToastOptional()
  const showError = toastApi ? (msg: string) => toastApi.showToast(msg, 'error') : (msg: string) => alert(msg)

  const [danhSach, setDanhSach] = useState<DonViTinhRecord[]>([])
  const [dongChon, setDongChon] = useState<DonViTinhRecord | null>(null)
  const [modalOpen, setModalOpen] = useState<'add' | 'edit' | null>(null)
  const [form, setForm] = useState({ ma_dvt: '', ten_dvt: '', ky_hieu: '', dien_giai: '' })
  const [loi, setLoi] = useState('')
  const [dangTai, setDangTai] = useState(true)
  const refTenDvt = useRef<HTMLInputElement | null>(null)
  const [timKiem, setTimKiem] = useState('')

  const napLai = async () => {
    setDangTai(true)
    donViTinhNapLai()
    try {
      const data = await donViTinhGetAll()
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

  const moThem = async () => {
    setForm({ ma_dvt: await donViTinhMaTuDong(), ten_dvt: '', ky_hieu: '', dien_giai: '' })
    setLoi('')
    setModalOpen('add')
  }

  const moSua = () => {
    if (!dongChon) return
    setForm({
      ma_dvt: dongChon.ma_dvt,
      ten_dvt: dongChon.ten_dvt,
      ky_hieu: dongChon.ky_hieu ?? '',
      dien_giai: dongChon.dien_giai ?? '',
    })
    setLoi('')
    setModalOpen('edit')
  }

  /** Double-click dòng: chọn dòng và mở modal sửa */
  const moSuaDoubleClick = (row: DonViTinhRecord) => {
    setDongChon(row)
    setForm({
      ma_dvt: row.ma_dvt,
      ten_dvt: row.ten_dvt,
      ky_hieu: row.ky_hieu ?? '',
      dien_giai: row.dien_giai ?? '',
    })
    setLoi('')
    setModalOpen('edit')
  }

  const dongModal = () => {
    setModalOpen(null)
    setLoi('')
  }

  const validateForm = async () => {
    const ma = form.ma_dvt.trim()
    const ten = form.ten_dvt.trim()
    if (!ten) {
      setLoi('Tên đơn vị tính là bắt buộc.')
      setTimeout(() => refTenDvt.current?.focus(), 0)
      return null
    }
    setLoi('')
    return { ma: ma || (await donViTinhMaTuDong()), ten }
  }

  const dongY = async () => {
    const validated = await validateForm()
    if (!validated) return
    const { ma, ten } = validated
    try {
      if (modalOpen === 'add') {
        await donViTinhPost({ ma_dvt: ma, ten_dvt: ten, ky_hieu: form.ky_hieu.trim(), dien_giai: form.dien_giai.trim() })
      } else if (modalOpen === 'edit' && dongChon) {
        await donViTinhPut(dongChon.id, { ma_dvt: ma, ten_dvt: ten, ky_hieu: form.ky_hieu.trim(), dien_giai: form.dien_giai.trim() })
      }
      dongModal()
      await napLai()
    } catch (e) {
      setLoi(e instanceof Error ? e.message : 'Có lỗi xảy ra.')
    }
  }

  const dongYVaThem = async () => {
    const validated = await validateForm()
    if (!validated) return
    const { ma, ten } = validated
    try {
      await donViTinhPost({ ma_dvt: ma, ten_dvt: ten, ky_hieu: form.ky_hieu.trim(), dien_giai: form.dien_giai.trim() })
      await napLai()
      setForm({ ma_dvt: await donViTinhMaTuDong(), ten_dvt: '', ky_hieu: '', dien_giai: '' })
      setLoi('')
    } catch (e) {
      setLoi(e instanceof Error ? e.message : 'Có lỗi xảy ra.')
    }
  }

  const xoa = async () => {
    if (!dongChon) return
    const dangDung = await donViTinhDangDuongTrongVatTu(dongChon.ma_dvt)
    if (dangDung) {
      showError('Đơn vị tính này đang được sử dụng trong danh mục Vật tư hàng hóa. Không thể xóa.')
      return
    }
    if (!window.confirm('Bạn có chắc chắn muốn xóa không?')) return
    const idXoa = dongChon.id
    try {
      await donViTinhDelete(idXoa)
      setDanhSach((prev) => prev.filter((r) => r.id !== idXoa))
      setDongChon(null)
      await napLai()
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Có lỗi xảy ra.')
    }
  }

  const xuatKhau = () => {
    const header = ['Mã ĐVT', 'Tên ĐVT', 'Ký hiệu', 'Diễn giải']
    const rows = danhSach.map((r) => [r.ma_dvt, r.ten_dvt, r.ky_hieu ?? '', r.dien_giai ?? ''])
    exportCsv([header, ...rows], 'Don_vi_tinh.csv')
  }

  const columns = COT.map((c) => ({
    key: c.key,
    label: c.label,
    width: c.width,
    filterable: false,
  }))

  const danhSachLoc = !timKiem.trim()
    ? danhSach
    : danhSach.filter((r) => {
        const q = timKiem.toLowerCase()
        return (
          r.ma_dvt.toLowerCase().includes(q) ||
          r.ten_dvt.toLowerCase().includes(q) ||
          (r.ky_hieu ?? '').toLowerCase().includes(q) ||
          (r.dien_giai ?? '').toLowerCase().includes(q)
        )
      })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <ListPageToolbar
        onQuayLai={onQuayLai}
        buttons={[
          { icon: <Plus size={14} />, label: 'Thêm', onClick: moThem },
          { icon: <Pencil size={14} />, label: 'Sửa', onClick: moSua, disabled: !dongChon },
          { icon: <Trash2 size={14} />, label: 'Xóa', onClick: xoa, disabled: !dongChon },
          { icon: <RefreshCw size={14} />, label: 'Làm mới', onClick: napLai, disabled: dangTai, title: 'Làm mới lại dữ liệu đơn vị tính' },
          { icon: <Download size={14} />, label: 'Xuất khẩu', onClick: xuatKhau },
        ]}
      />

      {/* Bảng dữ liệu - 1 ô tìm kiếm, không lọc theo cột, fit 100% không scroll ngang */}
      <div style={{ marginBottom: '6px' }}>
        <input
          type="text"
          placeholder="Tìm kiếm đơn vị tính..."
          value={timKiem}
          onChange={(e) => setTimKiem(e.target.value)}
          style={{
            width: '100%',
            maxWidth: 320,
            padding: '6px 8px',
            fontSize: '11px',
            background: 'var(--bg-primary)',
            border: '1px solid var(--border)',
            borderRadius: '4px',
            color: 'var(--text-primary)',
          }}
        />
      </div>
      <div style={{ flex: 1, minHeight: 0, width: '100%', minWidth: 0 }}>
        <DataGrid<DonViTinhRecord>
          columns={columns}
          data={danhSachLoc}
          keyField="id"
          selectedRowId={dongChon?.id ?? null}
          onRowSelect={setDongChon}
          onRowDoubleClick={moSuaDoubleClick}
          summary={[{ label: 'Số dòng', value: danhSachLoc.length }]}
          maxHeight={320}
          compact
        />
      </div>

      <Modal
        open={!!modalOpen}
        onClose={dongModal}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', minHeight: 32 }}>
            <span style={{ flexShrink: 0 }}>{modalOpen === 'add' ? 'Thêm đơn vị tính' : 'Sửa đơn vị tính'}</span>
            <div style={{ flex: 1, minWidth: 0, height: 28, minHeight: 28, display: 'flex', alignItems: 'center', padding: '0 10px', background: loi ? 'rgba(255, 87, 34, 0.12)' : 'transparent', border: loi ? '1px solid var(--accent)' : '1px solid transparent', borderRadius: 4, fontSize: 11, color: 'var(--text-primary)', overflow: 'hidden', boxSizing: 'border-box' }}>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{loi || '\u00A0'}</span>
            </div>
          </div>
        }
        size="sm"
        footer={
          <>
            <button type="button" style={formFooterButtonCancel} onClick={dongModal}>Hủy bỏ</button>
            <button type="button" style={formFooterButtonSave} onClick={dongY}>Lưu</button>
            {modalOpen === 'add' && (
              <button type="button" style={formFooterButtonSaveAndAdd} onClick={dongYVaThem}>Lưu và tiếp tục</button>
            )}
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={fieldWrap}>
            <label style={labelStyle}>Mã đơn vị tính</label>
            <input
              style={{ ...inputStyle, background: 'var(--bg-tab)', color: 'var(--text-muted)' }}
              value={form.ma_dvt}
              readOnly
              placeholder="Tự động: 01, 02, 03..."
            />
          </div>
          <div style={fieldWrap}>
            <label style={labelStyle}>Tên đơn vị tính *</label>
            <input
              ref={refTenDvt}
              style={inputStyle}
              value={form.ten_dvt}
              onChange={(e) => setForm((f) => ({ ...f, ten_dvt: e.target.value }))}
              placeholder="Nhập tên"
            />
          </div>
          <div style={fieldWrap}>
            <label style={labelStyle}>Ký hiệu</label>
            <input
              style={inputStyle}
              value={form.ky_hieu}
              onChange={(e) => setForm((f) => ({ ...f, ky_hieu: e.target.value }))}
              placeholder="VD: Kg, m, Cái"
            />
          </div>
          <div style={fieldWrap}>
            <label style={labelStyle}>Diễn giải</label>
            <input
              style={inputStyle}
              value={form.dien_giai}
              onChange={(e) => setForm((f) => ({ ...f, dien_giai: e.target.value }))}
              placeholder="Ghi chú thêm"
            />
          </div>
        </div>
      </Modal>
    </div>
  )
}
