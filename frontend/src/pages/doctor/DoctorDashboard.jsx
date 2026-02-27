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
      // Real-time subscription will update the UI automatically
      toast.success(`Appointment ${status}`)
    } catch (error) {
      toast.error('Failed to update appointment')
    }
  }

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="mb-8">
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-bold text-white mb-2"
        >
          Welcome, Dr. {userName?.split(' ').pop() || 'Doctor'}!
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-white/60"
        >
          You have {stats.today} appointments today
        </motion.p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {isLoading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <StatCard
              title="Today's Appointments"
              value={stats.today}
              icon={Calendar}
              color="primary"
              delay={0}
            />
            <StatCard
              title="Total Patients"
              value={stats.patients}
              icon={Users}
              color="purple"
              delay={0.1}
            />
            <StatCard
              title="Walk-in Queue"
              value={stats.waiting}
              icon={UserPlus}
              color="teal"
              delay={0.2}
            />
            <StatCard
              title="Rating"
              value={stats.rating > 0 ? stats.rating.toFixed(1) : 'N/A'}
              icon={Star}
              color="pink"
              delay={0.3}
            />
          </>
        )}
      </div>

      {/* Real-time Status Indicator */}
      <div className="flex items-center gap-2 mb-6">
        <div className={`w-2 h-2 rounded-full ${isAppointmentsSubscribed ? 'bg-success animate-pulse' : 'bg-warning'}`} />
        <span className="text-xs text-white/50">
          {isAppointmentsSubscribed ? 'Real-time updates active' : 'Connecting...'}
        </span>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Schedule */}
        <div className="lg:col-span-2 space-y-6">
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-white">Today's Schedule</h2>
                <Radio className="w-4 h-4 text-success animate-pulse" />
              </div>
              <Link to="/doctor/appointments">
                <Button variant="ghost" size="sm">
                  View All
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>

            {isLoading ? (
              <div className="space-y-4">
                <CardSkeleton />
                <CardSkeleton />
              </div>
            ) : todayAppointments.length > 0 ? (
              <div className="space-y-4">
                {todayAppointments.map((appointment, index) => (
                  <motion.div
                    key={appointment.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center gap-4 p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary-500/20">
                      <Clock className="w-6 h-6 text-primary-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white">
                        {appointment.patient_name}
                      </p>
                      <p className="text-sm text-white/60">
                        {appointment.time} • {appointment.mode === 'online' ? 'Video Call' : 'In-Person'}
                      </p>
                    </div>
                    <Badge
                      variant={appointment.status === 'confirmed' ? 'success' : 'warning'}
                    >
                      {appointment.status}
                    </Badge>
                    {appointment.status === 'pending' && (
                      <div className="flex gap-2">
                        <Button
                          variant="success"
                          size="sm"
                          onClick={() => handleUpdateStatus(appointment.id, 'confirmed')}
                        >
                          <CheckCircle className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleUpdateStatus(appointment.id, 'cancelled')}
                        >
                          <XCircle className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Calendar}
                title="No appointments today"
                description="You don't have any scheduled appointments for today."
              />
            )}
          </GlassCard>

          {/* Walk-in Queue */}
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-white">Walk-in Queue</h2>
                {walkInQueue?.filter(w => w.status === 'waiting').length > 0 && (
                  <Badge variant="warning">{walkInQueue.filter(w => w.status === 'waiting').length} waiting</Badge>
                )}
              </div>
            </div>

            {walkInQueue?.filter(w => w.status === 'waiting').length > 0 ? (
              <div className="space-y-3">
                {walkInQueue.filter(w => w.status === 'waiting').slice(0, 5).map((patient, index) => (
                  <motion.div
                    key={patient.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center gap-4 p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-accent-teal/20">
                      <span className="text-lg font-bold text-accent-teal">
                        {patient.token?.replace('A', '')}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white">{patient.name}</p>
                      <p className="text-sm text-white/60">{patient.reason || 'No reason specified'}</p>
                    </div>
                    <Badge variant="warning">Waiting</Badge>
                  </motion.div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={UserPlus}
                title="Queue is empty"
                description="No walk-in patients waiting."
              />
            )}
          </GlassCard>
        </div>

        {/* Quick Stats & Actions */}
        <div className="space-y-6">
          {/* Earnings Card */}
          <GlassCard className="p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Earnings Overview</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-white/60">Total Earnings</span>
                <span className="text-xl font-bold text-white">${earnings.totalEarnings}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/60">This Month</span>
                <span className="text-lg font-semibold text-success">${earnings.thisMonth}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/60">Pending Payout</span>
                <span className="text-lg font-semibold text-warning">${earnings.pendingPayout}</span>
              </div>
            </div>
            <Link to="/doctor/earnings">
              <Button variant="glass" className="w-full mt-4">
                View Details
              </Button>
            </Link>
          </GlassCard>

          {/* Quick Actions */}
          <GlassCard className="p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <Link to="/doctor/appointments">
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <Calendar className="w-5 h-5 text-primary-400" />
                  <span className="text-white/80">Manage Appointments</span>
                  <ArrowRight className="w-4 h-4 text-white/40 ml-auto" />
                </motion.div>
              </Link>
              <Link to="/doctor/availability">
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <Clock className="w-5 h-5 text-accent-purple" />
                  <span className="text-white/80">Set Availability</span>
                  <ArrowRight className="w-4 h-4 text-white/40 ml-auto" />
                </motion.div>
              </Link>
              <Link to="/doctor/patients">
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <Users className="w-5 h-5 text-accent-teal" />
                  <span className="text-white/80">View Patients</span>
                  <ArrowRight className="w-4 h-4 text-white/40 ml-auto" />
                </motion.div>
              </Link>
            </div>
          </GlassCard>
        </div>
      </div>
    </DashboardLayout>
  )
}

export default DoctorDashboard
