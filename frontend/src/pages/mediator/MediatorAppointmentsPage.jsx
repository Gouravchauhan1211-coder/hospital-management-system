import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { 
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  Filter,
  Search,
  ChevronDown,
  Eye,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Download,
  User,
  Stethoscope
} from 'lucide-react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths, subMonths } from 'date-fns'
import toast from 'react-hot-toast'
import useAuthStore from '../../store/authStore'
import { getAppointments, getDoctors, updateAppointment } from '../../services/api'
import { DashboardLayout } from '../../components/layout'
import { GlassCard, Badge, Button, Modal } from '../../components/ui'
import { EmptyState } from '../../components/shared'
import { CardSkeleton } from '../../components/ui/Skeleton'

// Status configuration
const statusConfig = {
  pending: { label: 'Pending', color: 'warning' },
  confirmed: { label: 'Confirmed', color: 'primary' },
  completed: { label: 'Completed', color: 'success' },
  cancelled: { label: 'Cancelled', color: 'error' },
  rejected: { label: 'Rejected', color: 'error' },
}

const MediatorAppointmentsPage = () => {
  const { user } = useAuthStore()
  
  // State
  const [isLoading, setIsLoading] = useState(true)
  const [appointments, setAppointments] = useState([])
  const [doctors, setDoctors] = useState([])
  const [viewMode, setViewMode] = useState('table') // 'table' or 'calendar'
  
  // Calendar state
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(null)
  
  // Filter state
  const [filters, setFilters] = useState({
    doctor: '',
    date: '',
    status: '',
    search: '',
  })
  const [showFilters, setShowFilters] = useState(false)
  
  // Modal state
  const [selectedAppointment, setSelectedAppointment] = useState(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [showRescheduleModal, setShowRescheduleModal] = useState(false)
  const [rescheduleData, setRescheduleData] = useState({ date: '', time: '' })

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [appointmentsData, doctorsData] = await Promise.all([
          getAppointments({}).catch(() => []),
          getDoctors({}).catch(() => []),
        ])
        
        setAppointments(appointmentsData || [])
        setDoctors(doctorsData || [])
      } catch (error) {
        console.error('Error fetching data:', error)
        toast.error('Failed to load appointments')
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchData()
  }, [])

  // Filtered appointments
  const filteredAppointments = useMemo(() => {
    return appointments.filter(apt => {
      if (filters.doctor && apt.doctor_id !== filters.doctor) return false
      if (filters.date && apt.date !== filters.date) return false
      if (filters.status && apt.status !== filters.status) return false
      if (filters.search) {
        const searchLower = filters.search.toLowerCase()
        return (
          apt.patient_name?.toLowerCase().includes(searchLower) ||
          apt.doctor_name?.toLowerCase().includes(searchLower) ||
          apt.specialization?.toLowerCase().includes(searchLower)
        )
      }
      return true
    })
  }, [appointments, filters])

  // Calendar days
  const calendarDays = useMemo(() => {
    const start = startOfMonth(currentMonth)
    const end = endOfMonth(currentMonth)
    return eachDayOfInterval({ start, end })
  }, [currentMonth])

  // Appointments by date for calendar view
  const appointmentsByDate = useMemo(() => {
    const grouped = {}
    appointments.forEach(apt => {
      if (!grouped[apt.date]) {
        grouped[apt.date] = []
      }
      grouped[apt.date].push(apt)
    })
    return grouped
  }, [appointments])

  // Handle appointment actions
  const handleApproveAppointment = async (appointmentId) => {
    try {
      await updateAppointment(appointmentId, { status: 'confirmed' })
      setAppointments(prev => 
        prev.map(apt => apt.id === appointmentId ? { ...apt, status: 'confirmed' } : apt)
      )
      toast.success('Appointment approved successfully')
    } catch (error) {
      toast.error('Failed to approve appointment')
    }
  }

  const handleRejectAppointment = async (appointmentId) => {
    try {
      await updateAppointment(appointmentId, { status: 'rejected' })
      setAppointments(prev => 
        prev.map(apt => apt.id === appointmentId ? { ...apt, status: 'rejected' } : apt)
      )
      toast.success('Appointment rejected')
    } catch (error) {
      toast.error('Failed to reject appointment')
    }
  }

  const handleReschedule = async () => {
    if (!selectedAppointment || !rescheduleData.date || !rescheduleData.time) {
      toast.error('Please select date and time')
      return
    }

    try {
      await updateAppointment(selectedAppointment.id, {
        date: rescheduleData.date,
        time: rescheduleData.time,
        status: 'pending',
      })
      setAppointments(prev =>
        prev.map(apt => apt.id === selectedAppointment.id 
          ? { ...apt, date: rescheduleData.date, time: rescheduleData.time, status: 'pending' }
          : apt
        )
      )
      setShowRescheduleModal(false)
      setSelectedAppointment(null)
      setRescheduleData({ date: '', time: '' })
      toast.success('Appointment rescheduled successfully')
    } catch (error) {
      toast.error('Failed to reschedule appointment')
    }
  }

  // Export appointments as CSV
  const handleExport = () => {
    const headers = ['Patient', 'Doctor', 'Date', 'Time', 'Status', 'Mode', 'Amount']
    const rows = filteredAppointments.map(apt => [
      apt.patient_name,
      apt.doctor_name,
      apt.date,
      apt.time,
      apt.status,
      apt.mode,
      apt.amount || 0,
    ])
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `appointments_${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Appointments exported successfully')
  }

  // Time slots for reschedule
  const timeSlots = [
    '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
    '12:00 PM', '12:30 PM', '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM',
    '04:00 PM', '04:30 PM', '05:00 PM', '05:30 PM'
  ]

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
              Appointments Management
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-white/60"
            >
              View, approve, reject, or reschedule appointments
            </motion.p>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsLoading(true)
                getAppointments({}).then(data => {
                  setAppointments(data || [])
                  setIsLoading(false)
                })
              }}
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleExport}
            >
              <Download className="w-4 h-4" />
              Export
            </Button>
          </div>
        </div>
      </div>

      {/* View Toggle & Filters */}
      <GlassCard className="p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input
                type="text"
                placeholder="Search by patient, doctor, or specialty..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:border-primary-500"
              />
            </div>
          </div>

          {/* View Toggle */}
          <div className="flex bg-white/5 rounded-lg p-1">
            <button
              onClick={() => setViewMode('table')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'table' ? 'bg-primary-500 text-white' : 'text-white/60 hover:text-white'
              }`}
            >
              Table
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'calendar' ? 'bg-primary-500 text-white' : 'text-white/60 hover:text-white'
              }`}
            >
              Calendar
            </button>
          </div>

          {/* Filter Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2"
          >
            <Filter className="w-4 h-4" />
            Filters
            <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </Button>
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mt-4 pt-4 border-t border-white/10 grid grid-cols-1 sm:grid-cols-4 gap-4"
          >
            <div>
              <label className="block text-sm text-white/60 mb-1">Doctor</label>
              <select
                value={filters.doctor}
                onChange={(e) => setFilters(prev => ({ ...prev, doctor: e.target.value }))}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-primary-500"
              >
                <option value="">All Doctors</option>
                {doctors.map(doc => (
                  <option key={doc.id} value={doc.id}>{doc.full_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-white/60 mb-1">Date</label>
              <input
                type="date"
                value={filters.date}
                onChange={(e) => setFilters(prev => ({ ...prev, date: e.target.value }))}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm text-white/60 mb-1">Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-primary-500"
              >
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div className="flex items-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFilters({ doctor: '', date: '', status: '', search: '' })}
              >
                Clear Filters
              </Button>
            </div>
          </motion.div>
        )}
      </GlassCard>

      {/* Content */}
      {viewMode === 'table' ? (
        /* Table View */
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-white">All Appointments</h2>
            <span className="text-sm text-white/60">{filteredAppointments.length} appointments</span>
          </div>

          {isLoading ? (
            <div className="space-y-4">
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
            </div>
          ) : filteredAppointments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left text-sm text-white/60 pb-3 font-medium">Patient</th>
                    <th className="text-left text-sm text-white/60 pb-3 font-medium">Doctor</th>
                    <th className="text-left text-sm text-white/60 pb-3 font-medium">Date & Time</th>
                    <th className="text-left text-sm text-white/60 pb-3 font-medium">Mode</th>
                    <th className="text-left text-sm text-white/60 pb-3 font-medium">Status</th>
                    <th className="text-left text-sm text-white/60 pb-3 font-medium">Payment</th>
                    <th className="text-right text-sm text-white/60 pb-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAppointments.map((apt, index) => (
                    <motion.tr
                      key={apt.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.02 }}
                      className="border-b border-white/5 hover:bg-white/5"
                    >
                      <td className="py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary-500/20 flex items-center justify-center">
                            <User className="w-5 h-5 text-primary-400" />
                          </div>
                          <div>
                            <p className="text-white font-medium">{apt.patient_name}</p>
                            <p className="text-xs text-white/40">ID: {apt.patient_id?.slice(0, 8)}...</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-accent-purple/20 flex items-center justify-center">
                            <Stethoscope className="w-5 h-5 text-accent-purple" />
                          </div>
                          <div>
                            <p className="text-white/80">Dr. {apt.doctor_name}</p>
                            <p className="text-xs text-white/40">{apt.specialization}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4">
                        <div>
                          <p className="text-white/80">{format(new Date(apt.date), 'MMM d, yyyy')}</p>
                          <p className="text-xs text-white/40">{apt.time}</p>
                        </div>
                      </td>
                      <td className="py-4">
                        <Badge variant={apt.mode === 'online' ? 'primary' : 'default'}>
                          {apt.mode === 'online' ? 'Video Call' : 'In-Person'}
                        </Badge>
                      </td>
                      <td className="py-4">
                        <Badge variant={statusConfig[apt.status]?.color || 'default'}>
                          {statusConfig[apt.status]?.label || apt.status}
                        </Badge>
                      </td>
                      <td className="py-4">
                        <Badge variant={apt.payment_status === 'paid' ? 'success' : 'warning'}>
                          {apt.payment_status === 'paid' ? 'Paid' : 'Pending'}
                        </Badge>
                      </td>
                      <td className="py-4">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedAppointment(apt)
                              setShowDetailsModal(true)
                            }}
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {apt.status === 'pending' && (
                            <>
                              <Button
                                variant="success"
                                size="sm"
                                onClick={() => handleApproveAppointment(apt.id)}
                                title="Approve"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={() => handleRejectAppointment(apt.id)}
                                title="Reject"
                              >
                                <XCircle className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                          {['pending', 'confirmed'].includes(apt.status) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedAppointment(apt)
                                setRescheduleData({ date: apt.date, time: apt.time })
                                setShowRescheduleModal(true)
                              }}
                              title="Reschedule"
                            >
                              <CalendarDays className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              icon={Calendar}
              title="No appointments found"
              description="Try adjusting your filters to see more results."
            />
          )}
        </GlassCard>
      ) : (
        /* Calendar View */
        <GlassCard className="p-6">
          {/* Calendar Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-white">
              {format(currentMonth, 'MMMM yyyy')}
            </h2>
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
            
            {/* Empty cells for days before month starts */}
            {Array.from({ length: calendarDays[0].getDay() }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square" />
            ))}
            
            {/* Calendar Days */}
            {calendarDays.map((day, index) => {
              const dateStr = format(day, 'yyyy-MM-dd')
              const dayAppointments = appointmentsByDate[dateStr] || []
              const isSelected = selectedDate && isSameDay(day, selectedDate)
              const isTodayDate = isToday(day)
              
              return (
                <motion.div
                  key={dateStr}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.01 }}
                  onClick={() => setSelectedDate(day)}
                  className={`aspect-square p-1 rounded-lg cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-primary-500/30 border border-primary-500'
                      : isTodayDate
                        ? 'bg-white/10 border border-white/20'
                        : 'hover:bg-white/5'
                  }`}
                >
                  <div className="text-sm text-white/80 mb-1">{format(day, 'd')}</div>
                  {dayAppointments.length > 0 && (
                    <div className="space-y-0.5">
                      {dayAppointments.slice(0, 3).map(apt => (
                        <div
                          key={apt.id}
                          className={`text-[10px] px-1 py-0.5 rounded truncate ${
                            apt.status === 'confirmed' ? 'bg-blue-500/30 text-blue-300' :
                            apt.status === 'pending' ? 'bg-yellow-500/30 text-yellow-300' :
                            apt.status === 'completed' ? 'bg-green-500/30 text-green-300' :
                            'bg-red-500/30 text-red-300'
                          }`}
                        >
                          {apt.time}
                        </div>
                      ))}
                      {dayAppointments.length > 3 && (
                        <div className="text-[10px] text-white/40 text-center">
                          +{dayAppointments.length - 3} more
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              )
            })}
          </div>

          {/* Selected Date Details */}
          {selectedDate && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 pt-6 border-t border-white/10"
            >
              <h3 className="text-lg font-semibold text-white mb-4">
                Appointments for {format(selectedDate, 'MMMM d, yyyy')}
              </h3>
              {(appointmentsByDate[format(selectedDate, 'yyyy-MM-dd')] || []).length > 0 ? (
                <div className="space-y-3">
                  {appointmentsByDate[format(selectedDate, 'yyyy-MM-dd')].map(apt => (
                    <div
                      key={apt.id}
                      className="flex items-center gap-4 p-3 rounded-lg bg-white/5 hover:bg-white/10"
                    >
                      <div className="text-sm font-medium text-white/60 w-20">{apt.time}</div>
                      <div className="flex-1">
                        <p className="text-white font-medium">{apt.patient_name}</p>
                        <p className="text-sm text-white/60">Dr. {apt.doctor_name}</p>
                      </div>
                      <Badge variant={statusConfig[apt.status]?.color}>
                        {statusConfig[apt.status]?.label}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedAppointment(apt)
                          setShowDetailsModal(true)
                        }}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-white/40 text-center py-4">No appointments on this date</p>
              )}
            </motion.div>
          )}
        </GlassCard>
      )}

      {/* Appointment Details Modal */}
      <Modal
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false)
          setSelectedAppointment(null)
        }}
        title="Appointment Details"
      >
        {selectedAppointment && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-white/60">Patient</p>
                <p className="text-white font-medium">{selectedAppointment.patient_name}</p>
              </div>
              <div>
                <p className="text-sm text-white/60">Doctor</p>
                <p className="text-white font-medium">Dr. {selectedAppointment.doctor_name}</p>
              </div>
              <div>
                <p className="text-sm text-white/60">Specialization</p>
                <p className="text-white">{selectedAppointment.specialization || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-white/60">Mode</p>
                <p className="text-white">{selectedAppointment.mode === 'online' ? 'Video Call' : 'In-Person'}</p>
              </div>
              <div>
                <p className="text-sm text-white/60">Date</p>
                <p className="text-white">{format(new Date(selectedAppointment.date), 'MMMM d, yyyy')}</p>
              </div>
              <div>
                <p className="text-sm text-white/60">Time</p>
                <p className="text-white">{selectedAppointment.time}</p>
              </div>
              <div>
                <p className="text-sm text-white/60">Status</p>
                <Badge variant={statusConfig[selectedAppointment.status]?.color}>
                  {statusConfig[selectedAppointment.status]?.label}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-white/60">Payment Status</p>
                <Badge variant={selectedAppointment.payment_status === 'paid' ? 'success' : 'warning'}>
                  {selectedAppointment.payment_status || 'Pending'}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-white/60">Amount</p>
                <p className="text-white">${selectedAppointment.amount || 0}</p>
              </div>
            </div>
            
            {selectedAppointment.symptoms && (
              <div>
                <p className="text-sm text-white/60 mb-1">Symptoms</p>
                <p className="text-white bg-white/5 p-3 rounded-lg">{selectedAppointment.symptoms}</p>
              </div>
            )}

            <div className="flex gap-3 pt-4 border-t border-white/10">
              {selectedAppointment.status === 'pending' && (
                <>
                  <Button
                    variant="success"
                    className="flex-1"
                    onClick={() => {
                      handleApproveAppointment(selectedAppointment.id)
                      setShowDetailsModal(false)
                    }}
                  >
                    <CheckCircle className="w-4 h-4" />
                    Approve
                  </Button>
                  <Button
                    variant="danger"
                    className="flex-1"
                    onClick={() => {
                      handleRejectAppointment(selectedAppointment.id)
                      setShowDetailsModal(false)
                    }}
                  >
                    <XCircle className="w-4 h-4" />
                    Reject
                  </Button>
                </>
              )}
              <Button
                variant="ghost"
                className="flex-1"
                onClick={() => {
                  setShowDetailsModal(false)
                  setRescheduleData({ date: selectedAppointment.date, time: selectedAppointment.time })
                  setShowRescheduleModal(true)
                }}
              >
                <CalendarDays className="w-4 h-4" />
                Reschedule
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Reschedule Modal */}
      <Modal
        isOpen={showRescheduleModal}
        onClose={() => {
          setShowRescheduleModal(false)
          setSelectedAppointment(null)
          setRescheduleData({ date: '', time: '' })
        }}
        title="Reschedule Appointment"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-white/60 mb-2">New Date</label>
            <input
              type="date"
              value={rescheduleData.date}
              onChange={(e) => setRescheduleData(prev => ({ ...prev, date: e.target.value }))}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm text-white/60 mb-2">New Time</label>
            <select
              value={rescheduleData.time}
              onChange={(e) => setRescheduleData(prev => ({ ...prev, time: e.target.value }))}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-primary-500"
            >
              <option value="">Select time</option>
              {timeSlots.map(slot => (
                <option key={slot} value={slot}>{slot}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-3 pt-4">
            <Button
              variant="ghost"
              className="flex-1"
              onClick={() => {
                setShowRescheduleModal(false)
                setSelectedAppointment(null)
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              className="flex-1"
              onClick={handleReschedule}
            >
              Reschedule
            </Button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  )
}

export default MediatorAppointmentsPage
