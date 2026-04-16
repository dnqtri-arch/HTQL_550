import { useState, useMemo, useEffect } from 'react'
import { X, Check, Ban, Search } from 'lucide-react'
import type { KhachHangRecord } from './khachHangApi'
import { khachHangGetAll } from './khachHangApi'

interface ChonKhachHangNccModalProps {
  title?: string
  /** Id các đối tượng đã có trong nhóm (để tránh chọn trùng) */
  excludeIds?: number[]
  onSelect: (records: KhachHangRecord[]) => void
  onClose: () => void
}

const overlay: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'transparent',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 4000,
  pointerEvents: 'none',
}

const box: React.CSSProperties = {
  background: 'var(--bg-secondary)',
  border: '1px solid var(--border)',
  borderRadius: 6,
  width: '90vw',
  maxWidth: 800,
  height: '80vh',
  maxHeight: 480,
  display: 'flex',
  flexDirection: 'column',
  boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
  overflow: 'hidden',
  pointerEvents: 'auto',
}

const headerStyle: React.CSSProperties = {
  padding: '8px 12px',
  borderBottom: '1px solid var(--border)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  background: 'var(--bg-tab)',
  fontSize: '12px',
  fontWeight: 600,
  color: 'var(--text-primary)',
}

const thStyle: React.CSSProperties = {
  padding: '6px 8px',
  textAlign: 'left',
  background: 'var(--bg-tab-active)',
  color: 'var(--text-primary)',
  borderBottom: '1px solid var(--border)',
  borderRight: '1px solid var(--border)',
  fontWeight: 600,
  fontSize: 11,
}

const filterInputStyle: React.CSSProperties = {
  width: '100%',
  padding: '2px 20px 2px 6px',
  fontSize: 11,
  background: 'var(--bg-primary)',
  border: '1px solid var(--border)',
  borderRadius: 2,
  color: 'var(--text-primary)',
  boxSizing: 'border-box',
  height: 24,
}

const footerStyle: React.CSSProperties = {
  padding: '8px 12px',
  borderTop: '1px solid var(--border)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  background: 'var(--bg-tab)',
  flexShrink: 0,
}

const btnStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  padding: '4px 12px',
  fontSize: 11,
  border: '1px solid var(--border)',
  borderRadius: 4,
  cursor: 'pointer',
  background: 'var(--bg-tab-active)',
  color: 'var(--text-primary)',
}

const btnPrimary: React.CSSProperties = {
  ...btnStyle,
  background: 'var(--accent)',
  color: 'var(--accent-text)',
  borderColor: 'var(--accent)',
}

export function ChonKhachHangNccModal({
  title = 'Chọn khách hàng, khách hàng vào nhóm',
  excludeIds = [],
  onSelect,
  onClose,
}: ChonKhachHangNccModalProps) {
  const [list, setList] = useState<KhachHangRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [filterMa, setFilterMa] = useState('')
  const [filterTen, setFilterTen] = useState('')
  const [filterDiaChi, setFilterDiaChi] = useState('')
  const [filterMST, setFilterMST] = useState('')
  const [filterDT, setFilterDT] = useState('')
  useEffect(() => {
    let cancelled = false
    khachHangGetAll().then((data) => {
      if (!cancelled) {
        setList(data)
        setLoading(false)
      }
    })
    return () => { cancelled = true }
  }, [])

  const filtered = useMemo(() => {
    const ma = filterMa.trim().toLowerCase()
    const ten = filterTen.trim().toLowerCase()
    const diaChi = filterDiaChi.trim().toLowerCase()
    const mst = filterMST.trim().toLowerCase()
    const dt = filterDT.trim().toLowerCase()
    return list.filter((r) => {
      if (excludeIds.includes(r.id)) return false
      if (ma && (r.ma_kh?.toLowerCase() ?? '').indexOf(ma) === -1) return false
      if (ten && (r.ten_kh?.toLowerCase() ?? '').indexOf(ten) === -1) return false
      if (diaChi && (r.dia_chi?.toLowerCase() ?? '').indexOf(diaChi) === -1) return false
      if (mst && (r.ma_so_thue?.toLowerCase() ?? '').indexOf(mst) === -1) return false
      if (dt && (r.dien_thoai?.toLowerCase() ?? '').indexOf(dt) === -1) return false
      return true
    })
  }, [list, excludeIds, filterMa, filterTen, filterDiaChi, filterMST, filterDT])

  const toggleRow = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleOk = () => {
    const selected = list.filter((r) => selectedIds.has(r.id))
    onSelect(selected)
    onClose()
  }

  return (
    <div style={overlay}>
      <div style={box}>
        <div style={headerStyle}>
          <span>{title}</span>
          <button type="button" onClick={onClose} style={{ padding: 2, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-primary)', display: 'flex' }} aria-label="Đóng">
            <X size={18} />
          </button>
        </div>

        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 16 }}>
          <div style={{ flex: 1, minHeight: 0, overflow: 'auto', border: '1px solid #4b5563', borderRadius: 4, background: 'var(--bg-tab)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr>
                <th style={{ ...thStyle, width: 36 }} />
                <th style={{ ...thStyle, width: '14%' }}>Mã KH/NCC</th>
                <th style={{ ...thStyle, width: '22%' }}>Tên KH/NCC</th>
                <th style={{ ...thStyle, width: '24%' }}>Địa chỉ</th>
                <th style={{ ...thStyle, width: '14%' }}>Mã số thuế</th>
                <th style={{ ...thStyle, width: '12%', borderRight: 'none' }}>Điện thoại</th>
              </tr>
              <tr style={{ background: 'var(--bg-tab)' }}>
                <td style={{ padding: '2px 6px', borderBottom: '1px solid var(--border)', borderRight: '1px solid var(--border)', width: 36 }} />
                <td style={{ padding: '2px 6px', borderBottom: '1px solid var(--border)', borderRight: '1px solid var(--border)' }}>
                  <div style={{ position: 'relative' }}>
                    <input type="text" value={filterMa} onChange={(e) => setFilterMa(e.target.value)} style={filterInputStyle} placeholder="" />
                    <Search size={12} style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)' }} />
                  </div>
                </td>
                <td style={{ padding: '2px 6px', borderBottom: '1px solid var(--border)', borderRight: '1px solid var(--border)' }}>
                  <div style={{ position: 'relative' }}>
                    <input type="text" value={filterTen} onChange={(e) => setFilterTen(e.target.value)} style={filterInputStyle} placeholder="" />
                    <Search size={12} style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)' }} />
                  </div>
                </td>
                <td style={{ padding: '2px 6px', borderBottom: '1px solid var(--border)', borderRight: '1px solid var(--border)' }}>
                  <input type="text" value={filterDiaChi} onChange={(e) => setFilterDiaChi(e.target.value)} style={filterInputStyle} placeholder="" />
                </td>
                <td style={{ padding: '2px 6px', borderBottom: '1px solid var(--border)', borderRight: '1px solid var(--border)' }}>
                  <input type="text" value={filterMST} onChange={(e) => setFilterMST(e.target.value)} style={filterInputStyle} placeholder="" />
                </td>
                <td style={{ padding: '2px 6px', borderBottom: '1px solid var(--border)' }}>
                  <input type="text" value={filterDT} onChange={(e) => setFilterDT(e.target.value)} style={filterInputStyle} placeholder="" />
                </td>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ padding: 16, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</td></tr>
              ) : (
                filtered.map((r) => {
                  const isSelected = selectedIds.has(r.id)
                  return (
                    <tr
                      key={r.id}
                      onClick={() => toggleRow(r.id)}
                      style={{
                        background: isSelected ? 'var(--row-selected-bg)' : undefined,
                        color: isSelected ? 'var(--row-selected-text)' : 'var(--text-primary)',
                        cursor: 'pointer',
                        borderBottom: '1px solid var(--border)',
                      }}
                    >
                      <td style={{ padding: '4px 8px', borderRight: '1px solid var(--border)' }}>
                        <input type="checkbox" checked={isSelected} onChange={() => toggleRow(r.id)} onClick={(e) => e.stopPropagation()} style={{ cursor: 'pointer' }} />
                      </td>
                      <td style={{ padding: '4px 8px', borderRight: '1px solid var(--border)' }}>{r.ma_kh}</td>
                      <td style={{ padding: '4px 8px', borderRight: '1px solid var(--border)' }}>{r.ten_kh}</td>
                      <td style={{ padding: '4px 8px', borderRight: '1px solid var(--border)' }}>{r.dia_chi ?? ''}</td>
                      <td style={{ padding: '4px 8px', borderRight: '1px solid var(--border)' }}>{r.ma_so_thue ?? ''}</td>
                      <td style={{ padding: '4px 8px' }}>{r.dien_thoai ?? ''}</td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
          </div>
        </div>

        <div style={footerStyle}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Số dòng = {selectedIds.size}</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" style={btnPrimary} onClick={handleOk}>
              <Check size={14} />
              <span>Đồng ý</span>
            </button>
            <button type="button" style={btnStyle} onClick={onClose}>
              <Ban size={14} />
              <span>Hủy bỏ</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
