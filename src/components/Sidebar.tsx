import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { MODULE_GROUPS } from '../config/sidebarConfig'
import { getModuleIcon } from './ModuleIcon'
import type { ModuleId } from '../config/sidebarConfig'

const sidebarStyles: React.CSSProperties = {
  width: '260px',
  minWidth: '260px',
  background: 'var(--bg-sidebar)',
  borderRight: '2px solid var(--border-strong)',
  display: 'flex',
  flexDirection: 'column',
  overflowY: 'auto',
}

const groupStyles: React.CSSProperties = {
  borderBottom: '1px solid var(--border-strong)',
}

const GROUP_ACCENTS: Record<string, { solid: string; bg: string }> = {
  group1: { solid: '#f5d042', bg: 'rgba(245, 208, 66, 0.10)' }, // Công việc
  group2: { solid: '#e67e22', bg: 'rgba(230, 126, 34, 0.10)' }, // CRM
  group3: { solid: '#c9a227', bg: 'rgba(201, 162, 39, 0.10)' }, // Tài chính
  group4: { solid: '#f39c12', bg: 'rgba(243, 156, 18, 0.10)' }, // Kho & hàng hóa
  group5: { solid: '#b8952e', bg: 'rgba(184, 149, 46, 0.10)' }, // HRM
  group6: { solid: '#d35400', bg: 'rgba(211, 84, 0, 0.10)' }, // Hóa đơn
}

const groupLabelBtn: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  width: '100%',
  padding: '10px 12px',
  border: 'none',
  background: 'transparent',
  color: 'var(--text-primary)',
  cursor: 'pointer',
  fontFamily: 'inherit',
  fontSize: '13px',
  fontWeight: 700,
  textAlign: 'left',
  borderRadius: '0 4px 4px 0',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
}

const itemStyles: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: '6px 12px',
  cursor: 'pointer',
  border: 'none',
  background: 'transparent',
  color: 'var(--text-primary)',
  width: '100%',
  textAlign: 'left',
  fontSize: '12px',
  fontFamily: 'inherit',
  borderRadius: '0 4px 4px 0',
  marginLeft: '0',
}

export interface SidebarProps {
  activeModuleId: ModuleId | null
  onSelectModule: (id: ModuleId) => void
}

export function Sidebar({ activeModuleId, onSelectModule }: SidebarProps) {
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {}
    MODULE_GROUPS.forEach((g) => { init[g.id] = true })
    return init
  })

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }))
  }

  return (
    <aside style={sidebarStyles}>
      <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-strong)' }}>
        <h1 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
          HTQL_550
        </h1>
        <p style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
          Hệ thống đa phân hệ
        </p>
      </div>
      <nav style={{ flex: 1, padding: '4px 0' }}>
        {MODULE_GROUPS.map((group) => {
          const isExpanded = expandedGroups[group.id] !== false
          const accent = GROUP_ACCENTS[group.id]?.solid ?? 'var(--accent)'
          const bg = GROUP_ACCENTS[group.id]?.bg ?? 'rgba(230, 126, 34, 0.10)'
          return (
            <div key={group.id} style={groupStyles}>
              <button
                type="button"
                className="htql-sidebar-group-btn"
                style={{
                  ...groupLabelBtn,
                  background: bg,
                  borderLeft: `4px solid ${accent}`,
                }}
                onClick={() => toggleGroup(group.id)}
                title={isExpanded ? 'Thu gọn' : 'Mở rộng'}
              >
                {isExpanded ? (
                  <ChevronDown size={16} style={{ flexShrink: 0, color: accent }} />
                ) : (
                  <ChevronRight size={16} style={{ flexShrink: 0, color: accent }} />
                )}
                <span>{group.label}</span>
              </button>
              {isExpanded &&
                group.items.map((item) => {
                  const isActive = activeModuleId === item.id
                  const Icon = getModuleIcon(item.icon)
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={`htql-sidebar-item ${isActive ? 'htql-sidebar-item-active' : ''}`}
                      style={{
                        ...itemStyles,
                        background: isActive ? 'var(--accent)' : 'transparent',
                        color: isActive ? '#0d0d0d' : 'var(--text-primary)',
                      }}
                      onClick={() => onSelectModule(item.id)}
                    >
                      <Icon size={18} style={{ flexShrink: 0, color: isActive ? '#0d0d0d' : 'var(--text-secondary)' }} />
                      {item.label}
                    </button>
                  )
                })}
            </div>
          )
        })}
      </nav>
    </aside>
  )
}
