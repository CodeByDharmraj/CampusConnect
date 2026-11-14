import { QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router'

import { queryClient } from '../lib/queryClient.js'

// App-wide providers that sit below the auth/toast providers in main.jsx.
// The shared queryClient instance is imported, never created here, so the
// whole app keeps a single cache.
export default function AppProviders({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{children}</BrowserRouter>
    </QueryClientProvider>
  )
}
