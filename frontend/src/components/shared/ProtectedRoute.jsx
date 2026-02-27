import { Navigate, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import useAuthStore from '../../store/authStore'
import { supabase } from '../../services/supabase'
import { Loader2 } from 'lucide-react'

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, isLoading } = useAuthStore()
  const location = useLocation()
  const [sessionValid, setSessionValid] = useState(true)
  const [checkingSession, setCheckingSession] = useState(true)

  useEffect(() => {
    const verifySession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          // No valid session, check if user is stored in localStorage
          const storedUser = localStorage.getItem('hospital_user')
          if (storedUser) {
            // Clear invalid stored user
            localStorage.removeItem('hospital_user')
            setSessionValid(false)
          }
        }
      } catch (error) {
        console.error('Session verification error:', error)
        setSessionValid(false)
      } finally {
        setCheckingSession(false)
      }
    }

    if (user) {
      verifySession()
    } else {
      setCheckingSession(false)
    }
  }, [user])

  if (isLoading || checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-600 via-accent-purple to-accent-pink">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-white animate-spin" />
          <p className="text-white/60">Loading...</p>
        </div>
      </div>
    )
  }

  // Check if user exists (authenticated)
  const isAuthenticated = !!user && sessionValid

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  const userRole = user?.role

  if (allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
    // Redirect to appropriate dashboard based on role
    const dashboardPath = userRole === 'doctor' 
      ? '/doctor/dashboard' 
      : userRole === 'mediator' 
        ? '/mediator/dashboard' 
        : '/patient/dashboard'
    return <Navigate to={dashboardPath} replace />
  }

  return children
}

export default ProtectedRoute
