import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Play,
  Pause,
  Square,
  UserPlus,
  Ticket,
  Bell,
  Star,
  AlertTriangle,
  Stethoscope,
  ChevronDown,
  Zap,
  Activity,
  Clock,
  Users,
  TrendingUp,
  Building2
} from 'lucide-react'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import useAuthStore from '../../store/authStore'
import { getDoctors } from '../../services/api'
import { getDoctorAppointmentQueue, callPatient, completeConsultation, cancelToken } from '../../services/queueApi'
import { usePriorityQueue } from '../../hooks/usePriorityQueue'
import { DashboardLayout } from '../../components/layout'
import { GlassCard, Button } from '../../components/ui'
import { PatientCheckIn } from '../../components/mediator'
import supabase from '../../services/supabase'

const MAX_CAPACITY = 60

// Priority configurations
const priorityConfig = {
  normal: { label: 'Normal', color: 'bg-slate-100 text-slate-700', tokenPrefix: 'A', tokenColor: 'bg-surface-container-high' },
  vip: { label: 'VIP', color: 'bg-amber-100 text-amber-700', tokenPrefix: 'V', tokenColor: 'bg-tertiary' },
  emergency: { label: 'Emergency', color: 'bg-red-100 text-red-700', tokenPrefix: 'E', tokenColor: 'bg-error' },
}

// Status configurations
const statusConfig = {
  waiting: { label: 'Waiting', color: 'text-slate-500', bgColor: 'bg-slate-100' },
  called: { label: 'Called', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  consulting: { label: 'Consulting', color: 'text-secondary', bgColor: 'bg-secondary-container' },
  completed: { label: 'Completed', color: 'text-green-600', bgColor: 'bg-green-100' },
  cancelled: { label: 'Cancelled', color: 'text-red-600', bgColor: 'bg-red-100' },
}

const MediatorDashboard = () => {
  const { user } = useAuthStore()
  const userName = user?.fullName || user?.email?.split('@')[0] || 'Mediator'

  // State
  const [isLoading, setIsLoading] = useState(true)
  const [queueEntries, setQueueEntries] = useState([])
  const [doctors, setDoctors] = useState([])
  const [appointments, setAppointments] = useState([])
  const [patients, setPatients] = useState([])
  // Session state with localStorage persistence
  const [sessionStatus, setSessionStatus] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('mediatorSessionStatus') || 'idle';
    }
    return 'idle';
  });
  
  // Track session start time for duration calculation
  const [sessionStartedAt, setSessionStartedAt] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('mediatorSessionStartedAt');
    }
    return null;
  });
  
  // Session duration display
  const [sessionDuration, setSessionDuration] = useState('00:00');
  
  // Handle session status change with localStorage persistence
  const handleSessionStatusChange = (newStatus) => {
    setSessionStatus(newStatus);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('mediatorSessionStatus', newStatus);
      } catch (e) {
        console.error('Error saving session status to localStorage:', e);
      }
    }
    
    // Track session start time
    if (newStatus === 'active' && sessionStatus !== 'active') {
      const now = new Date().toISOString();
      setSessionStartedAt(now);
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('mediatorSessionStartedAt', now);
        } catch (e) {
          console.error('Error saving session start time to localStorage:', e);
        }
      }
    }
  };
  
  // Update session duration every second when active
  useEffect(() => {
    if (sessionStatus !== 'active') {
      setSessionDuration('00:00');
      return;
    }
    
    const interval = setInterval(() => {
      if (sessionStartedAt) {
        const elapsed = Date.now() - new Date(sessionStartedAt).getTime();
        const minutes = Math.floor(elapsed / 60000);
        const seconds = Math.floor((elapsed % 60000) / 1000);
        setSessionDuration(
          `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        );
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [sessionStatus, sessionStartedAt]);
  
  // Form state
  const [newPatient, setNewPatient] = useState({
    name: '',
    doctorId: '',
    priority: 'normal'
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Fetch data
  useEffect(() => {
    fetchData()
    
    // Set up real-time subscription for queue updates
    const channel = supabase
      .channel('mediator-queue-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointment_queue' }, () => {
        fetchData()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const fetchData = async () => {
    try {
      setIsLoading(true)
      
      // Get today's date range in local timezone
      const today = new Date()
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
      const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)
      
      // Fetch appointment queue for today using supabase directly
      const startOfDay = new Date(todayStart.getTime() - todayStart.getTimezoneOffset() * 60000).toISOString()
      const endOfDay = new Date(todayEnd.getTime() - todayEnd.getTimezoneOffset() * 60000).toISOString()
      
      // Fetch queue entries
      const { data: queueData, error: queueError } = await supabase
        .from('appointment_queue')
        .select('*')
        .gte('created_at', startOfDay)
        .lt('created_at', endOfDay)
        .order('token_number', { ascending: true })
      
      if (queueError) {
        console.error('Error fetching queue:', queueError)
      }
      
      // Fetch all profiles to map patient and doctor names
      const { data: allProfiles } = await supabase
        .from('profiles')
        .select('id, full_name, role')
      
      const patientsMap = {}
      const doctorsMap = {}
      
      if (allProfiles) {
        allProfiles.forEach(p => {
          if (p.role === 'patient') {
            patientsMap[p.id] = p.full_name
          } else if (p.role === 'doctor') {
            doctorsMap[p.id] = p.full_name
          }
        })
      }
      
      // Map to expected format with patient and doctor names
      // Remove true duplicates: same patient_id + doctor_id + same day
      const seen = new Set()
      const seenPatientDoctor = new Set()
      const todayQueue = (queueData || [])
        .filter(entry => {
          // Skip if we've seen this ID already (true duplicates)
          if (seen.has(entry.id)) return false
          seen.add(entry.id)
          
          // Skip if same patient + doctor combo already exists (potential duplicates from multiple check-ins)
          if (entry.patient_id && entry.doctor_id) {
            const pdKey = `${entry.patient_id}-${entry.doctor_id}`
            if (seenPatientDoctor.has(pdKey)) return false
            seenPatientDoctor.add(pdKey)
          }
          
          return true
        })
        .map(entry => ({
          ...entry,
          patient_name: patientsMap[entry.patient_id] || entry.name || 'Patient',
          doctor_name: doctorsMap[entry.doctor_id] || null,
          token: String(entry.token_number),
          status: entry.status
        }))
      
      setQueueEntries(todayQueue)

      // Fetch doctors
      const doctorsData = await getDoctors({})
      setDoctors(doctorsData || [])

      // Fetch appointments for check-in (today and future)
      console.log('Fetching appointments...')
      const { data: appointmentsData, error: appointmentsError } = await supabase
        .from('appointments')
        .select('*')
        .in('status', ['pending', 'confirmed'])
        .order('date', { ascending: true })
      
      console.log('Appointments query result:', { appointmentsData, appointmentsError })
      setAppointments(appointmentsData || [])

      // Fetch patients/profiles
      const { data: patientsData } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'patient')
        .order('full_name', { ascending: true })
      setPatients(patientsData || [])
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Get current serving and next patient
  // Status values: 'waiting', 'in-progress', 'completed'
  const currentServing = queueEntries.find(e => e.status === 'in-progress')
  const nextPatient = queueEntries.find(e => e.status === 'waiting')
  const waitingCount = queueEntries.filter(e => e.status === 'waiting').length
  
  // Queue Command Center - aggregate stats
  const [commandCenterStats, setCommandCenterStats] = useState({
    totalPatients: 0,
    inProgress: 0,
    waiting: 0,
    completed: 0,
    avgWaitTime: 0,
    doctorLoad: {}
  })
  
  useEffect(() => {
    const fetchCommandCenterStats = async () => {
      const today = new Date()
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)
      
      const { data: allQueue } = await supabase
        .from('appointment_queue')
        .select('*')
        .gte('created_at', startOfDay.toISOString())
        .lt('created_at', endOfDay.toISOString())
      
      const waiting = allQueue?.filter(q => q.status === 'waiting').length || 0
      const inProgress = allQueue?.filter(q => q.status === 'in-progress').length || 0
      const completed = allQueue?.filter(q => q.status === 'completed').length || 0
      
      // Calculate doctor load
      const doctorLoad = {}
      for (const doc of doctors) {
        const docQueue = allQueue?.filter(q => q.doctor_id === doc.id) || []
        const docWaiting = docQueue.filter(q => q.status === 'waiting').length
        const docInProgress = docQueue.filter(q => q.status === 'in-progress').length
        doctorLoad[doc.id] = {
          total: docWaiting + docInProgress,
          waiting: docWaiting,
          inProgress: docInProgress,
          remaining: Math.max(0, MAX_CAPACITY - docWaiting - docInProgress),
          isFull: docWaiting + docInProgress >= MAX_CAPACITY
        }
      }
      
      setCommandCenterStats({
        totalPatients: waiting + inProgress + completed,
        inProgress,
        waiting,
        completed,
        avgWaitTime: waiting > 0 ? Math.round(waiting * 15 / Math.max(1, waiting)) : 0,
        doctorLoad
      })
    }
    
    fetchCommandCenterStats()
    const interval = setInterval(fetchCommandCenterStats, 15000)
    return () => clearInterval(interval)
  }, [doctors, queueEntries])

  // Handle adding new walk-in patient
  const handleAddPatient = async (e) => {
    e.preventDefault()
    
    if (!newPatient.name.trim()) {
      toast.error('Please enter patient name')
      return
    }

    if (!newPatient.doctorId) {
      toast.error('Please select a doctor')
      return
    }

    try {
      setIsSubmitting(true)
      
      const selectedDoctor = doctors.find(d => d.id === newPatient.doctorId)
      
      // Get next token number for the doctor
      const today = new Date()
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getTimezoneOffset() * 60000 / 60000).toISOString()
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1 - today.getTimezoneOffset() * 60000 / 60000).toISOString()
      
      const { data: existingTokens } = await supabase
        .from('appointment_queue')
        .select('token_number')
        .eq('doctor_id', newPatient.doctorId)
        .gte('created_at', startOfDay)
        .lt('created_at', endOfDay)
      
      const tokenNumbers = (existingTokens || []).map(t => parseInt(t.token_number))
      const nextNumber = tokenNumbers.length > 0 ? Math.max(...tokenNumbers) + 1 : 1
      
      // Insert into appointment_queue
      // Note: appointment_queue uses token_number, not queue_number
      // and doesn't have patient_name/doctor_name columns - those are fetched via joins
      try {
        const { error: insertError } = await supabase
          .from('appointment_queue')
          .insert([{
            doctor_id: newPatient.doctorId,
            token_number: String(nextNumber),
            status: 'waiting'
          }])
        
        if (insertError) {
          // Check if it's a duplicate key error - if so, just refresh
          if (insertError.code === '23505') {
            toast.success('Patient already in queue')
            fetchData()
            return
          }
          throw insertError
        }
      } catch (insertErr) {
        // If insert failed, check if patient already exists in queue
        const { data: existingPatient } = await supabase
          .from('appointment_queue')
          .select('id, status')
          .eq('doctor_id', newPatient.doctorId)
          .is('appointment_id', null)
          .eq('status', 'waiting')
          .order('created_at', { ascending: false })
          .limit(1)
        
        if (existingPatient && existingPatient.length > 0) {
          toast.success('Patient already in queue')
          fetchData()
          return
        }
        throw insertErr
      }

      toast.success('Patient added to queue')
      setNewPatient({ name: '', doctorId: '', priority: 'normal' })
      fetchData()
    } catch (error) {
      console.error('Error adding patient:', error)
      toast.error('Failed to add patient to queue')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle call next patient
  const handleCallNext = async (entry) => {
    try {
      // Update status to in-progress when called
      await supabase.from('appointment_queue').update({ status: 'in-progress' }).eq('id', entry.id)
      toast.success(`Calling patient - Token ${entry.token}`)
      fetchData()
    } catch (error) {
      console.error('Error calling patient:', error)
      toast.error('Failed to call patient')
    }
  }

  // Handle start consultation
  const handleStartConsultation = async (entry) => {
    try {
      await supabase.from('appointment_queue').update({ 
        status: 'in-progress',
        consultation_started_at: new Date().toISOString()
      }).eq('id', entry.id)
      toast.success(`Consultation started`)
      fetchData()
    } catch (error) {
      console.error('Error starting consultation:', error)
      toast.error('Failed to start consultation')
    }
  }

  // Handle complete consultation
  const handleCompleteConsultation = async (entry) => {
    try {
      await supabase.from('appointment_queue').update({ status: 'completed' }).eq('id', entry.id)
      toast.success(`Consultation completed for ${entry.patient_name || entry.name}`)
      fetchData()
    } catch (error) {
      console.error('Error completing consultation:', error)
      toast.error('Failed to complete consultation')
    }
  }

  // Handle cancel/no-show
  const handleCancelPatient = async (entry) => {
    try {
      await supabase.from('appointment_queue').update({ status: 'cancelled' }).eq('id', entry.id)
      toast.success(`Patient ${entry.patient_name || entry.name} removed from queue`)
      fetchData()
    } catch (error) {
      console.error('Error cancelling patient:', error)
      toast.error('Failed to remove patient')
    }
  }

  // Handle patient check-in
  const handlePatientCheckIn = async (appointment) => {
    fetchData()
  }

  // Handle view patient history
  const handleViewHistory = () => {
    toast.success('Opening patient history...')
    // Navigate to history page
  }

  // Handle urgent patient
  const handleMarkUrgent = () => {
    toast.warning('Select a patient to mark as urgent')
  }

  // Get token color based on priority
  const getTokenStyle = (entry) => {
    const priority = entry.priority || 'normal'
    const config = priorityConfig[priority] || priorityConfig.normal
    return config
  }

  return (
    <DashboardLayout>
      

      <main className="px-4 space-y-6 max-w-md mx-auto pb-24">
        {/* Public Display Preview */}
        <section className="bg-slate-800 rounded-[2rem] p-5 text-white shadow-lg border border-white/10">
          <div className="flex justify-between items-center mb-4">
            <span className="text-[10px] font-bold uppercase tracking-tighter opacity-70">Lobby Display Live</span>
            <div className="flex gap-1">
              <div className={`w-1.5 h-1.5 rounded-full ${sessionStatus === 'active' ? 'bg-teal-400 animate-pulse' : 'bg-slate-500'}`}></div>
            </div>
          </div>
          <div className="flex justify-around items-center divide-x divide-white/10">
            <div className="text-center px-4">
              <p className="text-[10px] opacity-60 mb-1">NOW SERVING</p>
              <p className="text-3xl font-black text-teal-300">
                {currentServing?.token || '--'}
              </p>
            </div>
            <div className="text-center px-4">
              <p className="text-[10px] opacity-60 mb-1">NEXT PATIENT</p>
              <p className="text-2xl font-bold">
                {nextPatient?.token || '--'}
              </p>
            </div>
          </div>
        </section>

        {/* Patient Check-in Card */}
        <PatientCheckIn
          patients={patients}
          appointments={appointments}
          doctors={doctors}
          onCheckIn={handlePatientCheckIn}
          onViewHistory={handleViewHistory}
          onMarkUrgent={handleMarkUrgent}
        />

        {/* Queue Command Center */}
        <section className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-[2rem] p-5 text-white shadow-lg">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="w-5 h-5" />
            <h2 className="font-bold text-lg">Queue Command Center</h2>
          </div>
          
          <div className="grid grid-cols-4 gap-3 mb-4">
            <div className="text-center p-3 bg-white/10 rounded-xl">
              <p className="text-2xl font-black">{commandCenterStats.totalPatients}</p>
              <p className="text-[10px] opacity-70">Total</p>
            </div>
            <div className="text-center p-3 bg-white/10 rounded-xl">
              <p className="text-2xl font-black text-yellow-400">{commandCenterStats.waiting}</p>
              <p className="text-[10px] opacity-70">Waiting</p>
            </div>
            <div className="text-center p-3 bg-white/10 rounded-xl">
              <p className="text-2xl font-black text-blue-400">{commandCenterStats.inProgress}</p>
              <p className="text-[10px] opacity-70">In Progress</p>
            </div>
            <div className="text-center p-3 bg-white/10 rounded-xl">
              <p className="text-2xl font-black text-green-400">{commandCenterStats.completed}</p>
              <p className="text-[10px] opacity-70">Done</p>
            </div>
          </div>
          
          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">Doctor Workload Distribution</p>
            {doctors.slice(0, 4).map(doc => {
              const load = commandCenterStats.doctorLoad[doc.id] || { total: 0, remaining: MAX_CAPACITY, isFull: false }
              const pct = Math.round((load.total / MAX_CAPACITY) * 100)
              
              return (
                <div key={doc.id} className="bg-white/5 rounded-lg p-2">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-medium truncate">{doc.full_name}</span>
                    <span className={`text-[10px] ${load.isFull ? 'text-red-400' : pct > 70 ? 'text-orange-400' : 'text-green-400'}`}>
                      {load.total}/{MAX_CAPACITY}
                    </span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-1.5">
                    <div 
                      className={`h-1.5 rounded-full transition-all ${load.isFull ? 'bg-red-500' : pct > 70 ? 'bg-orange-500' : 'bg-green-500'}`}
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* Active Controls */}
        <section>
          {/* Session Status Indicator */}
          <div className={`flex items-center justify-center gap-2 mb-3 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider ${
            sessionStatus === 'active' ? 'bg-green-100 text-green-700' :
            sessionStatus === 'paused' ? 'bg-amber-100 text-amber-700' :
            sessionStatus === 'ended' ? 'bg-red-100 text-red-700' :
            'bg-slate-100 text-slate-500'
          }`}>
            <span className={`w-2 h-2 rounded-full ${
              sessionStatus === 'active' ? 'bg-green-500 animate-pulse' :
              sessionStatus === 'paused' ? 'bg-amber-500' :
              sessionStatus === 'ended' ? 'bg-red-500' :
              'bg-slate-400'
            }`}></span>
            <span>{sessionStatus === 'idle' ? 'Not Started' : sessionStatus}</span>
            {sessionStatus === 'active' && (
              <span className="ml-2 font-mono text-base">{sessionDuration}</span>
            )}
          </div>
          
          {/* Session Control Buttons */}
          <div className="grid grid-cols-3 gap-3">
          <button 
            onClick={() => handleSessionStatusChange('active')}
            className={`flex flex-col items-center justify-center gap-2 py-4 rounded-3xl shadow-md transition-transform active:scale-95 ${
              sessionStatus === 'active' 
                ? 'bg-gradient-to-br from-blue-500 to-blue-700 text-white' 
                : 'bg-slate-100 text-slate-400'
            }`}
          >
            <Play className="w-6 h-6" fill={sessionStatus === 'active' ? "currentColor" : "none"} />
            <span className="text-[11px] font-bold uppercase tracking-wide">Start</span>
          </button>
          <button 
            onClick={() => handleSessionStatusChange('paused')}
            className={`flex flex-col items-center justify-center gap-2 py-4 rounded-3xl transition-transform active:scale-95 ${
              sessionStatus === 'paused'
                ? 'bg-amber-100 text-amber-700'
                : 'bg-slate-100 text-slate-400'
            }`}
          >
            <Pause className="w-6 h-6" />
            <span className="text-[11px] font-bold uppercase tracking-wide">Pause</span>
          </button>
          <button 
            onClick={() => handleSessionStatusChange('ended')}
            className={`flex flex-col items-center justify-center gap-2 py-4 rounded-3xl transition-transform active:scale-95 ${
              sessionStatus === 'ended'
                ? 'bg-red-100 text-red-700'
                : 'bg-slate-100 text-slate-400'
            }`}
          >
            <Square className="w-6 h-6" />
            <span className="text-[11px] font-bold uppercase tracking-wide">End</span>
          </button>
        </div>
        </section>

        {/* Add Patient Form */}
        <section className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-50 rounded-xl">
              <UserPlus className="w-5 h-5 text-blue-700" />
            </div>
            <h2 className="font-bold text-lg text-slate-900">New Entry</h2>
          </div>
          
          <form onSubmit={handleAddPatient} className="space-y-4">
            <div>
              <label htmlFor="patientName" className="block text-[11px] font-bold text-slate-600 uppercase mb-1.5 ml-1">
                Patient Name
              </label>
              <input
                id="patientName"
                name="patientName"
                type="text"
                value={newPatient.name}
                onChange={(e) => setNewPatient(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Full name"
                autoComplete="off"
                className="w-full bg-slate-50 border-none rounded-2xl py-3 px-4 focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all outline-none text-sm text-slate-900"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="doctorSelect" className="block text-[11px] font-bold text-slate-600 uppercase mb-1.5 ml-1">
                  Doctor
                </label>
                <div className="relative">
                  <select
                    id="doctorSelect"
                    name="doctorId"
                    value={newPatient.doctorId}
                    onChange={(e) => setNewPatient(prev => ({ ...prev, doctorId: e.target.value }))}
                    className="w-full bg-slate-50 border-none rounded-2xl py-3 px-4 appearance-none focus:ring-2 focus:ring-blue-500/20 text-sm text-slate-900"
                  >
                    <option value="">Select</option>
                    {doctors.map(doc => (
                      <option key={doc.id} value={doc.id}>{doc.full_name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>
              
              <div>
                <label htmlFor="prioritySelect" className="block text-[11px] font-bold text-slate-600 uppercase mb-1.5 ml-1">
                  Priority
                </label>
                <div className="relative">
                  <select
                    id="prioritySelect"
                    name="priority"
                    value={newPatient.priority}
                    onChange={(e) => setNewPatient(prev => ({ ...prev, priority: e.target.value }))}
                    className="w-full bg-slate-50 border-none rounded-2xl py-3 px-4 appearance-none focus:ring-2 focus:ring-blue-500/20 text-sm text-slate-900"
                  >
                    <option value="normal">Normal</option>
                    <option value="vip">VIP</option>
                    <option value="emergency">Emergency</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>
            
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-blue-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 hover:bg-blue-700 transition-all mt-2 disabled:opacity-50"
            >
              <span>{isSubmitting ? 'Adding...' : 'Generate Token'}</span>
              <Ticket className="w-4 h-4" />
            </button>
          </form>
        </section>

        {/* Live Queue Table */}
        <section className="space-y-4">
          <div className="flex justify-between items-end px-2">
            <h2 className="font-bold text-xl text-slate-900" style={{ color: '#0f172a' }}>Active Queue</h2>
            <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full" style={{ color: '#2563eb' }}>
              {waitingCount} Waiting
            </span>
          </div>
          
          <div className="space-y-2">
            {isLoading ? (
              // Loading skeletons
              [...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4 bg-white rounded-[1.5rem] shadow-sm animate-pulse">
                  <div className="w-14 h-14 bg-slate-200 rounded-2xl"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-slate-200 rounded w-32"></div>
                    <div className="h-3 bg-slate-100 rounded w-24"></div>
                  </div>
                </div>
              ))
            ) : queueEntries.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <p>No patients in queue</p>
                <p className="text-sm">Add patients using the form above</p>
              </div>
            ) : (
              queueEntries
                .filter(e => e.status !== 'cancelled' && e.status !== 'completed')
                .map((entry, index) => {
                  const tokenStyle = getTokenStyle(entry)
                  const status = statusConfig[entry.status] || statusConfig.waiting
                  const isEmergency = entry.priority === 'emergency'
                  const isVip = entry.priority === 'vip'
                  
                  return (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`flex items-center gap-4 p-4 bg-white rounded-[1.5rem] shadow-sm transition-all hover:scale-[1.01] ${
                        isEmergency ? 'bg-red-50/50 border border-red-100' : isVip ? 'bg-amber-50/30' : ''
                      }`}
                    >
                      {/* Token Box */}
                      <div className={`w-14 h-14 ${tokenStyle.tokenColor} flex items-center justify-center rounded-2xl`}>
                        <span className={`font-black text-lg ${
                          isEmergency ? 'text-white' : isVip ? 'text-white' : 'text-slate-700'
                        }`}>
                          {entry.token}
                        </span>
                      </div>
                      
                      {/* Patient Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-bold text-slate-900 leading-tight" style={{ color: '#0f172a' }}>{entry.patient_name || entry.name || 'Patient'}</h3>
                          {isEmergency && <AlertTriangle className="w-4 h-4 text-red-600" />}
                          {isVip && <Star className="w-4 h-4 text-amber-500" />}
                        </div>
                        <p className="text-[11px] text-slate-500 font-medium" style={{ color: '#64748b' }}>
                          {entry.doctor_name || 'Unassigned'}
                        </p>
                      </div>
                      
                      {/* Status & Actions */}
                      <div className="text-right">
                        {entry.status === 'consulting' ? (
                          <div className="flex flex-col items-end gap-2">
                            <span className="block text-[10px] font-black uppercase text-teal-600 mb-1">
                              {status.label}
                            </span>
                            <div className="h-1.5 w-12 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full bg-teal-500 w-2/3"></div>
                            </div>
                            <button
                              onClick={() => handleCompleteConsultation(entry)}
                              className="bg-teal-600 text-white text-[10px] font-bold px-3 py-1.5 rounded-xl uppercase tracking-wider hover:bg-teal-700"
                            >
                              Complete
                            </button>
                          </div>
                        ) : entry.status === 'called' ? (
                          <div className="flex flex-col items-end gap-2">
                            <span className="block text-[10px] font-black uppercase text-blue-600 mb-1">
                              Called
                            </span>
                            <button
                              onClick={() => handleStartConsultation(entry)}
                              className="bg-blue-600 text-white text-[10px] font-bold px-3 py-1.5 rounded-xl uppercase tracking-wider hover:bg-blue-700"
                            >
                              Start
                            </button>
                          </div>
                        ) : entry.status === 'waiting' ? (
                          <div className="flex flex-col items-end gap-2">
                            <span className="block text-[10px] font-black uppercase text-slate-500 mb-1" style={{ color: '#64748b' }}>
                              Waiting
                            </span>
                            <button
                              onClick={() => handleCallNext(entry)}
                              className="bg-blue-600 text-white text-[10px] font-bold px-3 py-1.5 rounded-xl uppercase tracking-wider hover:bg-blue-700"
                            >
                              Call Next
                            </button>
                          </div>
                        ) : (
                          <span className={`block text-[10px] font-black uppercase ${status.color} mb-1`}>
                            {status.label}
                          </span>
                        )}
                        
                        {/* Cancel button for non-completed entries */}
                        {['waiting', 'called'].includes(entry.status) && (
                          <button
                            onClick={() => handleCancelPatient(entry)}
                            className="text-[10px] text-red-500 hover:text-red-700 mt-1"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </motion.div>
                  )
                })
            )}
          </div>
        </section>
      </main>

      
    </DashboardLayout>
  )
}

export default MediatorDashboard
