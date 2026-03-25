import { Layout } from './components/layout'
import { ToastProvider } from './context/toastContext'
import { ErrorBoundary } from './components/errorBoundary'

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <Layout />
      </ToastProvider>
    </ErrorBoundary>
  )
}
