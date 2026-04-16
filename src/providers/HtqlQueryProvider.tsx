import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useState } from 'react'

/**
 * Dữ liệu nghiệp vụ: không cache entity lâu — luôn refetch từ API/MySQL khi mount (build.mdc).
 * (gcTime từng được gọi cacheTime ở React Query v4.)
 */
export function HtqlQueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            gcTime: 0,
            staleTime: 0,
          },
        },
      }),
  )
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}
