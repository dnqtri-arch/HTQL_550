import { Layout } from './components/Layout'
import { ToastProvider } from './context/ToastContext'
import { ErrorBoundary } from './components/ErrorBoundary'

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <Layout />
      </ToastProvider>
    </ErrorBoundary>
  )
}
