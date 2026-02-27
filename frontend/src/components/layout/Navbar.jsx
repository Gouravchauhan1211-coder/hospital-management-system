import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { 
  Menu, 
  Search,
  ChevronDown,
  LogOut,
  User,
  Settings
} from 'lucide-react'
import { clsx } from 'clsx'
import useAuthStore from '../../store/authStore'
import Avatar from '../ui/Avatar'
import NotificationDropdown from '../notifications/NotificationDropdown'

const Navbar = ({ onMenuClick }) => {
  const navigate = useNavigate()
  const [showDropdown, setShowDropdown] = useState(false)
  const { user, logout } = useAuthStore()

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
    <header className="sticky top-0 z-30 bg-black/10 backdrop-blur-xl border-b border-white/10">
      <div className="flex items-center justify-between h-16 px-4 lg:px-6">
        {/* Left side */}
        <div className="flex items-center gap-4">
          <button
            onClick={onMenuClick}
            className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 lg:hidden"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Search */}
          <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 border border-white/10">
            <Search className="w-4 h-4 text-white/40" />
            <input
              type="text"
              placeholder="Search..."
              className="bg-transparent border-none outline-none text-white placeholder-white/40 w-48"
            />
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* Notifications - Using the new component */}
          <NotificationDropdown />

          {/* Profile dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-2 p-2 rounded-xl hover:bg-white/10"
            >
              <Avatar 
                name={userName}
                src={user?.avatarUrl}
                size="sm"
              />
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium text-white">{userName}</p>
                <p className="text-xs text-white/50 capitalize">{userRole}</p>
              </div>
              <ChevronDown className="w-4 h-4 text-white/40" />
            </button>

            <AnimatePresence>
              {showDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute right-0 mt-2 w-56 bg-black/30 backdrop-blur-xl border border-white/20 rounded-2xl shadow-glass-lg overflow-hidden"
                >
                  <div className="p-2">
                    <button
                      onClick={() => {
                        setShowDropdown(false)
                        navigate(`/${userRole}/profile`)
                      }}
                      className="flex items-center gap-3 w-full p-3 rounded-xl text-white/80 hover:bg-white/10 hover:text-white transition-colors"
                    >
                      <User className="w-4 h-4" />
                      <span>My Profile</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowDropdown(false)
                        navigate(`/${userRole}/settings`)
                      }}
                      className="flex items-center gap-3 w-full p-3 rounded-xl text-white/80 hover:bg-white/10 hover:text-white transition-colors"
                    >
                      <Settings className="w-4 h-4" />
                      <span>Settings</span>
                    </button>
                  </div>
                  <div className="p-2 border-t border-white/10">
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-3 w-full p-3 rounded-xl text-error hover:bg-error/10 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Logout</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  )
}

export default Navbar
