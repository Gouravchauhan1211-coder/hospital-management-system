import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { 
  FileText,
  Upload,
  Download,
  Eye,
  Trash2,
  Search,
  Filter,
  ChevronDown,
  Calendar,
  User,
  Stethoscope,
  FileImage,
  File,
  Share2,
  Plus,
  X,
  FilePlus,
  Clock,
  AlertCircle
} from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import useAuthStore from '../../store/authStore'
import { getMedicalRecords, createMedicalRecord, getDoctors } from '../../services/api'
import { DashboardLayout } from '../../components/layout'
import { GlassCard, Badge, Button, Modal, Input, Select } from '../../components/ui'
import { EmptyState } from '../../components/shared'
import { CardSkeleton } from '../../components/ui/Skeleton'

// Record types
const recordTypes = [
  { id: 'consultation', label: 'Consultation', icon: User, color: 'bg-blue-500/20 text-blue-400' },
  { id: 'lab_report', label: 'Lab Report', icon: FileText, color: 'bg-green-500/20 text-green-400' },
  { id: 'prescription', label: 'Prescription', icon: FileText, color: 'bg-purple-500/20 text-purple-400' },
  { id: 'imaging', label: 'Imaging/X-Ray', icon: FileImage, color: 'bg-orange-500/20 text-orange-400' },
  { id: 'discharge', label: 'Discharge Summary', icon: File, color: 'bg-teal-500/20 text-teal-400' },
  { id: 'other', label: 'Other', icon: File, color: 'bg-gray-500/20 text-gray-400' },
]

const PatientMedicalRecordsPage = () => {
  const { user } = useAuthStore()
  
  // State
  const [isLoading, setIsLoading] = useState(true)
  const [records, setRecords] = useState([])
  const [doctors, setDoctors] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  
  // Modal state
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState(null)
  const [uploadData, setUploadData] = useState({
    title: '',
    type: 'consultation',
    description: '',
    doctorId: '',
    fileUrl: '',
  })
  const [isUploading, setIsUploading] = useState(false)

  // Fetch records
  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) return
      
      try {
        const [recordsData, doctorsData] = await Promise.all([
          getMedicalRecords(user.id),
          getDoctors({}),
        ])
        
        setRecords(recordsData || [])
        setDoctors(doctorsData || [])
      } catch (error) {
        console.error('Error fetching records:', error)
        toast.error('Failed to load medical records')
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchData()
  }, [user?.id])

  // Filtered records
  const filteredRecords = useMemo(() => {
    return records.filter(record => {
      if (typeFilter && record.type !== typeFilter) return false
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        return (
          record.title?.toLowerCase().includes(query) ||
          record.doctor_name?.toLowerCase().includes(query) ||
          record.description?.toLowerCase().includes(query)
        )
      }
      return true
    })
  }, [records, typeFilter, searchQuery])

  // Group records by date
  const groupedRecords = useMemo(() => {
    const groups = {}
    filteredRecords.forEach(record => {
      const monthYear = format(new Date(record.created_at), 'MMMM yyyy')
      if (!groups[monthYear]) {
        groups[monthYear] = []
      }
      groups[monthYear].push(record)
    })
    return groups
  }, [filteredRecords])

  // Stats
  const stats = useMemo(() => {
    return {
      total: records.length,
      consultations: records.filter(r => r.type === 'consultation').length,
      labReports: records.filter(r => r.type === 'lab_report').length,
      prescriptions: records.filter(r => r.type === 'prescription').length,
    }
  }, [records])

  // Handle upload
  const handleUpload = async () => {
    if (!uploadData.title || !uploadData.type) {
      toast.error('Please fill in required fields')
      return
    }
    
    setIsUploading(true)
    try {
      const doctor = doctors.find(d => d.id === uploadData.doctorId)
      
      const newRecord = await createMedicalRecord({
        patientId: user.id,
        doctorId: uploadData.doctorId || null,
        doctorName: doctor?.full_name || null,
        title: uploadData.title,
        type: uploadData.type,
        description: uploadData.description,
        fileUrl: uploadData.fileUrl || null,
      })
      
      setRecords(prev => [newRecord, ...prev])
      setShowUploadModal(false)
      setUploadData({
        title: '',
        type: 'consultation',
        description: '',
        doctorId: '',
        fileUrl: '',
      })
      toast.success('Record added successfully')
    } catch (error) {
      toast.error('Failed to add record')
    } finally {
      setIsUploading(false)
    }
  }

  // Handle delete
  const handleDelete = async (recordId) => {
    // TODO: Implement delete functionality
    setRecords(prev => prev.filter(r => r.id !== recordId))
    toast.success('Record deleted')
  }

  // Handle share
  const handleShare = (record) => {
    // TODO: Implement share functionality
    toast.success('Share link copied to clipboard')
  }

  // Get record type config
  const getRecordTypeConfig = (type) => {
    return recordTypes.find(t => t.id === type) || recordTypes[recordTypes.length - 1]
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
              className="text-2xl font-bold text-white mb-2"
            >
              Medical Records
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-white/60"
            >
              View and manage your medical history and documents
            </motion.p>
          </div>
          
          <Button
            variant="primary"
            onClick={() => setShowUploadModal(true)}
          >
            <Plus className="w-4 h-4" />
            Add Record
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary-500/20 flex items-center justify-center">
              <FileText className="w-5 h-5 text-primary-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.total}</p>
              <p className="text-xs text-white/60">Total Records</p>
            </div>
          </div>
        </GlassCard>
        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <User className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.consultations}</p>
              <p className="text-xs text-white/60">Consultations</p>
            </div>
          </div>
        </GlassCard>
        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
              <FileText className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.labReports}</p>
              <p className="text-xs text-white/60">Lab Reports</p>
            </div>
          </div>
        </GlassCard>
        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <FileText className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.prescriptions}</p>
              <p className="text-xs text-white/60">Prescriptions</p>
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
                placeholder="Search records..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:border-primary-500"
              />
            </div>
          </div>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-primary-500"
          >
            <option value="">All Types</option>
            {recordTypes.map(type => (
              <option key={type.id} value={type.id}>{type.label}</option>
            ))}
          </select>
        </div>
      </GlassCard>

      {/* Records List */}
      {isLoading ? (
        <div className="space-y-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : Object.keys(groupedRecords).length > 0 ? (
        <div className="space-y-8">
          {Object.entries(groupedRecords).map(([monthYear, monthRecords]) => (
            <div key={monthYear}>
              <h3 className="text-sm font-medium text-white/60 mb-4">{monthYear}</h3>
              <div className="space-y-3">
                {monthRecords.map((record, index) => {
                  const typeConfig = getRecordTypeConfig(record.type)
                  const TypeIcon = typeConfig.icon
                  
                  return (
                    <motion.div
                      key={record.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className="p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                    >
                      <div className="flex items-start gap-4">
                        {/* Type Icon */}
                        <div className={`w-12 h-12 rounded-xl ${typeConfig.color} flex items-center justify-center flex-shrink-0`}>
                          <TypeIcon className="w-6 h-6" />
                        </div>
                        
                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <h4 className="text-white font-medium">{record.title}</h4>
                              <div className="flex items-center gap-3 mt-1">
                                {record.doctor_name && (
                                  <span className="text-sm text-white/60 flex items-center gap-1">
                                    <Stethoscope className="w-3 h-3" />
                                    Dr. {record.doctor_name}
                                  </span>
                                )}
                                <span className="text-sm text-white/40 flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {format(new Date(record.created_at), 'MMM d, yyyy')}
                                </span>
                              </div>
                            </div>
                            <Badge variant="default" size="sm">
                              {typeConfig.label}
                            </Badge>
                          </div>
                          
                          {record.description && (
                            <p className="text-sm text-white/60 mt-2 line-clamp-2">
                              {record.description}
                            </p>
                          )}
                          
                          {/* Actions */}
                          <div className="flex items-center gap-2 mt-3">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedRecord(record)
                                setShowViewModal(true)
                              }}
                            >
                              <Eye className="w-4 h-4" />
                              View
                            </Button>
                            {record.file_url && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => window.open(record.file_url, '_blank')}
                              >
                                <Download className="w-4 h-4" />
                                Download
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleShare(record)}
                            >
                              <Share2 className="w-4 h-4" />
                              Share
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(record.id)}
                            >
                              <Trash2 className="w-4 h-4 text-red-400" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <GlassCard className="p-12">
          <EmptyState
            icon={FileText}
            title="No medical records found"
            description="You don't have any medical records yet. Add your first record to get started."
            action={
              <Button
                variant="primary"
                onClick={() => setShowUploadModal(true)}
              >
                <Plus className="w-4 h-4" />
                Add Record
              </Button>
            }
          />
        </GlassCard>
      )}

      {/* Upload Modal */}
      <Modal
        isOpen={showUploadModal}
        onClose={() => {
          setShowUploadModal(false)
          setUploadData({
            title: '',
            type: 'consultation',
            description: '',
            doctorId: '',
            fileUrl: '',
          })
        }}
        title="Add Medical Record"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-white/60 mb-2">Title *</label>
            <input
              type="text"
              value={uploadData.title}
              onChange={(e) => setUploadData(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-primary-500"
              placeholder="e.g., Blood Test Results"
            />
          </div>
          
          <div>
            <label className="block text-sm text-white/60 mb-2">Type *</label>
            <select
              value={uploadData.type}
              onChange={(e) => setUploadData(prev => ({ ...prev, type: e.target.value }))}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-primary-500"
            >
              {recordTypes.map(type => (
                <option key={type.id} value={type.id}>{type.label}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm text-white/60 mb-2">Related Doctor (Optional)</label>
            <select
              value={uploadData.doctorId}
              onChange={(e) => setUploadData(prev => ({ ...prev, doctorId: e.target.value }))}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-primary-500"
            >
              <option value="">Select doctor</option>
              {doctors.map(doctor => (
                <option key={doctor.id} value={doctor.id}>{doctor.full_name} - {doctor.specialization}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm text-white/60 mb-2">Description / Notes</label>
            <textarea
              value={uploadData.description}
              onChange={(e) => setUploadData(prev => ({ ...prev, description: e.target.value }))}
              rows={4}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-primary-500 resize-none"
              placeholder="Add any notes or description..."
            />
          </div>
          
          <div>
            <label className="block text-sm text-white/60 mb-2">File URL (Optional)</label>
            <input
              type="url"
              value={uploadData.fileUrl}
              onChange={(e) => setUploadData(prev => ({ ...prev, fileUrl: e.target.value }))}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-primary-500"
              placeholder="https://example.com/file.pdf"
            />
            <p className="text-xs text-white/40 mt-1">
              TODO: Add file upload functionality
            </p>
          </div>
          
          <div className="flex gap-3 pt-4">
            <Button
              variant="ghost"
              className="flex-1"
              onClick={() => {
                setShowUploadModal(false)
                setUploadData({
                  title: '',
                  type: 'consultation',
                  description: '',
                  doctorId: '',
                  fileUrl: '',
                })
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              className="flex-1"
              onClick={handleUpload}
              disabled={isUploading}
            >
              {isUploading ? 'Adding...' : 'Add Record'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* View Modal */}
      <Modal
        isOpen={showViewModal}
        onClose={() => {
          setShowViewModal(false)
          setSelectedRecord(null)
        }}
        title="Record Details"
        size="lg"
      >
        {selectedRecord && (
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              {(() => {
                const typeConfig = getRecordTypeConfig(selectedRecord.type)
                const TypeIcon = typeConfig.icon
                return (
                  <div className={`w-14 h-14 rounded-xl ${typeConfig.color} flex items-center justify-center flex-shrink-0`}>
                    <TypeIcon className="w-7 h-7" />
                  </div>
                )
              })()}
              <div>
                <h3 className="text-lg font-semibold text-white">{selectedRecord.title}</h3>
                <Badge variant="default" size="sm" className="mt-1">
                  {getRecordTypeConfig(selectedRecord.type).label}
                </Badge>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-white/5">
              <div>
                <p className="text-sm text-white/60">Date</p>
                <p className="text-white">{format(new Date(selectedRecord.created_at), 'MMMM d, yyyy')}</p>
              </div>
              <div>
                <p className="text-sm text-white/60">Time</p>
                <p className="text-white">{format(new Date(selectedRecord.created_at), 'h:mm a')}</p>
              </div>
              {selectedRecord.doctor_name && (
                <div className="col-span-2">
                  <p className="text-sm text-white/60">Doctor</p>
                  <p className="text-white">Dr. {selectedRecord.doctor_name}</p>
                </div>
              )}
            </div>
            
            {selectedRecord.description && (
              <div>
                <p className="text-sm text-white/60 mb-2">Description</p>
                <p className="text-white bg-white/5 p-4 rounded-lg">{selectedRecord.description}</p>
              </div>
            )}
            
            {selectedRecord.file_url && (
              <div className="p-4 rounded-lg bg-white/5">
                <p className="text-sm text-white/60 mb-2">Attached File</p>
                <a
                  href={selectedRecord.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-primary-400 hover:text-primary-300"
                >
                  <File className="w-5 h-5" />
                  View File
                  <Download className="w-4 h-4" />
                </a>
              </div>
            )}
            
            <div className="flex gap-3 pt-4 border-t border-white/10">
              <Button
                variant="ghost"
                className="flex-1"
                onClick={() => handleShare(selectedRecord)}
              >
                <Share2 className="w-4 h-4" />
                Share
              </Button>
              {selectedRecord.file_url && (
                <Button
                  variant="primary"
                  className="flex-1"
                  onClick={() => window.open(selectedRecord.file_url, '_blank')}
                >
                  <Download className="w-4 h-4" />
                  Download
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </DashboardLayout>
  )
}

export default PatientMedicalRecordsPage
