const tabBarStyles: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '1px',
  padding: '0 0 6px',
  marginBottom: '6px',
  borderBottom: '2px solid var(--border-strong)',
  flexWrap: 'wrap',
}

const tabStyles: React.CSSProperties = {
  padding: '4px 10px',
  background: 'var(--bg-tab)',
  border: 'none',
  borderBottom: '2px solid transparent',
  marginBottom: '-8px',
  color: 'var(--text-primary)',
  cursor: 'pointer',
  fontSize: '11px',
  fontFamily: 'inherit',
  borderRadius: '4px 4px 0 0',
}

export interface TabKhoItem {
  id: string
  label: string
}

export function KhoTabs({
  tabs,
  tabHienTai,
  onChonTab,
}: {
  tabs: TabKhoItem[]
  tabHienTai: string
  onChonTab: (id: string) => void
}) {
  return (
    <div style={tabBarStyles}>
      {tabs.map((tab) => {
        const active = tabHienTai === tab.id
        return (
          <button
            key={tab.id}
            type="button"
            className="htql-tab-btn"
            style={{
              ...tabStyles,
              background: active ? 'var(--bg-primary)' : 'var(--bg-tab)',
              color: active ? 'var(--accent)' : 'var(--text-primary)',
              borderBottomColor: active ? 'var(--accent)' : 'transparent',
              fontWeight: active ? 600 : 400,
            }}
            onClick={() => onChonTab(tab.id)}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
