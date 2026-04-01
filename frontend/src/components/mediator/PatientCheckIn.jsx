import { useState, useMemo, useEffect } from 'react'
import { Search, UserPlus, History, AlertTriangle, User, CheckCircle, Clock, Activity, Users, Zap } from 'lucide-react'
import toast from 'react-hot-toast'
import supabase from '../../services/supabase'
import { getCurrentIST } from '../../services/queueEngine'

const MAX_CAPACITY = 60

const CapacityFullModal = ({ isOpen, onClose, selectedDoctor, onScheduleNextDay, onChooseOther, onJoinStandby }) => {
  if (!isOpen) return null
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-6 h-6 text-orange-500" />
          <h3 className="font-bold text-lg text-gray-900">Doctor at Full Capacity</h3>
        </div>
        
        <p className="text-gray-600 mb-4">
          {selectedDoctor?.full_name} has reached maximum capacity ({MAX_CAPACITY} patients). 
          Please choose an alternative:
        </p>
        
        <div className="space-y-3">
          <button 
            onClick={onChooseOther}
            className="w-full p-4 bg-blue-50 rounded-xl text-left hover:bg-blue-100 transition-colors"
          >
            <span className="font-medium text-blue-700">Choose Another Doctor</span>
            <p className="text-sm text-blue-600">Select from available doctors</p>
          </button>
          
          <button 
            onClick={onScheduleNextDay}
            className="w-full p-4 bg-green-50 rounded-xl text-left hover:bg-green-100 transition-colors"
          >
            <span className="font-medium text-green-700">Schedule for Tomorrow</span>
            <p className="text-sm text-green-600">Book next available slot</p>
          </button>
          
          <button 
            onClick={onJoinStandby}
            className="w-full p-4 bg-yellow-50 rounded-xl text-left hover:bg-yellow-100 transition-colors"
          >
            <span className="font-medium text-yellow-700">Join Standby Queue</span>
            <p className="text-sm text-yellow-600">Wait for no-shows</p>
          </button>
        </div>
        
        <button onClick={onClose} className="w-full mt-4 py-3 text-gray-500 font-medium">
          Cancel
        </button>
      </div>
    </div>
  )
}

const PatientCheckIn = ({ 
  patients = [], 
  appointments = [], 
  doctors = [],
  onCheckIn,
  onViewHistory,
  onMarkUrgent 
}) => {
  const [doctorStats, setDoctorStats] = useState({})

  useEffect(() => {
    const fetchDoctorStats = async () => {
      const stats = {}
      const today = new Date()
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)
      
      for (const doctor of doctors) {
        try {
          const { data: queueData } = await supabase
            .from('appointment_queue')
            .select('status')
            .eq('doctor_id', doctor.id)
            .gte('created_at', startOfDay.toISOString())
            .lt('created_at', endOfDay.toISOString())
            .in('status', ['waiting', 'in-progress'])
          
          const waiting = queueData?.filter(q => q.status === 'waiting').length || 0
          const inProgress = queueData?.filter(q => q.status === 'in-progress').length || 0
          const total = waiting + inProgress
          
          stats[doctor.id] = {
            waiting,
            inProgress,
            total,
            remaining: Math.max(0, MAX_CAPACITY - total),
            isFull: total >= MAX_CAPACITY,
            isAlmostFull: total >= MAX_CAPACITY * 0.75
          }
        } catch (e) {
          stats[doctor.id] = { waiting: 0, inProgress: 0, total: 0, remaining: MAX_CAPACITY, isFull: false, isAlmostFull: false }
        }
      }
      setDoctorStats(stats)
    }
    
    if (doctors.length > 0) {
      fetchDoctorStats()
      const interval = setInterval(fetchDoctorStats, 30000)
      return () => clearInterval(interval)
    }
  }, [doctors])
  
  const [showCapacityModal, setShowCapacityModal] = useState(false)
  const [capacityFullDoctor, setCapacityFullDoctor] = useState(null)

  const getRecommendedDoctor = () => {
    let minWait = Infinity
    let recommended = null
    
    for (const doctor of doctors) {
      const stats = doctorStats[doctor.id]
      if (stats && !stats.isFull && stats.total < minWait) {
        minWait = stats.total
        recommended = doctor
      }
    }
    
    return recommended
  }
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPatient, setSelectedPatient] = useState(null)
  const [isCheckingIn, setIsCheckingIn] = useState(false)

  // Filter patients/appointments based on search
  const searchResults = useMemo(() => {
    // Show nothing by default - require explicit search for privacy
    if (!searchQuery.trim()) {
      return { 
        appointments: [], 
        patients: [] 
      }
    }
    
    const query = searchQuery.toLowerCase()
    
    // Search in appointments
    const matchedAppointments = (appointments || []).filter(apt => {
      const patientName = apt.patient_name?.toLowerCase() || ''
      const appointmentId = apt.id?.toLowerCase() || ''
      return patientName.includes(query) || appointmentId.includes(query)
    })
    
    // Search in patients/profiles
    const matchedPatients = (patients || []).filter(patient => {
      const name = patient.full_name?.toLowerCase() || ''
      const id = patient.id?.toLowerCase() || ''
      return name.includes(query) || id.includes(query)
    })

    return {
      appointments: matchedAppointments.slice(0, 5),
      patients: matchedPatients.slice(0, 5)
    }
  }, [searchQuery, patients, appointments])

  // Handle patient check-in
  const handleCheckIn = async (appointment) => {
    try {
      setIsCheckingIn(true)
      
      // Check doctor capacity first
      const selectedDoc = doctors.find(d => d.id === appointment.doctor_id)
      const docStats = doctorStats[appointment.doctor_id]
      
      if (docStats?.isFull) {
        setCapacityFullDoctor(selectedDoc)
        setShowCapacityModal(true)
        setIsCheckingIn(false)
        return
      }
      
      // Update appointment status to checked-in/arrived
      // Note: 'arrived' is not in the valid status list, using 'confirmed' as the check-in status
      const { error } = await supabase
        .from('appointments')
        .update({ 
          status: 'confirmed'
        })
        .eq('id', appointment.id)

      if (error) throw error

      // Also add to appointment_queue if not already there
      const { data: existingQueue } = await supabase
        .from('appointment_queue')
        .select('id')
        .eq('appointment_id', appointment.id)
        .limit(1)
      
      if (!existingQueue || existingQueue.length === 0) {
        // Get next token number for the doctor
        const today = new Date()
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
        const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)
        
        const { data: existingTokens } = await supabase
          .from('appointment_queue')
          .select('token_number')
          .eq('doctor_id', appointment.doctor_id)
          .gte('created_at', startOfDay.toISOString())
          .lt('created_at', endOfDay.toISOString())
        
        const tokenNumbers = existingTokens ? existingTokens.map(t => parseInt(t.token_number)) : []
        const nextNumber = tokenNumbers.length > 0 ? Math.max(...tokenNumbers) + 1 : 1
        
        // Insert into queue
        await supabase
          .from('appointment_queue')
          .insert([{
            doctor_id: appointment.doctor_id,
            patient_id: appointment.patient_id,
            appointment_id: appointment.id,
            token_number: String(nextNumber),
            status: 'waiting',
            priority: appointment.priority || 'normal',
            checked_in_at: getCurrentIST().toISOString()
          }])
      } else {
        // Update existing queue entry with check-in time
        await supabase
          .from('appointment_queue')
          .update({ 
            checked_in_at: getCurrentIST().toISOString(),
            status: 'waiting'
          })
          .eq('appointment_id', appointment.id)
      }

      toast.success(`Patient ${appointment.patient_name} checked in successfully!`)
      setSearchQuery('')
      setSelectedPatient(null)
      onCheckIn?.(appointment)
    } catch (error) {
      console.error('Check-in error:', error)
      toast.error('Failed to check in patient')
    } finally {
      setIsCheckingIn(false)
    }
  }

  // Handle urgent patient
  const handleMarkUrgent = (appointment) => {
    onMarkUrgent?.(appointment)
  }

  const recommendedDoctor = getRecommendedDoctor()

  const getCapacityStatus = (stats) => {
    if (!stats || stats.total === 0) return { label: 'Available', color: 'bg-green-500', text: 'text-green-600', bg: 'bg-green-50' }
    if (stats.isFull) return { label: 'Full', color: 'bg-red-500', text: 'text-red-600', bg: 'bg-red-50' }
    if (stats.isAlmostFull) return { label: 'High traffic', color: 'bg-orange-500', text: 'text-orange-600', bg: 'bg-orange-50' }
    return { label: 'Available', color: 'bg-green-500', text: 'text-green-600', bg: 'bg-green-50' }
  }

  return (
    <section className="bg-gray-50 p-8 rounded-lg border border-gray-200">
      <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
        <UserPlus className="w-6 h-6" />
        Patient Check-in
      </h3>
      
      {/* Doctor Availability Display */}
      <div className="mb-6 p-4 bg-white rounded-lg border border-gray-200">
        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
          <Activity className="w-4 h-4" />
          Live Doctor Availability
        </h4>
        <div className="space-y-2">
          {doctors.slice(0, 4).map(doctor => {
            const stats = doctorStats[doctor.id] || { waiting: 0, inProgress: 0, total: 0, remaining: MAX_CAPACITY, isFull: false }
            const status = getCapacityStatus(stats)
            const isRecommended = recommendedDoctor?.id === doctor.id
            
            return (
              <div key={doctor.id} className={`flex items-center justify-between p-2 rounded-lg ${status.bg} ${isRecommended ? 'ring-2 ring-blue-500' : ''}`}>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${status.color}`} />
                  <span className="text-sm font-medium text-gray-900">{doctor.full_name}</span>
                  {isRecommended && <Zap className="w-3 h-3 text-blue-600" />}
                </div>
                <div className="text-right">
                  <span className={`text-xs font-bold ${status.text}`}>{stats.total}/{MAX_CAPACITY}</span>
                  <span className="text-xs text-gray-500 ml-1">{status.label}</span>
                </div>
              </div>
            )
          })}
        </div>
        {recommendedDoctor && (
          <div className="mt-3 p-2 bg-blue-50 rounded-lg flex items-center gap-2">
            <Zap className="w-4 h-4 text-blue-600" />
            <span className="text-sm text-blue-700">Recommended: {recommendedDoctor.full_name} (shortest wait)</span>
          </div>
        )}
      </div>
      
      <div className="space-y-4">
        {/* Search Input */}
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 transition-colors group-focus-within:text-blue-600 w-5 h-5" />
          <input 
            className="w-full pl-12 pr-4 py-4 bg-white rounded-lg border border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none font-medium transition-all placeholder:text-gray-400"
            placeholder="Search by name or ID..." 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Search Results */}
        {searchResults.appointments.length > 0 && (
          <div className="bg-white rounded-lg p-2 space-y-1 max-h-48 overflow-y-auto border border-gray-200">
            {searchResults.appointments.map(apt => (
              <button
                key={apt.id}
                onClick={() => setSelectedPatient(apt)}
                className={`w-full text-left p-3 rounded-lg hover:bg-gray-100 transition-colors ${
                  selectedPatient?.id === apt.id ? 'bg-blue-50 border border-blue-500' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900">{apt.patient_name}</span>
                  <span className="text-xs text-gray-500">{apt.date}</span>
                </div>
                <div className="text-xs text-gray-500">
                  {apt.doctor_name || 'Doctor'} • {apt.time || 'Time not set'}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Check-in Button */}
        <button 
          onClick={() => selectedPatient && handleCheckIn(selectedPatient)}
          disabled={!selectedPatient || isCheckingIn}
          className="w-full bg-gradient-to-br from-blue-600 to-blue-700 text-white py-4 rounded-full font-bold shadow-lg shadow-blue-600/20 hover:shadow-xl hover:shadow-blue-600/30 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isCheckingIn ? (
            <>Checking in...</>
          ) : (
            <>
              <CheckCircle className="w-5 h-5" />
              Check-in Patient
            </>
          )}
        </button>
      </div>

      {/* Quick Actions */}
      <div className="mt-8 pt-8 border-t border-gray-200">
        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Quick Actions</h4>
        <div className="grid grid-cols-2 gap-3">
          <button 
            onClick={onViewHistory}
            className="bg-gray-200 p-3 rounded-lg text-sm font-semibold text-gray-800 flex items-center justify-center gap-2 hover:bg-gray-300 transition-colors"
          >
            <History className="w-[18px] h-[18px]" />
            History
          </button>
          <button 
            onClick={onMarkUrgent}
            className="bg-red-100 p-3 rounded-lg text-sm font-semibold text-red-600 flex items-center justify-center gap-2 hover:bg-red-200 transition-colors"
          >
            <AlertTriangle className="w-[18px] h-[18px]" />
            Urgent
          </button>
        </div>
      </div>

      {/* Today's Check-ins */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Today's Check-ins
        </h4>
        <div className="space-y-2">
          {(appointments || [])
            .filter(apt => apt.status === 'arrived')
            .slice(0, 3)
            .map(apt => (
              <div key={apt.id} className="flex items-center gap-3 p-2 bg-gray-100 rounded-lg">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <User className="w-4 h-4 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{apt.patient_name}</p>
                  <p className="text-xs text-gray-500">{apt.checked_in_at ? new Date(apt.checked_in_at).toLocaleTimeString() : 'Just now'}</p>
                </div>
                <span className="text-xs font-bold text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                  Arrived
                </span>
              </div>
            ))}
          {appointments.filter(apt => apt.status === 'arrived').length === 0 && (
            <p className="text-sm text-gray-500 text-center py-4">No check-ins today</p>
          )}
        </div>
      </div>
      
      {/* Capacity Full Modal */}
      <CapacityFullModal 
        isOpen={showCapacityModal}
        onClose={() => setShowCapacityModal(false)}
        selectedDoctor={capacityFullDoctor}
        onScheduleNextDay={() => {
          setShowCapacityModal(false)
          toast.success('Redirecting to schedule...')
        }}
        onChooseOther={() => {
          setShowCapacityModal(false)
          setSearchQuery('')
        }}
        onJoinStandby={() => {
          setShowCapacityModal(false)
          toast.success('Added to standby queue')
        }}
      />
    </section>
  )
}

export default PatientCheckIn
