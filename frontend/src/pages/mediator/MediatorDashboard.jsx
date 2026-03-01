import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
 Calendar,
 Users,
 Stethoscope,
 Activity,
 ArrowRight,
 Clock,
 CheckCircle,
 XCircle,
 Filter,
 Search,
 ChevronDown,
 Eye,
 CalendarDays,
 BarChart3,
 TrendingUp,
 AlertCircle
} from 'lucide-react'
import { format, subDays, startOfWeek, startOfMonth, endOfWeek, endOfMonth, eachDayOfInterval, isWithinInterval } from 'date-fns'
import toast from 'react-hot-toast'
import useAuthStore from '../../store/authStore'
import { getAppointments, getDoctors, getPatients, updateAppointment, getAnalytics } from '../../services/api'
import { DashboardLayout } from '../../components/layout'
import { GlassCard, Badge, Button, Modal, Input, Select } from '../../components/ui'
import { StatCard, EmptyState } from '../../components/shared'
import { StatCardSkeleton, CardSkeleton } from '../../components/ui/Skeleton'

// Status configuration
const statusConfig = {
 pending: { label: 'Pending', color: 'warning', bgColor: 'bg-yellow-500/20', textColor: 'text-yellow-400' },
 confirmed: { label: 'Confirmed', color: 'primary', bgColor: 'bg-blue-500/20', textColor: 'text-blue-400' },
 completed: { label: 'Completed', color: 'success', bgColor: 'bg-green-500/20', textColor: 'text-green-400' },
 cancelled: { label: 'Cancelled', color: 'error', bgColor: 'bg-red-500/20', textColor: 'text-red-400' },
 rejected: { label: 'Rejected', color: 'error', bgColor: 'bg-red-500/20', textColor: 'text-red-400' },
}

const MediatorDashboard = () => {
 const { user } = useAuthStore()
 const userName = user?.fullName || user?.email?.split('@')[0] || 'Mediator'

 // State
 const [isLoading, setIsLoading] = useState(true)
 const [appointments, setAppointments] = useState([])
 const [doctors, setDoctors] = useState([])
 const [patients, setPatients] = useState([])
 const [analytics, setAnalytics] = useState(null)

 // Filter state
 const [filters, setFilters] = useState({
 doctor: '',
 patient: '',
 date: '',
 status: '',
 search: '',
 })
 const [showFilters, setShowFilters] = useState(false)

 // Modal state
 const [selectedAppointment, setSelectedAppointment] = useState(null)
 const [showDetailsModal, setShowDetailsModal] = useState(false)
 const [showRescheduleModal, setShowRescheduleModal] = useState(false)
 const [rescheduleData, setRescheduleData] = useState({ date: '', time: '' })

 // Report state
 const [reportPeriod, setReportPeriod] = useState('week')
 const [reportData, setReportData] = useState(null)

 // Fetch all data
 useEffect(() => {
 const fetchData = async () => {
 try {
 const [appointmentsData, doctorsData, patientsData, analyticsData] = await Promise.all([
 getAppointments({}).catch(() => []),
 getDoctors({}).catch(() => []),
 getPatients({}).catch(() => []),
 getAnalytics().catch(() => null),
 ])

 setAppointments(appointmentsData || [])
 setDoctors(doctorsData || [])
 setPatients(patientsData || [])
 setAnalytics(analyticsData)
 } catch (error) {
 console.error('Error fetching data:', error)
 toast.error('Failed to load dashboard data')
 } finally {
 setIsLoading(false)
 }
 }

 fetchData()
 }, [])

 // Filtered appointments
 const filteredAppointments = useMemo(() => {
 return appointments.filter(apt => {
 if (filters.doctor && apt.doctor_id !== filters.doctor) return false
 if (filters.patient && apt.patient_id !== filters.patient) return false
 if (filters.date && apt.date !== filters.date) return false
 if (filters.status && apt.status !== filters.status) return false
 if (filters.search) {
 const searchLower = filters.search.toLowerCase()
 return (
 apt.patient_name?.toLowerCase().includes(searchLower) ||
 apt.doctor_name?.toLowerCase().includes(searchLower) ||
 apt.specialization?.toLowerCase().includes(searchLower)
 )
 }
 return true
 })
 }, [appointments, filters])

 // Calculate report data
 useEffect(() => {
 if (!appointments.length) {
 setReportData(null)
 return
 }

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

 const filteredByPeriod = appointments.filter(apt => {
 const aptDate = new Date(apt.date)
 return isWithinInterval(aptDate, { start: startDate, end: endDate })
 })

 // Group by date
 const byDate = filteredByPeriod.reduce((acc, apt) => {
 const dateKey = format(new Date(apt.date), 'yyyy-MM-dd')
 acc[dateKey] = (acc[dateKey] || 0) + 1
 return acc
 }, {})

 // Status breakdown
 const byStatus = filteredByPeriod.reduce((acc, apt) => {
 acc[apt.status] = (acc[apt.status] || 0) + 1
 return acc
 }, {})

 setReportData({
 total: filteredByPeriod.length,
 byDate,
 byStatus,
 periodStart: format(startDate, 'MMM d'),
 periodEnd: format(endDate, 'MMM d, yyyy'),
 })
 }, [appointments, reportPeriod])

 // Handle appointment actions
 const handleApproveAppointment = async (appointmentId) => {
 try {
 await updateAppointment(appointmentId, { status: 'confirmed' })
 setAppointments(prev =>
 prev.map(apt => apt.id === appointmentId ? { ...apt, status: 'confirmed' } : apt)
 )
 toast.success('Appointment approved successfully')
 } catch (error) {
 toast.error('Failed to approve appointment')
 }
 }

 const handleRejectAppointment = async (appointmentId) => {
 try {
 await updateAppointment(appointmentId, { status: 'rejected' })
 setAppointments(prev =>
 prev.map(apt => apt.id === appointmentId ? { ...apt, status: 'rejected' } : apt)
 )
 toast.success('Appointment rejected')
 } catch (error) {
 toast.error('Failed to reject appointment')
 }
 }

 const handleReschedule = async () => {
 if (!selectedAppointment || !rescheduleData.date || !rescheduleData.time) {
 toast.error('Please select date and time')
 return
 }

 try {
 await updateAppointment(selectedAppointment.id, {
 date: rescheduleData.date,
 time: rescheduleData.time,
 status: 'pending',
 })
 setAppointments(prev =>
 prev.map(apt => apt.id === selectedAppointment.id
 ? { ...apt, date: rescheduleData.date, time: rescheduleData.time, status: 'pending' }
 : apt
 )
 )
 setShowRescheduleModal(false)
 setSelectedAppointment(null)
 setRescheduleData({ date: '', time: '' })
 toast.success('Appointment rescheduled successfully')
 } catch (error) {
 toast.error('Failed to reschedule appointment')
 }
 }

 // Stats calculation
 const stats = useMemo(() => {
 const pending = appointments.filter(a => a.status === 'pending').length
 const confirmed = appointments.filter(a => a.status === 'confirmed').length
 const completed = appointments.filter(a => a.status === 'completed').length
 const today = format(new Date(), 'yyyy-MM-dd')
 const todayAppointments = appointments.filter(a => a.date === today).length

 return {
 total: appointments.length,
 pending,
 confirmed,
 completed,
 today: todayAppointments,
 totalDoctors: doctors.length,
 totalPatients: patients.length,
 }
 }, [appointments, doctors, patients])

 // Time slots for reschedule
 const timeSlots = [
 '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
 '12:00 PM', '12:30 PM', '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM',
 '04:00 PM', '04:30 PM', '05:00 PM', '05:30 PM'
 ]

 return (
 <DashboardLayout>
 {/* Mobile-Friendly Header Area */}
 <div className="mb-6 mt-2">
 <motion.h1
 initial={{ opacity: 0, y: -10 }}
 animate={{ opacity: 1, y: 0 }}
 className="text-2xl font-bold text-gray-900 mb-1"
 >
 Hi, {userName?.split(' ')[0] || 'Mediator'}
 </motion.h1>
 <p className="text-gray-500 text-sm">
 Overview & Management Dashboard
 </p>
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
 <StatCard title="Appointments" value={stats.total} icon={Calendar} color="primary" delay={0} />
 </div>
 <div className="min-w-[140px] shrink-0 snap-start">
 <StatCard title="Pending" value={stats.pending} icon={Clock} color="purple" delay={0.1} />
 </div>
 <div className="min-w-[140px] shrink-0 snap-start">
 <StatCard title="Today" value={stats.today} icon={CalendarDays} color="teal" delay={0.2} />
 </div>
 <div className="min-w-[140px] shrink-0 snap-start">
 <StatCard title="Doctors" value={stats.totalDoctors} icon={Stethoscope} color="pink" delay={0.3} />
 </div>
 </>
 )}
 </div>

 {/* Main Single Column Content mapping */}
 <div className="space-y-6">
 {/* Appointments Section */}
 <div className="space-y-4">
 {/* Filters */}
 <GlassCard className="p-4">
 <div className="flex flex-wrap items-center gap-4">
 {/* Search */}
 <div className="flex-1 min-w-[200px]">
 <div className="relative">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
 <input
 type="text"
 placeholder="Search appointments..."
 value={filters.search}
 onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
 className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-800 placeholder:text-gray-500 focus:outline-none focus:border-primary-500"
 />
 </div>
 </div>

 {/* Filter Toggle */}
 <Button
 variant="ghost"
 size="sm"
 onClick={() => setShowFilters(!showFilters)}
 className="flex items-center gap-2"
 >
 <Filter className="w-4 h-4" />
 Filters
 <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
 </Button>

 {/* Quick Status Filter */}
 <div className="flex gap-2">
 {['pending', 'confirmed', 'completed'].map((status) => (
 <button
 key={status}
 onClick={() => setFilters(prev => ({ ...prev, status: prev.status === status ? '' : status }))}
 className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${filters.status === status
 ? 'bg-primary-500 text-gray-800'
 : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
 }`}
 >
 {status.charAt(0).toUpperCase() + status.slice(1)}
 </button>
 ))}
 </div>
 </div>

 {/* Expanded Filters */}
 {showFilters && (
 <motion.div
 initial={{ height: 0, opacity: 0 }}
 animate={{ height: 'auto', opacity: 1 }}
 exit={{ height: 0, opacity: 0 }}
 className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-1 gap-4"
 >
 <div>
 <label className="block text-sm text-gray-600 mb-1">Doctor</label>
 <select
 value={filters.doctor}
 onChange={(e) => setFilters(prev => ({ ...prev, doctor: e.target.value }))}
 className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-800 focus:outline-none focus:border-primary-500"
 >
 <option value="">All Doctors</option>
 {doctors.map(doc => (
 <option key={doc.id} value={doc.id}>{doc.full_name}</option>
 ))}
 </select>
 </div>
 <div>
 <label className="block text-sm text-gray-600 mb-1">Date</label>
 <input
 type="date"
 value={filters.date}
 onChange={(e) => setFilters(prev => ({ ...prev, date: e.target.value }))}
 className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-800 focus:outline-none focus:border-primary-500"
 />
 </div>
 <div>
 <label className="block text-sm text-gray-600 mb-1">Status</label>
 <select
 value={filters.status}
 onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
 className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-800 focus:outline-none focus:border-primary-500"
 >
 <option value="">All Status</option>
 <option value="pending">Pending</option>
 <option value="confirmed">Confirmed</option>
 <option value="completed">Completed</option>
 <option value="cancelled">Cancelled</option>
 <option value="rejected">Rejected</option>
 </select>
 </div>
 </motion.div>
 )}
 </GlassCard>

 {/* Appointments List View (Mobile Friendly) */}
 <GlassCard className="p-5">
 <div className="flex items-center justify-between mb-4">
 <h2 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-2 flex-1">All Appointments</h2>
 </div>

 {isLoading ? (
 <div className="space-y-4">
 <CardSkeleton />
 <CardSkeleton />
 </div>
 ) : filteredAppointments.length > 0 ? (
 <div className="space-y-3">
 {filteredAppointments.map((apt, index) => (
 <motion.div
 key={apt.id}
 initial={{ opacity: 0, y: 10 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: index * 0.03 }}
 className="p-3 bg-gray-50 border border-gray-100 rounded-xl"
 >
 <div className="flex justify-between items-start mb-2">
 <div className="flex items-center gap-2">
 <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">
 {apt.patient_name?.charAt(0) || 'P'}
 </div>
 <div>
 <p className="text-sm font-bold text-gray-900">{apt.patient_name}</p>
 <p className="text-[10px] text-gray-500">Dr. {apt.doctor_name}</p>
 </div>
 </div>
 <Badge variant={statusConfig[apt.status]?.color || 'default'}>
 {statusConfig[apt.status]?.label || apt.status}
 </Badge>
 </div>

 <div className="flex items-center justify-between mt-3 text-xs text-gray-600 px-1 border-t border-gray-100 pt-2">
 <div className="flex items-center gap-1">
 <CalendarDays className="w-3 h-3 text-gray-400" />
 <span>{format(new Date(apt.date), 'MMM d, yy')}</span>
 </div>
 <div className="flex items-center gap-1">
 <Clock className="w-3 h-3 text-gray-400" />
 <span>{apt.time}</span>
 </div>
 </div>

 {/* Actions */}
 <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
 <button
 onClick={() => {
 setSelectedAppointment(apt)
 setShowDetailsModal(true)
 }}
 className="flex items-center justify-center gap-1 py-1.5 px-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 font-medium"
 >
 <Eye className="w-3 h-3" /> View
 </button>

 {['pending', 'confirmed'].includes(apt.status) && (
 <button
 onClick={() => {
 setSelectedAppointment(apt)
 setRescheduleData({ date: apt.date, time: apt.time })
 setShowRescheduleModal(true)
 }}
 className="flex items-center justify-center gap-1 py-1.5 px-2 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 font-medium"
 >
 <CalendarDays className="w-3 h-3" /> Reschedule
 </button>
 )}
 </div>

 {apt.status === 'pending' && (
 <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
 <button
 onClick={() => handleApproveAppointment(apt.id)}
 className="flex items-center justify-center gap-1 py-1.5 px-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 font-medium"
 >
 <CheckCircle className="w-3 h-3" /> Approve
 </button>
 <button
 onClick={() => handleRejectAppointment(apt.id)}
 className="flex items-center justify-center gap-1 py-1.5 px-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 font-medium"
 >
 <XCircle className="w-3 h-3" /> Reject
 </button>
 </div>
 )}
 </motion.div>
 ))}
 </div>
 ) : (
 <EmptyState
 icon={Calendar}
 title="No appointments"
 description="Try adjusting your filters."
 />
 )}
 </GlassCard>
 </div>

 {/* Supplementary Section */}
 <div className="space-y-6">
 {/* Reports Card */}
 <GlassCard className="p-6">
 <div className="flex items-center justify-between mb-4">
 <h2 className="text-lg font-semibold text-gray-800">Reports</h2>
 <select
 value={reportPeriod}
 onChange={(e) => setReportPeriod(e.target.value)}
 className="px-2 py-1 bg-gray-50 border border-gray-200 rounded text-sm text-gray-800 focus:outline-none"
 >
 <option value="week">This Week</option>
 <option value="month">This Month</option>
 <option value="7days">Last 7 Days</option>
 </select>
 </div>

 {reportData ? (
 <div className="space-y-4">
 <div className="text-center py-4">
 <p className="text-3xl font-bold text-gray-800">{reportData.total}</p>
 <p className="text-sm text-gray-600">
 Appointments ({reportData.periodStart} - {reportData.periodEnd})
 </p>
 </div>

 {/* Status Breakdown */}
 <div className="space-y-2">
 <p className="text-sm text-gray-600">Status Breakdown</p>
 {Object.entries(reportData.byStatus).map(([status, count]) => (
 <div key={status} className="flex items-center justify-between">
 <div className="flex items-center gap-2">
 <div className={`w-2 h-2 rounded-full ${status === 'completed' ? 'bg-green-500' :
 status === 'confirmed' ? 'bg-blue-500' :
 status === 'pending' ? 'bg-yellow-500' :
 'bg-red-500'
 }`} />
 <span className="text-sm text-gray-700 capitalize">{status}</span>
 </div>
 <span className="text-sm font-medium text-gray-800">{count}</span>
 </div>
 ))}
 </div>

 {/* TODO: Add chart visualization */}
 <div className="pt-4 border-t border-gray-200">
 <p className="text-xs text-gray-500 italic">
 TODO: Add chart visualization for appointment trends
 </p>
 </div>
 </div>
 ) : (
 <div className="text-center py-8 text-gray-500">
 <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-50" />
 <p className="text-sm">No data available</p>
 </div>
 )}
 </GlassCard>

 {/* Quick Stats */}
 <GlassCard className="p-6">
 <h2 className="text-lg font-semibold text-gray-800 mb-4">Overview</h2>
 <div className="space-y-4">
 <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
 <Clock className="w-5 h-5 text-yellow-400" />
 </div>
 <span className="text-gray-700">Pending</span>
 </div>
 <span className="text-xl font-bold text-gray-800">{stats.pending}</span>
 </div>
 <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
 <CheckCircle className="w-5 h-5 text-blue-400" />
 </div>
 <span className="text-gray-700">Confirmed</span>
 </div>
 <span className="text-xl font-bold text-gray-800">{stats.confirmed}</span>
 </div>
 <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
 <Activity className="w-5 h-5 text-green-400" />
 </div>
 <span className="text-gray-700">Completed</span>
 </div>
 <span className="text-xl font-bold text-gray-800">{stats.completed}</span>
 </div>
 </div>
 </GlassCard>

 {/* Quick Actions */}
 <GlassCard className="p-6">
 <h2 className="text-lg font-semibold text-gray-800 mb-4">Quick Actions</h2>
 <div className="space-y-3">
 <Link to="/mediator/departments">
 <motion.div
 whileHover={{ scale: 1.02 }}
 whileTap={{ scale: 0.98 }}
 className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
 >
 <Stethoscope className="w-5 h-5 text-primary-400" />
 <span className="text-gray-700">Departments</span>
 <ArrowRight className="w-4 h-4 text-gray-500 ml-auto" />
 </motion.div>
 </Link>
 <Link to="/mediator/queue">
 <motion.div
 whileHover={{ scale: 1.02 }}
 whileTap={{ scale: 0.98 }}
 className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
 >
 <Activity className="w-5 h-5 text-green-400" />
 <span className="text-gray-700">Queue Management</span>
 <ArrowRight className="w-4 h-4 text-gray-500 ml-auto" />
 </motion.div>
 </Link>
 <Link to="/admin/walk-in">
 <motion.div
 whileHover={{ scale: 1.02 }}
 whileTap={{ scale: 0.98 }}
 className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
 >
 <Users className="w-5 h-5 text-yellow-400" />
 <span className="text-gray-700">Walk-in Queue</span>
 <ArrowRight className="w-4 h-4 text-gray-500 ml-auto" />
 </motion.div>
 </Link>
 <Link to="/mediator/doctors">
 <motion.div
 whileHover={{ scale: 1.02 }}
 whileTap={{ scale: 0.98 }}
 className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
 >
 <Stethoscope className="w-5 h-5 text-primary-400" />
 <span className="text-gray-700">Manage Doctors</span>
 <ArrowRight className="w-4 h-4 text-gray-500 ml-auto" />
 </motion.div>
 </Link>
 <Link to="/mediator/patients">
 <motion.div
 whileHover={{ scale: 1.02 }}
 whileTap={{ scale: 0.98 }}
 className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
 >
 <Users className="w-5 h-5 text-accent-teal" />
 <span className="text-gray-700">View Patients</span>
 <ArrowRight className="w-4 h-4 text-gray-500 ml-auto" />
 </motion.div>
 </Link>
 <Link to="/mediator/analytics">
 <motion.div
 whileHover={{ scale: 1.02 }}
 whileTap={{ scale: 0.98 }}
 className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
 >
 <TrendingUp className="w-5 h-5 text-accent-pink" />
 <span className="text-gray-700">View Analytics</span>
 <ArrowRight className="w-4 h-4 text-gray-500 ml-auto" />
 </motion.div>
 </Link>
 </div>
 </GlassCard>
 </div>
 </div>

 {/* Appointment Details Modal */}
 <Modal
 isOpen={showDetailsModal}
 onClose={() => {
 setShowDetailsModal(false)
 setSelectedAppointment(null)
 }}
 title="Appointment Details"
 >
 {selectedAppointment && (
 <div className="space-y-4">
 <div className="grid grid-cols-2 gap-4">
 <div>
 <p className="text-sm text-gray-600">Patient</p>
 <p className="text-gray-800 font-medium">{selectedAppointment.patient_name}</p>
 </div>
 <div>
 <p className="text-sm text-gray-600">Doctor</p>
 <p className="text-gray-800 font-medium">Dr. {selectedAppointment.doctor_name}</p>
 </div>
 <div>
 <p className="text-sm text-gray-600">Specialization</p>
 <p className="text-gray-800">{selectedAppointment.specialization || 'N/A'}</p>
 </div>
 <div>
 <p className="text-sm text-gray-600">Mode</p>
 <p className="text-gray-800">{selectedAppointment.mode === 'online' ? 'Video Call' : 'In-Person'}</p>
 </div>
 <div>
 <p className="text-sm text-gray-600">Date</p>
 <p className="text-gray-800">{format(new Date(selectedAppointment.date), 'MMMM d, yyyy')}</p>
 </div>
 <div>
 <p className="text-sm text-gray-600">Time</p>
 <p className="text-gray-800">{selectedAppointment.time}</p>
 </div>
 <div>
 <p className="text-sm text-gray-600">Status</p>
 <Badge variant={statusConfig[selectedAppointment.status]?.color}>
 {statusConfig[selectedAppointment.status]?.label}
 </Badge>
 </div>
 <div>
 <p className="text-sm text-gray-600">Payment Status</p>
 <Badge variant={selectedAppointment.payment_status === 'paid' ? 'success' : 'warning'}>
 {selectedAppointment.payment_status || 'Pending'}
 </Badge>
 </div>
 </div>

 {selectedAppointment.symptoms && (
 <div>
 <p className="text-sm text-gray-600 mb-1">Symptoms</p>
 <p className="text-gray-800 bg-gray-50 p-3 rounded-lg">{selectedAppointment.symptoms}</p>
 </div>
 )}

 <div className="flex gap-3 pt-4 border-t border-gray-200">
 {selectedAppointment.status === 'pending' && (
 <>
 <Button
 variant="success"
 className="flex-1"
 onClick={() => {
 handleApproveAppointment(selectedAppointment.id)
 setShowDetailsModal(false)
 }}
 >
 <CheckCircle className="w-4 h-4" />
 Approve
 </Button>
 <Button
 variant="danger"
 className="flex-1"
 onClick={() => {
 handleRejectAppointment(selectedAppointment.id)
 setShowDetailsModal(false)
 }}
 >
 <XCircle className="w-4 h-4" />
 Reject
 </Button>
 </>
 )}
 <Button
 variant="ghost"
 className="flex-1"
 onClick={() => {
 setShowDetailsModal(false)
 setRescheduleData({ date: selectedAppointment.date, time: selectedAppointment.time })
 setShowRescheduleModal(true)
 }}
 >
 <CalendarDays className="w-4 h-4" />
 Reschedule
 </Button>
 </div>
 </div>
 )}
 </Modal>

 {/* Reschedule Modal */}
 <Modal
 isOpen={showRescheduleModal}
 onClose={() => {
 setShowRescheduleModal(false)
 setSelectedAppointment(null)
 setRescheduleData({ date: '', time: '' })
 }}
 title="Reschedule Appointment"
 >
 <div className="space-y-4">
 <div>
 <label className="block text-sm text-gray-600 mb-2">New Date</label>
 <input
 type="date"
 value={rescheduleData.date}
 onChange={(e) => setRescheduleData(prev => ({ ...prev, date: e.target.value }))}
 className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-800 focus:outline-none focus:border-primary-500"
 />
 </div>
 <div>
 <label className="block text-sm text-gray-600 mb-2">New Time</label>
 <select
 value={rescheduleData.time}
 onChange={(e) => setRescheduleData(prev => ({ ...prev, time: e.target.value }))}
 className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-800 focus:outline-none focus:border-primary-500"
 >
 <option value="">Select time</option>
 {timeSlots.map(slot => (
 <option key={slot} value={slot}>{slot}</option>
 ))}
 </select>
 </div>
 <div className="flex gap-3 pt-4">
 <Button
 variant="ghost"
 className="flex-1"
 onClick={() => {
 setShowRescheduleModal(false)
 setSelectedAppointment(null)
 }}
 >
 Cancel
 </Button>
 <Button
 variant="primary"
 className="flex-1"
 onClick={handleReschedule}
 >
 Reschedule
 </Button>
 </div>
 </div>
 </Modal>
 </DashboardLayout>
 )
}

export default MediatorDashboard



