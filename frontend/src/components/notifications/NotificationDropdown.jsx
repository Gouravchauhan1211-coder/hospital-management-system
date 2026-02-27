import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, Check, CheckCheck, X, AlertCircle, Calendar, MessageSquare, UserPlus } from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import useAuthStore from '../../store/authStore'
import { useNotifications } from '../../hooks/useRealtimeSubscription'
import toast from 'react-hot-toast'

const notificationIcons = {
  appointment: Calendar,
  message: MessageSquare,
  walk_in: UserPlus,
  alert: AlertCircle,
  default: Bell,
}

const notificationColors = {
  appointment: 'text-primary-400 bg-primary-500/20',
  message: 'text-accent-purple bg-accent-purple/20',
  walk_in: 'text-accent-teal bg-accent-teal/20',
  alert: 'text-error bg-error/20',
  default: 'text-white/60 bg-white/10',
}

const NotificationDropdown = () => {
  const { user } = useAuthStore()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)
  
  const { 
    data: notifications, 
    unreadCount, 
    markAsRead, 
    markAllAsRead,
    isSubscribed 
  } = useNotifications(user?.id)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Show toast for new notifications
  useEffect(() => {
    if (notifications && notifications.length > 0) {
      // Only show toast for the most recent unread notification
      const latestUnread = notifications.find(n => !n.read)
      if (latestUnread && isOpen === false) {
        // Don't show toast if dropdown is open
        // Toast will be handled by the real-time subscription
      }
    }
  }, [notifications, isOpen])

  const handleNotificationClick = async (notification) => {
    if (!notification.read) {
      await markAsRead(notification.id)
    }
    // Could navigate to relevant page based on notification type
    setIsOpen(false)
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 w-5 h-5 bg-error rounded-full text-xs font-bold text-white flex items-center justify-center"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-80 sm:w-96 bg-black/30 backdrop-blur-xl border border-white/20 rounded-2xl shadow-glass-lg overflow-hidden z-50"
          >
            {/* Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-white">Notifications</h3>
                {isSubscribed && (
                  <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1"
                >
                  <CheckCheck className="w-3 h-3" />
                  Mark all read
                </button>
              )}
            </div>

            {/* Notifications List */}
            <div className="max-h-96 overflow-y-auto">
              {notifications && notifications.length > 0 ? (
                <div className="divide-y divide-white/5">
                  {notifications.slice(0, 10).map((notification) => {
                    const Icon = notificationIcons[notification.type] || notificationIcons.default
                    const colorClass = notificationColors[notification.type] || notificationColors.default
                    
                    return (
                      <motion.div
                        key={notification.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        onClick={() => handleNotificationClick(notification)}
                        className={`p-4 hover:bg-white/5 cursor-pointer transition-colors ${
                          !notification.read ? 'bg-primary-500/5' : ''
                        }`}
                      >
                        <div className="flex gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p className={`text-sm ${!notification.read ? 'font-medium text-white' : 'text-white/80'}`}>
                                {notification.title}
                              </p>
                              {!notification.read && (
                                <div className="w-2 h-2 bg-primary-500 rounded-full flex-shrink-0 mt-1.5" />
                              )}
                            </div>
                            <p className="text-xs text-white/60 mt-0.5 line-clamp-2">
                              {notification.message}
                            </p>
                            <p className="text-xs text-white/40 mt-1">
                              {notification.created_at && formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              ) : (
                <div className="p-8 text-center">
                  <Bell className="w-12 h-12 text-white/20 mx-auto mb-3" />
                  <p className="text-white/60">No notifications yet</p>
                  <p className="text-xs text-white/40 mt-1">We'll notify you when something arrives</p>
                </div>
              )}
            </div>

            {/* Footer */}
            {notifications && notifications.length > 10 && (
              <div className="p-3 border-t border-white/10 text-center">
                <button className="text-sm text-primary-400 hover:text-primary-300">
                  View all notifications
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default NotificationDropdown
