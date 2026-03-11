import React, { createContext, useCallback, useContext, useRef, useState } from 'react'

export type ToastType = 'info' | 'error' | 'success'

export interface ToastState {
  message: string
  type: ToastType
  visible: boolean
}

export interface ToastContextValue {
  toast: ToastState
  showToast: (message: string, type?: ToastType) => void
  hideToast: () => void
}

const defaultState: ToastState = { message: '', type: 'info', visible: false }

export const ToastContext = createContext<ToastContextValue | null>(null)

const TOAST_DURATION_MS = 4000

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastState>(defaultState)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const hideToast = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    setToast((prev) => (prev.visible ? { ...prev, visible: false } : prev))
  }, [])

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    setToast({ message, type, visible: true })
    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null
      setToast((prev) => (prev.visible ? { ...prev, visible: false } : prev))
    }, TOAST_DURATION_MS)
  }, [])

  return (
    <ToastContext.Provider value={{ toast, showToast, hideToast }}>
      {children}
      {toast.visible && (
        <div
          role="alert"
          style={{
            position: 'fixed',
            bottom: 16,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
            padding: '10px 16px',
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 500,
            maxWidth: '90vw',
            boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
            background: toast.type === 'error' ? 'var(--accent)' : toast.type === 'success' ? '#22c55e' : 'var(--bg-tab)',
            color: toast.type === 'error' ? '#0d0d0d' : 'var(--text-primary)',
            border: '1px solid var(--border-strong)',
          }}
        >
          {toast.message}
        </div>
      )}
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

export function useToastOptional(): ToastContextValue | null {
  return useContext(ToastContext)
}
