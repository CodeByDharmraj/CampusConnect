import { Navigate, Outlet, useLocation } from 'react-router'

import { useAuth } from '../context/useAuth.js'

export default function PublicRoute() {
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div
        className="flex min-h-[50vh] items-center justify-center"
        role="status"
        aria-live="polite"
      >
        <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
          Checking your session...
        </p>
      </div>
    )
  }

  if (isAuthenticated) {
    const destination = location.state?.from?.pathname || '/'

    return <Navigate to={destination} replace />
  }

  return <Outlet />
}
