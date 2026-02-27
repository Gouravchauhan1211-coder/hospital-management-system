import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { 
  Calendar,
  Clock,
  Video,
  MapPin,
  X,
  CheckCircle,
  XCircle,
  AlertCircle,
  Plus,
  Search,
  User,
  Stethoscope
} from 'lucide-react'
import toast from 'react-hot-toast'
import useAuthStore from '../../store/authStore'
import { getAppointments, cancelAppointment, createAppointment, getDoctors } from '../../services/api'
import { DashboardLayout } from '../../components/layout'
import { GlassCard, Badge, Avatar, Button, Modal, Input, Select } from '../../components/ui'
import { CardSkeleton } from '../../components/ui/Skeleton'

const statusColors = {
  pending: 'warning',
  confirmed: 'success',
  completed: 'success',
  cancelled: 'error',
  'no-show': 'error'
}

const statusLabels = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
  'no-show': 'No Show'
}

const PatientAppointmentsPage = () => {
  const { user } = useAuthStore()
  const [appointments, setAppointments] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  
  // Booking modal state
  const [showBookingModal, setShowBookingModal] = useState(false)
  const [doctors, setDoctors] = useState([])
  const [bookingData, setBookingData] = useState({
    doctorId: '',
    date: '',
    time: '',
    mode: 'online',
    reason: ''
  })
  const [isBooking, setIsBooking] = useState(false)

  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        const data = await getAppointments({ patientId: user.id })
        setAppointments(data || [])
      } catch (error) {
        console.error('Error fetching appointments:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchAppointments()
  }, [user.id])

  // Fetch doctors when booking modal opens
  useEffect(() => {
    if (showBookingModal) {
      const fetchDoctors = async () => {
        try {
          const doctorsData = await getDoctors({})
          setDoctors(doctorsData || [])
        } catch (error) {
          console.error('Error fetching doctors:', error)
        }
      }
      fetchDoctors()
    }
  }, [showBookingModal])

  const handleCancel = async (appointmentId) => {
    if (!confirm('Are you sure you want to cancel this appointment?')) return
    
    try {
      await cancelAppointment(appointmentId)
      toast.success('Appointment cancelled')
      setAppointments(appointments.map(a => 
        a.id === appointmentId ? { ...a, status: 'cancelled' } : a
      ))
    } catch (error) {
      console.error('Error cancelling appointment:', error)
      toast.error('Failed to cancel appointment')
    }
  }

  const handleBookAppointment = async () => {
    if (!bookingData.doctorId || !bookingData.date || !bookingData.time) {
      toast.error('Please fill all required fields')
      return
    }
    
    setIsBooking(true)
    try {
      const selectedDoctor = doctors.find(d => d.id === bookingData.doctorId)
      const newAppointment = await createAppointment({
        patientId: user.id,
        doctorId: bookingData.doctorId,
        doctorName: selectedDoctor?.full_name,
        date: bookingData.date,
        time: bookingData.time,
        mode: bookingData.mode,
        reason: bookingData.reason,
        status: 'pending'
      })
      
      setAppointments([newAppointment, ...appointments])
      toast.success('Appointment booked successfully!')
      setShowBookingModal(false)
      setBookingData({ doctorId: '', date: '', time: '', mode: 'online', reason: '' })
    } catch (error) {
      console.error('Error booking appointment:', error)
      toast.error('Failed to book appointment')
    } finally {
      setIsBooking(false)
    }
  }

  const timeSlots = [
    '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
    '12:00 PM', '12:30 PM', '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM',
    '04:00 PM', '04:30 PM', '05:00 PM', '05:30 PM'
  ]

  const filteredAppointments = appointments.filter(a => {
    if (filter === 'all') return true
    return a.status === filter
  })

  const upcomingCount = appointments.filter(a => ['pending', 'confirmed'].includes(a.status)).length
  const completedCount = appointments.filter(a => a.status === 'completed').length

  return (
    <>
    <DashboardLayout>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <motion.h1 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl font-bold text-white mb-2"
          >
            My Appointments
          </motion.h1>
          <p className="text-white/60">View and manage your appointments</p>
        </div>
        <Button 
          variant="primary" 
          onClick={() => setShowBookingModal(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          Book Appointment
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <GlassCard className="p-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary-500/20 flex items-center justify-center">
              <Calendar className="w-6 h-6 text-primary-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{upcomingCount}</p>
              <p className="text-sm text-white/60">Upcoming</p>
            </div>
          </div>
        </GlassCard>
        <GlassCard className="p-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-success/20 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{completedCount}</p>
              <p className="text-sm text-white/60">Completed</p>
            </div>
          </div>
        </GlassCard>
        <GlassCard className="p-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-accent-purple/20 flex items-center justify-center">
              <Calendar className="w-6 h-6 text-accent-purple" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{appointments.length}</p>
              <p className="text-sm text-white/60">Total</p>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {['all', 'pending', 'confirmed', 'completed', 'cancelled'].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap ${
              filter === status 
                ? 'bg-primary-500 text-white' 
                : 'bg-white/10 text-white/70 hover:bg-white/20'
            }`}
          >
            {status === 'all' ? 'All' : statusLabels[status]}
          </button>
        ))}
      </div>

      {/* Appointments List */}
      {isLoading ? (
        <div className="space-y-4">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : filteredAppointments.length === 0 ? (
        <GlassCard className="p-12 text-center">
          <Calendar className="w-16 h-16 text-white/30 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No appointments found</h3>
          <p className="text-white/60 mb-4">
            {filter === 'all' 
              ? "You haven't booked any appointments yet" 
              : `No ${filter} appointments`}
          </p>
          <Link to="/patient/doctors">
            <Button variant="primary">Find a Doctor</Button>
          </Link>
        </GlassCard>
      ) : (
        <div className="space-y-4">
          {filteredAppointments.map((appointment, index) => (
            <motion.div
              key={appointment.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <GlassCard className="p-6">
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  <Avatar name={appointment.doctor_name} size="lg" />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-semibold text-white">Dr. {appointment.doctor_name}</h3>
                        <p className="text-sm text-primary-400">{appointment.specialization}</p>
                      </div>
                      <Badge variant={statusColors[appointment.status]}>
                        {statusLabels[appointment.status]}
                      </Badge>
                    </div>
                    
                    <div className="flex flex-wrap gap-4 text-sm text-white/60">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(appointment.date).toLocaleDateString('en-US', { 
                          weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' 
                        })}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {appointment.time}
                      </div>
                      <div className="flex items-center gap-1">
                        {appointment.mode === 'online' ? (
                          <Video className="w-4 h-4" />
                        ) : (
                          <MapPin className="w-4 h-4" />
                        )}
                        {appointment.mode === 'online' ? 'Online' : 'Offline'}
                      </div>
                    </div>

                    {appointment.symptoms && (
                      <p className="mt-2 text-sm text-white/60">
                        <span className="font-medium">Symptoms:</span> {appointment.symptoms}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    {['pending', 'confirmed'].includes(appointment.status) && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleCancel(appointment.id)}
                        className="text-error hover:bg-error/10"
                      >
                        <X className="w-4 h-4 mr-1" />
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      )}
    </DashboardLayout>

    {/* Booking Modal - outside DashboardLayout */}
    {showBookingModal && (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={() => setShowBookingModal(false)} />
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl p-6" style={{ background: 'rgba(30,58,95,0.98)' }}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Book New Appointment</h2>
          <button onClick={() => setShowBookingModal(false)} className="p-2 hover:bg-white/10 rounded-lg">
            <X className="w-5 h-5 text-white/60" />
          </button>
        </div>
      <div className="space-y-4">
        {/* Select Doctor */}
        <div>
          <label className="block text-sm text-white/70 mb-2">Select Doctor *</label>
          <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
            {doctors.map(doctor => (
              <button
                key={doctor.id}
                onClick={() => setBookingData({ ...bookingData, doctorId: doctor.id })}
                className={`p-3 rounded-xl border text-left transition-colors ${
                  bookingData.doctorId === doctor.id 
                    ? 'border-primary bg-primary/10' 
                    : 'border-white/10 hover:border-white/30'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <Stethoscope className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-white text-sm">Dr. {doctor.full_name}</p>
                    <p className="text-xs text-white/50">{doctor.specialization}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Date */}
        <div>
          <label className="block text-sm text-white/70 mb-2">Select Date *</label>
          <input
            type="date"
            value={bookingData.date}
            onChange={(e) => setBookingData({ ...bookingData, date: e.target.value })}
            min={new Date().toISOString().split('T')[0]}
            className="w-full px-4 py-3 bg-white/10 border border-white/10 rounded-xl text-white"
          />
        </div>

        {/* Time */}
        <div>
          <label className="block text-sm text-white/70 mb-2">Select Time *</label>
          <div className="grid grid-cols-4 gap-2">
            {timeSlots.map(time => (
              <button
                key={time}
                onClick={() => setBookingData({ ...bookingData, time })}
                className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                  bookingData.time === time
                    ? 'bg-primary text-white'
                    : 'bg-white/10 text-white/70 hover:bg-white/20'
                }`}
              >
                {time}
              </button>
            ))}
          </div>
        </div>

        {/* Mode */}
        <div>
          <label className="block text-sm text-white/70 mb-2">Consultation Mode</label>
          <div className="flex gap-3">
            <button
              onClick={() => setBookingData({ ...bookingData, mode: 'online' })}
              className={`flex-1 p-3 rounded-xl border flex items-center justify-center gap-2 transition-colors ${
                bookingData.mode === 'online'
                  ? 'border-primary bg-primary/10'
                  : 'border-white/10 hover:border-white/30'
              }`}
            >
              <Video className="w-5 h-5 text-primary" />
              <span className="text-white">Video Call</span>
            </button>
            <button
              onClick={() => setBookingData({ ...bookingData, mode: 'offline' })}
              className={`flex-1 p-3 rounded-xl border flex items-center justify-center gap-2 transition-colors ${
                bookingData.mode === 'offline'
                  ? 'border-primary bg-primary/10'
                  : 'border-white/10 hover:border-white/30'
              }`}
            >
              <MapPin className="w-5 h-5 text-primary" />
              <span className="text-white">In-Person</span>
            </button>
          </div>
        </div>

        {/* Reason */}
        <div>
          <label className="block text-sm text-white/70 mb-2">Reason for Visit</label>
          <textarea
            value={bookingData.reason}
            onChange={(e) => setBookingData({ ...bookingData, reason: e.target.value })}
            placeholder="Describe your symptoms or reason for visit..."
            className="w-full h-24 px-4 py-3 bg-white/10 border border-white/10 rounded-xl text-white placeholder:text-white/40 resize-none"
          />
        </div>

        {/* Submit */}
        <div className="flex gap-3 pt-2">
          <Button 
            variant="ghost" 
            className="flex-1"
            onClick={() => setShowBookingModal(false)}
          >
            Cancel
          </Button>
          <Button 
            variant="primary" 
            className="flex-1"
            onClick={handleBookAppointment}
            isLoading={isBooking}
          >
            Book Appointment
          </Button>
        </div>
        </div>
        </div>
        </div>
    )}
    </>
  );
}

export default PatientAppointmentsPage
