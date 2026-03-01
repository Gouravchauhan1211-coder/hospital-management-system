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
          const storedUser = localStorage.getItem('hospital_user')
          if (storedUser) {
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
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  const isAuthenticated = !!user && sessionValid

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  const userRole = user?.role

  if (allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
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


