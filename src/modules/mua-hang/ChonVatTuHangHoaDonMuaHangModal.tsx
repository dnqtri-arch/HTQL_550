import { useState, useEffect } from 'react'
import { X, Search } from 'lucide-react'
import type { VatTuHangHoaRecord } from '../kho/vatTuHangHoaApi'
import { vatTuHangHoaGetAll } from '../kho/vatTuHangHoaApi'
import { formatNumberDisplay } from '../../utils/numberFormat'
import { useDraggable } from '../../hooks/useDraggable'

export interface ChonVatTuHangHoaDonMuaHangModalProps {
  onSelect: (vthh: VatTuHangHoaRecord) => void
  onClose: () => void
}

const overlay: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'transparent',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 2100,
  pointerEvents: 'none',
}

const box: React.CSSProperties = {
  background: 'var(--bg-secondary)',
  border: '1px solid var(--border-strong)',
  borderRadius: 6,
  width: '90vw',
  maxWidth: 720,
  maxHeight: '80vh',
  display: 'flex',
  flexDirection: 'column',
  boxShadow: '0 8px 40px rgba(0,0,0,0.4)',
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
  padding: '4px 8px',
  fontSize: 11,
  background: 'var(--bg-primary)',
  border: '1px solid var(--border)',
  borderRadius: 4,
  color: 'var(--text-primary)',
  boxSizing: 'border-box',
  height: 24,
}

export function ChonVatTuHangHoaDonMuaHangModal({ onSelect, onClose }: ChonVatTuHangHoaDonMuaHangModalProps) {
  const { containerRef, containerStyle, dragHandleProps } = useDraggable()
  const [list, setList] = useState<VatTuHangHoaRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [keyword, setKeyword] = useState('')

  useEffect(() => {
    let cancelled = false
    vatTuHangHoaGetAll().then((data) => {
      if (!cancelled && Array.isArray(data)) setList(data)
      if (!cancelled) setLoading(false)
    })
    return () => { cancelled = true }
  }, [])

  const filtered = keyword.trim()
    ? list.filter(
        (r) =>
          (r.ma || '').toLowerCase().includes(keyword.toLowerCase()) ||
          (r.ten || '').toLowerCase().includes(keyword.toLowerCase()) ||
          (r.dvt_chinh || '').toLowerCase().includes(keyword.toLowerCase())
      )
    : list

  return (
    <div style={overlay} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={containerRef} style={{ ...box, ...containerStyle }} onMouseDown={(e) => e.stopPropagation()}>
        <div style={{ ...headerStyle, ...dragHandleProps.style }} onMouseDown={dragHandleProps.onMouseDown}>
          <span>Chọn vật tư hàng hóa (Hàng hóa, dịch vụ)</span>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <X size={18} />
          </button>
        </div>
        <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Search size={14} style={{ color: 'var(--text-muted)' }} />
          <input style={{ ...filterInputStyle, flex: 1 }} placeholder="Tìm theo mã, tên, ĐVT..." value={keyword} onChange={(e) => setKeyword(e.target.value)} />
        </div>
        <div style={{ overflow: 'auto', flex: 1, minHeight: 200 }}>
          {loading ? (
            <p style={{ padding: 12, fontSize: 11, color: 'var(--text-muted)' }}>Đang tải...</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr>
                  <th style={{ ...thStyle, width: 100 }}>Mã</th>
                  <th style={thStyle}>Tên VTHH</th>
                  <th style={{ ...thStyle, width: 80 }}>ĐVT</th>
                  <th style={{ ...thStyle, width: 90 }}>Tính chất</th>
                  <th style={{ ...thStyle, width: 100 }}>Đơn giá mua</th>
                  <th style={{ ...thStyle, width: 80 }}>% Thuế GTGT</th>
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
                    <td style={{ padding: '6px 8px', borderRight: '1px solid var(--border)' }}>{r.ma}</td>
                    <td style={{ padding: '6px 8px', borderRight: '1px solid var(--border)' }}>{r.ten}</td>
                    <td style={{ padding: '6px 8px', borderRight: '1px solid var(--border)' }}>{r.dvt_chinh ?? ''}</td>
                    <td style={{ padding: '6px 8px', borderRight: '1px solid var(--border)' }}>{r.tinh_chat ?? ''}</td>
                    <td style={{ padding: '6px 8px', borderRight: '1px solid var(--border)' }}>{r.don_gia_mua != null ? formatNumberDisplay(r.don_gia_mua, 0) : ''}</td>
                    <td style={{ padding: '6px 8px' }}>{r.thue_suat_gtgt ?? ''}</td>
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
