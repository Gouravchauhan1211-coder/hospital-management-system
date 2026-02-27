import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { 
  ArrowLeft,
  Star,
  MapPin,
  Building,
  Clock,
  Calendar,
  Video,
  CheckCircle,
  AlertCircle,
  Loader2,
  CreditCard
} from 'lucide-react'
import toast from 'react-hot-toast'
import useAuthStore from '../../store/authStore'
import { getDoctorById, getDoctorReviews, createAppointment, getAvailableTimeSlots } from '../../services/api'
import { DashboardLayout } from '../../components/layout'
import { GlassCard, Badge, Avatar, Button } from '../../components/ui'
import PaymentModal from '../../components/payment/PaymentModal'

const PatientDoctorProfilePage = () => {
  const { doctorId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [doctor, setDoctor] = useState(null)
  const [reviews, setReviews] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [selectedMode, setSelectedMode] = useState('offline')
  const [symptoms, setSymptoms] = useState('')
  const [isBooking, setIsBooking] = useState(false)
  const [showBooking, setShowBooking] = useState(false)
  const [availableSlots, setAvailableSlots] = useState([])
  const [isLoadingSlots, setIsLoadingSlots] = useState(false)
  const [showPayment, setShowPayment] = useState(false)

  useEffect(() => {
    const fetchDoctor = async () => {
      try {
        const [doctorData, reviewsData] = await Promise.all([
          getDoctorById(doctorId),
          getDoctorReviews(doctorId)
        ])
        setDoctor(doctorData)
        setReviews(reviewsData || [])
      } catch (error) {
        console.error('Error fetching doctor:', error)
        toast.error('Failed to load doctor details')
      } finally {
        setIsLoading(false)
      }
    }
    fetchDoctor()
  }, [doctorId])

  // Fetch available slots when date changes
  useEffect(() => {
    const fetchAvailableSlots = async () => {
      if (!selectedDate || !doctorId) {
        setAvailableSlots([])
        return
      }
      
      setIsLoadingSlots(true)
      try {
        const slots = await getAvailableTimeSlots(doctorId, selectedDate)
        setAvailableSlots(slots)
        // Clear selected time if it's no longer available
        if (selectedTime && !slots.includes(selectedTime)) {
          setSelectedTime('')
        }
      } catch (error) {
        console.error('Error fetching available slots:', error)
        setAvailableSlots([])
      } finally {
        setIsLoadingSlots(false)
      }
    }
    
    fetchAvailableSlots()
  }, [selectedDate, doctorId])

  // Generate next 7 days
  const availableDates = Array.from({ length: 7 }, (_, i) => {
    const date = new Date()
    date.setDate(date.getDate() + i)
    return date.toISOString().split('T')[0]
  })

  const handleBookAppointment = async () => {
    if (!selectedDate || !selectedTime) {
      toast.error('Please select date and time')
      return
    }

    // Show payment modal
    setShowPayment(true)
  }

  const handlePaymentSuccess = async () => {
    setIsBooking(true)
    setShowPayment(false)
    
    try {
      const appointment = await createAppointment({
        patientId: user.id,
        patientName: user.fullName,
        doctorId: doctor.id,
        doctorName: doctor.full_name,
        specialization: doctor.specialization,
        date: selectedDate,
        time: selectedTime,
        mode: selectedMode,
        symptoms,
        amount: doctor.fee,
        paymentStatus: 'paid'
      })
      
      toast.success('Appointment booked successfully!', {
        icon: '🎉',
        duration: 5000
      })
      
      // Navigate to appointments page
      navigate('/patient/appointments')
    } catch (error) {
      console.error('Booking error:', error)
      toast.error(error.message || 'Failed to book appointment. Please try another time slot.', {
        icon: '❌',
        duration: 5000
      })
      // Refresh available slots
      if (selectedDate) {
        const slots = await getAvailableTimeSlots(doctorId, selectedDate)
        setAvailableSlots(slots)
      }
    } finally {
      setIsBooking(false)
    }
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
        </div>
      </DashboardLayout>
    )
  }

  if (!doctor) {
    return (
      <DashboardLayout>
        <GlassCard className="p-12 text-center">
          <h3 className="text-xl font-semibold text-white mb-2">Doctor not found</h3>
          <Link to="/patient/doctors">
            <Button variant="primary">Back to Doctors</Button>
          </Link>
        </GlassCard>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <Link to="/patient/doctors">
        <Button variant="ghost" className="mb-4 flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back to Doctors
        </Button>
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Doctor Info */}
        <div className="lg:col-span-2 space-y-6">
          <GlassCard className="p-6">
            <div className="flex flex-col md:flex-row gap-6">
              <Avatar name={doctor.full_name} src={doctor.avatar_url} size="xl" className="w-32 h-32" />
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-white mb-1">Dr. {doctor.full_name}</h1>
                <p className="text-lg text-primary-400 mb-2">{doctor.specialization}</p>
                
                <div className="flex flex-wrap gap-4 text-white/60 mb-4">
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                    <span>{doctor.rating || '0.0'} ({doctor.review_count || 0} reviews)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>{doctor.experience || 0} years experience</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    <span>{doctor.location || 'Location'}</span>
                  </div>
                </div>

                {doctor.verified && (
                  <Badge variant="success" className="flex items-center gap-1 w-fit">
                    <CheckCircle className="w-3 h-3" />
                    Verified Doctor
                  </Badge>
                )}
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-white mb-1">${doctor.fee || 0}</div>
                <div className="text-sm text-white/60">per consultation</div>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <h2 className="text-lg font-semibold text-white mb-4">About</h2>
            <p className="text-white/70">{doctor.bio || 'No bio available'}</p>
          </GlassCard>

          <GlassCard className="p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Reviews</h2>
            {reviews.length === 0 ? (
              <p className="text-white/60">No reviews yet</p>
            ) : (
              <div className="space-y-4">
                {reviews.slice(0, 5).map((review) => (
                  <div key={review.id} className="p-4 bg-white/5 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-white">{review.patient_name}</span>
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className={`w-4 h-4 ${i < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-white/20'}`} />
                        ))}
                      </div>
                    </div>
                    <p className="text-white/60 text-sm">{review.comment}</p>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        </div>

        {/* Booking Sidebar */}
        <div>
          <GlassCard className="p-6 sticky top-24">
            <h2 className="text-lg font-semibold text-white mb-4">Book Appointment</h2>
            
            {!showBooking ? (
              <Button variant="primary" className="w-full" onClick={() => setShowBooking(true)}>
                <Calendar className="w-4 h-4 mr-2" />
                Book Now
              </Button>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-white/70 mb-2">Select Date</label>
                  <div className="grid grid-cols-2 gap-2">
                    {availableDates.map((date) => (
                      <button
                        key={date}
                        onClick={() => { setSelectedDate(date); setSelectedTime(''); }}
                        className={`p-2 rounded-lg text-sm ${
                          selectedDate === date 
                            ? 'bg-primary-500 text-white' 
                            : 'bg-white/10 text-white/70 hover:bg-white/20'
                        }`}
                      >
                        {new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </button>
                    ))}
                  </div>
                </div>

                {selectedDate && (
                  <div>
                    <label className="block text-sm text-white/70 mb-2">
                      Select Time
                      {isLoadingSlots && <Loader2 className="w-4 h-4 inline ml-2 animate-spin" />}
                    </label>
                    {availableSlots.length === 0 && !isLoadingSlots ? (
                      <div className="p-4 bg-warning/10 border border-warning/20 rounded-lg">
                        <div className="flex items-center gap-2 text-warning">
                          <AlertCircle className="w-4 h-4" />
                          <span className="text-sm">No available slots for this date</span>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-2">
                        {availableSlots.map((time) => (
                          <button
                            key={time}
                            onClick={() => setSelectedTime(time)}
                            className={`p-2 rounded-lg text-sm transition-all ${
                              selectedTime === time 
                                ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30' 
                                : 'bg-white/10 text-white/70 hover:bg-white/20'
                            }`}
                          >
                            {time}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-sm text-white/70 mb-2">Consultation Mode</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedMode('offline')}
                      className={`flex-1 p-2 rounded-lg text-sm ${
                        selectedMode === 'offline' 
                          ? 'bg-primary-500 text-white' 
                          : 'bg-white/10 text-white/70 hover:bg-white/20'
                      }`}
                    >
                      Offline
                    </button>
                    <button
                      onClick={() => setSelectedMode('online')}
                      className={`flex-1 p-2 rounded-lg text-sm ${
                        selectedMode === 'online' 
                          ? 'bg-primary-500 text-white' 
                          : 'bg-white/10 text-white/70 hover:bg-white/20'
                      }`}
                    >
                      <Video className="w-4 h-4 inline mr-1" />
                      Online
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-white/70 mb-2">Describe your symptoms</label>
                  <textarea
                    value={symptoms}
                    onChange={(e) => setSymptoms(e.target.value)}
                    placeholder="Describe your symptoms..."
                    className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-primary-500"
                    rows={3}
                  />
                </div>

                <div className="pt-4 border-t border-white/10">
                  <div className="flex justify-between text-white mb-4">
                    <span>Consultation Fee</span>
                    <span className="font-bold">${doctor.fee || 0}</span>
                  </div>
                  <Button 
                    variant="primary" 
                    className="w-full"
                    onClick={handleBookAppointment}
                    disabled={isBooking || !selectedDate || !selectedTime}
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    {isBooking ? 'Booking...' : 'Proceed to Payment'}
                  </Button>
                </div>
              </div>
            )}
          </GlassCard>
        </div>
      </div>

      {/* Payment Modal */}
      <PaymentModal
        isOpen={showPayment}
        onClose={() => setShowPayment(false)}
        amount={doctor?.fee || 0}
        doctorName={`Dr. ${doctor?.full_name}`}
        appointmentDetails={`${selectedDate} at ${selectedTime} (${selectedMode})`}
        onPaymentSuccess={handlePaymentSuccess}
      />
    </DashboardLayout>
  )
}

export default PatientDoctorProfilePage
