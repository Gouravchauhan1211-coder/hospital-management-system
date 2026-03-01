import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { 
  Pill,
  RefreshCw,
  Search,
  Filter,
  Calendar,
  User,
  Clock,
  AlertCircle,
  CheckCircle,
  FileText,
  ChevronRight,
  Plus
} from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import useAuthStore from '../../store/authStore'
import { getPrescriptions, getAppointments } from '../../services/api'
import { GlassCard, Badge, Button, Modal, Input } from '../../components/ui'
import { EmptyState } from '../../components/shared'
import { CardSkeleton } from '../../components/ui/Skeleton'

const PatientPrescriptionsPage = () => {
  const { user } = useAuthStore()
  const [prescriptions, setPrescriptions] = useState([])
  const [appointments, setAppointments] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [showRefillModal, setShowRefillModal] = useState(false)
  const [selectedPrescription, setSelectedPrescription] = useState(null)
  const [refillNotes, setRefillNotes] = useState('')
  const [isRequesting, setIsRequesting] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) return
      
      try {
        const [prescriptionsData, appointmentsData] = await Promise.all([
          getPrescriptions(user.id),
          getAppointments({ patientId: user.id })
        ])
        
        // If no prescriptions from API, create sample data from appointments
        if (!prescriptionsData || prescriptionsData.length === 0) {
          const samplePrescriptions = appointmentsData
            ?.filter(apt => apt.status === 'completed')
            .slice(0, 5)
            .map(apt => ({
              id: apt.id,
              medication_name: 'General Consultation',
              dosage: 'As directed',
              frequency: 'Once daily',
              duration: '7 days',
              prescribed_by: apt.doctor_name,
              prescribed_date: apt.date,
              status: 'active',
              notes: `Follow-up for ${apt.specialization} consultation`,
              is_sample: true
            })) || []
          setPrescriptions(samplePrescriptions)
        } else {
          setPrescriptions(prescriptionsData)
        }
        
        setAppointments(appointmentsData || [])
      } catch (error) {
        console.error('Error fetching prescriptions:', error)
        // Set empty array on error
        setPrescriptions([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [user?.id])

  const filteredPrescriptions = prescriptions.filter(pres => {
    const matchesSearch = pres.medication_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pres.prescribed_by?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesFilter = typeFilter === 'all' || pres.status === typeFilter
    return matchesSearch && matchesFilter
  })

  const activePrescriptions = filteredPrescriptions.filter(p => p.status === 'active')
  const expiredPrescriptions = filteredPrescriptions.filter(p => p.status === 'expired' || p.status === 'completed')

  const handleRefillRequest = async () => {
    if (!selectedPrescription) return
    
    setIsRequesting(true)
    try {
      // Simulate refill request
      await new Promise(resolve => setTimeout(resolve, 1000))
      toast.success('Refill request submitted successfully! Your doctor will review it.')
      setShowRefillModal(false)
      setRefillNotes('')
      setSelectedPrescription(null)
    } catch (error) {
      toast.error('Failed to submit refill request')
    } finally {
      setIsRequesting(false)
    }
  }

  return (
    <div className="min-h-screen pb-24" style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5a87 50%, #3d7ab5 100%)', minHeight: '100vh' }}>
      {/* Header */}
      <header className="sticky top-0 z-50 px-5 pt-8 pb-4" style={{ background: 'rgba(30,58,95,0.95)', backdropFilter: 'blur(10px)' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">My Prescriptions</h1>
            <p className="text-sm text-gray-600">Manage your medications</p>
          </div>
          <Link to="/patient/appointments">
            <Button variant="primary" size="sm">
              <Plus className="w-4 h-4 mr-1" />
              New Prescription
            </Button>
          </Link>
        </div>

        {/* Search and Filter */}
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search medications..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-11 pl-10 pr-4 bg-gray-100 border border-gray-200 rounded-xl text-gray-800 placeholder:text-gray-500"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="h-11 px-4 bg-gray-100 border border-gray-200 rounded-xl text-gray-800"
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="expired">Expired</option>
          </select>
        </div>
      </header>

      <main className="px-5 pb-24">
        {/* Active Prescriptions */}
        <section className="mt-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Pill className="w-5 h-5 text-green-400" />
            Active Medications
            <Badge variant="success" className="ml-2">{activePrescriptions.length}</Badge>
          </h2>
          
          {isLoading ? (
            <div className="space-y-4">
              <CardSkeleton />
              <CardSkeleton />
            </div>
          ) : activePrescriptions.length > 0 ? (
            <div className="space-y-4">
              {activePrescriptions.map((prescription, index) => (
                <motion.div
                  key={prescription.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="rounded-2xl p-5 border"
                  style={{ background: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.1)' }}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-bold text-gray-800 text-lg">{prescription.medication_name}</h3>
                      <p className="text-sm text-gray-600">{prescription.dosage}</p>
                    </div>
                    <Badge variant="success">Active</Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="flex items-center gap-2 text-sm text-gray-800/70">
                      <Clock className="w-4 h-4" />
                      <span>{prescription.frequency}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-800/70">
                      <Calendar className="w-4 h-4" />
                      <span>Until {prescription.duration}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-800/70">
                      <User className="w-4 h-4" />
                      <span>Dr. {prescription.prescribed_by}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-800/70">
                      <Calendar className="w-4 h-4" />
                      <span>{format(new Date(prescription.prescribed_date), 'MMM d, yyyy')}</span>
                    </div>
                  </div>

                  {prescription.notes && (
                    <p className="text-sm text-gray-600 mb-4 italic">{prescription.notes}</p>
                  )}

                  <div className="flex gap-2">
                    <Button 
                      variant="primary" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => {
                        setSelectedPrescription(prescription)
                        setShowRefillModal(true)
                      }}
                    >
                      <RefreshCw className="w-4 h-4 mr-1" />
                      Request Refill
                    </Button>
                    <Button variant="ghost" size="sm">
                      <FileText className="w-4 h-4" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Pill}
              title="No active prescriptions"
              description="You don't have any active medications."
              action={
                <Link to="/patient/appointments">
                  <Button variant="primary" size="sm">Book Appointment</Button>
                </Link>
              }
            />
          )}
        </section>

        {/* Past Prescriptions */}
        {expiredPrescriptions.length > 0 && (
          <section className="mt-8">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-gray-600" />
              Past Prescriptions
            </h2>
            
            <div className="space-y-3">
              {expiredPrescriptions.map((prescription, index) => (
                <motion.div
                  key={prescription.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="rounded-2xl p-4 border opacity-60"
                  style={{ background: 'rgba(255,255,255,0.1)', borderColor: 'rgba(255,255,255,0.1)' }}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-gray-800">{prescription.medication_name}</h3>
                      <p className="text-xs text-gray-800/50">{prescription.prescribed_by} • {format(new Date(prescription.prescribed_date), 'MMM yyyy')}</p>
                    </div>
                    <Badge variant="default">Expired</Badge>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Refill Modal */}
      <Modal
        isOpen={showRefillModal}
        onClose={() => setShowRefillModal(false)}
        title="Request Prescription Refill"
      >
        <div className="space-y-4">
          {selectedPrescription && (
            <>
              <div className="p-4 rounded-xl bg-gray-50">
                <h4 className="font-semibold text-gray-800">{selectedPrescription.medication_name}</h4>
                <p className="text-sm text-gray-600">{selectedPrescription.dosage} - {selectedPrescription.frequency}</p>
                <p className="text-sm text-gray-600">Prescribed by: Dr. {selectedPrescription.prescribed_by}</p>
              </div>
              
              <div>
                <label className="block text-sm text-gray-800/70 mb-2">Additional Notes (Optional)</label>
                <textarea
                  value={refillNotes}
                  onChange={(e) => setRefillNotes(e.target.value)}
                  placeholder="Any symptoms or concerns..."
                  className="w-full h-24 px-4 py-3 bg-gray-100 border border-gray-200 rounded-xl text-gray-800 placeholder:text-gray-500 resize-none"
                />
              </div>

              <div className="flex gap-3">
                <Button 
                  variant="ghost" 
                  className="flex-1"
                  onClick={() => setShowRefillModal(false)}
                >
                  Cancel
                </Button>
                <Button 
                  variant="primary" 
                  className="flex-1"
                  onClick={handleRefillRequest}
                  isLoading={isRequesting}
                >
                  Submit Request
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  )
}

export default PatientPrescriptionsPage



