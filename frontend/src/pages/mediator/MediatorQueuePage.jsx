import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Users, Clock, Phone, Play, CheckCircle, XCircle, 
  AlertTriangle, Filter, RefreshCw, Calendar, UserPlus,
  ChevronRight, Search, Bell
} from 'lucide-react'
import useAuthStore from '../../store/authStore'
import { 
  getDoctorQueue, 
  callPatient, 
  startConsultation, 
  completeConsultation,
  cancelToken,
  markNoShow,
  getBranches,
  getDepartments
} from '../../services/queueApi'
import { getAllDoctors } from '../../services/api'
import QueueDisplayBoard from '../../components/queue/QueueDisplayBoard'
import { Badge } from '../../components/ui'
import toast from 'react-hot-toast'

const MediatorQueuePage = () => {
  const { profile } = useAuthStore()
  const [activeTab, setActiveTab] = useState('queue') // queue, display, manage
  const [selectedBranch, setSelectedBranch] = useState('')
  const [selectedDepartment, setSelectedDepartment] = useState('')
  const [selectedDoctor, setSelectedDoctor] = useState('')
  const [queueData, setQueueData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [branches, setBranches] = useState([])
  const [departments, setDepartments] = useState([])
  const [doctors, setDoctors] = useState([])
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])

  useEffect(() => {
    loadFilters()
  }, [])

  useEffect(() => {
    if (selectedDoctor) {
      loadQueue()
    }
  }, [selectedDoctor, selectedDate])

  const loadFilters = async () => {
    try {
      const [branchesData, departmentsData, doctorsData] = await Promise.all([
        getBranches().catch(() => ({ branches: [] })),
        getDepartments().catch(() => ({ departments: [] })),
        getAllDoctors().catch(() => [])
      ])
      
      setBranches(branchesData.branches || [])
      setDepartments(departmentsData.departments || [])
      setDoctors(doctorsData || [])
      
      // Set defaults
      if (branchesData.branches?.length > 0) {
        setSelectedBranch(branchesData.branches[0].id)
      }
    } catch (error) {
      console.error('Error loading filters:', error)
    }
  }

  const loadQueue = async () => {
    if (!selectedDoctor) return
    
    setLoading(true)
    try {
      const data = await getDoctorQueue(selectedDoctor, { date: selectedDate })
      setQueueData(data)
    } catch (error) {
      toast.error('Failed to load queue')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleCallPatient = async (tokenId, roomNumber) => {
    try {
      await callPatient(tokenId, roomNumber)
      toast.success('Patient called')
      loadQueue()
    } catch (error) {
      toast.error(error.message)
    }
  }

  const handleStartConsultation = async (tokenId) => {
    try {
      await startConsultation(tokenId)
      toast.success('Consultation started')
      loadQueue()
    } catch (error) {
      toast.error(error.message)
    }
  }

  const handleCompleteConsultation = async (tokenId, notes) => {
    try {
      await completeConsultation(tokenId, { notes })
      toast.success('Consultation completed')
      loadQueue()
    } catch (error) {
      toast.error(error.message)
    }
  }

  const handleCancelToken = async (tokenId, reason) => {
    try {
      await cancelToken(tokenId, reason)
      toast.success('Token cancelled')
      loadQueue()
    } catch (error) {
      toast.error(error.message)
    }
  }

  const handleMarkNoShow = async (tokenId) => {
    try {
      await markNoShow(tokenId)
      toast.success('Marked as no-show')
      loadQueue()
    } catch (error) {
      toast.error(error.message)
    }
  }

  const getStatusBadge = (status) => {
    const variants = {
      waiting: 'warning',
      called: 'info',
      in_consultation: 'primary',
      completed: 'success',
      cancelled: 'error',
      no_show: 'default'
    }
    return <Badge variant={variants[status]}>{status.replace('_', ' ')}</Badge>
  }

  const getPriorityBadge = (priority) => {
    const colors = {
      emergency: 'bg-red-500',
      high: 'bg-orange-500',
      normal: 'bg-blue-500',
      'follow-up': 'bg-green-500'
    }
    return (
      <span className={`${colors[priority]} text-white px-2 py-1 rounded-full text-xs font-medium`}>
        {priority}
      </span>
    )
  }

  const filteredDoctors = doctors.filter(d => {
    if (selectedDepartment && d.department_id !== selectedDepartment) return false
    return true
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Queue Management</h1>
          <p className="text-gray-500">Manage walk-in patients and view queue</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadQueue}
            className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <RefreshCw className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {[
          { id: 'queue', label: 'Queue Management', icon: Users },
          { id: 'display', label: 'Display Board', icon: Monitor },
          { id: 'manage', label: 'Manage Tokens', icon: Calendar }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              flex items-center gap-2 px-4 py-3 border-b-2 transition-colors
              ${activeTab === tab.id 
                ? 'border-primary-500 text-primary-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700'}
            `}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 shadow-card">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">Select Branch</option>
              {branches.map(branch => (
                <option key={branch.id} value={branch.id}>{branch.name}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">All Departments</option>
              {departments.map(dept => (
                <option key={dept.id} value={dept.id}>{dept.name}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Doctor</label>
            <select
              value={selectedDoctor}
              onChange={(e) => setSelectedDoctor(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">Select Doctor</option>
              {filteredDoctors.map(doctor => (
                <option key={doctor.id} value={doctor.id}>{doctor.full_name}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'queue' && (
          <motion.div
            key="queue"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {selectedDoctor ? (
              <div className="space-y-4">
                {/* Stats */}
                {queueData?.stats && (
                  <div className="grid grid-cols-4 gap-4">
                    <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                      <div className="flex items-center gap-2 text-amber-600 mb-1">
                        <Clock className="w-4 h-4" />
                        <span className="font-medium">Waiting</span>
                      </div>
                      <div className="text-2xl font-bold text-amber-700">{queueData.stats.waiting}</div>
                    </div>
                    <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                      <div className="flex items-center gap-2 text-blue-600 mb-1">
                        <Phone className="w-4 h-4" />
                        <span className="font-medium">Called</span>
                      </div>
                      <div className="text-2xl font-bold text-blue-700">{queueData.stats.called}</div>
                    </div>
                    <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
                      <div className="flex items-center gap-2 text-purple-600 mb-1">
                        <Play className="w-4 h-4" />
                        <span className="font-medium">In Progress</span>
                      </div>
                      <div className="text-2xl font-bold text-purple-700">{queueData.stats.in_consultation}</div>
                    </div>
                    <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200">
                      <div className="flex items-center gap-2 text-emerald-600 mb-1">
                        <CheckCircle className="w-4 h-4" />
                        <span className="font-medium">Completed</span>
                      </div>
                      <div className="text-2xl font-bold text-emerald-700">{queueData.stats.completed}</div>
                    </div>
                  </div>
                )}

                {/* Queue List */}
                <div className="bg-white rounded-xl shadow-card overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="font-semibold text-gray-800">Patient Queue</h3>
                  </div>
                  
                  {loading ? (
                    <div className="p-8 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto"></div>
                    </div>
                  ) : queueData?.queue?.length > 0 ? (
                    <div className="divide-y divide-gray-100">
                      {queueData.queue.map((token, index) => (
                        <motion.div
                          key={token.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="p-4 hover:bg-gray-50"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center font-bold text-primary-600">
                                #{token.position}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-gray-800">{token.token_number}</span>
                                  {getPriorityBadge(token.priority)}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {token.patient?.full_name || 'Unknown Patient'}
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <div className="text-sm text-gray-500">Wait Time</div>
                                <div className="font-medium text-gray-700">
                                  {token.estimated_wait_minutes || 0} min
                                </div>
                              </div>
                              
                              {getStatusBadge(token.status)}
                              
                              <div className="flex items-center gap-2">
                                {token.status === 'waiting' && (
                                  <>
                                    <button
                                      onClick={() => handleCallPatient(token.id, token.room_number)}
                                      className="p-2 bg-blue-100 rounded-lg hover:bg-blue-200 transition-colors"
                                      title="Call Patient"
                                    >
                                      <Phone className="w-4 h-4 text-blue-600" />
                                    </button>
                                    <button
                                      onClick={() => handleCancelToken(token.id, 'Cancelled by admin')}
                                      className="p-2 bg-red-100 rounded-lg hover:bg-red-200 transition-colors"
                                      title="Cancel"
                                    >
                                      <XCircle className="w-4 h-4 text-red-600" />
                                    </button>
                                  </>
                                )}
                                
                                {token.status === 'called' && (
                                  <>
                                    <button
                                      onClick={() => handleStartConsultation(token.id)}
                                      className="p-2 bg-purple-100 rounded-lg hover:bg-purple-200 transition-colors"
                                      title="Start Consultation"
                                    >
                                      <Play className="w-4 h-4 text-purple-600" />
                                    </button>
                                    <button
                                      onClick={() => handleMarkNoShow(token.id)}
                                      className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                                      title="No Show"
                                    >
                                      <XCircle className="w-4 h-4 text-gray-600" />
                                    </button>
                                  </>
                                )}
                                
                                {token.status === 'in_consultation' && (
                                  <button
                                    onClick={() => handleCompleteConsultation(token.id, '')}
                                    className="p-2 bg-emerald-100 rounded-lg hover:bg-emerald-200 transition-colors"
                                    title="Complete"
                                  >
                                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center text-gray-500">
                      <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p>No patients in queue</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-xl p-8 text-center">
                <Users className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p className="text-gray-500">Select a doctor to view their queue</p>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'display' && (
          <motion.div
            key="display"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {selectedBranch ? (
              <QueueDisplayBoard 
                branchId={selectedBranch} 
                departmentId={selectedDepartment}
                autoRefresh={true}
                refreshInterval={5000}
              />
            ) : (
              <div className="bg-gray-50 rounded-xl p-8 text-center">
                <Monitor className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p className="text-gray-500">Select a branch to view display board</p>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'manage' && (
          <motion.div
            key="manage"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <div className="bg-white rounded-xl p-8 text-center">
              <UserPlus className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Token Management</h3>
              <p className="text-gray-500 mb-4">Generate new tokens and manage walk-in patients</p>
              <button className="px-6 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600">
                Generate New Token
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Missing import
const Monitor = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
    <line x1="8" y1="21" x2="16" y2="21" />
    <line x1="12" y1="17" x2="12" y2="21" />
  </svg>
)

export default MediatorQueuePage
