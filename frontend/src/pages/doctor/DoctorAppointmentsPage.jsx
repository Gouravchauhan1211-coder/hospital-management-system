import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { 
  Clock,
  CheckCircle,
  XCircle,
  Filter,
  Search,
  ChevronDown,
  Eye,
  User,
  FileText,
  MapPin,
  RefreshCw,
  Bell
} from 'lucide-react'
import { format, isSameDay, isToday } from 'date-fns'
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
    console.log('Rejecting appointment:', appointmentId)
    const result = await updateAppointment(appointmentId, { status: 'cancelled' })
    console.log('Reject result:', result)
    setAppointments(prev => 
      prev.map(apt => apt.id === appointmentId ? { ...apt, status: 'cancelled' } : apt)
    )
    toast.success('Appointment rejected')
  } catch (error) {
    console.error('Reject error:', error)
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
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 shadow-sm border-2 border-gray-300">
              {user?.avatar_url ? (
                <img alt="Doctor Portrait" className="w-full h-full object-cover" src={user.avatar_url} />
              ) : (
                <div className="w-full h-full bg-primary flex items-center justify-center">
                  <span className="text-white font-bold text-lg">{user?.fullName?.charAt(0) || 'D'}</span>
                </div>
              )}
            </div>
            <h1 className="font-bold text-xl tracking-tight text-primary">My Appointments</h1>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => {
                setIsLoading(true)
                getAppointments({ doctorId: user.id }).then(data => {
                  setAppointments(data || [])
                  setIsLoading(false)
                })
              }}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors active:scale-95 duration-200"
            >
              <RefreshCw className={`w-5 h-5 text-gray-600 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors active:scale-95 duration-200">
              <Bell className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>
      </div>

      {/* Welcome Header Section */}
      <header className="mb-8">
        <p className="text-gray-600 text-sm font-medium tracking-tight mb-1">Welcome back, Dr. {user?.fullName || 'Doctor'}</p>
        <h2 className="font-bold text-2xl text-primary tracking-tight">Manage your appointments and patient consultations</h2>
      </header>

      {/* Stats Overview - Horizontal Scroll */}
      <section className="mb-8 -mx-6 px-6 overflow-x-auto no-scrollbar flex gap-4">
        {/* Pending */}
        <div className="bg-yellow-50 flex-shrink-0 w-32 p-4 rounded-3xl shadow-sm border border-yellow-200">
          <p className="text-[10px] font-bold uppercase tracking-widest text-yellow-700 mb-1">Pending</p>
          <p className="text-3xl font-bold text-yellow-700">{stats.pending}</p>
        </div>
        {/* Confirmed */}
        <div className="bg-blue-50 flex-shrink-0 w-32 p-4 rounded-3xl border border-blue-200 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-widest text-blue-700 mb-1">Confirmed</p>
          <p className="text-3xl font-bold text-blue-700">{stats.confirmed}</p>
        </div>
        {/* Completed */}
        <div className="bg-green-50 flex-shrink-0 w-32 p-4 rounded-3xl shadow-sm border border-green-200">
          <p className="text-[10px] font-bold uppercase tracking-widest text-green-700 mb-1">Completed</p>
          <p className="text-3xl font-bold text-green-700">{stats.completed}</p>
        </div>
        {/* Today */}
        <div className="bg-purple-50 flex-shrink-0 w-32 p-4 rounded-3xl border border-purple-200 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-widest text-purple-700 mb-1">Today</p>
          <p className="text-3xl font-bold text-purple-700">{stats.today}</p>
        </div>
      </section>

      {/* View Toggle & Filters */}
 <GlassCard className="p-4 mb-6">
 <div className="flex flex-wrap items-center gap-4">
 {/* Search */}
 <div className="flex-1 min-w-[200px]">
 <div className="relative">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
<input
  type="text"
  value={filters.search}
  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
  className="w-full pl-12 pr-4 py-4 bg-gray-100 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm text-gray-700"
  placeholder="Search patient names..."
/>
  </div>
  </div>

  {/* Filter Buttons - Status */}
  <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
    <button 
      onClick={() => setFilters(prev => ({ ...prev, status: '' }))}
      className={`px-5 py-2 rounded-full text-xs font-bold shadow-md ${filters.status === '' ? 'bg-blue-600 text-white shadow-blue-300' : 'glass-panel border border-gray-300 text-gray-600 hover:bg-white'}`}
    >
      All
    </button>
    <button 
      onClick={() => setFilters(prev => ({ ...prev, status: 'pending' }))}
      className={`px-5 py-2 rounded-full text-xs font-bold ${filters.status === 'pending' ? 'bg-yellow-500 text-white shadow-lg' : 'glass-panel border border-gray-300 text-gray-600 hover:bg-white'}`}
    >
      Pending
    </button>
    <button 
      onClick={() => setFilters(prev => ({ ...prev, status: 'confirmed' }))}
      className={`px-5 py-2 rounded-full text-xs font-bold ${filters.status === 'confirmed' ? 'bg-blue-600 text-white shadow-lg' : 'glass-panel border border-gray-300 text-gray-600 hover:bg-white'}`}
    >
      Confirmed
    </button>
    <button 
      onClick={() => setFilters(prev => ({ ...prev, status: 'completed' }))}
      className={`px-5 py-2 rounded-full text-xs font-bold ${filters.status === 'completed' ? 'bg-primary text-white shadow-lg' : 'glass-panel border border-gray-300 text-gray-600 hover:bg-white'}`}
    >
      Completed
    </button>
    </div>
  </div>
</GlassCard>

{/* Card View */}
<section className="mb-12">
  <div className="flex items-center justify-between mb-6">
    <h3 className="font-bold text-lg text-gray-700">Appointments ({filteredAppointments.length} {filteredAppointments.length === 1 ? 'result' : 'results'})</h3>
  </div>

  {isLoading ? (
    <div className="space-y-4">
      <CardSkeleton />
      <CardSkeleton />
      <CardSkeleton />
    </div>
    ) : filteredAppointments.length > 0 ? (
      <div className="space-y-4">
        {filteredAppointments.map((apt, index) => (
          <motion.div
            key={apt.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.02 }}
            className="group glass-panel p-6 rounded-[2rem] shadow-sm border border-gray-300 transition-all hover:translate-y-[-4px]"
          >
            {/* Header - Patient Info */}
            <div className="flex items-start justify-between mb-5">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl overflow-hidden shadow-md">
                  {apt.patient_avatar ? (
                    <img alt={apt.patient_name} className="w-full h-full object-cover" src={apt.patient_avatar} />
                  ) : (
                    <div className="w-full h-full bg-blue-100 flex items-center justify-center">
                      <User className="w-6 h-6 text-primary" />
                    </div>
                  )}
                </div>
                <div>
                  <h4 className="font-bold text-gray-700 text-lg">{apt.patient_name}</h4>
                  <p className="text-gray-600 text-sm flex items-center gap-1">
                    {apt.mode === 'online' ? (
                      <Video className="w-4 h-4 text-blue-500" />
                    ) : (
                      <MapPin className="w-4 h-4 text-blue-500" />
                    )}
                    {apt.mode === 'online' ? 'Virtual Visit' : 'In-Person Consultation'}
                  </p>
                  {apt.symptoms && (
                    <p className="text-gray-500 text-xs mt-1">Reason: {apt.symptoms}</p>
                  )}
                </div>
                <button 
                  onClick={() => handleViewPatient(apt.patient_id)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  title="View Patient Details"
                >
                  <Eye className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg ${
                apt.status === 'confirmed' ? 'bg-blue-100 text-blue-700' :
                apt.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                apt.status === 'completed' ? 'bg-green-100 text-green-700' :
                'bg-red-100 text-red-700'
              }`}>
                {apt.status}
              </div>
            </div>

            {/* Date & Time Info */}
            <div className="bg-gray-50 rounded-2xl p-4 mb-5 flex items-center gap-4">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Date & Time</span>
                <span className="text-sm font-semibold text-gray-700">{format(new Date(apt.date), 'MMM d, yyyy')} • {apt.time}</span>
              </div>
              <div className="h-8 w-px bg-gray-300"></div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Duration</span>
                <span className="text-sm font-semibold text-gray-700">{apt.duration || 30} Mins</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3">
              {apt.status === 'pending' && (
                <>
                  <button 
                    onClick={() => handleConfirmAppointment(apt.id)}
                    className="py-3.5 rounded-2xl bg-blue-600 text-white text-sm font-bold shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
                  >
                    Accept
                  </button>
                  <button 
                    onClick={() => handleRejectAppointment(apt.id)}
                    className="py-3.5 rounded-2xl border border-red-500/30 text-red-600 text-sm font-bold hover:bg-red-50 hover:border-red-500/50 active:scale-95 transition-all"
                  >
                    Reject
                  </button>
                </>
              )}
              {apt.status === 'confirmed' && (
                <>
                  <button 
                    onClick={() => handleCompleteAppointment(apt.id)}
                    className="py-3.5 rounded-2xl bg-green-600 text-white text-sm font-bold shadow-lg shadow-green-500/20 active:scale-95 transition-all"
                  >
                    Mark Completed
                  </button>
                  <button 
                    onClick={() => handleRejectAppointment(apt.id)}
                    className="py-3.5 rounded-2xl border border-red-500/30 text-red-600 text-sm font-bold hover:bg-red-50 hover:border-red-500/50 active:scale-95 transition-all"
                  >
                    Cancel
                  </button>
                </>
              )}
              {apt.status === 'completed' && (
                <button 
                  onClick={() => handleViewPatient(apt.patient_id)}
                  className="col-span-2 py-3.5 rounded-2xl border border-gray-300 text-gray-700 text-sm font-bold hover:bg-gray-50 active:scale-95 transition-all"
                >
                  View Details
                </button>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    ) : (
      <EmptyState
        icon={Clock}
        title="No appointments found"
        description="You don't have any appointments matching the filters."
      />
    )}
  </section>

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



