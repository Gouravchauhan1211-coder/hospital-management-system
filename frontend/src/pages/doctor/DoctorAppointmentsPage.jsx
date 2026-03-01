import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { 
 Calendar,
 Clock,
 CheckCircle,
 XCircle,
 Filter,
 Search,
 ChevronDown,
 Eye,
 CalendarDays,
 ChevronLeft,
 ChevronRight,
 User,
 FileText,
 Video,
 MapPin,
 RefreshCw,
 Bell
} from 'lucide-react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths, subMonths } from 'date-fns'
import toast from 'react-hot-toast'
import useAuthStore from '../../store/authStore'
import { getAppointments, updateAppointment, getPatientById, createMedicalRecord } from '../../services/api'
import { DashboardLayout } from '../../components/layout'
import { GlassCard, Badge, Button, Modal, Input, Select } from '../../components/ui'
import { EmptyState } from '../../components/shared'
import { CardSkeleton } from '../../components/ui/Skeleton'

// Status configuration
const statusConfig = {
 pending: { label: 'Pending', color: 'warning' },
 confirmed: { label: 'Confirmed', color: 'primary' },
 completed: { label: 'Completed', color: 'success' },
 cancelled: { label: 'Cancelled', color: 'error' },
 rejected: { label: 'Rejected', color: 'error' },
}

const DoctorAppointmentsPage = () => {
 const { user } = useAuthStore()
 
 // State
 const [isLoading, setIsLoading] = useState(true)
 const [appointments, setAppointments] = useState([])
 const [viewMode, setViewMode] = useState('table') // 'table' or 'calendar'
 
 // Calendar state
 const [currentMonth, setCurrentMonth] = useState(new Date())
 const [selectedDate, setSelectedDate] = useState(null)
 
 // Filter state
 const [filters, setFilters] = useState({
 date: '',
 status: '',
 search: '',
 })
 const [showFilters, setShowFilters] = useState(false)
 
 // Modal state
 const [selectedAppointment, setSelectedAppointment] = useState(null)
 const [showDetailsModal, setShowDetailsModal] = useState(false)
 const [showPatientModal, setShowPatientModal] = useState(false)
 const [showNotesModal, setShowNotesModal] = useState(false)
 const [patientDetails, setPatientDetails] = useState(null)
 const [appointmentNotes, setAppointmentNotes] = useState('')
 const [isSaving, setIsSaving] = useState(false)

 // Fetch appointments
 useEffect(() => {
 const fetchAppointments = async () => {
 if (!user?.id) return
 
 try {
 const data = await getAppointments({ doctorId: user.id })
 setAppointments(data || [])
 } catch (error) {
 console.error('Error fetching appointments:', error)
 toast.error('Failed to load appointments')
 } finally {
 setIsLoading(false)
 }
 }
 
 fetchAppointments()
 }, [user?.id])

 // Filtered appointments
 const filteredAppointments = useMemo(() => {
 return appointments.filter(apt => {
 if (filters.date && apt.date !== filters.date) return false
 if (filters.status && apt.status !== filters.status) return false
 if (filters.search) {
 const searchLower = filters.search.toLowerCase()
 return (
 apt.patient_name?.toLowerCase().includes(searchLower) ||
 apt.specialization?.toLowerCase().includes(searchLower)
 )
 }
 return true
 })
 }, [appointments, filters])

 // Calendar days
 const calendarDays = useMemo(() => {
 const start = startOfMonth(currentMonth)
 const end = endOfMonth(currentMonth)
 return eachDayOfInterval({ start, end })
 }, [currentMonth])

 // Appointments by date for calendar view
 const appointmentsByDate = useMemo(() => {
 const grouped = {}
 appointments.forEach(apt => {
 if (!grouped[apt.date]) {
 grouped[apt.date] = []
 }
 grouped[apt.date].push(apt)
 })
 return grouped
 }, [appointments])

 // Stats
 const stats = useMemo(() => {
 const today = format(new Date(), 'yyyy-MM-dd')
 return {
 total: appointments.length,
 pending: appointments.filter(a => a.status === 'pending').length,
 confirmed: appointments.filter(a => a.status === 'confirmed').length,
 completed: appointments.filter(a => a.status === 'completed').length,
 today: appointments.filter(a => a.date === today).length,
 }
 }, [appointments])

 // Handle appointment actions
 const handleConfirmAppointment = async (appointmentId) => {
 try {
 await updateAppointment(appointmentId, { status: 'confirmed' })
 setAppointments(prev => 
 prev.map(apt => apt.id === appointmentId ? { ...apt, status: 'confirmed' } : apt)
 )
 toast.success('Appointment confirmed')
 } catch (error) {
 toast.error('Failed to confirm appointment')
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

 const handleCompleteAppointment = async (appointmentId) => {
 try {
 await updateAppointment(appointmentId, { status: 'completed' })
 setAppointments(prev => 
 prev.map(apt => apt.id === appointmentId ? { ...apt, status: 'completed' } : apt)
 )
 toast.success('Appointment marked as completed')
 } catch (error) {
 toast.error('Failed to update appointment')
 }
 }

 // Fetch patient details
 const handleViewPatient = async (patientId) => {
 try {
 const data = await getPatientById(patientId)
 setPatientDetails(data)
 setShowPatientModal(true)
 } catch (error) {
 toast.error('Failed to load patient details')
 }
 }

 // Save appointment notes
 const handleSaveNotes = async () => {
 if (!selectedAppointment) return
 
 setIsSaving(true)
 try {
 // Update appointment with notes
 await updateAppointment(selectedAppointment.id, { 
 notes: appointmentNotes,
 })
 
 // Optionally create a medical record
 if (appointmentNotes.trim()) {
 await createMedicalRecord({
 patientId: selectedAppointment.patient_id,
 doctorId: user.id,
 doctorName: user.fullName,
 title: `Consultation Notes - ${format(new Date(selectedAppointment.date), 'MMM d, yyyy')}`,
 type: 'consultation',
 description: appointmentNotes,
 })
 }
 
 setAppointments(prev =>
 prev.map(apt => apt.id === selectedAppointment.id 
 ? { ...apt, notes: appointmentNotes }
 : apt
 )
 )
 
 setShowNotesModal(false)
 setSelectedAppointment(null)
 setAppointmentNotes('')
 toast.success('Notes saved successfully')
 } catch (error) {
 toast.error('Failed to save notes')
 } finally {
 setIsSaving(false)
 }
 }

 return (
 <DashboardLayout>
 {/* Header */}
 <div className="mb-8">
 <div className="flex items-center justify-between">
 <div>
 <motion.h1
 initial={{ opacity: 0, y: -10 }}
 animate={{ opacity: 1, y: 0 }}
 className="text-2xl font-bold text-gray-800 mb-2"
 >
 My Appointments
 </motion.h1>
 <motion.p
 initial={{ opacity: 0, y: -10 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: 0.1 }}
 className="text-gray-600"
 >
 Manage your appointments and patient consultations
 </motion.p>
 </div>
 
 <Button
 variant="ghost"
 size="sm"
 onClick={() => {
 setIsLoading(true)
 getAppointments({ doctorId: user.id }).then(data => {
 setAppointments(data || [])
 setIsLoading(false)
 })
 }}
 >
 <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
 </Button>
 </div>
 </div>

 {/* Stats Cards */}
 <div className="grid grid-cols-2 gap-4 mb-6">
 <GlassCard className="p-4">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
 <Clock className="w-5 h-5 text-yellow-400" />
 </div>
 <div>
 <p className="text-2xl font-bold text-gray-800">{stats.pending}</p>
 <p className="text-xs text-gray-600">Pending</p>
 </div>
 </div>
 </GlassCard>
 <GlassCard className="p-4">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
 <Calendar className="w-5 h-5 text-blue-400" />
 </div>
 <div>
 <p className="text-2xl font-bold text-gray-800">{stats.confirmed}</p>
 <p className="text-xs text-gray-600">Confirmed</p>
 </div>
 </div>
 </GlassCard>
 <GlassCard className="p-4">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
 <CheckCircle className="w-5 h-5 text-green-400" />
 </div>
 <div>
 <p className="text-2xl font-bold text-gray-800">{stats.completed}</p>
 <p className="text-xs text-gray-600">Completed</p>
 </div>
 </div>
 </GlassCard>
 <GlassCard className="p-4">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded-lg bg-primary-500/20 flex items-center justify-center">
 <CalendarDays className="w-5 h-5 text-primary-400" />
 </div>
 <div>
 <p className="text-2xl font-bold text-gray-800">{stats.today}</p>
 <p className="text-xs text-gray-600">Today</p>
 </div>
 </div>
 </GlassCard>
 </div>

 {/* View Toggle & Filters */}
 <GlassCard className="p-4 mb-6">
 <div className="flex flex-wrap items-center gap-4">
 {/* Search */}
 <div className="flex-1 min-w-[200px]">
 <div className="relative">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
 <input
 type="text"
 placeholder="Search by patient name..."
 value={filters.search}
 onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
 className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-800 placeholder:text-gray-500 focus:outline-none focus:border-primary-500"
 />
 </div>
 </div>

 {/* View Toggle */}
 <div className="flex bg-gray-50 rounded-lg p-1">
 <button
 onClick={() => setViewMode('table')}
 className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
 viewMode === 'table' ? 'bg-primary-500 text-gray-800' : 'text-gray-600 hover:text-gray-800'
 }`}
 >
 Table
 </button>
 <button
 onClick={() => setViewMode('calendar')}
 className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
 viewMode === 'calendar' ? 'bg-primary-500 text-gray-800' : 'text-gray-600 hover:text-gray-800'
 }`}
 >
 Calendar
 </button>
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
 </select>
 </div>
 <div className="flex items-end">
 <Button
 variant="ghost"
 size="sm"
 onClick={() => setFilters({ date: '', status: '', search: '' })}
 >
 Clear Filters
 </Button>
 </div>
 </motion.div>
 )}
 </GlassCard>

 {/* Content */}
 {viewMode === 'table' ? (
 /* Table View */
 <GlassCard className="p-6">
 <div className="flex items-center justify-between mb-6">
 <h2 className="text-lg font-semibold text-gray-800">Appointments</h2>
 <span className="text-sm text-gray-600">{filteredAppointments.length} results</span>
 </div>

 {isLoading ? (
 <div className="space-y-4">
 <CardSkeleton />
 <CardSkeleton />
 <CardSkeleton />
 </div>
 ) : filteredAppointments.length > 0 ? (
 <div className="overflow-x-auto">
 <table className="w-full">
 <thead>
 <tr className="border-b border-gray-200">
 <th className="text-left text-sm text-gray-600 pb-3 font-medium">Patient</th>
 <th className="text-left text-sm text-gray-600 pb-3 font-medium">Date & Time</th>
 <th className="text-left text-sm text-gray-600 pb-3 font-medium">Mode</th>
 <th className="text-left text-sm text-gray-600 pb-3 font-medium">Status</th>
 <th className="text-right text-sm text-gray-600 pb-3 font-medium">Actions</th>
 </tr>
 </thead>
 <tbody>
 {filteredAppointments.map((apt, index) => (
 <motion.tr
 key={apt.id}
 initial={{ opacity: 0, y: 10 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: index * 0.02 }}
 className="border-b border-white/5 hover:bg-gray-50"
 >
 <td className="py-4">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded-full bg-primary-500/20 flex items-center justify-center">
 <User className="w-5 h-5 text-primary-400" />
 </div>
 <div>
 <p className="text-gray-800 font-medium">{apt.patient_name}</p>
 <p className="text-xs text-gray-500">{apt.specialization || 'General'}</p>
 </div>
 </div>
 </td>
 <td className="py-4">
 <div>
 <p className="text-gray-700">{format(new Date(apt.date), 'MMM d, yyyy')}</p>
 <p className="text-xs text-gray-500">{apt.time}</p>
 </div>
 </td>
 <td className="py-4">
 <div className="flex items-center gap-2">
 {apt.mode === 'online' ? (
 <>
 <Video className="w-4 h-4 text-blue-400" />
 <span className="text-gray-700">Video Call</span>
 </>
 ) : (
 <>
 <MapPin className="w-4 h-4 text-green-400" />
 <span className="text-gray-700">In-Person</span>
 </>
 )}
 </div>
 </td>
 <td className="py-4">
 <Badge variant={statusConfig[apt.status]?.color || 'default'}>
 {statusConfig[apt.status]?.label || apt.status}
 </Badge>
 </td>
 <td className="py-4">
 <div className="flex items-center justify-end gap-2">
 <Button
 variant="ghost"
 size="sm"
 onClick={() => handleViewPatient(apt.patient_id)}
 title="View Patient"
 >
 <User className="w-4 h-4" />
 </Button>
 <Button
 variant="ghost"
 size="sm"
 onClick={() => {
 setSelectedAppointment(apt)
 setAppointmentNotes(apt.notes || '')
 setShowNotesModal(true)
 }}
 title="Add Notes"
 >
 <FileText className="w-4 h-4" />
 </Button>
 {apt.status === 'pending' && (
 <>
 <Button
 variant="success"
 size="sm"
 onClick={() => handleConfirmAppointment(apt.id)}
 title="Confirm"
 >
 <CheckCircle className="w-4 h-4" />
 </Button>
 <Button
 variant="danger"
 size="sm"
 onClick={() => handleRejectAppointment(apt.id)}
 title="Reject"
 >
 <XCircle className="w-4 h-4" />
 </Button>
 </>
 )}
 {apt.status === 'confirmed' && (
 <Button
 variant="primary"
 size="sm"
 onClick={() => handleCompleteAppointment(apt.id)}
 title="Mark Completed"
 >
 <CheckCircle className="w-4 h-4" />
 </Button>
 )}
 </div>
 </td>
 </motion.tr>
 ))}
 </tbody>
 </table>
 </div>
 ) : (
 <EmptyState
 icon={Calendar}
 title="No appointments found"
 description="You don't have any appointments matching the filters."
 />
 )}
 </GlassCard>
 ) : (
 /* Calendar View */
 <GlassCard className="p-6">
 {/* Calendar Header */}
 <div className="flex items-center justify-between mb-6">
 <h2 className="text-lg font-semibold text-gray-800">
 {format(currentMonth, 'MMMM yyyy')}
 </h2>
 <div className="flex items-center gap-2">
 <Button
 variant="ghost"
 size="sm"
 onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
 >
 <ChevronLeft className="w-5 h-5" />
 </Button>
 <Button
 variant="ghost"
 size="sm"
 onClick={() => setCurrentMonth(new Date())}
 >
 Today
 </Button>
 <Button
 variant="ghost"
 size="sm"
 onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
 >
 <ChevronRight className="w-5 h-5" />
 </Button>
 </div>
 </div>

 {/* Calendar Grid */}
 <div className="grid grid-cols-7 gap-1">
 {/* Day Headers */}
 {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
 <div key={day} className="text-center text-sm text-gray-600 py-2 font-medium">
 {day}
 </div>
 ))}
 
 {/* Empty cells for days before month starts */}
 {Array.from({ length: calendarDays[0].getDay() }).map((_, i) => (
 <div key={`empty-${i}`} className="aspect-square" />
 ))}
 
 {/* Calendar Days */}
 {calendarDays.map((day, index) => {
 const dateStr = format(day, 'yyyy-MM-dd')
 const dayAppointments = appointmentsByDate[dateStr] || []
 const isSelected = selectedDate && isSameDay(day, selectedDate)
 const isTodayDate = isToday(day)
 
 return (
 <motion.div
 key={dateStr}
 initial={{ opacity: 0, scale: 0.9 }}
 animate={{ opacity: 1, scale: 1 }}
 transition={{ delay: index * 0.01 }}
 onClick={() => setSelectedDate(day)}
 className={`aspect-square p-1 rounded-lg cursor-pointer transition-colors ${
 isSelected
 ? 'bg-primary-500/30 border border-primary-500'
 : isTodayDate
 ? 'bg-gray-100 border border-white/20'
 : 'hover:bg-gray-50'
 }`}
 >
 <div className="text-sm text-gray-700 mb-1">{format(day, 'd')}</div>
 {dayAppointments.length > 0 && (
 <div className="space-y-0.5">
 {dayAppointments.slice(0, 3).map(apt => (
 <div
 key={apt.id}
 className={`text-[10px] px-1 py-0.5 rounded truncate ${
 apt.status === 'confirmed' ? 'bg-blue-500/30 text-blue-300' :
 apt.status === 'pending' ? 'bg-yellow-500/30 text-yellow-300' :
 apt.status === 'completed' ? 'bg-green-500/30 text-green-300' :
 'bg-red-500/30 text-red-300'
 }`}
 >
 {apt.time}
 </div>
 ))}
 {dayAppointments.length > 3 && (
 <div className="text-[10px] text-gray-500 text-center">
 +{dayAppointments.length - 3} more
 </div>
 )}
 </div>
 )}
 </motion.div>
 )
 })}
 </div>

 {/* Selected Date Details */}
 {selectedDate && (
 <motion.div
 initial={{ opacity: 0, y: 10 }}
 animate={{ opacity: 1, y: 0 }}
 className="mt-6 pt-6 border-t border-gray-200"
 >
 <h3 className="text-lg font-semibold text-gray-800 mb-4">
 Appointments for {format(selectedDate, 'MMMM d, yyyy')}
 </h3>
 {(appointmentsByDate[format(selectedDate, 'yyyy-MM-dd')] || []).length > 0 ? (
 <div className="space-y-3">
 {appointmentsByDate[format(selectedDate, 'yyyy-MM-dd')].map(apt => (
 <div
 key={apt.id}
 className="flex items-center gap-4 p-3 rounded-lg bg-gray-50 hover:bg-gray-100"
 >
 <div className="text-sm font-medium text-gray-600 w-20">{apt.time}</div>
 <div className="flex-1">
 <p className="text-gray-800 font-medium">{apt.patient_name}</p>
 <p className="text-sm text-gray-600 flex items-center gap-2">
 {apt.mode === 'online' ? (
 <>
 <Video className="w-3 h-3" /> Video Call
 </>
 ) : (
 <>
 <MapPin className="w-3 h-3" /> In-Person
 </>
 )}
 </p>
 </div>
 <Badge variant={statusConfig[apt.status]?.color}>
 {statusConfig[apt.status]?.label}
 </Badge>
 <div className="flex gap-2">
 {apt.status === 'pending' && (
 <>
 <Button
 variant="success"
 size="sm"
 onClick={() => handleConfirmAppointment(apt.id)}
 >
 <CheckCircle className="w-4 h-4" />
 </Button>
 <Button
 variant="danger"
 size="sm"
 onClick={() => handleRejectAppointment(apt.id)}
 >
 <XCircle className="w-4 h-4" />
 </Button>
 </>
 )}
 {apt.status === 'confirmed' && (
 <Button
 variant="primary"
 size="sm"
 onClick={() => handleCompleteAppointment(apt.id)}
 >
 Complete
 </Button>
 )}
 </div>
 </div>
 ))}
 </div>
 ) : (
 <p className="text-gray-500 text-center py-4">No appointments on this date</p>
 )}
 </motion.div>
 )}
 </GlassCard>
 )}

 {/* Patient Details Modal */}
 <Modal
 isOpen={showPatientModal}
 onClose={() => {
 setShowPatientModal(false)
 setPatientDetails(null)
 }}
 title="Patient Details"
 >
 {patientDetails && (
 <div className="space-y-4">
 <div className="flex items-center gap-4 pb-4 border-b border-gray-200">
 <div className="w-16 h-16 rounded-full bg-primary-500/20 flex items-center justify-center">
 <User className="w-8 h-8 text-primary-400" />
 </div>
 <div>
 <h3 className="text-lg font-semibold text-gray-800">{patientDetails.full_name}</h3>
 <p className="text-sm text-gray-600">{patientDetails.email}</p>
 </div>
 </div>
 
 <div className="grid grid-cols-2 gap-4">
 <div>
 <p className="text-sm text-gray-600">Phone</p>
 <p className="text-gray-800">{patientDetails.phone || 'N/A'}</p>
 </div>
 <div>
 <p className="text-sm text-gray-600">Gender</p>
 <p className="text-gray-800 capitalize">{patientDetails.gender || 'N/A'}</p>
 </div>
 <div>
 <p className="text-sm text-gray-600">Blood Group</p>
 <p className="text-gray-800">{patientDetails.blood_group || 'N/A'}</p>
 </div>
 <div>
 <p className="text-sm text-gray-600">Date of Birth</p>
 <p className="text-gray-800">
 {patientDetails.date_of_birth 
 ? format(new Date(patientDetails.date_of_birth), 'MMM d, yyyy')
 : 'N/A'
 }
 </p>
 </div>
 </div>

 {patientDetails.medical_history && (
 <div>
 <p className="text-sm text-gray-600 mb-1">Medical History</p>
 <p className="text-gray-800 bg-gray-50 p-3 rounded-lg">{patientDetails.medical_history}</p>
 </div>
 )}

 {patientDetails.allergies && (
 <div>
 <p className="text-sm text-gray-600 mb-1">Allergies</p>
 <p className="text-gray-800 bg-gray-50 p-3 rounded-lg">{patientDetails.allergies}</p>
 </div>
 )}

 {/* TODO: Add link to full patient history */}
 <div className="pt-4 border-t border-gray-200">
 <p className="text-xs text-gray-500 italic">
 TODO: Add link to view complete patient medical history
 </p>
 </div>
 </div>
 )}
 </Modal>

 {/* Notes Modal */}
 <Modal
 isOpen={showNotesModal}
 onClose={() => {
 setShowNotesModal(false)
 setSelectedAppointment(null)
 setAppointmentNotes('')
 }}
 title="Appointment Notes"
 >
 <div className="space-y-4">
 {selectedAppointment && (
 <div className="p-3 bg-gray-50 rounded-lg">
 <p className="text-sm text-gray-600">Patient</p>
 <p className="text-gray-800 font-medium">{selectedAppointment.patient_name}</p>
 <p className="text-sm text-gray-600 mt-2">Date & Time</p>
 <p className="text-gray-800">
 {format(new Date(selectedAppointment.date), 'MMM d, yyyy')} at {selectedAppointment.time}
 </p>
 </div>
 )}
 
 <div>
 <label className="block text-sm text-gray-600 mb-2">Consultation Notes</label>
 <textarea
 value={appointmentNotes}
 onChange={(e) => setAppointmentNotes(e.target.value)}
 rows={6}
 placeholder="Enter your notes about this consultation..."
 className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-800 placeholder:text-gray-500 focus:outline-none focus:border-primary-500 resize-none"
 />
 </div>
 
 <div className="flex gap-3 pt-4">
 <Button
 variant="ghost"
 className="flex-1"
 onClick={() => {
 setShowNotesModal(false)
 setSelectedAppointment(null)
 setAppointmentNotes('')
 }}
 >
 Cancel
 </Button>
 <Button
 variant="primary"
 className="flex-1"
 onClick={handleSaveNotes}
 disabled={isSaving}
 >
 {isSaving ? 'Saving...' : 'Save Notes'}
 </Button>
 </div>
 </div>
 </Modal>
 </DashboardLayout>
 )
}

export default DoctorAppointmentsPage



