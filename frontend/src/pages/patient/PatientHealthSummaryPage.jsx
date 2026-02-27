import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { 
  Heart,
  Activity,
  Thermometer,
  Droplets,
  AlertTriangle,
  Syringe,
  User,
  Calendar,
  FileText,
  Plus,
  Edit,
  Phone,
  MessageSquare,
  Stethoscope,
  Shield,
  Clock,
  ChevronRight
} from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import useAuthStore from '../../store/authStore'
import { getAppointments, getDoctors } from '../../services/api'
import { GlassCard, Badge, Button, Modal, Input } from '../../components/ui'
import { EmptyState } from '../../components/shared'

const PatientHealthSummaryPage = () => {
  const { user } = useAuthStore()
  const [appointments, setAppointments] = useState([])
  const [doctors, setDoctors] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddAllergyModal, setShowAddAllergyModal] = useState(false)
  const [showAddConditionModal, setShowAddConditionModal] = useState(false)
  const [newAllergy, setNewAllergy] = useState('')
  const [newCondition, setNewCondition] = useState('')

  // Health data - in a real app this would come from the backend
  const [healthData, setHealthData] = useState({
    allergies: ['Penicillin', 'Pollen'],
    conditions: ['Asthma (Childhood)'],
    immunizations: [
      { name: 'COVID-19', date: '2023-06-15', status: 'completed' },
      { name: 'Influenza', date: '2024-01-10', status: 'completed' },
      { name: 'Tetanus', date: '2022-05-20', status: 'completed' },
    ],
    vitals: {
      bloodPressure: '120/80',
      heartRate: 72,
      temperature: 98.6,
      weight: 70,
      height: 175,
      bmi: 22.9
    },
    emergencyContact: {
      name: 'John Doe',
      relationship: 'Spouse',
      phone: '+91 98765 43210'
    }
  })

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) return
      
      try {
        const [appointmentsData, doctorsData] = await Promise.all([
          getAppointments({ patientId: user.id }),
          getDoctors({})
        ])
        
        setAppointments(appointmentsData || [])
        setDoctors(doctorsData || [])
      } catch (error) {
        console.error('Error fetching health data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [user?.id])

  // Get patient's assigned doctors (from completed appointments)
  const careTeam = [...new Map(appointments
    .filter(apt => apt.status === 'completed' && apt.doctor_id)
    .map(apt => [apt.doctor_id, { id: apt.doctor_id, name: apt.doctor_name, specialization: apt.specialization }]))
  .values()].slice(0, 4)

  const handleAddAllergy = () => {
    if (!newAllergy.trim()) return
    setHealthData(prev => ({
      ...prev,
      allergies: [...prev.allergies, newAllergy]
    }))
    setNewAllergy('')
    setShowAddAllergyModal(false)
    toast.success('Allergy added!')
  }

  const handleAddCondition = () => {
    if (!newCondition.trim()) return
    setHealthData(prev => ({
      ...prev,
      conditions: [...prev.conditions, newCondition]
    }))
    setNewCondition('')
    setShowAddConditionModal(false)
    toast.success('Condition added!')
  }

  const removeAllergy = (index) => {
    setHealthData(prev => ({
      ...prev,
      allergies: prev.allergies.filter((_, i) => i !== index)
    }))
  }

  return (
    <div className="min-h-screen pb-24" style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5a87 50%, #3d7ab5 100%)', minHeight: '100vh' }}>
      {/* Header */}
      <header className="sticky top-0 z-50 px-5 pt-8 pb-4" style={{ background: 'rgba(30,58,95,0.95)', backdropFilter: 'blur(10px)' }}>
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-white">Health Summary</h1>
          <p className="text-sm text-white/60">Your complete health profile</p>
        </div>
      </header>

      <main className="px-5 pb-24">
        {/* Vitals Overview */}
        <section className="mt-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-red-400" />
            Vitals
          </h2>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-2xl" style={{ background: 'rgba(255,255,255,0.15)' }}>
              <div className="flex items-center gap-2 mb-2">
                <Heart className="w-4 h-4 text-red-400" />
                <span className="text-xs text-white/60">Blood Pressure</span>
              </div>
              <p className="text-2xl font-bold text-white">{healthData.vitals.bloodPressure}</p>
              <p className="text-xs text-green-400">Normal</p>
            </div>
            <div className="p-4 rounded-2xl" style={{ background: 'rgba(255,255,255,0.15)' }}>
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-4 h-4 text-pink-400" />
                <span className="text-xs text-white/60">Heart Rate</span>
              </div>
              <p className="text-2xl font-bold text-white">{healthData.vitals.heartRate} <span className="text-sm font-normal">bpm</span></p>
              <p className="text-xs text-green-400">Normal</p>
            </div>
            <div className="p-4 rounded-2xl" style={{ background: 'rgba(255,255,255,0.15)' }}>
              <div className="flex items-center gap-2 mb-2">
                <Thermometer className="w-4 h-4 text-orange-400" />
                <span className="text-xs text-white/60">Temperature</span>
              </div>
              <p className="text-2xl font-bold text-white">{healthData.vitals.temperature}°F</p>
              <p className="text-xs text-green-400">Normal</p>
            </div>
            <div className="p-4 rounded-2xl" style={{ background: 'rgba(255,255,255,0.15)' }}>
              <div className="flex items-center gap-2 mb-2">
                <User className="w-4 h-4 text-blue-400" />
                <span className="text-xs text-white/60">BMI</span>
              </div>
              <p className="text-2xl font-bold text-white">{healthData.vitals.bmi}</p>
              <p className="text-xs text-green-400">Healthy</p>
            </div>
          </div>
        </section>

        {/* Allergies */}
        <section className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-400" />
              Allergies
            </h2>
            <Button variant="ghost" size="sm" onClick={() => setShowAddAllergyModal(true)}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {healthData.allergies.map((allergy, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/20 text-red-300"
              >
                <span>{allergy}</span>
                <button onClick={() => removeAllergy(index)} className="hover:text-white">
                  <AlertTriangle className="w-3 h-3" />
                </button>
              </motion.div>
            ))}
            {healthData.allergies.length === 0 && (
              <p className="text-white/50">No known allergies</p>
            )}
          </div>
        </section>

        {/* Medical Conditions */}
        <section className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-400" />
              Medical Conditions
            </h2>
            <Button variant="ghost" size="sm" onClick={() => setShowAddConditionModal(true)}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="space-y-2">
            {healthData.conditions.map((condition, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center justify-between p-4 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.1)' }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                  <span className="text-white">{condition}</span>
                </div>
                <Badge variant="primary">History</Badge>
              </motion.div>
            ))}
            {healthData.conditions.length === 0 && (
              <p className="text-white/50">No medical conditions recorded</p>
            )}
          </div>
        </section>

        {/* Immunizations */}
        <section className="mt-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Syringe className="w-5 h-5 text-green-400" />
            Immunizations
          </h2>
          
          <div className="space-y-3">
            {healthData.immunizations.map((imm, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center justify-between p-4 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.15)' }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-white">{imm.name}</p>
                    <p className="text-xs text-white/50">{format(new Date(imm.date), 'MMM d, yyyy')}</p>
                  </div>
                </div>
                <Badge variant="success">Completed</Badge>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Emergency Contact */}
        <section className="mt-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Phone className="w-5 h-5 text-purple-400" />
            Emergency Contact
          </h2>
          
          <div className="p-5 rounded-2xl" style={{ background: 'rgba(255,255,255,0.15)' }}>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <User className="w-6 h-6 text-purple-400" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-white">{healthData.emergencyContact.name}</p>
                <p className="text-sm text-white/60">{healthData.emergencyContact.relationship}</p>
                <p className="text-sm text-white/80 mt-2 flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  {healthData.emergencyContact.phone}
                </p>
              </div>
              <Button variant="ghost" size="sm">
                <Edit className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </section>

        {/* Care Team */}
        {careTeam.length > 0 && (
          <section className="mt-8">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-primary" />
              My Care Team
            </h2>
            
            <div className="space-y-3">
              {careTeam.map((doctor, index) => (
                <motion.div
                  key={doctor.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between p-4 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.15)' }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                      <Stethoscope className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-white">Dr. {doctor.name}</p>
                      <p className="text-xs text-white/60">{doctor.specialization}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Link to="/patient/messages">
                      <Button variant="ghost" size="sm">
                        <MessageSquare className="w-4 h-4" />
                      </Button>
                    </Link>
                    <ChevronRight className="w-5 h-5 text-white/40" />
                  </div>
                </motion.div>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Add Allergy Modal */}
      <Modal
        isOpen={showAddAllergyModal}
        onClose={() => setShowAddAllergyModal(false)}
        title="Add Allergy"
      >
        <div className="space-y-4">
          <Input
            placeholder="Enter allergy name"
            value={newAllergy}
            onChange={(e) => setNewAllergy(e.target.value)}
          />
          <div className="flex gap-3">
            <Button variant="ghost" className="flex-1" onClick={() => setShowAddAllergyModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" className="flex-1" onClick={handleAddAllergy}>
              Add
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add Condition Modal */}
      <Modal
        isOpen={showAddConditionModal}
        onClose={() => setShowAddConditionModal(false)}
        title="Add Medical Condition"
      >
        <div className="space-y-4">
          <Input
            placeholder="Enter condition name"
            value={newCondition}
            onChange={(e) => setNewCondition(e.target.value)}
          />
          <div className="flex gap-3">
            <Button variant="ghost" className="flex-1" onClick={() => setShowAddConditionModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" className="flex-1" onClick={handleAddCondition}>
              Add
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default PatientHealthSummaryPage
