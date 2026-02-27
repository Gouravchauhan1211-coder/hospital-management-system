import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Calendar,
  Clock,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Save,
  AlertCircle,
  CheckCircle,
  X,
  CalendarDays,
  Bell,
  BellOff
} from 'lucide-react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths, subMonths, addDays, startOfWeek, endOfWeek } from 'date-fns'
import toast from 'react-hot-toast'
import useAuthStore from '../../store/authStore'
import { getUserProfile, updateUserProfile } from '../../services/api'
import { DashboardLayout } from '../../components/layout'
import { GlassCard, Badge, Button, Modal } from '../../components/ui'

// Default time slots
const defaultTimeSlots = [
  '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
  '12:00 PM', '12:30 PM', '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM',
  '04:00 PM', '04:30 PM', '05:00 PM', '05:30 PM'
]

// Days of the week
const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const DoctorAvailabilityPage = () => {
  const { user } = useAuthStore()
  
  // State
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  
  // Availability state
  const [weeklySchedule, setWeeklySchedule] = useState({
    Monday: { enabled: true, slots: ['09:00 AM', '10:00 AM', '11:00 AM', '02:00 PM', '03:00 PM', '04:00 PM'] },
    Tuesday: { enabled: true, slots: ['09:00 AM', '10:00 AM', '11:00 AM', '02:00 PM', '03:00 PM', '04:00 PM'] },
    Wednesday: { enabled: true, slots: ['09:00 AM', '10:00 AM', '11:00 AM', '02:00 PM', '03:00 PM', '04:00 PM'] },
    Thursday: { enabled: true, slots: ['09:00 AM', '10:00 AM', '11:00 AM', '02:00 PM', '03:00 PM', '04:00 PM'] },
    Friday: { enabled: true, slots: ['09:00 AM', '10:00 AM', '11:00 AM', '02:00 PM', '03:00 PM', '04:00 PM'] },
    Saturday: { enabled: false, slots: [] },
    Sunday: { enabled: false, slots: [] },
  })
  
  // Unavailable dates
  const [unavailableDates, setUnavailableDates] = useState([])
  
  // Calendar state
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(null)
  const [showUnavailableModal, setShowUnavailableModal] = useState(false)
  const [unavailableReason, setUnavailableReason] = useState('')
  
  // Notification preferences
  const [notifications, setNotifications] = useState({
    newAppointment: true,
    reminder: true,
    cancellation: true,
  })

  // Fetch doctor profile
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.id) return
      
      try {
        const profile = await getUserProfile('doctors', user.id)
        
        if (profile?.availability) {
          setWeeklySchedule(prev => ({
            ...prev,
            ...profile.availability
          }))
        }
        
        if (profile?.unavailable_dates) {
          setUnavailableDates(profile.unavailable_dates)
        }
        
        if (profile?.notification_preferences) {
          setNotifications(prev => ({
            ...prev,
            ...profile.notification_preferences
          }))
        }
      } catch (error) {
        console.error('Error fetching profile:', error)
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchProfile()
  }, [user?.id])

  // Calendar days
  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth))
    const end = endOfWeek(endOfMonth(currentMonth))
    return eachDayOfInterval({ start, end })
  }, [currentMonth])

  // Toggle day enabled
  const toggleDayEnabled = (day) => {
    setWeeklySchedule(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        enabled: !prev[day].enabled,
        slots: !prev[day].enabled ? ['09:00 AM', '10:00 AM', '11:00 AM', '02:00 PM', '03:00 PM', '04:00 PM'] : []
      }
    }))
  }

  // Toggle time slot
  const toggleTimeSlot = (day, slot) => {
    setWeeklySchedule(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        slots: prev[day].slots.includes(slot)
          ? prev[day].slots.filter(s => s !== slot)
          : [...prev[day].slots, slot].sort((a, b) => defaultTimeSlots.indexOf(a) - defaultTimeSlots.indexOf(b))
      }
    }))
  }

  // Add unavailable date
  const addUnavailableDate = () => {
    if (!selectedDate) return
    
    const dateStr = format(selectedDate, 'yyyy-MM-dd')
    
    if (unavailableDates.some(d => d.date === dateStr)) {
      toast.error('This date is already marked as unavailable')
      return
    }
    
    setUnavailableDates(prev => [...prev, {
      date: dateStr,
      reason: unavailableReason || 'Not available',
    }])
    
    setShowUnavailableModal(false)
    setSelectedDate(null)
    setUnavailableReason('')
    toast.success('Date marked as unavailable')
  }

  // Remove unavailable date
  const removeUnavailableDate = (dateStr) => {
    setUnavailableDates(prev => prev.filter(d => d.date !== dateStr))
    toast.success('Date is now available')
  }

  // Check if date is unavailable
  const isDateUnavailable = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    return unavailableDates.some(d => d.date === dateStr)
  }

  // Save availability
  const handleSave = async () => {
    setIsSaving(true)
    try {
      await updateUserProfile('doctors', user.id, {
        availability: weeklySchedule,
        unavailable_dates: unavailableDates,
        notification_preferences: notifications,
      })
      toast.success('Availability saved successfully')
    } catch (error) {
      toast.error('Failed to save availability')
    } finally {
      setIsSaving(false)
    }
  }

  // Toggle notification
  const toggleNotification = (key) => {
    setNotifications(prev => ({
      ...prev,
      [key]: !prev[key]
    }))
  }

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <motion.h1
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-2xl font-bold text-white mb-2"
            >
              Availability Settings
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-white/60"
            >
              Set your weekly schedule and mark unavailable dates
            </motion.p>
          </div>
          
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={isSaving || isLoading}
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Schedule */}
        <GlassCard className="p-6">
          <h2 className="text-lg font-semibold text-white mb-6">Weekly Schedule</h2>
          
          <div className="space-y-4">
            {daysOfWeek.map(day => (
              <motion.div
                key={day}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-xl bg-white/5"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => toggleDayEnabled(day)}
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                        weeklySchedule[day].enabled
                          ? 'bg-primary-500 border-primary-500'
                          : 'border-white/30 hover:border-white/50'
                      }`}
                    >
                      {weeklySchedule[day].enabled && (
                        <CheckCircle className="w-4 h-4 text-white" />
                      )}
                    </button>
                    <span className={`font-medium ${weeklySchedule[day].enabled ? 'text-white' : 'text-white/40'}`}>
                      {day}
                    </span>
                  </div>
                  <Badge variant={weeklySchedule[day].enabled ? 'success' : 'default'}>
                    {weeklySchedule[day].enabled ? 'Available' : 'Off'}
                  </Badge>
                </div>
                
                {weeklySchedule[day].enabled && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {defaultTimeSlots.map(slot => (
                      <button
                        key={slot}
                        onClick={() => toggleTimeSlot(day, slot)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          weeklySchedule[day].slots.includes(slot)
                            ? 'bg-primary-500 text-white'
                            : 'bg-white/5 text-white/60 hover:bg-white/10'
                        }`}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </GlassCard>

        {/* Unavailable Dates Calendar */}
        <div className="space-y-6">
          <GlassCard className="p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Unavailable Dates</h2>
            
            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-medium">
                {format(currentMonth, 'MMMM yyyy')}
              </h3>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                >
                  <ChevronLeft className="w-5 h-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentMonth(new Date())}
                >
                  Today
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                >
                  <ChevronRight className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1">
              {/* Day Headers */}
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center text-sm text-white/60 py-2 font-medium">
                  {day}
                </div>
              ))}
              
              {/* Calendar Days */}
              {calendarDays.map((day, index) => {
                const isCurrentMonth = format(day, 'MMMM') === format(currentMonth, 'MMMM')
                const isUnavailable = isDateUnavailable(day)
                const isTodayDate = isToday(day)
                
                return (
                  <motion.button
                    key={index}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.005 }}
                    onClick={() => {
                      if (!isUnavailable && isCurrentMonth) {
                        setSelectedDate(day)
                        setShowUnavailableModal(true)
                      }
                    }}
                    disabled={!isCurrentMonth}
                    className={`aspect-square p-1 rounded-lg text-sm transition-colors ${
                      !isCurrentMonth
                        ? 'text-white/20 cursor-default'
                        : isUnavailable
                          ? 'bg-red-500/20 text-red-300 cursor-pointer hover:bg-red-500/30'
                          : isTodayDate
                            ? 'bg-primary-500/20 text-primary-300 hover:bg-primary-500/30'
                            : 'text-white/80 hover:bg-white/10'
                    }`}
                  >
                    {format(day, 'd')}
                  </motion.button>
                )
              })}
            </div>

            <p className="text-xs text-white/40 mt-4 text-center">
              Click on a date to mark it as unavailable
            </p>
          </GlassCard>

          {/* Upcoming Unavailable Dates */}
          <GlassCard className="p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Marked Unavailable</h2>
            
            {unavailableDates.length > 0 ? (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {unavailableDates
                  .sort((a, b) => new Date(a.date) - new Date(b.date))
                  .map(item => (
                    <div
                      key={item.date}
                      className="flex items-center justify-between p-3 rounded-lg bg-white/5"
                    >
                      <div>
                        <p className="text-white font-medium">
                          {format(new Date(item.date), 'EEEE, MMM d, yyyy')}
                        </p>
                        <p className="text-xs text-white/60">{item.reason}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeUnavailableDate(item.date)}
                      >
                        <X className="w-4 h-4 text-red-400" />
                      </Button>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center py-8 text-white/40">
                <CalendarDays className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No unavailable dates marked</p>
              </div>
            )}
          </GlassCard>

          {/* Notification Preferences */}
          <GlassCard className="p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Notification Preferences</h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                <div className="flex items-center gap-3">
                  <Bell className="w-5 h-5 text-primary-400" />
                  <div>
                    <p className="text-white font-medium">New Appointments</p>
                    <p className="text-xs text-white/60">Get notified for new bookings</p>
                  </div>
                </div>
                <button
                  onClick={() => toggleNotification('newAppointment')}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    notifications.newAppointment ? 'bg-primary-500' : 'bg-white/20'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white shadow transform transition-transform ${
                    notifications.newAppointment ? 'translate-x-6' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>
              
              <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-yellow-400" />
                  <div>
                    <p className="text-white font-medium">Appointment Reminders</p>
                    <p className="text-xs text-white/60">Remind 1 hour before</p>
                  </div>
                </div>
                <button
                  onClick={() => toggleNotification('reminder')}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    notifications.reminder ? 'bg-primary-500' : 'bg-white/20'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white shadow transform transition-transform ${
                    notifications.reminder ? 'translate-x-6' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>
              
              <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                <div className="flex items-center gap-3">
                  <BellOff className="w-5 h-5 text-red-400" />
                  <div>
                    <p className="text-white font-medium">Cancellations</p>
                    <p className="text-xs text-white/60">Get notified when patients cancel</p>
                  </div>
                </div>
                <button
                  onClick={() => toggleNotification('cancellation')}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    notifications.cancellation ? 'bg-primary-500' : 'bg-white/20'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white shadow transform transition-transform ${
                    notifications.cancellation ? 'translate-x-6' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>

      {/* Add Unavailable Date Modal */}
      <Modal
        isOpen={showUnavailableModal}
        onClose={() => {
          setShowUnavailableModal(false)
          setSelectedDate(null)
          setUnavailableReason('')
        }}
        title="Mark Date as Unavailable"
      >
        <div className="space-y-4">
          {selectedDate && (
            <div className="p-4 bg-white/5 rounded-lg">
              <p className="text-white font-medium">
                {format(selectedDate, 'EEEE, MMMM d, yyyy')}
              </p>
            </div>
          )}
          
          <div>
            <label className="block text-sm text-white/60 mb-2">Reason (Optional)</label>
            <input
              type="text"
              value={unavailableReason}
              onChange={(e) => setUnavailableReason(e.target.value)}
              placeholder="e.g., Vacation, Conference, Personal"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:border-primary-500"
            />
          </div>
          
          <div className="flex gap-3 pt-4">
            <Button
              variant="ghost"
              className="flex-1"
              onClick={() => {
                setShowUnavailableModal(false)
                setSelectedDate(null)
                setUnavailableReason('')
              }}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              className="flex-1"
              onClick={addUnavailableDate}
            >
              <X className="w-4 h-4" />
              Mark Unavailable
            </Button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  )
}

export default DoctorAvailabilityPage
