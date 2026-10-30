import { Navigate, Outlet, useLocation } from 'react-router'

import { useAuth } from '../context/useAuth.js'

export default function ProtectedRoute({ allowedRoles }) {
  const { user, isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  // Wait until the refresh-cookie session check finishes.
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

  // Remember the requested page so login can return the user there.
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  // Optional role-level restriction.
  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
