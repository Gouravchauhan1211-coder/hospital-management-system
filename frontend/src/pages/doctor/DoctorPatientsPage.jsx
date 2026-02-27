import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { 
  Users,
  Search,
  Filter,
  ChevronDown,
  Eye,
  FileText,
  Plus,
  Calendar,
  Clock,
  User,
  Phone,
  Mail,
  Heart,
  Activity,
  AlertCircle
} from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import useAuthStore from '../../store/authStore'
import { getAppointments, getPatientById, getMedicalRecords, createMedicalRecord } from '../../services/api'
import { DashboardLayout } from '../../components/layout'
import { GlassCard, Badge, Button, Modal } from '../../components/ui'
import { EmptyState } from '../../components/shared'
import { CardSkeleton } from '../../components/ui/Skeleton'

const DoctorPatientsPage = () => {
  const { user } = useAuthStore()
  
  // State
  const [isLoading, setIsLoading] = useState(true)
  const [appointments, setAppointments] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [statusFilter, setStatusFilter] = useState('')
  
  // Modal state
  const [selectedPatient, setSelectedPatient] = useState(null)
  const [showPatientModal, setShowPatientModal] = useState(false)
  const [patientAppointments, setPatientAppointments] = useState([])
  const [patientRecords, setPatientRecords] = useState([])
  const [isLoadingPatient, setIsLoadingPatient] = useState(false)
  
  // Add note modal
  const [showNoteModal, setShowNoteModal] = useState(false)
  const [noteData, setNoteData] = useState({ title: '', description: '' })
  const [isSavingNote, setIsSavingNote] = useState(false)

  // Fetch appointments
  useEffect(() => {
    const fetchAppointments = async () => {
      if (!user?.id) return
      
      try {
        const data = await getAppointments({ doctorId: user.id })
        setAppointments(data || [])
      } catch (error) {
        console.error('Error fetching appointments:', error)
        toast.error('Failed to load patients')
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchAppointments()
  }, [user?.id])

  // Get unique patients from appointments
  const patients = useMemo(() => {
    const patientMap = new Map()
    
    appointments.forEach(apt => {
      if (!patientMap.has(apt.patient_id)) {
        patientMap.set(apt.patient_id, {
          id: apt.patient_id,
          name: apt.patient_name,
          lastVisit: apt.date,
          totalAppointments: 1,
          status: apt.status,
        })
      } else {
        const existing = patientMap.get(apt.patient_id)
        existing.totalAppointments += 1
        if (new Date(apt.date) > new Date(existing.lastVisit)) {
          existing.lastVisit = apt.date
        }
      }
    })
    
    return Array.from(patientMap.values())
  }, [appointments])

  // Filtered patients
  const filteredPatients = useMemo(() => {
    return patients.filter(patient => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        if (!patient.name?.toLowerCase().includes(query)) {
          return false
        }
      }
      return true
    })
  }, [patients, searchQuery])

  // View patient details
  const handleViewPatient = async (patientId) => {
    setIsLoadingPatient(true)
    setShowPatientModal(true)
    
    try {
      const [patientData, recordsData, patientAppointmentsData] = await Promise.all([
        getPatientById(patientId),
        getMedicalRecords(patientId).catch(() => []),
        getAppointments({ patientId, doctorId: user.id }).catch(() => []),
      ])
      
      setSelectedPatient(patientData)
      setPatientRecords(recordsData || [])
      setPatientAppointments(patientAppointmentsData || [])
    } catch (error) {
      toast.error('Failed to load patient details')
      setShowPatientModal(false)
    } finally {
      setIsLoadingPatient(false)
    }
  }

  // Add medical note
  const handleAddNote = async () => {
    if (!selectedPatient || !noteData.title || !noteData.description) {
      toast.error('Please fill in all fields')
      return
    }
    
    setIsSavingNote(true)
    try {
      await createMedicalRecord({
        patientId: selectedPatient.id,
        doctorId: user.id,
        doctorName: user.fullName,
        title: noteData.title,
        type: 'note',
        description: noteData.description,
      })
      
      // Refresh records
      const recordsData = await getMedicalRecords(selectedPatient.id)
      setPatientRecords(recordsData || [])
      
      setShowNoteModal(false)
      setNoteData({ title: '', description: '' })
      toast.success('Medical note added successfully')
    } catch (error) {
      toast.error('Failed to add note')
    } finally {
      setIsSavingNote(false)
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
          My Patients
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-white/60"
        >
          View and manage your patients' information
        </motion.p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary-500/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{patients.length}</p>
              <p className="text-xs text-white/60">Total Patients</p>
            </div>
          </div>
        </GlassCard>
        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
              <Activity className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {appointments.filter(a => a.status === 'completed').length}
              </p>
              <p className="text-xs text-white/60">Completed Consultations</p>
            </div>
          </div>
        </GlassCard>
        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {appointments.filter(a => a.status === 'confirmed').length}
              </p>
              <p className="text-xs text-white/60">Upcoming Appointments</p>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Search & Filters */}
      <GlassCard className="p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input
                type="text"
                placeholder="Search patients by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:border-primary-500"
              />
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Patients List */}
      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-white">Patients</h2>
          <span className="text-sm text-white/60">{filteredPatients.length} patients</span>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>
        ) : filteredPatients.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPatients.map((patient, index) => (
              <motion.div
                key={patient.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary-500/20 flex items-center justify-center flex-shrink-0">
                    <User className="w-6 h-6 text-primary-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-medium truncate">{patient.name}</h3>
                    <p className="text-sm text-white/60">
                      {patient.totalAppointments} appointment{patient.totalAppointments > 1 ? 's' : ''}
                    </p>
                    <p className="text-xs text-white/40 mt-1">
                      Last visit: {format(new Date(patient.lastVisit), 'MMM d, yyyy')}
                    </p>
                  </div>
                </div>
                
                <div className="mt-4 flex items-center justify-between">
                  <Badge variant="success" size="sm">Active</Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleViewPatient(patient.id)}
                  >
                    <Eye className="w-4 h-4" />
                    View
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Users}
            title="No patients found"
            description="You don't have any patients matching your search."
          />
        )}
      </GlassCard>

      {/* Patient Details Modal */}
      <Modal
        isOpen={showPatientModal}
        onClose={() => {
          setShowPatientModal(false)
          setSelectedPatient(null)
          setPatientAppointments([])
          setPatientRecords([])
        }}
        title="Patient Details"
        size="lg"
      >
        {isLoadingPatient ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          </div>
        ) : selectedPatient ? (
          <div className="space-y-6">
            {/* Patient Header */}
            <div className="flex items-center gap-4 pb-4 border-b border-white/10">
              <div className="w-16 h-16 rounded-full bg-primary-500/20 flex items-center justify-center">
                <User className="w-8 h-8 text-primary-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">{selectedPatient.full_name}</h3>
                <div className="flex items-center gap-4 mt-1">
                  {selectedPatient.email && (
                    <div className="flex items-center gap-1 text-sm text-white/60">
                      <Mail className="w-3 h-3" />
                      {selectedPatient.email}
                    </div>
                  )}
                  {selectedPatient.phone && (
                    <div className="flex items-center gap-1 text-sm text-white/60">
                      <Phone className="w-3 h-3" />
                      {selectedPatient.phone}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Patient Info */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-3 rounded-lg bg-white/5">
                <p className="text-xs text-white/60">Gender</p>
                <p className="text-white font-medium capitalize">{selectedPatient.gender || 'N/A'}</p>
              </div>
              <div className="p-3 rounded-lg bg-white/5">
                <p className="text-xs text-white/60">Blood Group</p>
                <p className="text-white font-medium">{selectedPatient.blood_group || 'N/A'}</p>
              </div>
              <div className="p-3 rounded-lg bg-white/5">
                <p className="text-xs text-white/60">Date of Birth</p>
                <p className="text-white font-medium">
                  {selectedPatient.date_of_birth 
                    ? format(new Date(selectedPatient.date_of_birth), 'MMM d, yyyy')
                    : 'N/A'
                  }
                </p>
              </div>
              <div className="p-3 rounded-lg bg-white/5">
                <p className="text-xs text-white/60">Total Visits</p>
                <p className="text-white font-medium">{patientAppointments.length}</p>
              </div>
            </div>

            {/* Medical History */}
            {(selectedPatient.medical_history || selectedPatient.allergies) && (
              <div className="space-y-3">
                {selectedPatient.medical_history && (
                  <div>
                    <p className="text-sm text-white/60 mb-1 flex items-center gap-2">
                      <Heart className="w-4 h-4" />
                      Medical History
                    </p>
                    <p className="text-white bg-white/5 p-3 rounded-lg">{selectedPatient.medical_history}</p>
                  </div>
                )}
                {selectedPatient.allergies && (
                  <div>
                    <p className="text-sm text-white/60 mb-1 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      Allergies
                    </p>
                    <p className="text-white bg-red-500/10 p-3 rounded-lg border border-red-500/20">{selectedPatient.allergies}</p>
                  </div>
                )}
              </div>
            )}

            {/* Recent Appointments */}
            <div>
              <h4 className="text-sm font-medium text-white mb-3">Recent Appointments</h4>
              {patientAppointments.length > 0 ? (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {patientAppointments.slice(0, 5).map(apt => (
                    <div key={apt.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                      <div>
                        <p className="text-white text-sm">{format(new Date(apt.date), 'MMM d, yyyy')}</p>
                        <p className="text-xs text-white/60">{apt.time} • {apt.mode === 'online' ? 'Video Call' : 'In-Person'}</p>
                      </div>
                      <Badge variant={
                        apt.status === 'completed' ? 'success' :
                        apt.status === 'confirmed' ? 'primary' :
                        apt.status === 'pending' ? 'warning' : 'error'
                      }>
                        {apt.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-white/40 text-sm text-center py-4">No appointments found</p>
              )}
            </div>

            {/* Medical Records */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-white">Medical Records</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowNoteModal(true)}
                >
                  <Plus className="w-4 h-4" />
                  Add Note
                </Button>
              </div>
              {patientRecords.length > 0 ? (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {patientRecords.slice(0, 5).map(record => (
                    <div key={record.id} className="p-3 rounded-lg bg-white/5">
                      <div className="flex items-center justify-between">
                        <p className="text-white text-sm font-medium">{record.title}</p>
                        <p className="text-xs text-white/40">{format(new Date(record.created_at), 'MMM d, yyyy')}</p>
                      </div>
                      {record.description && (
                        <p className="text-xs text-white/60 mt-1">{record.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-white/40 text-sm text-center py-4">No medical records found</p>
              )}
            </div>

            {/* TODO: Add more patient management features */}
            <div className="pt-4 border-t border-white/10">
              <p className="text-xs text-white/40 italic">
                TODO: Add features for updating patient info, prescribing medications, and ordering tests
              </p>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* Add Note Modal */}
      <Modal
        isOpen={showNoteModal}
        onClose={() => {
          setShowNoteModal(false)
          setNoteData({ title: '', description: '' })
        }}
        title="Add Medical Note"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-white/60 mb-2">Title</label>
            <input
              type="text"
              value={noteData.title}
              onChange={(e) => setNoteData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="e.g., Follow-up Notes, Diagnosis Update"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:border-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm text-white/60 mb-2">Description</label>
            <textarea
              value={noteData.description}
              onChange={(e) => setNoteData(prev => ({ ...prev, description: e.target.value }))}
              rows={5}
              placeholder="Enter your notes..."
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:border-primary-500 resize-none"
            />
          </div>
          <div className="flex gap-3 pt-4">
            <Button
              variant="ghost"
              className="flex-1"
              onClick={() => {
                setShowNoteModal(false)
                setNoteData({ title: '', description: '' })
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              className="flex-1"
              onClick={handleAddNote}
              disabled={isSavingNote}
            >
              {isSavingNote ? 'Saving...' : 'Save Note'}
            </Button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  )
}

export default DoctorPatientsPage