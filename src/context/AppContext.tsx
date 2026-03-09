import { createContext, useContext } from 'react'
import type { ModuleId } from '../config/sidebarConfig'

export interface AppContextValue {
  activeModuleId: ModuleId | null
  openOrFocusTab: (moduleId: ModuleId) => void
}

export const AppContext = createContext<AppContextValue | null>(null)

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}

export function useAppOptional() {
  return useContext(AppContext)
}
