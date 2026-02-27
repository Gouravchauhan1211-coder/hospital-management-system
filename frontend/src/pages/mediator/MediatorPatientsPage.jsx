import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { 
  Search,
  User,
  Mail,
  Phone,
  Calendar,
  Clock,
  Heart,
  FileText,
  ChevronLeft,
  ChevronRight,
  Activity,
  AlertCircle
} from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import useAuthStore from '../../store/authStore'
import { getPatients, getAppointments } from '../../services/api'
import { DashboardLayout } from '../../components/layout'
import { GlassCard, Badge, Button, Modal } from '../../components/ui'
import { EmptyState } from '../../components/shared'
import { CardSkeleton } from '../../components/ui/Skeleton'

const MediatorPatientsPage = () => {
  const { user } = useAuthStore()
  const [isLoading, setIsLoading] = useState(true)
  const [patients, setPatients] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPatient, setSelectedPatient] = useState(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [patientAppointments, setPatientAppointments] = useState([])

  useEffect(() => {
    fetchPatients()
  }, [])

  const fetchPatients = async () => {
    try {
      setIsLoading(true)
      const data = await getPatients({})
      setPatients(data || [])
    } catch (error) {
      console.error('Error fetching patients:', error)
      toast.error('Failed to load patients')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchPatientAppointments = async (patientId) => {
    try {
      const data = await getAppointments({ patientId })
      setPatientAppointments(data || [])
    } catch (error) {
      console.error('Error fetching appointments:', error)
    }
  }

  const filteredPatients = patients.filter(patient => {
    const fullName = patient.full_name || ''
    const email = patient.email || ''
    return fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
           email.toLowerCase().includes(searchQuery.toLowerCase())
  })

  const handleViewDetails = async (patient) => {
    setSelectedPatient(patient)
    await fetchPatientAppointments(patient.id)
    setShowDetailsModal(true)
  }

  return (
    <DashboardLayout>
      <div className="mb-8">
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-bold text-white mb-2"
        >
          View Patients
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-white/60"
        >
          View all registered patients and their details
        </motion.p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary-500/20 flex items-center justify-center">
              <User className="w-6 h-6 text-primary-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{patients.length}</p>
              <p className="text-sm text-white/60">Total Patients</p>
            </div>
          </div>
        </GlassCard>
        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
              <Calendar className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {patients.filter(p => p.created_at).length}
              </p>
              <p className="text-sm text-white/60">This Month</p>
            </div>
          </div>
        </GlassCard>
        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center">
              <Activity className="w-6 h-6 text-yellow-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {patients.filter(p => p.is_active !== false).length}
              </p>
              <p className="text-sm text-white/60">Active</p>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Search */}
      <GlassCard className="p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <input
            type="text"
            placeholder="Search patients by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:border-primary-500"
          />
        </div>
      </GlassCard>

      {/* Patients Table */}
      {isLoading ? (
        <div className="space-y-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : filteredPatients.length > 0 ? (
        <GlassCard className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left text-sm text-white/60 pb-3 font-medium px-4">Patient</th>
                  <th className="text-left text-sm text-white/60 pb-3 font-medium px-4">Contact</th>
                  <th className="text-left text-sm text-white/60 pb-3 font-medium px-4">Gender</th>
                  <th className="text-left text-sm text-white/60 pb-3 font-medium px-4">Date of Birth</th>
                  <th className="text-left text-sm text-white/60 pb-3 font-medium px-4">Status</th>
                  <th className="text-right text-sm text-white/60 pb-3 font-medium px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPatients.map((patient, index) => (
                  <motion.tr
                    key={patient.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className="border-b border-white/5 hover:bg-white/5"
                  >
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary-500/20 flex items-center justify-center">
                          <User className="w-5 h-5 text-primary-400" />
                        </div>
                        <div>
                          <p className="text-white font-medium">{patient.full_name || 'N/A'}</p>
                          <p className="text-xs text-white/40">{patient.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div>
                        <p className="text-white/80 text-sm">{patient.email}</p>
                        <p className="text-xs text-white/40">{patient.phone || 'No phone'}</p>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-white/80 text-sm capitalize">{patient.gender || 'N/A'}</span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-white/80 text-sm">
                        {patient.date_of_birth ? format(new Date(patient.date_of_birth), 'MMM d, yyyy') : 'N/A'}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <Badge variant={patient.is_active !== false ? 'success' : 'error'}>
                        {patient.is_active !== false ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDetails(patient)}
                        >
                          <FileText className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      ) : (
        <EmptyState
          icon={User}
          title="No patients found"
          description="Try adjusting your search"
        />
      )}

      {/* Patient Details Modal */}
      <Modal
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false)
          setSelectedPatient(null)
          setPatientAppointments([])
        }}
        title="Patient Details"
      >
        {selectedPatient && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary-500/20 flex items-center justify-center">
                <User className="w-8 h-8 text-primary-400" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white">
                  {selectedPatient.full_name}
                </h3>
                <p className="text-white/60">{selectedPatient.email}</p>
                <Badge variant={selectedPatient.is_active !== false ? 'success' : 'error'} className="mt-2">
                  {selectedPatient.is_active !== false ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
              <div>
                <p className="text-sm text-white/60">Phone</p>
                <p className="text-white">{selectedPatient.phone || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-white/60">Gender</p>
                <p className="text-white capitalize">{selectedPatient.gender || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-white/60">Date of Birth</p>
                <p className="text-white">
                  {selectedPatient.date_of_birth 
                    ? format(new Date(selectedPatient.date_of_birth), 'MMMM d, yyyy')
                    : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm text-white/60">Address</p>
                <p className="text-white">{selectedPatient.address || 'N/A'}</p>
              </div>
            </div>

            <div className="pt-4 border-t border-white/10">
              <h4 className="text-lg font-semibold text-white mb-3">Appointment History</h4>
              {patientAppointments.length > 0 ? (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {patientAppointments.slice(0, 5).map(apt => (
                    <div key={apt.id} className="flex items-center justify-between p-2 rounded-lg bg-white/5">
                      <div>
                        <p className="text-white text-sm">Dr. {apt.doctor_name}</p>
                        <p className="text-xs text-white/40">{apt.specialization}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-white text-sm">{format(new Date(apt.date), 'MMM d')}</p>
                        <p className="text-xs text-white/40">{apt.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-white/40 text-sm">No appointments found</p>
              )}
            </div>
          </div>
        )}
      </Modal>
    </DashboardLayout>
  )
}

export default MediatorPatientsPage
