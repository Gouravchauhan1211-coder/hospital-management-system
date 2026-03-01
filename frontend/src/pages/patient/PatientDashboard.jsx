import { useState, useEffect } from 'react'
import { isToday } from 'date-fns'
import { Loader2, AlertCircle } from 'lucide-react'
import useAuthStore from '../../store/authStore'
import { supabase } from '../../services/supabase'

// Components
import NotificationDrawer from '../../components/shared/NotificationDrawer'
import PatientHeader from '../../components/patient/PatientHeader'
import SearchBar from '../../components/patient/SearchBar'
import UpcomingAppointmentCard from '../../components/patient/UpcomingAppointmentCard'
import SpecialtiesSection from '../../components/patient/SpecialtiesSection'
import TopDoctorsSection from '../../components/patient/TopDoctorsSection'
import PatientBottomNav from '../../components/layout/PatientBottomNav'

const PatientDashboard = () => {
  const { user } = useAuthStore()

  // State
  const [profile, setProfile] = useState(null)
  const [appointment, setAppointment] = useState(null)
  const [queueInfo, setQueueInfo] = useState(null)
  const [topDoctors, setTopDoctors] = useState([])
  const [notifications, setNotifications] = useState([])
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isDoctorsLoading, setIsDoctorsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let queueSubscription = null

    const fetchDashboardData = async () => {
      try {
        if (!user?.id) return

        // Parallel Fetch Profile and Top Doctors
        const [profileRes, doctorsRes, notesRes] = await Promise.all([
          supabase.from('profiles').select('*').eq('id', user.id).single(),
          supabase.from('doctors').select('*').order('rating', { ascending: false }).limit(5),
          supabase.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(3)
        ])

        if (profileRes.error) throw profileRes.error
        setProfile(profileRes.data)

        if (doctorsRes.data) setTopDoctors(doctorsRes.data)
        setIsDoctorsLoading(false)

        if (notesRes.data) setNotifications(notesRes.data)

        // Fetch Upcoming Appointment (don't block the rest)
        fetchUpcomingAppointment(user.id, profileRes.data)

      } catch (err) {
        if (err.code !== 'PGRST116') {
          console.error('Error fetching dashboard data:', err)
          setError('Failed to load dashboard data')
        }
      } finally {
        setIsLoading(false)
      }
    }

    const fetchUpcomingAppointment = async (userId, profileData) => {
      try {
        const { data: aptData } = await supabase
          .from('appointments')
          .select(`*, doctor:doctors(*)`)
          .eq('patient_id', userId)
          .in('status', ['pending', 'confirmed'])
          .order('date', { ascending: true })
          .limit(1)
          .single()

        if (aptData) {
          setAppointment(aptData)
          const isAptToday = new Date(aptData.date).toDateString() === new Date().toDateString()
          if (isAptToday) {
            await fetchQueueInfo(aptData.doctor_id, null, aptData.patient_name)
            queueSubscription = subscribeToQueue(aptData.doctor_id)
          }
        } else if (profileData?.full_name) {
          // Check walk-in queue
          const { data: qData } = await supabase
            .from('walk_in_queue')
            .select('*')
            .eq('patient_name', profileData.full_name)
            .in('status', ['waiting', 'in-progress'])
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

          if (qData) {
            setQueueInfo({ ...qData, isWalkIn: true })
            if (qData.doctor_id) {
              await fetchQueueInfo(qData.doctor_id, qData.created_at)
              queueSubscription = subscribeToQueue(qData.doctor_id)
            }
          }
        }
      } catch (err) {
        console.error('Error fetching appointment:', err)
      }
    }

    const subscribeToQueue = (doctorId) => {
      return supabase
        .channel('queue_changes')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'walk_in_queue',
          filter: `doctor_id=eq.${doctorId}`
        }, () => {
          fetchDashboardData()
        })
        .subscribe()
    }

    const fetchQueueInfo = async (doctorId, queueCreatedAt, patientName) => {
      const { data: waitingData } = await supabase
        .from('walk_in_queue')
        .select('*')
        .eq('doctor_id', doctorId)
        .eq('status', 'waiting')
        .order('created_at', { ascending: true })

      if (waitingData && waitingData.length > 0) {
        let patientsAhead = 0
        if (queueCreatedAt) {
          patientsAhead = waitingData.filter(q => new Date(q.created_at) < new Date(queueCreatedAt)).length
        } else if (patientName) {
          const myIndex = waitingData.findIndex(q => q.patient_name === patientName)
          patientsAhead = myIndex >= 0 ? myIndex : waitingData.length
        }

        const AVG_CONSULT_MINUTES = 15
        setQueueInfo(prev => ({
          ...prev,
          patientsAhead,
          estimatedWait: patientsAhead * AVG_CONSULT_MINUTES
        }))
      }
    }

    fetchDashboardData()

    return () => {
      if (queueSubscription) supabase.removeChannel(queueSubscription)
    }
  }, [user?.id])

  const formatAppointmentDate = (dateStr) => {
    try {
      const d = new Date(dateStr)
      if (isToday(d)) return 'Today'
      return new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'short', day: 'numeric' }).format(d)
    } catch { return dateStr }
  }

  const statusConfig = {
    pending: { label: 'Pending', color: 'bg-yellow-400/20 text-yellow-600' },
    confirmed: { label: 'Confirmed', color: 'bg-green-400/20 text-green-600' },
    cancelled: { label: 'Cancelled', color: 'bg-red-400/20 text-red-600' },
    completed: { label: 'Completed', color: 'bg-gray-400/20 text-gray-600' },
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-6 rounded-2xl shadow-sm text-center border border-gray-100 max-w-xs">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-gray-800 mb-1">Oops, something went wrong</h2>
          <p className="text-gray-500 text-sm">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans max-w-md mx-auto relative pb-24 px-4 pt-4">
      <PatientHeader
        profile={profile}
        onNotificationClick={() => setIsNotificationsOpen(true)}
        hasNotifications={notifications.length > 0}
      />

      <SearchBar />

      <section className="mb-6">
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-base font-bold text-gray-900">Upcoming Visit</h2>
        </div>
        <UpcomingAppointmentCard
          appointment={appointment}
          queueInfo={queueInfo}
          formatAppointmentDate={formatAppointmentDate}
          statusConfig={statusConfig}
        />
      </section>

      <SpecialtiesSection />

      <TopDoctorsSection
        doctors={topDoctors}
        isLoading={isDoctorsLoading}
      />

      <PatientBottomNav />

      <NotificationDrawer
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        notifications={notifications}
      />
    </div>
  )
}

export default PatientDashboard
