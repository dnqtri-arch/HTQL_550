import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { MODULE_GROUPS, type SidebarItem } from '../config/sidebarConfig'
import { getModuleIcon } from './moduleIcon'
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
  congViec: { solid: '#E67E22', bg: 'rgba(230, 126, 34, 0.12)' },
  crm: { solid: '#D9731A', bg: 'rgba(217, 115, 26, 0.12)' },
  taiChinh: { solid: '#C45C2C', bg: 'rgba(196, 92, 44, 0.12)' },
  kho: { solid: '#E67E22', bg: 'rgba(230, 126, 34, 0.12)' },
  hrm: { solid: '#B85A24', bg: 'rgba(184, 90, 36, 0.12)' },
  hoaDon: { solid: '#D35400', bg: 'rgba(211, 84, 0, 0.12)' },
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

const subItemStyles: React.CSSProperties = {
  ...itemStyles,
  paddingLeft: '40px',
  fontSize: '11px',
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
  
  const [expandedParents, setExpandedParents] = useState<Record<string, boolean>>({
    banHang: true,
    muaHang: true,
  })

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }))
  }
  
  const toggleParent = (parentId: string) => {
    setExpandedParents((prev) => ({ ...prev, [parentId]: !prev[parentId] }))
  }
  
  const isChildActive = (item: SidebarItem): boolean => {
    if (!item.children) return false
    return item.children.some((child) => child.id === activeModuleId)
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
          const bg = GROUP_ACCENTS[group.id]?.bg ?? 'rgba(230, 126, 34, 0.12)'
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
                  const hasChildren = item.children && item.children.length > 0
                  const isParentExpanded = expandedParents[item.id] !== false
                  const childActive = isChildActive(item)
                  const Icon = getModuleIcon(item.icon)
                  
                  if (hasChildren) {
                    return (
                      <div key={item.id}>
                        <button
                          type="button"
                          className={`htql-sidebar-item ${childActive ? 'htql-sidebar-item-parent-active' : ''}`}
                          style={{
                            ...itemStyles,
                            background: childActive ? 'rgba(255, 138, 0, 0.1)' : 'transparent',
                            fontWeight: childActive ? 600 : 400,
                          }}
                          onClick={() => toggleParent(item.id)}
                        >
                          <Icon size={18} style={{ flexShrink: 0, color: childActive ? 'var(--accent)' : 'var(--text-secondary)' }} />
                          {item.label}
                          {isParentExpanded ? (
                            <ChevronDown size={14} style={{ marginLeft: 'auto', flexShrink: 0 }} />
                          ) : (
                            <ChevronRight size={14} style={{ marginLeft: 'auto', flexShrink: 0 }} />
                          )}
                        </button>
                        {isParentExpanded && item.children?.map((child) => {
                          const isActive = activeModuleId === child.id
                          const ChildIcon = getModuleIcon(child.icon)
                          return (
                            <button
                              key={child.id}
                              type="button"
                              className={`htql-sidebar-item htql-sidebar-subitem ${isActive ? 'htql-sidebar-item-active' : ''}`}
                              style={{
                                ...subItemStyles,
                                background: isActive ? 'var(--accent)' : 'transparent',
                                color: isActive ? 'var(--accent-text)' : 'var(--text-primary)',
                              }}
                              onClick={() => onSelectModule(child.id as ModuleId)}
                            >
                              <ChildIcon size={16} style={{ flexShrink: 0, color: isActive ? 'var(--accent-text)' : 'var(--text-secondary)' }} />
                              {child.label}
                            </button>
                          )
                        })}
                      </div>
                    )
                  }
                  
                  const isActive = activeModuleId === item.id
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={`htql-sidebar-item ${isActive ? 'htql-sidebar-item-active' : ''}`}
                      style={{
                        ...itemStyles,
                        background: isActive ? 'var(--accent)' : 'transparent',
                        color: isActive ? 'var(--accent-text)' : 'var(--text-primary)',
                      }}
                      onClick={() => onSelectModule(item.id as ModuleId)}
                    >
                      <Icon size={18} style={{ flexShrink: 0, color: isActive ? 'var(--accent-text)' : 'var(--text-secondary)' }} />
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
