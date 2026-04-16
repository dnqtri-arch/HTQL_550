import { Layout } from './components/layout'
import { ToastProvider } from './context/toastContext'
import { ErrorBoundary } from './components/errorBoundary'
import { HtqlQueryProvider } from './providers/HtqlQueryProvider'
import { UserPreferencesProvider } from './context/userPreferencesContext'
import { InstallerDownloadProgressBanner } from './components/installerDownloadProgressBanner'

export default function App() {
  return (
    <ErrorBoundary>
      <HtqlQueryProvider>
        <UserPreferencesProvider>
          <ToastProvider>
            <InstallerDownloadProgressBanner />
            <Layout />
          </ToastProvider>
        </UserPreferencesProvider>
      </HtqlQueryProvider>
    </ErrorBoundary>
  )
}
