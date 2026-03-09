import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, RefreshCw, Download } from 'lucide-react'
import { DataGrid } from '../../components/DataGrid'
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

const COT: { key: keyof DonViTinhRecord | string; label: string; width?: number | string }[] = [
  { key: 'ma_dvt', label: 'Mã ĐVT', width: '12%' },
  { key: 'ten_dvt', label: 'Tên ĐVT', width: '22%' },
  { key: 'ky_hieu', label: 'Ký hiệu', width: '18%' },
  { key: 'dien_giai', label: 'Diễn giải', width: '48%' },
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

const btnSecondary: React.CSSProperties = {
  padding: '6px 12px',
  fontSize: '11px',
  background: 'var(--bg-tab)',
  color: 'var(--text-primary)',
  border: '1px solid var(--border)',
  borderRadius: '4px',
  cursor: 'pointer',
}

const modalOverlay: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.6)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
}

const modalBox: React.CSSProperties = {
  background: 'var(--bg-secondary)',
  border: '1px solid var(--border-strong)',
  borderRadius: '6px',
  minWidth: 320,
  maxWidth: '90vw',
  boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
}

const modalHeader: React.CSSProperties = {
  padding: '8px 12px',
  borderBottom: '1px solid var(--border-strong)',
  fontSize: '12px',
  fontWeight: 600,
  color: 'var(--accent)',
}

const modalBody: React.CSSProperties = {
  padding: '12px',
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
}

const modalFooter: React.CSSProperties = {
  padding: '8px 12px',
  borderTop: '1px solid var(--border-strong)',
  display: 'flex',
  justifyContent: 'flex-end',
  gap: '8px',
}

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

const btnPrimary: React.CSSProperties = {
  padding: '6px 12px',
  fontSize: '11px',
  background: 'var(--accent)',
  color: '#0d0d0d',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  fontWeight: 600,
}

export function DonViTinh({ onQuayLai }: { onQuayLai?: () => void }) {
  const [danhSach, setDanhSach] = useState<DonViTinhRecord[]>([])
  const [dongChon, setDongChon] = useState<DonViTinhRecord | null>(null)
  const [modalOpen, setModalOpen] = useState<'add' | 'edit' | null>(null)
  const [form, setForm] = useState({ ma_dvt: '', ten_dvt: '', ky_hieu: '', dien_giai: '' })
  const [loi, setLoi] = useState('')
  const [dangTai, setDangTai] = useState(true)
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

  const dongModal = () => {
    setModalOpen(null)
    setLoi('')
  }

  const validateForm = async () => {
    const ma = form.ma_dvt.trim()
    const ten = form.ten_dvt.trim()
    if (!ten) {
      setLoi('Tên đơn vị tính là bắt buộc.')
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
      alert('Đơn vị tính này đang được sử dụng trong danh mục Vật tư hàng hóa. Không thể xóa.')
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
      alert(e instanceof Error ? e.message : 'Có lỗi xảy ra.')
    }
  }

  const xuatKhau = () => {
    const header = ['Mã ĐVT', 'Tên ĐVT', 'Ký hiệu', 'Diễn giải']
    const rows = danhSach.map((r) => [r.ma_dvt, r.ten_dvt, r.ky_hieu ?? '', r.dien_giai ?? ''])
    const csv = [header.join(';'), ...rows.map((row) => row.join(';'))].join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'Don_vi_tinh.csv'
    a.click()
    URL.revokeObjectURL(url)
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
      {/* Toolbar */}
      <div style={toolbarWrap}>
        <button type="button" className="htql-toolbar-btn" style={toolbarBtn} title="Thêm" onClick={moThem}>
          <Plus size={14} />
          <span>Thêm</span>
        </button>
        <button type="button" className="htql-toolbar-btn" style={toolbarBtn} title="Sửa" onClick={moSua} disabled={!dongChon}>
          <Pencil size={14} />
          <span>Sửa</span>
        </button>
        <button type="button" className="htql-toolbar-btn" style={toolbarBtn} title="Xóa" onClick={xoa} disabled={!dongChon}>
          <Trash2 size={14} />
          <span>Xóa</span>
        </button>
        <button type="button" className="htql-toolbar-btn" style={toolbarBtn} title="Làm mới lại dữ liệu đơn vị tính" onClick={napLai} disabled={dangTai}>
          <RefreshCw size={14} />
          <span>Làm mới</span>
        </button>
        <button type="button" className="htql-toolbar-btn" style={toolbarBtn} title="Xuất khẩu" onClick={xuatKhau}>
          <Download size={14} />
          <span>Xuất khẩu</span>
        </button>
        {onQuayLai && (
          <button type="button" className="htql-toolbar-btn" onClick={onQuayLai} style={{ ...toolbarBtn, marginLeft: 'auto' }}>
            ← Quay lại Quy trình
          </button>
        )}
      </div>

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
        <DataGrid
        columns={columns}
        data={danhSachLoc as unknown as Record<string, unknown>[]}
        keyField="id"
        selectedRowId={dongChon?.id ?? null}
        onRowSelect={(row) => setDongChon(row as unknown as DonViTinhRecord)}
        summary={[{ label: 'Số dòng', value: danhSachLoc.length }]}
        maxHeight={320}
        compact
      />
      </div>

      {/* Modal Thêm/Sửa */}
      {modalOpen && (
        <div style={modalOverlay} onClick={dongModal}>
          <div style={modalBox} onClick={(e) => e.stopPropagation()}>
            <div style={modalHeader}>
              {modalOpen === 'add' ? 'Thêm đơn vị tính' : 'Sửa đơn vị tính'}
            </div>
            <div style={modalBody}>
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
              {loi && (
                <p style={{ fontSize: '11px', color: 'var(--accent)' }}>{loi}</p>
              )}
            </div>
            <div style={modalFooter}>
              <button type="button" style={btnSecondary} onClick={dongModal}>
                Hủy bỏ
              </button>
              <button type="button" style={btnPrimary} onClick={dongY}>
                Đồng ý
              </button>
              {modalOpen === 'add' && (
                <button type="button" style={btnPrimary} onClick={dongYVaThem}>
                  Đồng ý và thêm
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
