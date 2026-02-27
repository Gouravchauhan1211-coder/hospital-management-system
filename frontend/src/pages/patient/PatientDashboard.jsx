import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { 
  Calendar,
  CalendarDays,
  FileText, 
  MessageSquare, 
  Stethoscope,
  Search,
  Bell,
  Home,
  User,
  Star,
  Clock,
  Heart,
  HeartPulse,
  Baby,
  Brain,
  Smile,
  Phone,
  Activity,
  CreditCard,
  ChevronRight
} from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import useAuthStore from '../../store/authStore'
import { getAppointments, getDoctors } from '../../services/api'

// Icons as Material Symbols equivalents
const icons = {
  favorite: Heart,
  medical_services: HeartPulse,
  psychology: Brain,
  dentistry: Smile,
  child_care: Baby,
  home: Home,
  calendar_month: Calendar,
  chat_bubble: MessageSquare,
  person: User,
  search: Search,
  notifications: Bell,
  schedule: Clock,
  star: Star,
  call: Phone,
  file_text: FileText,
}

const specialties = [
  { id: 'cardiology', name: 'Cardiology', icon: 'favorite', color: 'bg-blue-100 text-blue-600' },
  { id: 'dental', name: 'Dental', icon: 'dentistry', color: 'bg-orange-100 text-orange-600' },
  { id: 'neurology', name: 'Neurology', icon: 'psychology', color: 'bg-sky-100 text-sky-600' },
  { id: 'general', name: 'General', icon: 'medical_services', color: 'bg-green-100 text-green-600' },
  { id: 'pediatrics', name: 'Pediatrics', icon: 'child_care', color: 'bg-purple-100 text-purple-600' },
]

const PatientDashboard = () => {
  const { user } = useAuthStore()
  const userName = user?.fullName || user?.email?.split('@')[0] || 'User'
  const firstName = userName.split(' ')[0]
  const [appointments, setAppointments] = useState([])
  const [doctors, setDoctors] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        if (!user?.id) {
          setIsLoading(false)
          return
        }

        // Fetch appointments
        const appointmentsData = await getAppointments({ patientId: user.id })
        setAppointments(appointmentsData || [])

        // Fetch recommended doctors
        const doctorsData = await getDoctors({})
        setDoctors(doctorsData || [])
      } catch (error) {
        console.error('Error fetching dashboard data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchDashboardData()
  }, [user?.id])

  const upcomingAppointment = appointments.find(a => 
    ['pending', 'confirmed'].includes(a.status)
  )

  const currentHour = new Date().getHours()
  let greeting = 'Good Morning'
  if (currentHour >= 12 && currentHour < 17) greeting = 'Good Afternoon'
  else if (currentHour >= 17) greeting = 'Good Evening'

  // Notifications state
  const [showNotifications, setShowNotifications] = useState(false)
  const [notifications, setNotifications] = useState([
    { id: 1, type: 'appointment', title: 'Upcoming Appointment', message: 'Appointment with Dr. Smith tomorrow at 10:00 AM', time: '2 hours ago', read: false, link: '/patient/appointments' },
    { id: 2, type: 'bill', title: 'Payment Due', message: 'You have a pending bill of ₹500', time: '1 day ago', read: false, link: '/patient/billing' },
    { id: 3, type: 'prescription', title: 'Prescription Refill', message: 'Your prescription for Amoxicillin needs refill', time: '2 days ago', read: true, link: '/patient/prescriptions' },
    { id: 4, type: 'lab', title: 'Lab Results Ready', message: 'Your blood test results are now available', time: '3 days ago', read: true, link: '/patient/lab-results' },
    { id: 5, type: 'message', title: 'New Message', message: 'Dr. Johnson sent you a message', time: '5 days ago', read: true, link: '/patient/messages' },
  ])

  const unreadCount = notifications.filter(n => !n.read).length

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'appointment': return Calendar
      case 'bill': return CreditCard
      case 'prescription': return FileText
      case 'lab': return Activity
      case 'message': return MessageSquare
      default: return Bell
    }
  }

  const markAsRead = (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  return (
    <div className="min-h-screen pb-24" style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5a87 50%, #3d7ab5 100%)', backgroundAttachment: 'fixed', minHeight: '100vh' }}>
      {/* Header */}
      <header className="sticky top-0 z-50 px-5 pt-8 pb-4" style={{ background: 'rgba(30,58,95,0.95)', backdropFilter: 'blur(10px)' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold" style={{ background: 'rgba(255,255,255,0.2)' }}>
              {firstName?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">{greeting}, {firstName}</h1>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.7)' }}>How are you feeling today?</p>
            </div>
          </div>
          
          {/* Notification Bell - Hidden as per user request */}
          {/* <div className="relative">
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 rounded-xl transition-colors hover:bg-white/10"
            >
              <Bell className="w-6 h-6 text-white" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>
            
            {/* Notification Dropdown */}
            {showNotifications && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setShowNotifications(false)}
                />
                <div className="absolute right-0 top-12 w-80 max-h-96 overflow-y-auto rounded-2xl z-50" style={{ background: 'rgba(30,58,95,0.98)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <div className="p-4 border-b border-white/10 flex items-center justify-between">
                    <h3 className="font-bold text-white">Notifications</h3>
                    {unreadCount > 0 && (
                      <button 
                        onClick={markAllAsRead}
                        className="text-xs text-primary hover:underline"
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length > 0 ? (
                      notifications.map((notification) => {
                        const IconComponent = getNotificationIcon(notification.type)
                        return (
                          <Link
                            key={notification.id}
                            to={notification.link}
                            onClick={() => {
                              markAsRead(notification.id)
                              setShowNotifications(false)
                            }}
                            className={`flex items-start gap-3 p-4 border-b border-white/5 hover:bg-white/5 transition-colors ${
                              !notification.read ? 'bg-primary/5' : ''
                            }`}
                          >
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                              notification.type === 'appointment' ? 'bg-blue-500/20' :
                              notification.type === 'bill' ? 'bg-yellow-500/20' :
                              notification.type === 'prescription' ? 'bg-purple-500/20' :
                              notification.type === 'lab' ? 'bg-green-500/20' :
                              'bg-gray-500/20'
                            }`}>
                              <IconComponent className={`w-5 h-5 ${
                                notification.type === 'appointment' ? 'text-blue-400' :
                                notification.type === 'bill' ? 'text-yellow-400' :
                                notification.type === 'prescription' ? 'text-purple-400' :
                                notification.type === 'lab' ? 'text-green-400' :
                                'text-gray-400'
                              }`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-white text-sm">{notification.title}</p>
                              <p className="text-xs text-white/60 truncate">{notification.message}</p>
                              <p className="text-xs text-white/40 mt-1">{notification.time}</p>
                            </div>
                            {!notification.read && (
                              <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                            )}
                          </Link>
                        )
                      })
                    ) : (
                      <div className="p-8 text-center">
                        <Bell className="w-8 h-8 mx-auto text-white/30 mb-2" />
                        <p className="text-white/50 text-sm">No notifications</p>
                      </div>
                    )}
                  </div>
                  <div className="p-3 border-t border-white/10">
                    <Link 
                      to="/patient/notifications"
                      onClick={() => setShowNotifications(false)}
                      className="block text-center text-sm text-primary hover:underline"
                    >
                      View all notifications
                    </Link>
                  </div>
                </div>
              </>
            )}
        </div>
      </header>

      <main className="px-5 overflow-y-auto">
        {/* Search */}
        <div className="mt-2">
          <Link to="/patient/doctors">
            <div className="relative flex items-center group">
              <Search className="absolute left-4" style={{ color: 'rgba(255,255,255,0.5)' }} size={20} />
              <input 
                className="w-full h-14 pl-12 pr-4 border-none rounded-2xl text-base text-white placeholder:text-white/50"
                style={{ background: 'rgba(255,255,255,0.15)' }}
                placeholder="Search doctor, specialty..." 
                type="text"
                readOnly
              />
            </div>
          </Link>
        </div>

        {/* Upcoming Appointment */}
        {upcomingAppointment && (
          <section className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">Upcoming Appointment</h2>
              <Link to="/patient/appointments" className="text-sm font-semibold text-cyan-300">See All</Link>
            </div>
            <div className="relative overflow-hidden rounded-3xl p-6 text-white shadow-xl" style={{ background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)' }}>
              <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full bg-white/10 blur-3xl"></div>
              <div className="relative flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-white/20 p-1 backdrop-blur-sm border border-white/20 flex items-center justify-center">
                  <Stethoscope className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">Dr. {upcomingAppointment.doctor_name}</h3>
                  <p className="text-white/80 text-sm">{upcomingAppointment.specialization}</p>
                </div>
              </div>
              <div className="mt-6 flex items-center justify-between rounded-2xl bg-white/15 p-4 backdrop-blur-md border border-white/10">
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-2 py-1 bg-white/20 rounded">Token: {upcomingAppointment.token || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <CalendarDays size={18} />
                    <span className="text-sm font-medium">
                      {new Date(upcomingAppointment.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock size={18} />
                    <span className="text-sm font-medium">{upcomingAppointment.time}</span>
                  </div>
                </div>
                <button 
                  className="flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-bold shadow-lg" 
                  style={{ color: '#0284c7' }}
                  onClick={() => {
                    const threadId = upcomingAppointment?.thread_id || upcomingAppointment?.id;
                    if (threadId) {
                      window.location.href = `/call/${threadId}?type=video`;
                    } else {
                      toast.success('Starting video call...');
                    }
                  }}
                >
                  Join Call
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Specialties */}
        <section className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">Specialties</h2>
            <Link to="/patient/doctors" className="text-sm font-semibold text-primary">View All</Link>
          </div>
          <div className="flex gap-4 overflow-x-auto -mx-5 px-5 py-2">
            {specialties.map((specialty) => {
              const IconComponent = icons[specialty.icon] || Stethoscope
              return (
                <Link 
                  key={specialty.id} 
                  to={`/patient/doctors?specialization=${specialty.name}`}
                  className="flex flex-col items-center gap-2 min-w-[70px]"
                >
                  <div className={`w-16 h-16 flex items-center justify-center rounded-2xl ${specialty.color} shadow-sm`}>
                    <IconComponent size={32} />
                  </div>
                  <span className="text-xs font-semibold text-center" style={{ color: 'rgba(255,255,255,0.8)' }}>{specialty.name}</span>
                </Link>
              )
            })}
          </div>
        </section>

        {/* Quick Actions */}
        <section className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white">Quick Actions</h2>
          </div>
          <div className="grid grid-cols-4 gap-3">
            <Link to="/patient/appointments" className="flex flex-col items-center gap-2">
              <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-primary" />
              </div>
              <span className="text-xs font-medium text-white/80">Book</span>
            </Link>
            <Link to="/patient/prescriptions" className="flex flex-col items-center gap-2">
              <div className="w-14 h-14 rounded-2xl bg-purple-500/20 flex items-center justify-center">
                <FileText className="w-6 h-6 text-purple-400" />
              </div>
              <span className="text-xs font-medium text-white/80">Medicines</span>
            </Link>
            <Link to="/patient/lab-results" className="flex flex-col items-center gap-2">
              <div className="w-14 h-14 rounded-2xl bg-green-500/20 flex items-center justify-center">
                <Activity className="w-6 h-6 text-green-400" />
              </div>
              <span className="text-xs font-medium text-white/80">Lab Tests</span>
            </Link>
            <Link to="/patient/billing" className="flex flex-col items-center gap-2">
              <div className="w-14 h-14 rounded-2xl bg-yellow-500/20 flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-yellow-400" />
              </div>
              <span className="text-xs font-medium text-white/80">Billing</span>
            </Link>
          </div>
        </section>

        {/* Health Summary Quick Access */}
        <section className="mt-6">
          <Link to="/patient/health-summary">
            <div className="rounded-2xl p-4 border flex items-center justify-between" style={{ background: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.1)' }}>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center">
                  <Heart className="w-6 h-6 text-red-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Health Summary</h3>
                  <p className="text-xs text-white/60">Allergies, vitals, immunizations</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-white/40" />
            </div>
          </Link>
        </section>

        {/* Recommended Doctors */}
        <section className="mt-8 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white">Recommended Doctors</h2>
            <Link to="/patient/doctors" className="text-sm font-semibold" style={{ color: '#0ea5e9' }}>See More</Link>
          </div>
          <div className="flex flex-col gap-4">
            {doctors.slice(0, 3).map((doctor) => (
              <Link 
                key={doctor.id} 
                to={`/patient/doctors/${doctor.id}`}
                className="rounded-3xl p-4 flex gap-4 shadow-sm border transition-colors" style={{ background: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.1)' }}
              >
                <div className="w-24 h-24 rounded-2xl bg-primary/10 flex-shrink-0 flex items-center justify-center">
                  <Stethoscope className="w-10 h-10 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold" style={{ color: 'white' }}>Dr. {doctor.full_name}</h4>
                      <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.6)' }}>{doctor.specialization}</p>
                    </div>
                    <div className="flex items-center gap-1 px-2 py-1 rounded-lg" style={{ background: 'rgba(255,255,255,0.1)' }}>
                      <Star size={14} className="text-orange-400 fill-orange-400" />
                      <span className="text-xs font-bold" style={{ color: '#fbbf24' }}>{doctor.rating || '4.8'}</span>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Clock size={16} style={{ color: 'rgba(255,255,255,0.5)' }} />
                      <span className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.6)' }}>9:00 AM - 4:00 PM</span>
                    </div>
                    <button className="px-5 py-2 bg-primary text-white text-xs font-bold rounded-xl shadow-md">
                      Book
                    </button>
                  </div>
                </div>
              </Link>
            ))}
            
            {doctors.length === 0 && !isLoading && (
              <div className="text-center py-8">
                <Stethoscope className="w-12 h-12 mx-auto mb-2" style={{ color: 'rgba(255,255,255,0.3)' }} />
                <p style={{ color: 'rgba(255,255,255,0.5)' }}>No doctors available</p>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 w-full max-w-[430px] px-8 pb-8 pt-3 flex items-center justify-between z-50" style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(20px)', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <Link to="/patient/dashboard" className="flex flex-col items-center gap-1" style={{ color: 'white' }}>
          <Home size={28} />
          <span className="text-[10px] font-bold">Home</span>
        </Link>
        <Link to="/patient/appointments" className="flex flex-col items-center gap-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
          <Calendar size={28} />
          <span className="text-[10px] font-bold">Schedule</span>
        </Link>
        <Link to="/patient/messages" className="flex flex-col items-center gap-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
          <MessageSquare size={28} />
          <span className="text-[10px] font-bold">Messages</span>
        </Link>
        <Link to="/patient/profile" className="flex flex-col items-center gap-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
          <User size={28} />
          <span className="text-[10px] font-bold">Profile</span>
        </Link>
      </nav>
    </div>
  )
}

export default PatientDashboard
