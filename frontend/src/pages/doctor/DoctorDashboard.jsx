import { useState, useEffect, useMemo, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Calendar,
  Users,
  DollarSign,
  Clock,
  ArrowRight,
  Star,
  CheckCircle,
  XCircle,
  Radio,
  UserPlus,
  User,
  Timer,
  Play,
  Pause,
  Square,
  AlertTriangle
} from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import useAuthStore from '../../store/authStore'
import { supabase } from '../../services/supabase'
import { getAppointments, getDoctorEarnings, updateAppointment, getWalkInQueue, getAppointmentQueue, updateAppointmentQueueStatus } from '../../services/api'
import { callPatient, callPatientAppointment, completeConsultation, startConsultation } from '../../services/queueApi'
import { getDoctorAppointmentQueue, calculateAverageConsultationTime } from '../../services/queueApi'
import { useDoctorAppointments, useWalkInQueue } from '../../hooks/useRealtimeSubscription'
import { usePriorityQueue } from '../../hooks/usePriorityQueue'
import { calculatePriorityScore, QUEUE_STATUS, getCurrentIST, getMinutesBetween } from '../../services/queueEngine'
import { DashboardLayout } from '../../components/layout'
import { GlassCard, Badge, Avatar, Button } from '../../components/ui'
import { StatCard, EmptyState } from '../../components/shared'
import { StatCardSkeleton, CardSkeleton } from '../../components/ui/Skeleton'
import { ActiveQueueMonitor } from '../../components/doctor'

const DoctorDashboard = () => {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const userName = user?.fullName || user?.email?.split('@')[0] || 'Doctor'
  const [isLoading, setIsLoading] = useState(true)
  const [queueStatus, setQueueStatus] = useState('idle')
  const [currentPatient, setCurrentPatient] = useState(null)
  const [nextPatient, setNextPatient] = useState(null)
  const [queueStats, setQueueStats] = useState({
    patientsWaiting: 0,
    avgConsultTime: 15,
    estWait: 0,
    completed: 0
  })

  const [pendingAppointments, setPendingAppointments] = useState([])

  const [earnings, setEarnings] = useState({
    totalEarnings: 0,
    thisMonth: 0,
    pendingPayout: 0,
  })

  // Use real-time subscriptions for appointments
  const {
    data: appointments,
    isSubscribed: isAppointmentsSubscribed,
    setData: setAppointments
  } = useDoctorAppointments(user?.id)

  // Use real-time subscription for walk-in queue
  const { data: walkInQueue } = useWalkInQueue(user?.id)

  // Priority Queue with scoring (for advanced queue management)
  const {
    queue: priorityQueue,
    queueMetrics,
    changePriority,
    movePatientUp,
    movePatientDown
  } = usePriorityQueue(user?.id, {
    includeWalkIns: true,
    includeAppointments: true,
    autoRefresh: true,
    refreshInterval: 30000
  })

  // Calculate stats from real-time data
  const stats = useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd')
    const validStatuses = ['pending', 'accepted', 'confirmed']
    const todayAppointments = appointments?.filter(a => a.date === today && validStatuses.includes(a.status)) || []
    const uniquePatients = [...new Set(appointments?.filter(a => validStatuses.includes(a.status)).map(a => a.patient_id))].length

    return {
      today: todayAppointments.length,
      week: appointments?.length || 0,
      patients: uniquePatients,
      rating: user?.rating || 0,
      waiting: walkInQueue?.filter(w => w.status === 'waiting').length || 0,
    }
  }, [appointments, walkInQueue, user?.rating])

  // Fetch earnings separately (not real-time)
  useEffect(() => {
    const fetchEarnings = async () => {
      if (!user?.id) return

      try {
        const earningsData = await getDoctorEarnings(user.id)
        setEarnings(earningsData || { totalEarnings: 0, thisMonth: 0, pendingPayout: 0 })
      } catch (e) {
        setEarnings({ totalEarnings: 0, thisMonth: 0, pendingPayout: 0 })
      } finally {
        setIsLoading(false)
      }
    }

    fetchEarnings()
  }, [user?.id])

  // Fetch queue data - extracted for reuse in handlers
  const fetchQueue = useCallback(async () => {
    if (!user?.id) return

    try {
      const today = new Date().toISOString().split('T')[0]
      
      // Get appointment queue
      const result = await getDoctorAppointmentQueue(user.id, today)
      
      if (result.success && result.queue) {
        // Find current patient (in-progress)
        const inProgress = result.queue.find(p => p.status === 'in-progress')
        
        // Find next patient (first waiting)
        const waiting = result.queue.find(p => p.status === 'waiting')
        
        // Get patient details
        if (inProgress) {
          const { data: patientData } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', inProgress.patient_id)
            .single()
          
          const { data: appointmentData } = await supabase
            .from('appointments')
            .select('patient_name, symptoms')
            .eq('id', inProgress.appointment_id)
            .single()
          
          setCurrentPatient({
            ...inProgress,
            patientName: patientData?.full_name || appointmentData?.patient_name || 'Patient',
            symptoms: appointmentData?.symptoms || ''
          })
          setQueueStatus('active')
        } else {
          setCurrentPatient(null)
        }
        
        if (waiting) {
          const { data: patientData } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', waiting.patient_id)
            .single()
          
          const { data: appointmentData } = await supabase
            .from('appointments')
            .select('patient_name, symptoms')
            .eq('id', waiting.appointment_id)
            .single()
          
          setNextPatient({
            ...waiting,
            patientName: patientData?.full_name || appointmentData?.patient_name || 'Patient',
            symptoms: appointmentData?.symptoms || ''
          })
        } else {
          setNextPatient(null)
        }
        
        // Calculate stats
        const waitingCount = result.queue.filter(p => p.status === 'waiting').length
        const completedCount = result.stats?.completed || 0
        const avgTime = await calculateAverageConsultationTime(user.id)
        
        setQueueStats({
          patientsWaiting: waitingCount,
          avgConsultTime: avgTime,
          estWait: waitingCount * avgTime,
          completed: completedCount
        })
      }
    } catch (error) {
      console.error('Error fetching queue data:', error)
    }
  }, [user?.id])

  // Set up polling interval
  useEffect(() => {
    fetchQueue()
    const interval = setInterval(fetchQueue, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [fetchQueue])

  // Schedule - only pending appointments (for accept/reject)
  const pendingAppointmentsForQueue = useMemo(() => {
    // Get pending appointments from today and future dates
    const today = format(new Date(), 'yyyy-MM-dd')
    return appointments
      ?.filter(a => a.status === 'pending' && a.date >= today)
      .slice(0, 10) || []
  }, [appointments])

  // Live Queue - confirmed/accepted appointments for today
  const liveQueueAppointments = useMemo(() => {
    const confirmedStatuses = ['confirmed', 'accepted']
    return appointments
      ?.filter(a => a.date === format(new Date(), 'yyyy-MM-dd') && confirmedStatuses.includes(a.status))
      .slice(0, 10) || []
  }, [appointments])

  // Legacy variable for backward compatibility
  const todayAppointments = pendingAppointmentsForQueue

  // Handle view full queue
  const handleViewFullQueue = () => {
    navigate('/doctor/appointments')
  }

  // Handle view appointment details
  const handleViewAppointment = (appointment) => {
    navigate(`/doctor/appointments?id=${appointment.id}`)
  }

  const handleUpdateStatus = async (appointmentId, status) => {
    try {
      await updateAppointment(appointmentId, { status })
      toast.success(`Appointment ${status}`)
    } catch (error) {
      toast.error('Failed to update appointment')
    }
  }

  // Handle calling the next patient
  const handleCallNextPatient = async () => {
    if (!nextPatient || !user?.id) return
    
    try {
      await updateAppointmentQueueStatus(nextPatient.id, 'in-progress')
      toast.success('Patient called')
      // Refresh queue data
      await fetchQueue()
    } catch (error) {
      toast.error('Failed to call patient')
    }
  }

  // Handle completing consultation
  const handleCompleteConsultation = async () => {
    if (!currentPatient || !user?.id) return
    
    try {
      await updateAppointmentQueueStatus(currentPatient.id, 'completed')
      // Update appointment status
      await updateAppointment(currentPatient.appointment_id, { status: 'completed' })
      toast.success('Consultation completed')
      // Refresh queue data
      await fetchQueue()
    } catch (error) {
      toast.error('Failed to complete consultation')
    }
  }

  // Handle skipping patient
  const handleSkipPatient = async () => {
    if (!currentPatient || !user?.id) return
    
    try {
      // Move current patient to end of queue
      const { error } = await supabase
        .from('appointment_queue')
        .update({ status: 'waiting' })
        .eq('id', currentPatient.id)
      
      if (error) throw error
      toast.success('Patient skipped')
      // Refresh queue data
      await fetchQueue()
    } catch (error) {
      toast.error('Failed to skip patient')
    }
  }

  // Handle start session button - call the next patient
  const handleStartSession = async () => {
    if (!nextPatient || !user?.id) {
      toast.error('No patient in queue to start')
      return
    }
    
    try {
      // Call the next patient based on whether it's a walk-in or appointment
      if (nextPatient.appointment_id) {
        await callPatientAppointment(nextPatient.id)
      } else if (nextPatient.token_id) {
        await callPatient(nextPatient.token_id)
      }
      toast.success('Session started - patient called')
      await fetchQueue()
    } catch (error) {
      console.error('Error starting session:', error)
      toast.error('Failed to start session')
    }
  }

  // Handle pause session button - set current patient back to waiting
  const handlePauseSession = async () => {
    if (!currentPatient || !user?.id) {
      toast.error('No active consultation to pause')
      return
    }
    
    try {
      await updateAppointmentQueueStatus(currentPatient.id, 'waiting')
      toast.success('Consultation paused - patient moved back to queue')
      await fetchQueue()
    } catch (error) {
      console.error('Error pausing session:', error)
      toast.error('Failed to pause consultation')
    }
  }

  // Handle end session button - complete current patient if exists
  const handleEndSession = async () => {
    if (!currentPatient || !user?.id) {
      toast.error('No active consultation to end')
      return
    }
    
    try {
      await updateAppointmentQueueStatus(currentPatient.id, 'completed')
      await updateAppointment(currentPatient.appointment_id, { status: 'completed' })
      toast.success('Session ended - consultation completed')
      await fetchQueue()
    } catch (error) {
      console.error('Error ending session:', error)
      toast.error('Failed to end session')
    }
  }

  // Handle emergency button - prioritize current patient
  const handleEmergency = async () => {
    if (!currentPatient || !user?.id) {
      toast.error('No patient to mark as emergency')
      return
    }
    
    try {
      // Add emergency priority by updating the queue entry
      await supabase
        .from('appointment_queue')
        .update({ priority: 'emergency', updated_at: new Date().toISOString() })
        .eq('id', currentPatient.id)
      
      toast.success('Patient marked as emergency - prioritized')
      await fetchQueue()
    } catch (error) {
      console.error('Error handling emergency:', error)
      toast.error('Failed to mark emergency')
    }
  }

  return (
    <DashboardLayout>
      {/* Mobile-Friendly Header Area */}
      <div className="mb-6 mt-2">
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-bold text-gray-900 mb-1"
        >
          Hi, Dr. {userName?.split(' ').pop() || 'Doctor'}
        </motion.h1>

        {/* Real-time indicator tucked concisely under title */}
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${queueStatus === 'active' ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />
          <p className="text-gray-500 text-sm">
            {queueStatus === 'active' ? 'Live Session Active' : 'Ready to start'}
          </p>
        </div>
      </div>

      {/* LIVE QUEUE SECTION - New Design */}
      <main className="space-y-6">
        {/* Current Patient Panel */}
        <section className="relative">
          <div className="bg-white rounded-[2rem] p-6 shadow-lg border border-gray-100 overflow-hidden relative">
            <div className="absolute -z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-teal-50 blur-[80px] rounded-full"></div>
            <div className="flex justify-between items-start mb-6">
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-teal-600 mb-1 block">Currently Consulting</span>
                <h1 className="text-2xl font-extrabold text-gray-900">
                  {currentPatient?.patientName || 'No Patient'}
                </h1>
                <p className="text-gray-500 font-medium text-sm flex items-center gap-2">
                  {currentPatient ? (
                    <>
                      <span className="bg-gray-100 px-2 py-0.5 rounded text-xs font-bold">
                        A{currentPatient.queue_number || '0'}
                      </span>
                      • {currentPatient.symptoms || 'General Consultation'}
                    </>
                  ) : (
                    'Waiting for next patient'
                  )}
                </p>
              </div>
              {currentPatient && (
                <div className="flex items-center gap-1 bg-teal-50 text-teal-700 font-bold px-3 py-1.5 rounded-full text-sm">
                  <Timer className="w-4 h-4" />
                  Start
                </div>
              )}
            </div>
            <div className="space-y-4">
              {currentPatient ? (
                <button 
                  onClick={handleCompleteConsultation}
                  className="w-full py-4 bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-2xl font-bold text-lg shadow-lg active:scale-95 transition-transform"
                >
                  Complete Consultation
                </button>
              ) : (
                <button 
                  onClick={handleCallNextPatient}
                  disabled={!nextPatient}
                  className="w-full py-4 bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-2xl font-bold text-lg shadow-lg active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Start Consulting
                </button>
              )}
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={handleSkipPatient}
                  disabled={!currentPatient}
                  className="flex items-center justify-center gap-2 py-3 bg-gray-50 text-gray-600 rounded-xl font-semibold text-sm hover:bg-gray-100 transition-colors disabled:opacity-50"
                >
                  <Clock className="w-4 h-4" />
                  Skip
                </button>
                <button 
                  onClick={handleEmergency}
                  disabled={!currentPatient}
                  className="flex items-center justify-center gap-2 py-3 bg-red-50 text-red-600 rounded-xl font-semibold text-sm hover:bg-red-100 transition-colors disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-sm">report</span>
                  Emergency
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Next Up Section - With Priority Scoring */}
        <section>
          <div className="flex justify-between items-center mb-3 px-1">
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Next in Queue</h2>
            <div className="flex items-center gap-2">
              {/* Priority Score Badge for next patient */}
              {priorityQueue && priorityQueue.length > 0 && (
                <span className="text-xs font-semibold text-purple-600 bg-purple-50 px-2 py-1 rounded-full flex items-center gap-1">
                  <Star className="w-3 h-3" />
                  Priority Queue Active
                </span>
              )}
              <span className="text-xs font-semibold text-teal-600">{queueStats.estWait} min wait</span>
            </div>
          </div>
          <div className="bg-white rounded-3xl p-5 flex items-center justify-between shadow-sm border border-gray-100">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-600">
                <User className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-900">{nextPatient?.patientName || 'No one waiting'}</span>
                  {/* Priority Badge */}
                  {nextPatient?.priority === 'emergency' && (
                    <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full font-bold">EMERGENCY</span>
                  )}
                  {nextPatient?.priority === 'urgent' && (
                    <span className="text-xs bg-orange-500 text-white px-2 py-0.5 rounded-full font-bold">URGENT</span>
                  )}
                  {nextPatient?.priority === 'vip' && (
                    <Star className="w-4 h-4 text-yellow-500 fill-current" />
                  )}
                </div>
                <p className="text-xs text-gray-500 font-medium">
                  {nextPatient ? (
                    <>
                      A{nextPatient.token_number || '0'} • {nextPatient.symptoms || 'New Consultation'}
                    </>
                  ) : (
                    'Queue is empty'
                  )}
                </p>
              </div>
            </div>
            {nextPatient && (
              <button 
                onClick={handleCallNextPatient}
                className="bg-blue-50 text-blue-700 px-4 py-2 rounded-xl font-bold text-xs hover:bg-blue-100 transition-colors"
              >
                Call Next
              </button>
            )}
          </div>
        </section>

        {/* Analytics Grid */}
        <section>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 p-4 rounded-3xl border border-gray-100">
              <Users className="w-5 h-5 text-teal-500 mb-2" />
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Patients Waiting</p>
              <p className="text-2xl font-black text-gray-900">{queueStats.patientsWaiting}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-3xl border border-gray-100">
              <Clock className="w-5 h-5 text-blue-500 mb-2" />
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Avg Consult</p>
              <p className="text-2xl font-black text-gray-900">{queueStats.avgConsultTime}<span className="text-xs font-bold text-gray-400 ml-1">m</span></p>
            </div>
            <div className="bg-gray-50 p-4 rounded-3xl border border-gray-100">
              <Timer className="w-5 h-5 text-orange-500 mb-2" />
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Est. Wait</p>
              <p className="text-2xl font-black text-gray-900">{queueStats.estWait}<span className="text-xs font-bold text-gray-400 ml-1">m</span></p>
            </div>
            <div className="bg-gray-50 p-4 rounded-3xl border border-gray-100">
              <CheckCircle className="w-5 h-5 text-green-500 mb-2" />
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Completed</p>
              <p className="text-2xl font-black text-gray-900">{queueStats.completed}</p>
            </div>
          </div>
        </section>

        {/* Queue Control */}
        <section className="pt-2">
          <div className="bg-gray-900 text-white rounded-3xl p-6 flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold uppercase tracking-widest opacity-70">Queue Control</span>
              <span className="flex items-center gap-1.5 text-[10px] bg-teal-500/20 text-teal-400 px-2 py-1 rounded-full font-bold">
                <span className="h-1.5 w-1.5 rounded-full bg-teal-400 animate-pulse"></span>
                LIVE SESSION
              </span>
            </div>
            <div className="flex justify-between gap-3">
              <button 
                onClick={handleStartSession}
                disabled={!nextPatient}
                className="flex-1 bg-white/10 hover:bg-white/20 py-3 rounded-2xl flex flex-col items-center gap-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Play className="w-5 h-5 text-white" />
                <span className="text-[10px] font-bold">Start</span>
              </button>
              <button 
                onClick={handlePauseSession}
                disabled={!currentPatient}
                className="flex-1 bg-white/10 hover:bg-white/20 py-3 rounded-2xl flex flex-col items-center gap-1 transition-all border border-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Pause className="w-5 h-5 text-white" />
                <span className="text-[10px] font-bold">Pause</span>
              </button>
              <button 
                onClick={handleEndSession}
                disabled={!currentPatient}
                className="flex-1 bg-red-500/20 hover:bg-red-500/30 py-3 rounded-2xl flex flex-col items-center gap-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Square className="w-5 h-5 text-red-400" />
                <span className="text-[10px] font-bold text-red-400">End</span>
              </button>
            </div>
          </div>
        </section>

        {/* Active Queue Monitor - Bottom Section */}
        <section>
          <ActiveQueueMonitor
            queueItems={liveQueueAppointments}
            pendingAppointments={pendingAppointmentsForQueue}
            onViewFullQueue={handleViewFullQueue}
            onViewAppointment={handleViewAppointment}
          />
        </section>
      </main>
    </DashboardLayout>
  )
}

export default DoctorDashboard

