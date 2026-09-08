import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function ProtectedRoute() {
  const { status } = useAuth()
  const location = useLocation()

  if (status === 'checking') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-chalk">
        <p className="font-mono text-xs uppercase tracking-wide text-graphite" role="status" aria-live="polite">
          Checking session…
        </p>
      </div>
    )
  }

  if (status === 'signed_out') {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <Outlet />
}
