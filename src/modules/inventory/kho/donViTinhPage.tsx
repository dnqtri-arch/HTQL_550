import { DonViTinh } from './donViTinh'

export function DonViTinhPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <h1 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '4px', color: 'var(--text-primary)' }}>
        Đơn vị tính
      </h1>
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        <DonViTinh />
      </div>
    </div>
  )
}
