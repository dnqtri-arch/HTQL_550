import { useState } from 'react'

const pageStyles: React.CSSProperties = {
  background: 'var(--bg-primary)',
  color: 'var(--text-primary)',
  minHeight: '100%',
}

const subNavStyles: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '4px',
  marginBottom: '8px',
  paddingBottom: '6px',
  borderBottom: '1px solid var(--border-strong)',
}

const subNavButtonStyles: React.CSSProperties = {
  padding: '4px 10px',
  background: 'var(--bg-secondary)',
  border: '1px solid var(--border)',
  color: 'var(--text-primary)',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '11px',
  fontFamily: 'inherit',
}

export interface SubNavItem {
  id: string
  label: string
}

export interface ModulePageProps {
  title: string
  subNav?: SubNavItem[]
  children: React.ReactNode | ((activeSubId: string) => React.ReactNode)
  defaultSubId?: string
}

export function ModulePage({ title, subNav, children, defaultSubId }: ModulePageProps) {
  const [activeSub, setActiveSub] = useState(defaultSubId ?? subNav?.[0]?.id ?? '')

  const content =
    typeof children === 'function' ? children(activeSub) : children

  return (
    <div style={pageStyles}>
      <h1
        style={{
          fontSize: '14px',
          fontWeight: 600,
          marginBottom: '6px',
          color: 'var(--text-primary)',
        }}
      >
        {title}
      </h1>
      {subNav && subNav.length > 0 && (
        <div style={subNavStyles}>
          {subNav.map((item) => (
            <button
              key={item.id}
              type="button"
              style={{
                ...subNavButtonStyles,
                background: activeSub === item.id ? 'var(--accent)' : 'var(--bg-secondary)',
                color: activeSub === item.id ? '#0d0d0d' : 'var(--text-primary)',
                borderColor: activeSub === item.id ? 'var(--accent)' : 'var(--border)',
              }}
              onClick={() => setActiveSub(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
      <div>{content}</div>
    </div>
  )
}
