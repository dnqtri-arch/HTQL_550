import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'

export interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.props.onError?.(error, errorInfo)
  }

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) return this.props.fallback
      return (
        <div
          style={{
            padding: 16,
            margin: 8,
            border: '1px solid var(--accent)',
            borderRadius: 6,
            background: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            fontSize: 12,
          }}
        >
          <p style={{ fontWeight: 600, marginBottom: 8 }}>Đã xảy ra lỗi</p>
          <p style={{ color: 'var(--text-muted)', marginBottom: 12 }}>{this.state.error.message}</p>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              padding: '6px 12px',
              fontSize: 11,
              background: 'var(--accent)',
              color: '#0d0d0d',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
            }}
          >
            Thử lại
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
