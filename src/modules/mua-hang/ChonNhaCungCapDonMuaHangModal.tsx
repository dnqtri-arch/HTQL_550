import { useState, useEffect } from 'react'
import { X, Search } from 'lucide-react'
import type { NhaCungCapRecord } from './nhaCungCapApi'
import { nhaCungCapGetAll } from './nhaCungCapApi'

export interface ChonNhaCungCapDonMuaHangModalProps {
  onSelect: (ncc: NhaCungCapRecord) => void
  onClose: () => void
}

const overlay: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.6)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 2100,
}

const box: React.CSSProperties = {
  background: 'var(--bg-secondary)',
  border: '1px solid var(--border-strong)',
  borderRadius: 6,
  width: '90vw',
  maxWidth: 640,
  maxHeight: '80vh',
  display: 'flex',
  flexDirection: 'column',
  boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
  overflow: 'hidden',
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
  padding: '4px 8px',
  fontSize: 11,
  background: 'var(--bg-primary)',
  border: '1px solid var(--border)',
  borderRadius: 4,
  color: 'var(--text-primary)',
  boxSizing: 'border-box',
  height: 24,
}

export function ChonNhaCungCapDonMuaHangModal({ onSelect, onClose }: ChonNhaCungCapDonMuaHangModalProps) {
  const [list, setList] = useState<NhaCungCapRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [keyword, setKeyword] = useState('')

  useEffect(() => {
    let cancelled = false
    nhaCungCapGetAll().then((data) => {
      if (!cancelled && Array.isArray(data)) setList(data)
      if (!cancelled) setLoading(false)
    })
    return () => { cancelled = true }
  }, [])

  const filtered = keyword.trim()
    ? list.filter(
        (r) =>
          (r.ma_ncc || '').toLowerCase().includes(keyword.toLowerCase()) ||
          (r.ten_ncc || '').toLowerCase().includes(keyword.toLowerCase()) ||
          (r.ma_so_thue || '').includes(keyword)
      )
    : list

  return (
    <div style={overlay} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div style={box} onMouseDown={(e) => e.stopPropagation()}>
        <div style={headerStyle}>
          <span>Chọn nhà cung cấp</span>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <X size={18} />
          </button>
        </div>
        <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Search size={14} style={{ color: 'var(--text-muted)' }} />
          <input style={{ ...filterInputStyle, flex: 1 }} placeholder="Tìm theo mã, tên, MST..." value={keyword} onChange={(e) => setKeyword(e.target.value)} />
        </div>
        <div style={{ overflow: 'auto', flex: 1, minHeight: 200 }}>
          {loading ? (
            <p style={{ padding: 12, fontSize: 11, color: 'var(--text-muted)' }}>Đang tải...</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr>
                  <th style={{ ...thStyle, width: 100 }}>Mã NCC</th>
                  <th style={thStyle}>Tên nhà cung cấp</th>
                  <th style={{ ...thStyle, width: 120 }}>Mã số thuế</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr
                    key={r.id}
                    style={{ cursor: 'pointer', background: 'var(--bg-primary)', borderBottom: '1px solid var(--border)' }}
                    onClick={() => { onSelect(r); onClose(); }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--row-selected-bg)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-primary)' }}
                  >
                    <td style={{ padding: '6px 8px', borderRight: '1px solid var(--border)' }}>{r.ma_ncc}</td>
                    <td style={{ padding: '6px 8px', borderRight: '1px solid var(--border)' }}>{r.ten_ncc}</td>
                    <td style={{ padding: '6px 8px' }}>{r.ma_so_thue ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
