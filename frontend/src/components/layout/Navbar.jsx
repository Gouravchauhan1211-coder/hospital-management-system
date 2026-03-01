import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  Search,
  ChevronDown,
  LogOut,
  User,
  Settings,
  Bell
} from 'lucide-react'
import useAuthStore from '../../store/authStore'
import Avatar from '../ui/Avatar'
import { supabase } from '../../services/supabase'
import NotificationDrawer from '../shared/NotificationDrawer'

const Navbar = () => {
  const navigate = useNavigate()
  const [showDropdown, setShowDropdown] = useState(false)
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const { user, logout } = useAuthStore()

  useEffect(() => {
    if (!user?.id) return

    const fetchNotifications = async () => {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10)

      if (data) setNotifications(data)
    }

    fetchNotifications()

    // Subscribe to new notifications
    const channel = supabase
      .channel(`user-notifications-${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        setNotifications(prev => [payload.new, ...prev].slice(0, 10))
        toast.success(payload.new.title || 'New notification')
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id])

  const handleLogout = async () => {
    try {
      await logout()
      navigate('/login')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  const userRole = user?.role || 'patient'
  const userName = user?.fullName || user?.email?.split('@')[0] || 'User'

  return (
    <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-gray-100 dark:border-slate-800 transition-colors">
      <div className="flex items-center justify-between h-14 px-4 max-w-md mx-auto">

        {/* Left icon / Title placeholder */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-200 dark:shadow-none">
            <span className="text-white font-bold pb-0.5">+</span>
          </div>
          <span className="font-bold text-gray-800 dark:text-white text-sm tracking-tight transition-colors">Medicare</span>
        </div>

        {/* Right side Actions */}
        <div className="flex items-center gap-3">
          {/* Notification Bell */}
          <button
            onClick={() => setIsNotificationsOpen(true)}
            className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors text-gray-700 dark:text-slate-300"
          >
            <Bell className="w-5 h-5" />
            {notifications.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-900"></span>
            )}
          </button>

          {/* Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-2 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
            >
              <Avatar
                name={userName}
                src={user?.avatarUrl}
                size="sm"
                className="ring-2 ring-white dark:ring-slate-900"
              />
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>

            <AnimatePresence>
              {showDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-3 w-48 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden z-50 origin-top-right transition-colors"
                >
                  <div className="p-2 space-y-1">
                    <button
                      onClick={() => {
                        setShowDropdown(false)
                        navigate(`/${userRole}/profile`)
                      }}
                      className="flex items-center gap-3 w-full p-2.5 rounded-xl text-gray-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-slate-800 hover:text-blue-700 dark:hover:text-blue-400 transition-colors text-sm font-medium"
                    >
                      <User className="w-4 h-4" />
                      <span>My Profile</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowDropdown(false)
                        navigate(`/${userRole}/settings`)
                      }}
                      className="flex items-center gap-3 w-full p-2.5 rounded-xl text-gray-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-slate-800 hover:text-blue-700 dark:hover:text-blue-400 transition-colors text-sm font-medium"
                    >
                      <Settings className="w-4 h-4" />
                      <span>Settings</span>
                    </button>
                  </div>
                  <div className="p-2 border-t border-gray-100 dark:border-slate-800">
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-3 w-full p-2.5 rounded-xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors text-sm font-medium"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Log Out</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <NotificationDrawer
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        notifications={notifications}
      />
    </header>
  )
}

export default Navbar


