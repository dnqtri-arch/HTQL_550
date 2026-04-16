import { X } from 'lucide-react'
import type { ModuleId } from '../config/sidebarConfig'
import { MODULE_GROUPS } from '../config/sidebarConfig'
import { getModuleIcon } from './moduleIcon'

export interface TabItem {
  id: string
  moduleId: ModuleId
  label: string
}

function getModuleIconName(moduleId: ModuleId): string {
  for (const group of MODULE_GROUPS) {
    for (const item of group.items) {
      if (item.id === moduleId) return item.icon
      if (item.children?.length) {
        const ch = item.children.find((c) => c.id === moduleId)
        if (ch) return ch.icon
      }
    }
  }
  return 'LayoutDashboard'
}

const tabBarStyles: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '1px',
  background: 'var(--bg-tab)',
  borderBottom: '2px solid var(--border-strong)',
  padding: '0 6px',
  minHeight: '32px',
}

const tabStyles: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  padding: '4px 8px 4px 10px',
  background: 'var(--bg-tab)',
  border: 'none',
  borderLeft: '1px solid var(--border)',
  borderRight: '1px solid var(--border)',
  color: 'var(--text-primary)',
  cursor: 'pointer',
  fontSize: '11px',
  fontFamily: 'inherit',
  borderRadius: '0',
  maxWidth: '160px',
}

const closeBtnStyles: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '16px',
  height: '16px',
  border: 'none',
  background: 'transparent',
  color: 'var(--text-muted)',
  cursor: 'pointer',
  borderRadius: '2px',
  padding: 0,
  marginLeft: '2px',
}

export interface TabBarProps {
  tabs: TabItem[]
  activeTabId: string | null
  onSelectTab: (id: string) => void
  onCloseTab: (id: string) => void
}

export function TabBar({ tabs, activeTabId, onSelectTab, onCloseTab }: TabBarProps) {
  return (
    <div style={tabBarStyles}>
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId
        const Icon = getModuleIcon(getModuleIconName(tab.moduleId))
        return (
          <button
            key={tab.id}
            type="button"
            style={{
              ...tabStyles,
              background: isActive ? 'var(--bg-primary)' : 'var(--bg-tab)',
              color: isActive ? 'var(--accent)' : 'var(--text-primary)',
              borderBottom: isActive ? '2px solid var(--bg-primary)' : '2px solid var(--border-strong)',
              marginBottom: isActive ? '-2px' : 0,
            }}
            onClick={() => onSelectTab(tab.id)}
          >
            <Icon size={14} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {tab.label}
            </span>
            <button
              type="button"
              aria-label="Đóng tab"
              style={closeBtnStyles}
              onClick={(e) => {
                e.stopPropagation()
                onCloseTab(tab.id)
              }}
            >
              <X size={12} />
            </button>
          </button>
        )
      })}
      <button
        type="button"
        aria-label="Tab mới"
        style={{
          ...closeBtnStyles,
          width: '24px',
          height: '24px',
          marginLeft: '4px',
          fontSize: '14px',
          color: 'var(--text-muted)',
        }}
      >
        +
      </button>
    </div>
  )
}
