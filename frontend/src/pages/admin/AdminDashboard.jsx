import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { 
  Users, 
  Stethoscope, 
  Calendar,
  Activity,
  ArrowRight,
  Clock,
  UserPlus,
  AlertCircle
} from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import useAuthStore from '../../store/authStore'
import { getAnalytics, getWalkInQueue, getAppointments } from '../../services/api'
import { DashboardLayout } from '../../components/layout'
import { GlassCard, Badge, Avatar, Button } from '../../components/ui'
import { StatCard, EmptyState } from '../../components/shared'
import { StatCardSkeleton, CardSkeleton } from '../../components/ui/Skeleton'

const AdminDashboard = () => {
  const { user } = useAuthStore()
  const userName = user?.fullName || user?.email?.split('@')[0] || 'Admin'
  const [isLoading, setIsLoading] = useState(true)
  const [analytics, setAnalytics] = useState({
    totalPatients: 0,
    totalDoctors: 0,
    totalAppointments: 0,
    appointmentsToday: 0,
    pendingVerifications: 0,
    appointmentsByStatus: {},
  })
  const [walkInQueue, setWalkInQueue] = useState([])
  const [recentAppointments, setRecentAppointments] = useState([])

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Fetch analytics - wrapped in try/catch
        try {
          const analyticsData = await getAnalytics()
          setAnalytics(analyticsData || {
            totalPatients: 0,
            totalDoctors: 0,
            totalAppointments: 0,
            appointmentsToday: 0,
            revenue: 0,
            avgRating: 0,
          })
        } catch (e) {
          setAnalytics({
            totalPatients: 0,
            totalDoctors: 0,
            totalAppointments: 0,
            appointmentsToday: 0,
            revenue: 0,
            avgRating: 0,
          })
        }

        // Fetch walk-in queue
        try {
          const queueData = await getWalkInQueue({ status: 'waiting' })
          setWalkInQueue(queueData || [])
        } catch (e) {
          setWalkInQueue([])
        }

        // Fetch recent appointments
        try {
          const appointmentsData = await getAppointments({})
          setRecentAppointments(appointmentsData?.slice(0, 5) || [])
        } catch (e) {
          setRecentAppointments([])
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error)
        // Don't show error toast - just show empty state
      } finally {
        setIsLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="mb-8">
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-bold text-white mb-2"
        >
          Admin Dashboard
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-white/60"
        >
          Welcome back, {userName?.split(' ')[0] || 'Admin'}! Here's your hospital overview.
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
              title="Total Patients"
              value={analytics.totalPatients}
              icon={Users}
              color="primary"
              delay={0}
            />
            <StatCard
              title="Total Doctors"
              value={analytics.totalDoctors}
              icon={Stethoscope}
              color="purple"
              delay={0.1}
            />
            <StatCard
              title="Today's Appointments"
              value={analytics.appointmentsToday}
              icon={Calendar}
              color="teal"
              delay={0.2}
            />
            <StatCard
              title="Pending Verifications"
              value={analytics.pendingVerifications}
              icon={AlertCircle}
              color="pink"
              delay={0.3}
            />
          </>
        )}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Walk-in Queue */}
        <div className="lg:col-span-2">
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-white">Walk-in Queue</h2>
              <Link to="/admin/walk-in">
                <Button variant="ghost" size="sm">
                  Manage Queue
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>

            {isLoading ? (
              <div className="space-y-4">
                <CardSkeleton />
                <CardSkeleton />
              </div>
            ) : walkInQueue.length > 0 ? (
              <div className="space-y-3">
                {walkInQueue.slice(0, 5).map((patient, index) => (
                  <motion.div
                    key={patient.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center gap-4 p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary-500/20">
                      <span className="text-lg font-bold text-primary-400">
                        {patient.token?.split('-')[1]}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white">
                        {patient.name}
                      </p>
                      <p className="text-sm text-white/60">
                        {patient.reason || 'No reason specified'}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge variant="warning">Waiting</Badge>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Users}
                title="Queue is empty"
                description="No patients in the walk-in queue."
                action={
                  <Link to="/admin/walk-in">
                    <Button variant="primary" size="sm">
                      <UserPlus className="w-4 h-4" />
                      Add Walk-in
                    </Button>
                  </Link>
                }
              />
            )}
          </GlassCard>

          {/* Recent Appointments */}
          <GlassCard className="p-6 mt-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-white">Recent Appointments</h2>
              <Link to="/admin/appointments">
                <Button variant="ghost" size="sm">
                  View All
                </Button>
              </Link>
            </div>

            {isLoading ? (
              <div className="space-y-4">
                <CardSkeleton />
                <CardSkeleton />
              </div>
            ) : recentAppointments.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="text-left text-sm text-white/60 pb-3">Patient</th>
                      <th className="text-left text-sm text-white/60 pb-3">Doctor</th>
                      <th className="text-left text-sm text-white/60 pb-3">Date</th>
                      <th className="text-left text-sm text-white/60 pb-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentAppointments.map((apt, index) => (
                      <motion.tr
                        key={apt.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="border-t border-white/5"
                      >
                        <td className="py-3">
                          <span className="text-white">{apt.patient_name}</span>
                        </td>
                        <td className="py-3">
                          <span className="text-white/80">{apt.doctor_name}</span>
                        </td>
                        <td className="py-3">
                          <span className="text-white/60">
                            {format(new Date(apt.date), 'MMM d, yyyy')}
                          </span>
                        </td>
                        <td className="py-3">
                          <Badge
                            variant={
                              apt.status === 'completed' ? 'success' :
                              apt.status === 'confirmed' ? 'primary' :
                              apt.status === 'cancelled' ? 'error' : 'warning'
                            }
                          >
                            {apt.status}
                          </Badge>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                icon={Calendar}
                title="No appointments"
                description="No recent appointments to display."
              />
            )}
          </GlassCard>
        </div>

        {/* Quick Stats & Actions */}
        <div className="space-y-6">
          {/* Appointment Status */}
          <GlassCard className="p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Appointment Status</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-warning" />
                  <span className="text-white/70">Pending</span>
                </div>
                <span className="text-white font-medium">{analytics.statusCounts?.pending || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-primary-500" />
                  <span className="text-white/70">Confirmed</span>
                </div>
                <span className="text-white font-medium">{analytics.statusCounts?.confirmed || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-success" />
                  <span className="text-white/70">Completed</span>
                </div>
                <span className="text-white font-medium">{analytics.statusCounts?.completed || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-error" />
                  <span className="text-white/70">Cancelled</span>
                </div>
                <span className="text-white font-medium">{analytics.statusCounts?.cancelled || 0}</span>
              </div>
            </div>
          </GlassCard>

          {/* Quick Actions */}
          <GlassCard className="p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <Link to="/admin/walk-in">
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <UserPlus className="w-5 h-5 text-primary-400" />
                  <span className="text-white/80">Add Walk-in Patient</span>
                  <ArrowRight className="w-4 h-4 text-white/40 ml-auto" />
                </motion.div>
              </Link>
              <Link to="/admin/doctors">
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <Stethoscope className="w-5 h-5 text-accent-purple" />
                  <span className="text-white/80">Manage Doctors</span>
                  <ArrowRight className="w-4 h-4 text-white/40 ml-auto" />
                </motion.div>
              </Link>
              <Link to="/admin/patients">
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
              <Link to="/admin/analytics">
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <Activity className="w-5 h-5 text-accent-pink" />
                  <span className="text-white/80">View Analytics</span>
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

export default AdminDashboard
