import { useState, useCallback, useEffect } from 'react'
import { AppContext, type AppContextValue } from '../context/appContext'
import { getUnsavedChanges } from '../context/unsavedChanges'
import { Sidebar } from './sidebar'
import { ModuleRouter } from './moduleRouter'
import { AppHeader } from './appHeader'
import { AppFooter } from './appFooter'
import { ElectronDragBar } from './electronDragBar'
import { MODULE_GROUPS } from '../config/sidebarConfig'
import type { ModuleId } from '../config/sidebarConfig'

let tabCounter = 0
function generateTabId() {
  return `tab-${++tabCounter}-${Date.now()}`
}

/** Đổi id module cũ (YC92) khi khôi phục tab từ sessionStorage. */
function normalizeLayoutModuleId(id: string): ModuleId {
  if (id === 'taiKhoanNganHang') return 'taiKhoan'
  return id as ModuleId
}

function getModuleLabel(moduleId: ModuleId): string {
  for (const group of MODULE_GROUPS) {
    for (const item of group.items) {
      if (item.children?.length) {
        const ch = item.children.find((c) => c.id === moduleId)
        if (ch) return ch.label
      }
      if (item.id === moduleId && !item.children?.length) return item.label
    }
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

type LayoutTab = { id: string; moduleId: ModuleId; label: string }

export function Layout() {
  const [tabs, setTabs] = useState<LayoutTab[]>([])
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
      const newTab: LayoutTab = {
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

  /** F5: Khôi phục tab và màn hình đang xem từ sessionStorage. */
  useEffect(() => {
    if (hasRestored) return
    setHasRestored(true)
    try {
      const raw = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(STORAGE_KEY_LAYOUT) : null
      if (raw) {
        const data = JSON.parse(raw) as { openModuleIds?: string[]; activeModuleId?: string | null }
        const openModuleIds = data.openModuleIds
        const savedActive = data.activeModuleId
        if (Array.isArray(openModuleIds) && openModuleIds.length > 0) {
          const newTabs: LayoutTab[] = openModuleIds.map((mid) => {
            const moduleId = normalizeLayoutModuleId(String(mid))
            return {
              id: generateTabId(),
              moduleId,
              label: getModuleLabel(moduleId),
            }
          })
          setTabs(newTabs)
          const activeTab =
            newTabs.find((t) => t.moduleId === (savedActive != null ? normalizeLayoutModuleId(String(savedActive)) : null)) ??
            newTabs[0]
          setActiveTabId(activeTab.id)
          setActiveModuleId(activeTab.moduleId)
          return
        }
      }
    } catch {
      // ignore
    }
    if (tabs.length === 0) {
      handleSelectModule('banLamViec')
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
        <ElectronDragBar />
        <AppHeader />
        <div style={contentStyles}>
          {tabs.length === 0 ? (
            <WelcomeScreen onSelectModule={handleSelectModule} />
          ) : (
            tabs.map((tab) => (
              <div
                key={tab.id}
                style={{
                  flex: 1,
                  minHeight: 0,
                  display: tab.id === activeTabId ? 'flex' : 'none',
                  flexDirection: 'column',
                  overflow: 'hidden',
                }}
              >
                <ModuleRouter moduleId={tab.moduleId} />
              </div>
            ))
          )}
        </div>
        <AppFooter />
      </main>
    </div>
    </AppContext.Provider>
  )
}

function WelcomeScreen({ onSelectModule }: { onSelectModule: (id: ModuleId) => void }) {
  const welcomeItems = MODULE_GROUPS.flatMap((g) => 
    g.items.flatMap((item) => item.children ?? [item])
  ).filter((item): item is typeof item & { id: ModuleId } => !('children' in item && item.children)).slice(0, 6)
  return (
    <div style={{ padding: '24px 16px', textAlign: 'center' }}>
      <h2 style={{ fontSize: '16px', marginBottom: '8px', color: 'var(--text-primary)' }}>
        Chào mừng đến HTQL_550
      </h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '12px', fontSize: '11px' }}>
        Chọn một phân hệ ở menu bên trái để làm việc. Dùng menu để chuyển giữa các màn hình nghiệp vụ.
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
