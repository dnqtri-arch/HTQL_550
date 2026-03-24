import { useState } from 'react'
import { ListPageToolbar } from '../../../components/ListPageToolbar'
import { hinhThucGetAll, type HinhThucRecord } from './hinhThucApi'
import { ThemHinhThucModal } from './ThemHinhThucModal'
import { Plus, Pencil } from 'lucide-react'

export function HinhThucView({ onQuayLai }: { onQuayLai: () => void }) {
  const [danhSach, setDanhSach] = useState<HinhThucRecord[]>(() => hinhThucGetAll())
  const [showThemModal, setShowThemModal] = useState(false)
  const [showSuaModal, setShowSuaModal] = useState(false)
  const [dongChon, setDongChon] = useState<HinhThucRecord | null>(null)

  const handleThem = (_item: HinhThucRecord) => {
    setDanhSach(hinhThucGetAll())
    setShowThemModal(false)
  }

  const handleSua = (_item: HinhThucRecord) => {
    setDanhSach(hinhThucGetAll())
    setShowSuaModal(false)
    setDongChon(null)
  }

  const tableWrap: React.CSSProperties = {
    border: '1px solid var(--border)',
    borderRadius: 4,
    overflow: 'auto',
    background: 'var(--bg-secondary)',
    flex: 1,
    minHeight: 0,
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <ListPageToolbar
        onQuayLai={onQuayLai}
        quayLaiLabel="← Quay lại"
        buttons={[
          { icon: <Plus size={14} />, label: 'Thêm', onClick: () => setShowThemModal(true) },
          { icon: <Pencil size={14} />, label: 'Sửa', onClick: () => setShowSuaModal(true), disabled: !dongChon },
        ]}
      />
      <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: 8 }}>Danh mục hình thức mua hàng.</p>
      <div style={tableWrap}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
          <thead>
            <tr>
              <th style={{ padding: '6px 8px', textAlign: 'left', background: 'var(--bg-tab)', borderBottom: '1px solid var(--border)', fontWeight: 600, width: 72 }}>Mã</th>
              <th style={{ padding: '6px 8px', textAlign: 'left', background: 'var(--bg-tab)', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>Tên hình thức</th>
              <th style={{ padding: '6px 8px', textAlign: 'left', background: 'var(--bg-tab)', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>Ghi chú</th>
            </tr>
          </thead>
          <tbody>
            {danhSach.length === 0 ? (
              <tr>
                <td colSpan={3} style={{ padding: '12px 10px', color: 'var(--text-muted)', fontSize: 11 }}>
                  Chưa có hình thức. Bấm <strong>Thêm</strong> để tạo mới.
                </td>
              </tr>
            ) : (
              danhSach.map((d) => (
                <tr
                  key={d.id}
                  style={{
                    borderBottom: '1px solid var(--border)',
                    background: dongChon?.id === d.id ? 'var(--row-selected-bg)' : undefined,
                    cursor: 'pointer',
                  }}
                  onClick={() => setDongChon(dongChon?.id === d.id ? null : d)}
                >
                  <td style={{ padding: '6px 8px', color: 'var(--text-primary)' }}>{d.ma}</td>
                  <td style={{ padding: '6px 8px', color: 'var(--text-primary)' }}>{d.ten}</td>
                  <td style={{ padding: '6px 8px', color: 'var(--text-primary)' }}>{d.ghi_chu}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {showThemModal && (
        <ThemHinhThucModal
          onClose={() => setShowThemModal(false)}
          onSave={handleThem}
        />
      )}
      {showSuaModal && dongChon && (
        <ThemHinhThucModal
          onClose={() => setShowSuaModal(false)}
          onSave={handleSua}
          initialData={dongChon}
        />
      )}
    </div>
  )
}
