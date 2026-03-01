import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
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
  UserPlus
} from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import useAuthStore from '../../store/authStore'
import { getAppointments, getDoctorEarnings, updateAppointment, getWalkInQueue } from '../../services/api'
import { useDoctorAppointments, useWalkInQueue } from '../../hooks/useRealtimeSubscription'
import { DashboardLayout } from '../../components/layout'
import { GlassCard, Badge, Avatar, Button } from '../../components/ui'
import { StatCard, EmptyState } from '../../components/shared'
import { StatCardSkeleton, CardSkeleton } from '../../components/ui/Skeleton'

const DoctorDashboard = () => {
  const { user } = useAuthStore()
  const userName = user?.fullName || user?.email?.split('@')[0] || 'Doctor'
  const [isLoading, setIsLoading] = useState(true)
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

  // Calculate stats from real-time data
  const stats = useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd')
    const todayAppointments = appointments?.filter(a => a.date === today) || []
    const uniquePatients = [...new Set(appointments?.map(a => a.patient_id))].length

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

  const todayAppointments = useMemo(() => {
    return appointments
      ?.filter(a => a.date === format(new Date(), 'yyyy-MM-dd'))
      .slice(0, 5) || []
  }, [appointments])

  const handleUpdateStatus = async (appointmentId, status) => {
    try {
      await updateAppointment(appointmentId, { status })
      toast.success(`Appointment ${status}`)
    } catch (error) {
      toast.error('Failed to update appointment')
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
          <div className={`w-2 h-2 rounded-full ${isAppointmentsSubscribed ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />
          <p className="text-gray-500 text-sm">
            {stats.today} appointments today
          </p>
        </div>
      </div>

      {/* Stats - Horizontal Scrollable Row for Mobile layout efficiency */}
      <div className="flex overflow-x-auto pb-4 -mx-4 px-4 gap-3 snap-x no-scrollbar mb-6">
        {isLoading ? (
          <>
            <div className="min-w-[140px] shrink-0 snap-start"><StatCardSkeleton /></div>
            <div className="min-w-[140px] shrink-0 snap-start"><StatCardSkeleton /></div>
          </>
        ) : (
          <>
            <div className="min-w-[140px] shrink-0 snap-start">
              <StatCard title="Today" value={stats.today} icon={Calendar} color="primary" delay={0} />
            </div>
            <div className="min-w-[140px] shrink-0 snap-start">
              <StatCard title="Queue" value={stats.waiting} icon={UserPlus} color="teal" delay={0.1} />
            </div>
            <div className="min-w-[140px] shrink-0 snap-start">
              <StatCard title="Patients" value={stats.patients} icon={Users} color="purple" delay={0.2} />
            </div>
            <div className="min-w-[140px] shrink-0 snap-start">
              <StatCard title="Rating" value={stats.rating > 0 ? stats.rating.toFixed(1) : 'N/A'} icon={Star} color="pink" delay={0.3} />
            </div>
          </>
        )}
      </div>

      {/* Main Single Column Content mapping */}
      <div className="space-y-6">

        {/* Today's Schedule Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              Schedule <Radio className="w-4 h-4 text-green-500 animate-pulse" />
            </h2>
            <Link to="/doctor/appointments" className="text-sm font-semibold text-blue-600">
              View All
            </Link>
          </div>

          {isLoading ? (
            <div className="space-y-3"><CardSkeleton /><CardSkeleton /></div>
          ) : todayAppointments.length > 0 ? (
            <div className="space-y-3">
              {todayAppointments.map((appointment, index) => (
                <div key={appointment.id} className="p-3 rounded-xl bg-gray-50 border border-gray-100 flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                        {appointment.patient_name?.charAt(0) || 'P'}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 text-sm">{appointment.patient_name}</p>
                        <p className="text-xs text-gray-500">{appointment.time} • {appointment.mode}</p>
                      </div>
                    </div>
                    <Badge variant={appointment.status === 'confirmed' ? 'success' : 'warning'}>
                      {appointment.status}
                    </Badge>
                  </div>

                  {appointment.status === 'pending' && (
                    <div className="flex gap-2 pt-2 border-t border-gray-100">
                      <button
                        onClick={() => handleUpdateStatus(appointment.id, 'confirmed')}
                        className="flex-1 bg-green-50 text-green-600 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1 hover:bg-green-100"
                      >
                        <CheckCircle className="w-4 h-4" /> Accept
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(appointment.id, 'cancelled')}
                        className="flex-1 bg-red-50 text-red-600 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1 hover:bg-red-100"
                      >
                        <XCircle className="w-4 h-4" /> Decline
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-gray-50 rounded-xl p-4 text-center">
              <p className="text-sm text-gray-500">No scheduled appointments today.</p>
            </div>
          )}
        </div>

        {/* Walk-in Queue Mobile Stack */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">Live Queue</h2>
            {walkInQueue?.filter(w => w.status === 'waiting').length > 0 && (
              <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2 py-1 rounded-full">
                {walkInQueue.filter(w => w.status === 'waiting').length} waiting
              </span>
            )}
          </div>

          {walkInQueue?.filter(w => w.status === 'waiting').length > 0 ? (
            <div className="space-y-3">
              {walkInQueue.filter(w => w.status === 'waiting').slice(0, 3).map((patient, index) => (
                <div key={patient.id} className="flex flex-row items-center gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <div className="w-10 h-10 shrink-0 bg-teal-100 text-teal-700 flex items-center justify-center rounded-xl font-bold">
                    {patient.token?.replace('A', '')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 line-clamp-1">{patient.name}</p>
                    <p className="text-xs text-gray-500 line-clamp-1">{patient.reason || 'Waiting'}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-gray-50 rounded-xl p-4 text-center">
              <p className="text-sm text-gray-500">Queue is empty.</p>
            </div>
          )}
        </div>

        {/* Quick Actions Grid */}
        <div className="mb-4">
          <h2 className="text-sm font-bold text-gray-900 mb-3 px-1 uppercase tracking-wider">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            <Link to="/doctor/availability" className="bg-white p-4 rounded-xl shadow-sm border border-gray-50 flex flex-col items-center justify-center text-center gap-2 hover:bg-gray-50">
              <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-gray-700">Availability</span>
            </Link>
            <Link to="/doctor/earnings" className="bg-white p-4 rounded-xl shadow-sm border border-gray-50 flex flex-col items-center justify-center text-center gap-2 hover:bg-gray-50">
              <div className="w-10 h-10 bg-green-50 text-green-600 rounded-full flex items-center justify-center">
                <DollarSign className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-gray-700">Earnings</span>
            </Link>
          </div>
        </div>

      </div>
    </DashboardLayout>
  )
}

export default DoctorDashboard



