import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { 
 Calendar,
 Users,
 Stethoscope,
 TrendingUp,
 TrendingDown,
 Clock,
 CheckCircle,
 XCircle,
 BarChart3,
 Activity,
 PieChart,
 ArrowRight
} from 'lucide-react'
import { format, subDays, startOfWeek, startOfMonth, endOfWeek, endOfMonth, eachDayOfInterval, isWithinInterval } from 'date-fns'
import toast from 'react-hot-toast'
import useAuthStore from '../../store/authStore'
import { getAppointments, getDoctors, getPatients, getAnalytics } from '../../services/api'
import { DashboardLayout } from '../../components/layout'
import { GlassCard, Badge, Button, Select } from '../../components/ui'
import { StatCard } from '../../components/shared'

const MediatorAnalyticsPage = () => {
 const { user } = useAuthStore()
 const [isLoading, setIsLoading] = useState(true)
 const [appointments, setAppointments] = useState([])
 const [doctors, setDoctors] = useState([])
 const [patients, setPatients] = useState([])
 const [analytics, setAnalytics] = useState(null)
 const [reportPeriod, setReportPeriod] = useState('week')

 useEffect(() => {
 fetchData()
 }, [])

 const fetchData = async () => {
 try {
 setIsLoading(true)
 const [appointmentsData, doctorsData, patientsData, analyticsData] = await Promise.all([
 getAppointments({}).catch(() => []),
 getDoctors({}).catch(() => []),
 getPatients({}).catch(() => []),
 getAnalytics().catch(() => null)
 ])
 
 setAppointments(appointmentsData || [])
 setDoctors(doctorsData || [])
 setPatients(patientsData || [])
 setAnalytics(analyticsData)
 } catch (error) {
 console.error('Error fetching data:', error)
 } finally {
 setIsLoading(false)
 }
 }

 // Calculate stats
 const stats = useMemo(() => {
 const now = new Date()
 let startDate, endDate

 if (reportPeriod === 'week') {
 startDate = startOfWeek(now)
 endDate = endOfWeek(now)
 } else if (reportPeriod === 'month') {
 startDate = startOfMonth(now)
 endDate = endOfMonth(now)
 } else {
 startDate = subDays(now, 6)
 endDate = now
 }

 const filteredAppointments = appointments.filter(apt => {
 const aptDate = new Date(apt.date)
 return isWithinInterval(aptDate, { start: startDate, end: endDate })
 })

 const byStatus = filteredAppointments.reduce((acc, apt) => {
 acc[apt.status] = (acc[apt.status] || 0) + 1
 return acc
 }, {})

 const byDate = filteredAppointments.reduce((acc, apt) => {
 const dateKey = format(new Date(apt.date), 'yyyy-MM-dd')
 acc[dateKey] = (acc[dateKey] || 0) + 1
 return acc
 }, {})

 // Previous period comparison
 const periodLength = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24))
 const prevStartDate = subDays(startDate, periodLength)
 const prevEndDate = subDays(endDate, periodLength)

 const prevAppointments = appointments.filter(apt => {
 const aptDate = new Date(apt.date)
 return isWithinInterval(aptDate, { start: prevStartDate, end: prevEndDate })
 })

 const currentCount = filteredAppointments.length
 const prevCount = prevAppointments.length
 const percentChange = prevCount > 0 ? ((currentCount - prevCount) / prevCount) * 100 : 0

 return {
 total: currentCount,
 previousTotal: prevCount,
 percentChange,
 byStatus,
 byDate,
 periodStart: format(startDate, 'MMM d'),
 periodEnd: format(endDate, 'MMM d, yyyy'),
 completed: byStatus.completed || 0,
 pending: byStatus.pending || 0,
 confirmed: byStatus.confirmed || 0,
 cancelled: byStatus.cancelled || 0,
 rejected: byStatus.rejected || 0
 }
 }, [appointments, reportPeriod])

 // Top doctors
 const topDoctors = useMemo(() => {
 const doctorAppointments = appointments.reduce((acc, apt) => {
 if (apt.doctor_id) {
 acc[apt.doctor_id] = (acc[apt.doctor_id] || 0) + 1
 }
 return acc
 }, {})

 return Object.entries(doctorAppointments)
 .map(([doctorId, count]) => {
 const doctor = doctors.find(d => d.id === doctorId)
 return {
 id: doctorId,
 name: doctor?.full_name || 'Unknown',
 specialization: doctor?.specialization || 'N/A',
 count
 }
 })
 .sort((a, b) => b.count - a.count)
 .slice(0, 5)
 }, [appointments, doctors])

 return (
 <DashboardLayout>
 <div className="mb-8">
 <motion.h1
 initial={{ opacity: 0, y: -10 }}
 animate={{ opacity: 1, y: 0 }}
 className="text-2xl font-bold text-gray-800 mb-2"
 >
 View Analytics
 </motion.h1>
 <motion.p
 initial={{ opacity: 0, y: -10 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: 0.1 }}
 className="text-gray-600"
 >
 View reports and analytics for appointments, doctors, and patients
 </motion.p>
 </div>

 {/* Period Selector */}
 <div className="flex gap-2 mb-6">
 {['week', 'month', '7days'].map((period) => (
 <button
 key={period}
 onClick={() => setReportPeriod(period)}
 className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
 reportPeriod === period
 ? 'bg-primary-500 text-gray-800'
 : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
 }`}
 >
 {period === 'week' ? 'This Week' : period === 'month' ? 'This Month' : 'Last 7 Days'}
 </button>
 ))}
 </div>

 {/* Main Stats */}
 <div className="grid grid-cols-1 gap-4 mb-8">
 <GlassCard className="p-6">
 <div className="flex items-center justify-between mb-4">
 <div className="w-12 h-12 rounded-xl bg-primary-500/20 flex items-center justify-center">
 <Calendar className="w-6 h-6 text-primary-400" />
 </div>
 <div className={`flex items-center gap-1 text-sm ${stats.percentChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
 {stats.percentChange >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
 {Math.abs(stats.percentChange).toFixed(1)}%
 </div>
 </div>
 <p className="text-3xl font-bold text-gray-800">{stats.total}</p>
 <p className="text-sm text-gray-600">
 Appointments ({stats.periodStart} - {stats.periodEnd})
 </p>
 </GlassCard>

 <GlassCard className="p-6">
 <div className="flex items-center justify-between mb-4">
 <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
 <CheckCircle className="w-6 h-6 text-green-400" />
 </div>
 </div>
 <p className="text-3xl font-bold text-gray-800">{stats.completed}</p>
 <p className="text-sm text-gray-600">Completed</p>
 </GlassCard>

 <GlassCard className="p-6">
 <div className="flex items-center justify-between mb-4">
 <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center">
 <Clock className="w-6 h-6 text-yellow-400" />
 </div>
 </div>
 <p className="text-3xl font-bold text-gray-800">{stats.pending}</p>
 <p className="text-sm text-gray-600">Pending</p>
 </GlassCard>

 <GlassCard className="p-6">
 <div className="flex items-center justify-between mb-4">
 <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
 <Stethoscope className="w-6 h-6 text-blue-400" />
 </div>
 </div>
 <p className="text-3xl font-bold text-gray-800">{doctors.length}</p>
 <p className="text-sm text-gray-600">Total Doctors</p>
 </GlassCard>
 </div>

 <div className="grid grid-cols-1 gap-6">
 {/* Status Breakdown */}
 <GlassCard className="p-6">
 <h3 className="text-lg font-semibold text-gray-800 mb-4">Appointment Status</h3>
 <div className="space-y-4">
 {Object.entries(stats.byStatus).length > 0 ? (
 Object.entries(stats.byStatus).map(([status, count]) => (
 <div key={status}>
 <div className="flex items-center justify-between mb-1">
 <span className="text-gray-700 capitalize">{status}</span>
 <span className="text-gray-800 font-medium">{count}</span>
 </div>
 <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
 <motion.div
 initial={{ width: 0 }}
 animate={{ width: `${(count / stats.total) * 100}%` }}
 className={`h-full rounded-full ${
 status === 'completed' ? 'bg-green-500' :
 status === 'confirmed' ? 'bg-blue-500' :
 status === 'pending' ? 'bg-yellow-500' :
 'bg-red-500'
 }`}
 />
 </div>
 </div>
 ))
 ) : (
 <p className="text-gray-500 text-center py-4">No data available</p>
 )}
 </div>
 </GlassCard>

 {/* Top Doctors */}
 <GlassCard className="p-6">
 <h3 className="text-lg font-semibold text-gray-800 mb-4">Top Doctors</h3>
 <div className="space-y-4">
 {topDoctors.length > 0 ? (
 topDoctors.map((doctor, index) => (
 <div key={doctor.id} className="flex items-center gap-4">
 <div className="w-8 h-8 rounded-full bg-primary-500/20 flex items-center justify-center text-primary-400 font-bold">
 {index + 1}
 </div>
 <div className="flex-1">
 <p className="text-gray-800 font-medium">Dr. {doctor.name}</p>
 <p className="text-xs text-gray-500">{doctor.specialization}</p>
 </div>
 <div className="text-right">
 <p className="text-gray-800 font-bold">{doctor.count}</p>
 <p className="text-xs text-gray-500">appointments</p>
 </div>
 </div>
 ))
 ) : (
 <p className="text-gray-500 text-center py-4">No data available</p>
 )}
 </div>
 </GlassCard>
 </div>

 {/* Overall Stats */}
 <div className="grid grid-cols-1 gap-4 mt-6">
 <GlassCard className="p-6">
 <div className="flex items-center gap-4">
 <div className="w-12 h-12 rounded-xl bg-teal-500/20 flex items-center justify-center">
 <Users className="w-6 h-6 text-teal-400" />
 </div>
 <div>
 <p className="text-2xl font-bold text-gray-800">{patients.length}</p>
 <p className="text-sm text-gray-600">Total Patients</p>
 </div>
 </div>
 </GlassCard>

 <GlassCard className="p-6">
 <div className="flex items-center gap-4">
 <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
 <Stethoscope className="w-6 h-6 text-purple-400" />
 </div>
 <div>
 <p className="text-2xl font-bold text-gray-800">{doctors.length}</p>
 <p className="text-sm text-gray-600">Total Doctors</p>
 </div>
 </div>
 </GlassCard>

 <GlassCard className="p-6">
 <div className="flex items-center gap-4">
 <div className="w-12 h-12 rounded-xl bg-pink-500/20 flex items-center justify-center">
 <Activity className="w-6 h-6 text-pink-400" />
 </div>
 <div>
 <p className="text-2xl font-bold text-gray-800">{appointments.length}</p>
 <p className="text-sm text-gray-600">Total Appointments</p>
 </div>
 </div>
 </GlassCard>
 </div>
 </DashboardLayout>
 )
}

export default MediatorAnalyticsPage



