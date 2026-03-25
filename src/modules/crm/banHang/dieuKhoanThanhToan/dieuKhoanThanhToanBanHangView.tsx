/**
 * Danh mục Điều khoản thanh toán dùng chung — hiển thị trong context Bán hàng.
 * Dữ liệu độc lập với module Mua hàng (localStorage key riêng).
 */

import { useState, useEffect } from 'react'
import { ChevronLeft, Plus, Trash2 } from 'lucide-react'
import { DataGrid, type DataGridColumn } from '../../../../components/common/dataGrid'
import { useToastOptional } from '../../../../context/toastContext'
import { formFooterButtonCancel, formFooterButtonSave } from '../../../../constants/formFooterButtons'

interface DieuKhoanRecord {
  id: string
  ma: string
  ten: string
  so_ngay: number
  mo_ta: string
}

const STORAGE_KEY = 'htql_dieu_khoan_tt_ban_hang'

function loadDieuKhoan(): DieuKhoanRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as DieuKhoanRecord[]
  } catch { /* ignore */ }
  return [
    { id: 'dk1', ma: 'TM', ten: 'Thanh toán ngay', so_ngay: 0, mo_ta: 'Thanh toán khi nhận hàng' },
    { id: 'dk2', ma: 'NT30', ten: 'Nợ 30 ngày', so_ngay: 30, mo_ta: 'Thanh toán trong vòng 30 ngày' },
    { id: 'dk3', ma: 'NT60', ten: 'Nợ 60 ngày', so_ngay: 60, mo_ta: 'Thanh toán trong vòng 60 ngày' },
  ]
}

function saveDieuKhoan(list: DieuKhoanRecord[]): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)) } catch { /* ignore */ }
}

const columns: DataGridColumn<DieuKhoanRecord>[] = [
  { key: 'ma', label: 'Mã', width: 80 },
  { key: 'ten', label: 'Tên điều khoản', width: '40%' },
  { key: 'so_ngay', label: 'Số ngày', width: 80, align: 'right' },
  { key: 'mo_ta', label: 'Mô tả', width: '40%' },
]

interface Props {
  onQuayLai: () => void
}

export function DieuKhoanThanhToanBanHangView({ onQuayLai }: Props) {
  const toast = useToastOptional()
  const [danhSach, setDanhSach] = useState<DieuKhoanRecord[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ ma: '', ten: '', so_ngay: '', mo_ta: '' })
  const [editId, setEditId] = useState<string | null>(null)

  useEffect(() => { setDanhSach(loadDieuKhoan()) }, [])

  const handleLuu = () => {
    if (!formData.ma.trim() || !formData.ten.trim()) {
      toast?.showToast('Mã và Tên không được để trống.', 'error')
      return
    }
    const list = [...danhSach]
    if (editId) {
      const idx = list.findIndex((r) => r.id === editId)
      if (idx >= 0) list[idx] = { ...list[idx], ...formData, so_ngay: Number(formData.so_ngay) || 0 }
    } else {
      list.push({ id: `dk${Date.now()}`, ...formData, so_ngay: Number(formData.so_ngay) || 0 })
    }
    saveDieuKhoan(list)
    setDanhSach(list)
    setShowForm(false)
    toast?.showToast('Đã lưu điều khoản thanh toán.', 'success')
  }

  const handleXoa = () => {
    const row = danhSach.find((r) => r.id === selectedId)
    if (!row) return
    if (!window.confirm(`Xóa điều khoản "${row.ten}"?\nThao tác này không thể hoàn tác.`)) return
    const list = danhSach.filter((r) => r.id !== selectedId)
    saveDieuKhoan(list)
    setDanhSach(list)
    setSelectedId(null)
    toast?.showToast(`Đã xóa "${row.ten}".`, 'info')
  }

  const moFormThem = () => {
    setEditId(null)
    setFormData({ ma: '', ten: '', so_ngay: '', mo_ta: '' })
    setShowForm(true)
  }

  const moFormSua = (row: DieuKhoanRecord) => {
    setEditId(row.id)
    setFormData({ ma: row.ma, ten: row.ten, so_ngay: String(row.so_ngay), mo_ta: row.mo_ta })
    setShowForm(true)
  }

  const inp: React.CSSProperties = {
    height: 26, width: '100%', fontSize: 11, fontFamily: 'inherit',
    border: '1px solid var(--border)', borderRadius: 3,
    padding: '0 6px', background: 'var(--bg-tab)', color: 'var(--text-primary)',
    boxSizing: 'border-box',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        <button
          type="button"
          onClick={onQuayLai}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            background: 'var(--bg-secondary)', border: '1px solid var(--border)',
            borderRadius: 4, padding: '3px 10px', fontSize: 11, cursor: 'pointer',
            color: 'var(--text-primary)', fontFamily: 'inherit',
          }}
        >
          <ChevronLeft size={13} /> Quay lại
        </button>
        <button
          type="button"
          onClick={moFormThem}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            background: 'var(--accent)', color: 'var(--accent-text)',
            border: 'none', borderRadius: 4, padding: '3px 10px', fontSize: 11,
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          <Plus size={13} /> Thêm
        </button>
        <button
          type="button"
          disabled={!selectedId}
          onClick={handleXoa}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            background: selectedId ? '#dc2626' : 'var(--bg-secondary)',
            color: selectedId ? '#fff' : 'var(--text-muted)',
            border: 'none', borderRadius: 4, padding: '3px 10px', fontSize: 11,
            cursor: selectedId ? 'pointer' : 'not-allowed', fontFamily: 'inherit',
          }}
        >
          <Trash2 size={13} /> Xóa
        </button>
      </div>

      <div style={{ flex: 1, minHeight: 0 }}>
        <DataGrid<DieuKhoanRecord>
          columns={columns}
          data={danhSach}
          keyField="id"
          stripedRows
          compact
          height="100%"
          selectedRowId={selectedId}
          onRowSelect={(r) => setSelectedId(r.id)}
          onRowDoubleClick={(r) => moFormSua(r)}
          summary={[{ label: 'Số điều khoản', value: `= ${danhSach.length}` }]}
        />
      </div>

      {showForm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 4000,
        }} onClick={() => setShowForm(false)}>
          <div style={{
            background: 'var(--bg-primary)', borderRadius: 8, padding: 20,
            width: 440, boxShadow: '0 8px 32px rgba(0,0,0,0.24)',
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 14 }}>
              {editId ? 'Sửa' : 'Thêm'} Điều khoản thanh toán
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px 12px', alignItems: 'center', fontSize: 11 }}>
              <span>Mã *</span>
              <input style={inp} value={formData.ma} onChange={(e) => setFormData((f) => ({ ...f, ma: e.target.value }))} />
              <span>Tên *</span>
              <input style={inp} value={formData.ten} onChange={(e) => setFormData((f) => ({ ...f, ten: e.target.value }))} />
              <span>Số ngày nợ</span>
              <input style={{ ...inp, width: 80 }} type="number" value={formData.so_ngay} onChange={(e) => setFormData((f) => ({ ...f, so_ngay: e.target.value }))} />
              <span>Mô tả</span>
              <input style={inp} value={formData.mo_ta} onChange={(e) => setFormData((f) => ({ ...f, mo_ta: e.target.value }))} />
            </div>
            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', marginTop: 16 }}>
              <button type="button" style={formFooterButtonCancel} onClick={() => setShowForm(false)}>Hủy bỏ</button>
              <button type="button" style={formFooterButtonSave} onClick={handleLuu}>Lưu</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
