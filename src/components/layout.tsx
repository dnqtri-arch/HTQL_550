import { useState, useCallback, useEffect } from 'react'
import { AppContext, type AppContextValue } from '../context/appContext'
import { getUnsavedChanges } from '../context/unsavedChanges'
import { Sidebar } from './sidebar'
import { TabBar } from './tabBar'
import { ModuleRouter } from './moduleRouter'
import { AppHeader } from './appHeader'
import { AppFooter } from './appFooter'
import { MODULE_GROUPS } from '../config/sidebarConfig'
import type { ModuleId } from '../config/sidebarConfig'
import type { TabItem } from './tabBar'

let tabCounter = 0
function generateTabId() {
  return `tab-${++tabCounter}-${Date.now()}`
}

function getModuleLabel(moduleId: ModuleId): string {
  for (const group of MODULE_GROUPS) {
    const found = group.items.find((i) => i.id === moduleId)
    if (found) return found.label
  }
  return moduleId
}

const layoutStyles: React.CSSProperties = {
  display: 'flex',
  height: '100vh',
  overflow: 'hidden',
}

const mainStyles: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  background: 'var(--bg-primary)',
}

const contentStyles: React.CSSProperties = {
  flex: 1,
  // Nguyên tắc: module không scroll; chỉ vùng DataGrid tự scroll.
  // Khung content phải là flex container và minHeight: 0 để con có thể co/scroll đúng.
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  minHeight: 0,
  padding: '8px 10px',
  borderLeft: '1px solid var(--border-strong)',
  borderRight: '1px solid var(--border-strong)',
  borderBottom: '1px solid var(--border-strong)',
}

const STORAGE_KEY_LAYOUT = 'htql550_layout_restore'

export function Layout() {
  const [tabs, setTabs] = useState<TabItem[]>([])
  const [activeTabId, setActiveTabId] = useState<string | null>(null)
  const [activeModuleId, setActiveModuleId] = useState<ModuleId | null>(null)
  const [hasRestored, setHasRestored] = useState(false)

  const openOrFocusTab = useCallback((moduleId: ModuleId) => {
    const label = getModuleLabel(moduleId)
    setTabs((prev) => {
      const existing = prev.find((t) => t.moduleId === moduleId)
      if (existing) {
        setActiveTabId(existing.id)
        setActiveModuleId(moduleId)
        return prev
      }
      const newTab: TabItem = {
        id: generateTabId(),
        moduleId,
        label,
      }
      setActiveTabId(newTab.id)
      setActiveModuleId(moduleId)
      return [...prev, newTab]
    })
  }, [])

  const handleSelectModule = useCallback((id: ModuleId) => {
    openOrFocusTab(id)
  }, [openOrFocusTab])

  const handleSelectTab = useCallback((id: string) => {
    const tab = tabs.find((t) => t.id === id)
    if (tab) {
      setActiveTabId(id)
      setActiveModuleId(tab.moduleId)
    }
  }, [tabs])

  const handleCloseTab = useCallback((id: string) => {
    setTabs((prev) => {
      const next = prev.filter((t) => t.id !== id)
      if (activeTabId === id) {
        const idx = prev.findIndex((t) => t.id === id)
        const newActive = next[idx] ?? next[idx - 1]
        setActiveTabId(newActive?.id ?? null)
        setActiveModuleId(newActive?.moduleId ?? null)
      }
      return next
    })
  }, [activeTabId])

  const activeTab = tabs.find((t) => t.id === activeTabId)
  const displayModuleId = activeTab?.moduleId ?? activeModuleId

  /** F5: Khôi phục tab và màn hình đang xem từ sessionStorage. */
  useEffect(() => {
    if (hasRestored) return
    setHasRestored(true)
    try {
      const raw = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(STORAGE_KEY_LAYOUT) : null
      if (raw) {
        const data = JSON.parse(raw) as { openModuleIds?: ModuleId[]; activeModuleId?: ModuleId | null }
        const openModuleIds = data.openModuleIds
        const savedActive = data.activeModuleId
        if (Array.isArray(openModuleIds) && openModuleIds.length > 0) {
          const newTabs: TabItem[] = openModuleIds.map((moduleId) => ({
            id: generateTabId(),
            moduleId,
            label: getModuleLabel(moduleId),
          }))
          setTabs(newTabs)
          const activeTab = newTabs.find((t) => t.moduleId === savedActive) ?? newTabs[0]
          setActiveTabId(activeTab.id)
          setActiveModuleId(activeTab.moduleId)
          return
        }
      }
    } catch {
      // ignore
    }
    if (tabs.length === 0) {
      handleSelectModule('ban-lam-viec')
    }
  }, [hasRestored, tabs.length, handleSelectModule])

  /** Lưu trạng thái tab + màn hình để F5 vẫn giữ màn hình hiện tại. */
  useEffect(() => {
    if (tabs.length === 0) return
    try {
      const activeTab = tabs.find((t) => t.id === activeTabId)
      const activeModuleIdToSave = activeTab?.moduleId ?? null
      const openModuleIds = tabs.map((t) => t.moduleId)
      sessionStorage.setItem(STORAGE_KEY_LAYOUT, JSON.stringify({ activeModuleId: activeModuleIdToSave, openModuleIds }))
    } catch {
      // ignore
    }
  }, [tabs, activeTabId])

  /** Cảnh báo khi refresh (F5) hoặc đóng tab nếu có form đang nhập dở. */
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (getUnsavedChanges()) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [])

  const appContextValue: AppContextValue = {
    activeModuleId,
    openOrFocusTab: handleSelectModule,
  }

  return (
    <AppContext.Provider value={appContextValue}>
    <div style={layoutStyles}>
      <Sidebar activeModuleId={activeModuleId} onSelectModule={handleSelectModule} />
      <main style={mainStyles}>
        <AppHeader />
        <TabBar
          tabs={tabs}
          activeTabId={activeTabId}
          onSelectTab={handleSelectTab}
          onCloseTab={handleCloseTab}
        />
        <div style={contentStyles}>
          {displayModuleId ? (
            <ModuleRouter moduleId={displayModuleId} />
          ) : (
            <WelcomeScreen onSelectModule={handleSelectModule} />
          )}
        </div>
        <AppFooter />
      </main>
    </div>
    </AppContext.Provider>
  )
}

function WelcomeScreen({ onSelectModule }: { onSelectModule: (id: ModuleId) => void }) {
  const welcomeItems = MODULE_GROUPS.flatMap((g) => g.items).slice(0, 6)
  return (
    <div style={{ padding: '24px 16px', textAlign: 'center' }}>
      <h2 style={{ fontSize: '16px', marginBottom: '8px', color: 'var(--text-primary)' }}>
        Chào mừng đến HTQL_550
      </h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '12px', fontSize: '11px' }}>
        Chọn một phân hệ ở menu bên trái để mở trong tab mới. Bạn có thể mở nhiều tab và chuyển đổi mà không mất dữ liệu.
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', justifyContent: 'center' }}>
        {welcomeItems.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelectModule(item.id)}
            style={{
              padding: '6px 12px',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-strong)',
              color: 'var(--text-primary)',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '11px',
            }}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  )
}
