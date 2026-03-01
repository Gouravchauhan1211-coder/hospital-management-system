import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { 
 UserPlus, 
 Users, 
 Clock, 
 CheckCircle, 
 XCircle,
 AlertCircle,
 Radio,
 Trash2,
 ArrowRight
} from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import useAuthStore from '../../store/authStore'
import { getAllDoctors, addToWalkInQueue, updateWalkInQueue } from '../../services/api'
import { useWalkInQueue } from '../../hooks/useRealtimeSubscription'
import { DashboardLayout } from '../../components/layout'
import { GlassCard, Badge, Avatar, Button, Input, Select, Modal } from '../../components/ui'
import { EmptyState } from '../../components/shared'
import { CardSkeleton } from '../../components/ui/Skeleton'

const WalkInManagementPage = () => {
 const { user } = useAuthStore()
 const [doctors, setDoctors] = useState([])
 const [isLoading, setIsLoading] = useState(true)
 const [showAddModal, setShowAddModal] = useState(false)
 const [newPatient, setNewPatient] = useState({
 name: '',
 age: '',
 reason: '',
 doctorId: '',
 doctorName: ''
 })
 const [isAdding, setIsAdding] = useState(false)

 // Real-time walk-in queue subscription
 const { data: walkInQueue, isSubscribed, setData: setQueue } = useWalkInQueue()

 useEffect(() => {
 const fetchDoctors = async () => {
 try {
 const doctorsData = await getAllDoctors()
 setDoctors(doctorsData || [])
 } catch (error) {
 console.error('Error fetching doctors:', error)
 } finally {
 setIsLoading(false)
 }
 }
 fetchDoctors()
 }, [])

 // Separate queue by status
 const waitingPatients = useMemo(() => 
 walkInQueue?.filter(p => p.status === 'waiting') || [], 
 [walkInQueue]
 )
 
 const inProgressPatients = useMemo(() => 
 walkInQueue?.filter(p => p.status === 'in-progress') || [], 
 [walkInQueue]
 )
 
 const completedPatients = useMemo(() => 
 walkInQueue?.filter(p => p.status === 'completed') || [], 
 [walkInQueue]
 )

 const handleAddPatient = async () => {
 if (!newPatient.name.trim()) {
 toast.error('Please enter patient name')
 return
 }

 setIsAdding(true)
 try {
 const patient = await addToWalkInQueue({
 name: newPatient.name,
 age: newPatient.age ? parseInt(newPatient.age) : null,
 reason: newPatient.reason,
 doctorId: newPatient.doctorId || null,
 doctorName: newPatient.doctorName || 'Unassigned'
 })
 
 toast.success(`Added to queue - Token: ${patient.token}`)
 setShowAddModal(false)
 setNewPatient({ name: '', age: '', reason: '', doctorId: '', doctorName: '' })
 } catch (error) {
 console.error('Error adding to queue:', error)
 toast.error('Failed to add patient to queue')
 } finally {
 setIsAdding(false)
 }
 }

 const handleUpdateStatus = async (queueId, status) => {
 try {
 await updateWalkInQueue(queueId, { status })
 toast.success(`Patient status updated to ${status}`)
 } catch (error) {
 console.error('Error updating status:', error)
 toast.error('Failed to update status')
 }
 }

 const handleDoctorChange = (doctorId) => {
 const doctor = doctors.find(d => d.id === doctorId)
 setNewPatient({
 ...newPatient,
 doctorId: doctorId,
 doctorName: doctor ? doctor.full_name : ''
 })
 }

 return (
 <DashboardLayout>
 {/* Header */}
 <div className="mb-8">
 <motion.h1
 initial={{ opacity: 0, y: -10 }}
 animate={{ opacity: 1, y: 0 }}
 className="text-2xl font-bold text-gray-800 mb-2"
 >
 Walk-in Queue Management
 </motion.h1>
 <motion.p
 initial={{ opacity: 0, y: -10 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: 0.1 }}
 className="text-gray-600"
 >
 Manage walk-in patients and assign them to doctors
 </motion.p>
 </div>

 {/* Real-time Status */}
 <div className="flex items-center gap-4 mb-6">
 <div className="flex items-center gap-2">
 <div className={`w-2 h-2 rounded-full ${isSubscribed ? 'bg-success animate-pulse' : 'bg-warning'}`} />
 <span className="text-xs text-gray-800/50">
 {isSubscribed ? 'Real-time updates active' : 'Connecting...'}
 </span>
 </div>
 <div className="flex items-center gap-4 text-sm text-gray-600">
 <span className="flex items-center gap-1">
 <div className="w-2 h-2 bg-warning rounded-full" />
 {waitingPatients.length} Waiting
 </span>
 <span className="flex items-center gap-1">
 <div className="w-2 h-2 bg-primary-500 rounded-full" />
 {inProgressPatients.length} In Progress
 </span>
 <span className="flex items-center gap-1">
 <div className="w-2 h-2 bg-success rounded-full" />
 {completedPatients.length} Completed
 </span>
 </div>
 </div>

 {/* Add Patient Button */}
 <div className="mb-6">
 <Button
 variant="primary"
 onClick={() => setShowAddModal(true)}
 className="flex items-center gap-2"
 >
 <UserPlus className="w-5 h-5" />
 Add Walk-in Patient
 </Button>
 </div>

 {/* Queue Sections */}
 <div className="grid grid-cols-1 gap-6">
 {/* Waiting Queue */}
 <GlassCard className="p-6">
 <div className="flex items-center justify-between mb-4">
 <div className="flex items-center gap-2">
 <Clock className="w-5 h-5 text-warning" />
 <h2 className="text-lg font-semibold text-gray-800">Waiting</h2>
 </div>
 <Badge variant="warning">{waitingPatients.length}</Badge>
 </div>

 {isLoading ? (
 <div className="space-y-3">
 <CardSkeleton />
 <CardSkeleton />
 </div>
 ) : waitingPatients.length > 0 ? (
 <div className="space-y-3">
 {waitingPatients.map((patient, index) => (
 <motion.div
 key={patient.id}
 initial={{ opacity: 0, y: 10 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: index * 0.05 }}
 className="p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
 >
 <div className="flex items-start gap-3">
 <div className="w-10 h-10 rounded-xl bg-warning/20 flex items-center justify-center flex-shrink-0">
 <span className="text-sm font-bold text-warning">
 {patient.token?.replace('A', '')}
 </span>
 </div>
 <div className="flex-1 min-w-0">
 <p className="font-medium text-gray-800">{patient.name}</p>
 <p className="text-xs text-gray-600 mt-0.5">
 {patient.age ? `${patient.age} yrs` : ''} {patient.reason && `· ${patient.reason}`}
 </p>
 <p className="text-xs text-primary-400 mt-1">
 Dr. {patient.doctor_name || 'Unassigned'}
 </p>
 </div>
 </div>
 <div className="flex gap-2 mt-3">
 <Button
 variant="success"
 size="sm"
 onClick={() => handleUpdateStatus(patient.id, 'in-progress')}
 className="flex-1"
 >
 <ArrowRight className="w-3 h-3 mr-1" />
 Start
 </Button>
 </div>
 </motion.div>
 ))}
 </div>
 ) : (
 <EmptyState
 icon={Users}
 title="No patients waiting"
 description="The queue is empty"
 />
 )}
 </GlassCard>

 {/* In Progress */}
 <GlassCard className="p-6">
 <div className="flex items-center justify-between mb-4">
 <div className="flex items-center gap-2">
 <Radio className="w-5 h-5 text-primary-400 animate-pulse" />
 <h2 className="text-lg font-semibold text-gray-800">In Progress</h2>
 </div>
 <Badge variant="primary">{inProgressPatients.length}</Badge>
 </div>

 {inProgressPatients.length > 0 ? (
 <div className="space-y-3">
 {inProgressPatients.map((patient, index) => (
 <motion.div
 key={patient.id}
 initial={{ opacity: 0, y: 10 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: index * 0.05 }}
 className="p-4 rounded-xl bg-primary-500/10 border border-primary-500/20"
 >
 <div className="flex items-start gap-3">
 <div className="w-10 h-10 rounded-xl bg-primary-500/20 flex items-center justify-center flex-shrink-0">
 <span className="text-sm font-bold text-primary-400">
 {patient.token?.replace('A', '')}
 </span>
 </div>
 <div className="flex-1 min-w-0">
 <p className="font-medium text-gray-800">{patient.name}</p>
 <p className="text-xs text-gray-600 mt-0.5">
 {patient.age ? `${patient.age} yrs` : ''} {patient.reason && `· ${patient.reason}`}
 </p>
 <p className="text-xs text-primary-400 mt-1">
 Dr. {patient.doctor_name || 'Unassigned'}
 </p>
 </div>
 </div>
 <div className="flex gap-2 mt-3">
 <Button
 variant="success"
 size="sm"
 onClick={() => handleUpdateStatus(patient.id, 'completed')}
 className="flex-1"
 >
 <CheckCircle className="w-3 h-3 mr-1" />
 Complete
 </Button>
 </div>
 </motion.div>
 ))}
 </div>
 ) : (
 <EmptyState
 icon={Radio}
 title="No patients in progress"
 description="Start a consultation from the waiting queue"
 />
 )}
 </GlassCard>

 {/* Completed */}
 <GlassCard className="p-6">
 <div className="flex items-center justify-between mb-4">
 <div className="flex items-center gap-2">
 <CheckCircle className="w-5 h-5 text-success" />
 <h2 className="text-lg font-semibold text-gray-800">Completed</h2>
 </div>
 <Badge variant="success">{completedPatients.length}</Badge>
 </div>

 {completedPatients.length > 0 ? (
 <div className="space-y-3 max-h-96 overflow-y-auto">
 {completedPatients.slice(0, 10).map((patient, index) => (
 <motion.div
 key={patient.id}
 initial={{ opacity: 0, y: 10 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: index * 0.05 }}
 className="p-4 rounded-xl bg-success/10 border border-success/20"
 >
 <div className="flex items-start gap-3">
 <div className="w-10 h-10 rounded-xl bg-success/20 flex items-center justify-center flex-shrink-0">
 <span className="text-sm font-bold text-success">
 {patient.token?.replace('A', '')}
 </span>
 </div>
 <div className="flex-1 min-w-0">
 <p className="font-medium text-gray-800">{patient.name}</p>
 <p className="text-xs text-gray-600 mt-0.5">
 {patient.age ? `${patient.age} yrs` : ''} {patient.reason && `· ${patient.reason}`}
 </p>
 <p className="text-xs text-success mt-1">
 Completed at {patient.updated_at ? format(new Date(patient.updated_at), 'h:mm a') : ''}
 </p>
 </div>
 </div>
 </motion.div>
 ))}
 </div>
 ) : (
 <EmptyState
 icon={CheckCircle}
 title="No completed consultations"
 description="Completed patients will appear here"
 />
 )}
 </GlassCard>
 </div>

 {/* Add Patient Modal */}
 <Modal
 isOpen={showAddModal}
 onClose={() => setShowAddModal(false)}
 title="Add Walk-in Patient"
 >
 <div className="space-y-4">
 <div>
 <label className="block text-sm text-gray-800/70 mb-2">Patient Name *</label>
 <Input
 value={newPatient.name}
 onChange={(e) => setNewPatient({ ...newPatient, name: e.target.value })}
 placeholder="Enter patient name"
 />
 </div>

 <div>
 <label className="block text-sm text-gray-800/70 mb-2">Age</label>
 <Input
 type="number"
 value={newPatient.age}
 onChange={(e) => setNewPatient({ ...newPatient, age: e.target.value })}
 placeholder="Enter age"
 />
 </div>

 <div>
 <label className="block text-sm text-gray-800/70 mb-2">Reason for Visit</label>
 <Input
 value={newPatient.reason}
 onChange={(e) => setNewPatient({ ...newPatient, reason: e.target.value })}
 placeholder="Brief description of symptoms"
 />
 </div>

 <div>
 <label className="block text-sm text-gray-800/70 mb-2">Assign to Doctor</label>
 <select
 value={newPatient.doctorId}
 onChange={(e) => handleDoctorChange(e.target.value)}
 className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 focus:outline-none focus:border-primary-500"
 >
 <option value="">Select a doctor (optional)</option>
 {doctors.map((doctor) => (
 <option key={doctor.id} value={doctor.id}>
 Dr. {doctor.full_name} - {doctor.specialization}
 </option>
 ))}
 </select>
 </div>

 <div className="flex gap-3 pt-4">
 <Button
 variant="ghost"
 onClick={() => setShowAddModal(false)}
 className="flex-1"
 >
 Cancel
 </Button>
 <Button
 variant="primary"
 onClick={handleAddPatient}
 disabled={isAdding || !newPatient.name.trim()}
 className="flex-1"
 >
 {isAdding ? 'Adding...' : 'Add to Queue'}
 </Button>
 </div>
 </div>
 </Modal>
 </DashboardLayout>
 )
}

export default WalkInManagementPage



