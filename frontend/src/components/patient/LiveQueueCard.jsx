import { Link } from 'react-router-dom'
import { Calendar, User, Clock, Users, ChevronRight, Activity } from 'lucide-react'

const LiveQueueCard = ({ queueDetails, isLoading, appointment }) => {
  // If no queue details and not loading, show empty state with booking option
  if (!queueDetails && !isLoading) {
    // If there's an upcoming appointment (not today), show appointment info
    if (appointment) {
      const appointmentDate = new Date(appointment.date)
      const today = new Date()
      const isToday = appointmentDate.toDateString() === today.toDateString()
      
      if (!isToday) {
        // Show upcoming appointment info
        const formatDate = (date) => {
          return new Intl.DateTimeFormat('en-US', { 
            weekday: 'long', 
            month: 'short', 
            day: 'numeric' 
          }).format(new Date(date))
        }
        
        return (
          <div className="bg-white dark:bg-slate-900 rounded-[32px] p-6 shadow-sm border border-gray-100 dark:border-slate-800 text-center transition-colors">
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="w-2 h-2 bg-blue-400 rounded-full" />
              <span className="text-[10px] font-black tracking-widest text-blue-600 dark:text-blue-400 uppercase">Upcoming Appointment</span>
            </div>
            
            <div className="flex items-center gap-4 mb-6 pb-4 border-b border-dashed border-gray-100 dark:border-slate-800">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg">
                {appointment.doctor_name?.charAt(0).toUpperCase() || 'D'}
              </div>
              <div className="flex-1 text-left">
                <h4 className="text-base font-black text-gray-900 dark:text-white">Dr. {appointment.doctor_name || 'Doctor'}</h4>
                <p className="text-xs font-medium text-gray-500 dark:text-slate-400">{appointment.time || '10:00 AM'}</p>
                <p className="text-xs font-bold text-blue-600 dark:text-blue-400 mt-1">{formatDate(appointment.date)}</p>
              </div>
              <span className={`text-[9px] font-black px-2 py-1 rounded-lg uppercase ${
                appointment.status === 'accepted' 
                  ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' 
                  : 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400'
              }`}>
                {appointment.status}
              </span>
            </div>
            
            <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">
              Your appointment is scheduled for {formatDate(appointment.date)}. Queue information will be available on the appointment day.
            </p>
            
            <Link
              to="/patient/appointments"
              className="inline-flex bg-blue-600 text-white font-black py-3 px-6 rounded-2xl shadow-lg shadow-blue-200 dark:shadow-none hover:bg-blue-700 active:scale-95 transition-all text-sm uppercase tracking-widest"
            >
              View Appointment
            </Link>
          </div>
        )
      }
    }
    
    // No queue and no upcoming appointment - show empty state
    return (
      <div className="bg-white dark:bg-slate-900 rounded-[32px] p-8 shadow-sm border border-gray-100 dark:border-slate-800 text-center transition-colors">
        <div className="w-20 h-20 bg-gray-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
          <Calendar className="w-10 h-10 text-gray-400 dark:text-slate-500" />
        </div>
        <h3 className="font-bold text-gray-900 dark:text-white mb-2">No Active Queue</h3>
        <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">
          You don't have any active queue. Schedule an appointment to join the queue.
        </p>
        <Link
          to="/patient/doctors"
          className="inline-flex bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 font-semibold py-2.5 px-5 rounded-xl hover:bg-gray-200 dark:hover:bg-slate-700 active:scale-95 transition-all text-sm"
        >
          Find a Doctor
        </Link>
      </div>
    )
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-[32px] p-6 shadow-sm border border-gray-100 dark:border-slate-800 transition-colors animate-pulse">
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="w-3 h-3 bg-gray-200 dark:bg-slate-700 rounded-full" />
          <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-32" />
        </div>
        <div className="mb-6">
          <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-40 mx-auto mb-2" />
          <div className="h-12 bg-gray-200 dark:bg-slate-700 rounded-3xl w-40 mx-auto" />
        </div>
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="h-24 bg-gray-100 dark:bg-slate-800 rounded-3xl" />
          <div className="h-24 bg-gray-100 dark:bg-slate-800 rounded-3xl" />
        </div>
        <div className="h-16 bg-gray-100 dark:bg-slate-800 rounded-3xl" />
      </div>
    )
  }

  const { 
    doctorName, 
    doctorSpecialization,
    tokenNumber, 
    currentToken, 
    nextToken,
    patientsAhead, 
    yourPosition, 
    estimatedWaitTime,
    estimatedStartTime,
    currentISTTime,
    status,
    isWalkIn 
  } = queueDetails

  // Status badge color
  const getStatusBadge = () => {
    switch (status) {
      case 'in-progress':
        return { label: 'In Consultation', color: 'bg-green-500', text: 'text-green-600 dark:text-green-400' }
      case 'waiting':
        return { label: 'In Queue', color: 'bg-blue-500', text: 'text-blue-600 dark:text-blue-400' }
      default:
        return { label: 'Not in Queue', color: 'bg-gray-400', text: 'text-gray-500' }
    }
  }

  const statusBadge = getStatusBadge()

  return (
    <div className="bg-white dark:bg-slate-900 rounded-[32px] p-6 shadow-sm border border-gray-100 dark:border-slate-800 relative overflow-hidden transition-colors">
      {/* Live Indicator Background */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-400 via-blue-500 to-purple-500" />
      
      {/* Live Status Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
          <span className="text-[10px] font-black tracking-widest text-green-600 dark:text-green-400 uppercase">Live Queue</span>
        </div>
        <span className={`text-[9px] font-black px-2 py-1 rounded-lg uppercase ${statusBadge.color} text-white`}>
          {statusBadge.label}
        </span>
      </div>

      {/* Doctor Info */}
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-dashed border-gray-100 dark:border-slate-800">
        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center text-white font-black text-lg shadow-lg">
          {doctorName?.charAt(0).toUpperCase() || 'D'}
        </div>
        <div className="flex-1">
          <h4 className="text-base font-black text-gray-900 dark:text-white">Dr. {doctorName}</h4>
          <p className="text-xs font-medium text-gray-500 dark:text-slate-400">{doctorSpecialization || 'General Medicine'}</p>
        </div>
        {isWalkIn && (
          <span className="text-[9px] font-black px-2 py-1 rounded-lg uppercase bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">
            Walk-in
          </span>
        )}
      </div>

      {/* Token Number Hero */}
      <div className="text-center mb-6">
        <p className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-2">Your Token</p>
        <div className="inline-block bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30 text-blue-600 dark:text-blue-400 px-10 py-4 rounded-3xl font-black text-5xl shadow-sm border border-blue-100 dark:border-blue-800">
          {tokenNumber || '--'}
        </div>
      </div>

      {/* Queue Stats Grid */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {/* Current Token Being Served */}
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-4 rounded-3xl border border-green-100 dark:border-green-900/30">
          <div className="flex items-center justify-center gap-1.5 mb-1 text-green-600 dark:text-green-400">
            <Activity className="w-4 h-4" />
            <p className="text-xs font-bold uppercase tracking-wide">Now Serving</p>
          </div>
          <p className="text-2xl font-black text-gray-900 dark:text-white">{currentToken || '--'}</p>
          <p className="text-[10px] font-bold text-gray-400 dark:text-slate-500">Token Number</p>
        </div>

        {/* Next Patient */}
        <div className="bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 p-4 rounded-3xl border border-purple-100 dark:border-purple-900/30">
          <div className="flex items-center justify-center gap-1.5 mb-1 text-purple-600 dark:text-purple-400">
            <ChevronRight className="w-4 h-4" />
            <p className="text-xs font-bold uppercase tracking-wide">Next Patient</p>
          </div>
          <p className="text-2xl font-black text-gray-900 dark:text-white">{nextToken || '--'}</p>
          <p className="text-[10px] font-bold text-gray-400 dark:text-slate-500">Token Number</p>
        </div>

        {/* Patients Ahead */}
        <div className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-3xl border border-gray-100 dark:border-slate-700">
          <div className="flex items-center justify-center gap-1.5 mb-1 text-blue-600 dark:text-blue-400">
            <Users className="w-4 h-4" />
            <p className="text-xs font-bold uppercase tracking-wide">Ahead</p>
          </div>
          <p className="text-2xl font-black text-gray-900 dark:text-white">{patientsAhead}</p>
          <p className="text-[10px] font-bold text-gray-400 dark:text-slate-500">Patients</p>
        </div>

        {/* Estimated Wait Time */}
        <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-3xl border border-orange-100 dark:border-orange-900/30">
          <div className="flex items-center justify-center gap-1.5 mb-1 text-orange-600 dark:text-orange-400">
            <Clock className="w-4 h-4" />
            <p className="text-xs font-bold uppercase tracking-wide">Wait Time</p>
          </div>
          <p className="text-2xl font-black text-gray-900 dark:text-white">~{estimatedWaitTime || 0}</p>
          <p className="text-[10px] font-bold text-gray-400 dark:text-slate-500">Minutes</p>
        </div>

        {/* Estimated Consultation Time */}
        <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-3xl border border-indigo-100 dark:border-indigo-900/30">
          <div className="flex items-center justify-center gap-1.5 mb-1 text-indigo-600 dark:text-indigo-400">
            <Clock className="w-4 h-4" />
            <p className="text-xs font-bold uppercase tracking-wide">Est. Start</p>
          </div>
          <p className="text-2xl font-black text-gray-900 dark:text-white">{estimatedStartTime || '--'}</p>
          <p className="text-[10px] font-bold text-gray-400 dark:text-slate-500">{currentISTTime ? `Current: ${currentISTTime}` : 'At'}</p>
        </div>
      </div>

      {/* Your Position */}
      <div className="flex items-center justify-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-2xl">
        <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
          Your Position: <span className="font-black text-lg">#{yourPosition || '--'}</span>
        </span>
      </div>
    </div>
  )
}

export default LiveQueueCard
