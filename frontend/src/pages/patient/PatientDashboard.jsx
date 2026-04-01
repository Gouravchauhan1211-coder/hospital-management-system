import { useState, useEffect } from 'react'
import { isToday } from 'date-fns'
import { Loader2, AlertCircle } from 'lucide-react'
import useAuthStore from '../../store/authStore'
import { supabase } from '../../services/supabase'
import { getPatientAppointmentPosition, getPatientWalkInQueueDetails, generateAppointmentQueueToken } from '../../services/queueApi'

// Components
import NotificationDrawer from '../../components/shared/NotificationDrawer'
import PatientHeader from '../../components/patient/PatientHeader'
import SearchBar from '../../components/patient/SearchBar'
import LiveQueueCard from '../../components/patient/LiveQueueCard'
import SpecialtiesSection from '../../components/patient/SpecialtiesSection'
import TopDoctorsSection from '../../components/patient/TopDoctorsSection'
import PatientBottomNav from '../../components/layout/PatientBottomNav'

const PatientDashboard = () => {
  const { user } = useAuthStore()

  // State
  const [profile, setProfile] = useState(null)
  const [appointment, setAppointment] = useState(null)
  const [queueDetails, setQueueDetails] = useState(null)
  const [isQueueLoading, setIsQueueLoading] = useState(true)
  const [currentDoctorId, setCurrentDoctorId] = useState(null)
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

        // Fetch queue info (don't block the rest)
        fetchQueueInfo(user.id, profileRes.data)

      } catch (err) {
        if (err.code !== 'PGRST116') {
          console.error('Error fetching dashboard data:', err)
          setError('Failed to load dashboard data')
        }
      } finally {
        setIsLoading(false)
      }
    }

    const fetchQueueInfo = async (userId, profileData) => {
      setIsQueueLoading(true)
      try {
        const today = new Date().toISOString().split('T')[0]
        let foundQueue = false

        // First check for appointment queue
        const { data: aptDataArray } = await supabase
          .from('appointments')
          .select('*')
          .eq('patient_id', userId)
          .eq('date', new Date().toISOString().split('T')[0])
          .in('status', ['pending', 'accepted', 'confirmed'])
          .order('time', { ascending: true })
          .limit(1)
        
        // Get first appointment from array
        const aptData = aptDataArray?.[0]

        // Filter for valid appointment statuses on client side
        const validStatuses = ['pending', 'accepted', 'confirmed']
        // Query already filters by date and status - no need for extra checks
        const isValidApt = true
        
        if (isValidApt && aptData) {
          setAppointment(aptData)
          const isConfirmed = aptData?.status === 'confirmed' || aptData?.status === 'accepted' || aptData?.status === 'pending'
          
          if (isConfirmed) {
            // Get queue position for appointment
            const result = await getPatientAppointmentPosition(userId, aptData.doctor_id, today)
            
            // Handle queue position result
            if (!result.success) {
              console.error('Error getting appointment position:', result.error)
              // Still show the appointment, but queue details will show as calculating
            } else if (!result.inQueue && aptData.id) {
              // No queue entry exists but appointment is confirmed - try to create one
              // Still set up subscription for appointment status changes and check-in
              setCurrentDoctorId(aptData.doctor_id)
              queueSubscription = subscribeToQueue(aptData.doctor_id)
              
              try {
                const tokenResult = await generateAppointmentQueueToken(
                  aptData.id,
                  aptData.doctor_id,
                  userId
                )
                if (tokenResult.success) {
                  // Re-fetch queue details after creating token
                  const retryResult = await getPatientAppointmentPosition(userId, aptData.doctor_id, today)
                  if (retryResult.success && retryResult.inQueue && retryResult.queueDetails) {
                    setQueueDetails(retryResult.queueDetails)
                    foundQueue = true
                  }
                }
              } catch (err) {
                console.error('Error creating queue token:', err)
              }
            } else if (result.inQueue && result.queueDetails) {
              setQueueDetails(result.queueDetails)
              setCurrentDoctorId(aptData.doctor_id)
              // Subscribe to real-time updates
              queueSubscription = subscribeToQueue(aptData.doctor_id)
              foundQueue = true
            }
          }
        }

        // If no appointment queue found, check walk-in queue
        if (!foundQueue && profileData?.full_name) {
          const walkInResult = await getPatientWalkInQueueDetails(userId, profileData.full_name)
          if (walkInResult.success && walkInResult.inQueue && walkInResult.queueDetails) {
            setQueueDetails(walkInResult.queueDetails)
            if (walkInResult.queueDetails.doctorName && walkInResult.queueDetails.doctorName !== 'Unassigned') {
              // Try to get doctor ID for subscription
              const { data: doctorData } = await supabase
                .from('profiles')
                .select('id')
                .eq('full_name', walkInResult.queueDetails.doctorName)
                .single()
              if (doctorData?.id) {
                setCurrentDoctorId(doctorData.id)
                queueSubscription = subscribeToQueue(doctorData.id)
              }
            }
          }
        }
      } catch (err) {
        console.error('Error fetching queue info:', err)
      } finally {
        setIsQueueLoading(false)
      }
    }

    const subscribeToQueue = (doctorId, patientId = user?.id) => {
      // Subscribe to both walk_in_queue and appointment_queue for real-time updates
      // Also subscribe to appointments for status changes
      const channel = supabase.channel('queue_changes')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: patientId ? `patient_id=eq.${patientId}` : null
        }, () => {
          // Re-fetch queue info on appointment changes
          if (user?.id) {
            supabase.from('profiles').select('full_name').eq('id', user.id).single()
              .then(({ data }) => {
                fetchQueueInfo(user.id, data)
              })
          }
        })
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'walk_in_queue',
          filter: `doctor_id=eq.${doctorId}`
        }, () => {
          // Re-fetch queue info on changes
          if (user?.id) {
            supabase.from('profiles').select('full_name').eq('id', user.id).single()
              .then(({ data }) => {
                fetchQueueInfo(user.id, data)
              })
          }
        })
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'appointment_queue',
          filter: `doctor_id=eq.${doctorId}`
        }, () => {
          // Re-fetch queue info on changes
          if (user?.id) {
            supabase.from('profiles').select('full_name').eq('id', user.id).single()
              .then(({ data }) => {
                fetchQueueInfo(user.id, data)
              })
          }
        })
        .subscribe()
      
      return channel
    }

    fetchDashboardData()

    return () => {
      if (queueSubscription) supabase.removeChannel(queueSubscription)
    }
  }, [user?.id, currentDoctorId])

// Status config for appointments (kept for reference)
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

      {/* Live Queue Section - Today's Appointment */}
      <section className="mb-6">
        {appointment && (appointment.status === 'confirmed' || appointment.status === 'accepted' || appointment.status === 'pending') ? (
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            {/* Header */}
            <div className="flex justify-between items-start mb-6">
              <div className="flex-1">
                <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-1">Today's Appointment</p>
                <h2 className="font-bold text-xl text-gray-900">Dr. {appointment.doctor_name || 'Doctor'}</h2>
                <p className="text-sm text-gray-500 font-medium">{appointment.specialization || 'General Medicine'}</p>
                {/* Status Badge */}
                <div className="mt-2">
                  {appointment.status === 'confirmed' && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      ✓ Confirmed
                    </span>
                  )}
                  {appointment.status === 'accepted' && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      ✓ Accepted
                    </span>
                  )}
                  {appointment.status === 'pending' && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      ⏳ Pending Approval
                    </span>
                  )}
                </div>
              </div>
              {appointment.doctor_avatar ? (
                <img 
                  alt="Doctor" 
                  className="w-14 h-14 rounded-2xl object-cover ring-4 ring-blue-500/5" 
                  src={appointment.doctor_avatar} 
                />
              ) : (
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl">
                  {appointment.doctor_name?.charAt(0) || 'D'}
                </div>
              )}
            </div>
            
            {/* Appointment Info Grid */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-50 p-4 rounded-2xl">
                <p className="text-xs text-gray-500 font-semibold mb-1">Scheduled Time</p>
                <p className="text-lg font-bold text-gray-900">{appointment.time || '--:--'}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-2xl">
                <p className="text-xs text-gray-500 font-semibold mb-1">Est. Consultation</p>
                <p className="text-lg font-bold text-gray-900">
                  {appointment.status === 'pending' ? (
                    <span className="text-yellow-600">Pending</span>
                  ) : queueDetails?.estimatedWaitTime ? (
                    `${queueDetails.estimatedWaitTime} min`
                  ) : (
                    'Calculating...'
                  )}
                </p>
              </div>
            </div>
            
            {/* Queue Visualization */}
            {queueDetails && (
              <div className="mb-6">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 bg-teal-500 rounded-full flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                      </svg>
                    </div>
                    <p className="text-sm font-bold text-gray-900">{queueDetails.patientsAhead || 0} Patients Ahead</p>
                  </div>
                  <p className="text-xs font-semibold text-teal-600 bg-teal-50 px-3 py-1 rounded-full">Your turn is coming soon</p>
                </div>
                
                {/* Token Flow */}
                <div className="flex justify-between items-center gap-2 mb-4">
                  {/* Previous tokens */}
                  {queueDetails.currentToken && (
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-10 h-10 rounded-full bg-teal-500 flex items-center justify-center text-white text-xs font-bold shadow-lg">{queueDetails.currentToken.replace('A', '')}</div>
                      <svg className="w-4 h-4 text-teal-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                    </div>
                  )}
                  
                  <div className="flex-1 h-0.5 bg-teal-200"></div>
                  
                  {/* Next token */}
                  {queueDetails.nextToken && (
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-10 h-10 rounded-full bg-teal-500 flex items-center justify-center text-white text-xs font-bold shadow-lg">{queueDetails.nextToken.replace('A', '')}</div>
                      <svg className="w-4 h-4 text-teal-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                    </div>
                  )}
                  
                  <div className="flex-1 h-0.5 bg-gray-200"></div>
                  
                  {/* Your token */}
                  <div className="flex flex-col items-center gap-1">
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-black ring-4 ring-blue-500/20">{queueDetails.tokenNumber?.replace('A', '') || '--'}</div>
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center border-2 border-white">
                        <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                      </div>
                    </div>
                    <p className="text-xs font-black text-blue-600">YOU</p>
                  </div>
                </div>
                
                {/* Progress Bar Overall */}
                <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-gradient-to-r from-teal-500 to-blue-500 h-full rounded-full" style={{ width: `${Math.max(10, 100 - (queueDetails.yourPosition || 1) * 20)}%` }}></div>
                </div>
              </div>
            )}
            
            {/* Waiting Time Box */}
            <div className="bg-blue-50 rounded-2xl p-4 flex items-center justify-between border border-blue-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-semibold text-blue-800">
                    {queueDetails?.status === 'appointment-not-checked-in' ? 'Appointment Time' : 
                     queueDetails?.hasAppointment ? 'Appointment at ' + (queueDetails.appointmentTime || '--') : 'Estimated Waiting Time'}
                  </p>
                  <p className="text-lg font-extrabold text-blue-600">
                    {appointment?.status === 'pending' ? (
                      <span className="text-yellow-600">Waiting for approval</span>
                    ) : queueDetails?.status === 'appointment-not-checked-in' ? (
                      <span className="text-green-600">
                        {queueDetails.timeUntilAppointment > 0 
                          ? `In ${queueDetails.timeUntilAppointment} min` 
                          : 'Now'}
                      </span>
                    ) : queueDetails?.estimatedWaitTime !== undefined && queueDetails?.estimatedWaitTime !== null && isFinite(queueDetails.estimatedWaitTime) ? (
                      <span>
                        {queueDetails.estimatedWaitTime} min
                        {queueDetails.estimatedStartTime && queueDetails.estimatedStartTime !== '--' && (
                          <span className="text-sm font-normal text-blue-400 ml-1">
                            (~{queueDetails.estimatedStartTime})
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="text-gray-500">Calculating...</span>
                    )}
                  </p>
                </div>
              </div>
              <svg className="w-5 h-5 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        ) : (
          <LiveQueueCard
            queueDetails={queueDetails}
            isLoading={isQueueLoading}
            appointment={appointment}
          />
        )}
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
