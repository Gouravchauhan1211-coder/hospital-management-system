import { NavLink, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  MessageSquare, 
  FileText,
  Settings,
  LogOut,
  X,
  Stethoscope,
  Clock,
  DollarSign,
  UserCheck,
  ClipboardList,
  Activity
} from 'lucide-react'
import { clsx } from 'clsx'
import useAuthStore from '../../store/authStore'
import Avatar from '../ui/Avatar'

const Sidebar = ({ isOpen, onClose }) => {
  const location = useLocation()
  const { user, logout } = useAuthStore()
  const role = user?.role || 'patient'

  const patientLinks = [
    { to: '/patient/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/patient/doctors', icon: Stethoscope, label: 'Find Doctors' },
    { to: '/patient/appointments', icon: Calendar, label: 'My Appointments' },
    { to: '/patient/records', icon: FileText, label: 'Medical Records' },
    { to: '/patient/messages', icon: MessageSquare, label: 'Messages' },
    { to: '/patient/profile', icon: Users, label: 'Profile' },
    { to: '/patient/settings', icon: Settings, label: 'Settings' },
  ]

  const doctorLinks = [
    { to: '/doctor/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/doctor/appointments', icon: Calendar, label: 'Appointments' },
    { to: '/doctor/patients', icon: Users, label: 'Patients' },
    { to: '/doctor/messages', icon: MessageSquare, label: 'Messages' },
    { to: '/doctor/availability', icon: Clock, label: 'Availability' },
    { to: '/doctor/earnings', icon: DollarSign, label: 'Earnings' },
    { to: '/doctor/profile', icon: UserCheck, label: 'Profile' },
    { to: '/doctor/settings', icon: Settings, label: 'Settings' },
  ]

  const mediatorLinks = [
    { to: '/mediator/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/mediator/departments', icon: ClipboardList, label: 'Departments' },
    { to: '/mediator/queue', icon: Clock, label: 'Queue' },
    { to: '/mediator/appointments', icon: Calendar, label: 'Appointments' },
    { to: '/mediator/doctors', icon: Stethoscope, label: 'Doctors' },
    { to: '/mediator/patients', icon: Users, label: 'Patients' },
    { to: '/mediator/analytics', icon: Activity, label: 'Analytics' },
    { to: '/mediator/settings', icon: Settings, label: 'Settings' },
  ]

  const links = role === 'doctor' ? doctorLinks : role === 'mediator' ? mediatorLinks : patientLinks

  const userName = user?.fullName || user?.email?.split('@')[0] || 'User'

  const handleLogout = async () => {
    try {
      await logout()
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ x: isOpen ? 0 : '-100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className={clsx(
          'fixed left-0 top-0 h-full w-64 z-50',
          'bg-black/20 backdrop-blur-xl border-r border-white/10',
          'flex flex-col',
          'lg:translate-x-0 lg:static lg:z-auto'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-purple flex items-center justify-center">
              <Stethoscope className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white font-display">MediCare</span>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Info */}
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <Avatar 
              src={user?.avatarUrl} 
              name={userName} 
              size="lg"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {userName}
              </p>
              <p className="text-xs text-white/60 capitalize">
                {role}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {links.map((link) => {
            const isActive = location.pathname === link.to
            return (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={onClose}
                className={clsx(
                  'flex items-center gap-3 px-4 py-3 rounded-xl',
                  'text-white/70 transition-all duration-200',
                  'hover:bg-white/10 hover:text-white',
                  isActive && 'bg-white/20 text-white font-medium shadow-glass'
                )}
              >
                <link.icon className="w-5 h-5" />
                <span>{link.label}</span>
                {isActive && (
                  <motion.div
                    layoutId="activeIndicator"
                    className="absolute left-0 w-1 h-8 bg-primary-500 rounded-r-full"
                  />
                )}
              </NavLink>
            )
          })}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-white/10">
          <button
            onClick={handleLogout}
            className={clsx(
              'flex items-center gap-3 w-full px-4 py-3 rounded-xl',
              'text-white/70 hover:text-error hover:bg-error/10',
              'transition-all duration-200'
            )}
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      </motion.aside>
    </>
  )
}

export default Sidebar
