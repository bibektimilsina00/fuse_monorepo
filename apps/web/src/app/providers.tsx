import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { ConfirmProvider } from '@/components/ui/confirm-modal'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

export const Providers: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <QueryClientProvider client={queryClient}>
      <ConfirmProvider>
        {children}
      </ConfirmProvider>
    </QueryClientProvider>
  )
}
