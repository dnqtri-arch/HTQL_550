import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { userPreferencesGet, userPreferencesPut } from '../utils/userPreferencesApi'

export const userPreferencesQueryKey = ['user-preferences'] as const

type Ctx = {
  prefs: Record<string, unknown>
  loading: boolean
  /** Merge shallow vào MySQL (server merge với bản đã lưu). */
  mergePrefs: (patch: Record<string, unknown>) => Promise<void>
}

const UserPreferencesContext = createContext<Ctx | null>(null)

export function UserPreferencesProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient()
  const q = useQuery({
    queryKey: userPreferencesQueryKey,
    queryFn: userPreferencesGet,
    retry: false,
  })
  const mut = useMutation({
    mutationFn: userPreferencesPut,
    onSuccess: () => qc.invalidateQueries({ queryKey: userPreferencesQueryKey }),
  })
  const mergePrefs = useCallback(
    async (patch: Record<string, unknown>) => {
      await mut.mutateAsync(patch)
    },
    [mut],
  )
  const value = useMemo(
    (): Ctx => ({
      prefs: q.data ?? {},
      loading: q.isLoading,
      mergePrefs,
    }),
    [q.data, q.isLoading, mergePrefs],
  )
  return <UserPreferencesContext.Provider value={value}>{children}</UserPreferencesContext.Provider>
}

export function useUserPreferences(): Ctx {
  const v = useContext(UserPreferencesContext)
  if (!v) throw new Error('useUserPreferences must be used within UserPreferencesProvider')
  return v
}

/** Dùng khi provider tùy chọn (vd. test). */
export function useUserPreferencesOptional(): Ctx | null {
  return useContext(UserPreferencesContext)
}
