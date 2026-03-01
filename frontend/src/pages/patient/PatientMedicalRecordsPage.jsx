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
import { getMedicalRecords, createMedicalRecord, getDoctors, uploadFile, shareRecord } from '../../services/api'
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
 const [showShareModal, setShowShareModal] = useState(false)
 const [selectedRecord, setSelectedRecord] = useState(null)
 const [selectedFile, setSelectedFile] = useState(null)
 const [shareRecipient, setShareRecipient] = useState('')
 const [shareNote, setShareNote] = useState('')
 const [uploadData, setUploadData] = useState({
 title: '',
 type: 'consultation',
 description: '',
 doctorId: '',
 fileUrl: '',
 })
 const [isUploading, setIsUploading] = useState(false)
 const [isSharing, setIsSharing] = useState(false)

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
 if (typeFilter && record.record_type !== typeFilter) return false
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
 consultations: records.filter(r => r.record_type === 'consultation').length,
 labReports: records.filter(r => r.record_type === 'lab_report').length,
 prescriptions: records.filter(r => r.record_type === 'prescription').length,
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
 let fileUrl = uploadData.fileUrl
 
 // Upload file if selected
 if (selectedFile) {
 try {
 fileUrl = await uploadFile(selectedFile, 'medical-records')
 } catch (uploadError) {
 console.error('File upload failed:', uploadError)
 toast.error('Failed to upload file, but record will be saved')
 }
 }
 
 const doctor = doctors.find(d => d.id === uploadData.doctorId)
 
 const newRecord = await createMedicalRecord({
 patientId: user.id,
 doctorId: uploadData.doctorId || null,
 doctorName: doctor?.full_name || null,
 title: uploadData.title,
 type: uploadData.type,
 description: uploadData.description,
 fileUrl: fileUrl || null,
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
 setSelectedFile(null)
 toast.success('Record added successfully')
 } catch (error) {
 toast.error('Failed to add record')
 } finally {
 setIsUploading(false)
 }
 }

 // Handle file selection
 const handleFileSelect = (e) => {
 const file = e.target.files[0]
 if (file) {
 setSelectedFile(file)
 setUploadData(prev => ({ ...prev, fileUrl: URL.createObjectURL(file) }))
 }
 }

 // Handle delete
 const handleDelete = async (recordId) => {
 if (!confirm('Are you sure you want to delete this record?')) return
 setRecords(prev => prev.filter(r => r.id !== recordId))
 toast.success('Record deleted')
 }

 // Handle share - open share modal
 const handleShare = (record) => {
 setSelectedRecord(record)
 setShareRecipient('')
 setShareNote('')
 setShowShareModal(true)
 }

 // Handle share submit
 const handleShareSubmit = async () => {
 if (!shareRecipient) {
 toast.error('Please select a doctor to share with')
 return
 }
 
 setIsSharing(true)
 try {
 const recipientDoctor = doctors.find(d => d.id === shareRecipient)
 
 await shareRecord({
 recordId: selectedRecord.id,
 recordType: selectedRecord.type,
 patientId: user.id,
 recipientId: shareRecipient,
 recipientType: 'doctor',
 recipientName: recipientDoctor?.full_name || 'Doctor',
 shareNote: shareNote,
 })
 
 toast.success(`Record shared with Dr. ${recipientDoctor?.full_name}`)
 setShowShareModal(false)
 } catch (error) {
 console.error('Share error:', error)
 toast.error('Failed to share record')
 } finally {
 setIsSharing(false)
 }
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
 className="text-2xl font-bold text-gray-800 mb-2"
 >
 Medical Records
 </motion.h1>
 <motion.p
 initial={{ opacity: 0, y: -10 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: 0.1 }}
 className="text-gray-600"
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
 <div className="grid grid-cols-2 gap-4 mb-6">
 <GlassCard className="p-4">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded-lg bg-primary-500/20 flex items-center justify-center">
 <FileText className="w-5 h-5 text-primary-400" />
 </div>
 <div>
 <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
 <p className="text-xs text-gray-600">Total Records</p>
 </div>
 </div>
 </GlassCard>
 <GlassCard className="p-4">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
 <User className="w-5 h-5 text-blue-400" />
 </div>
 <div>
 <p className="text-2xl font-bold text-gray-800">{stats.consultations}</p>
 <p className="text-xs text-gray-600">Consultations</p>
 </div>
 </div>
 </GlassCard>
 <GlassCard className="p-4">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
 <FileText className="w-5 h-5 text-green-400" />
 </div>
 <div>
 <p className="text-2xl font-bold text-gray-800">{stats.labReports}</p>
 <p className="text-xs text-gray-600">Lab Reports</p>
 </div>
 </div>
 </GlassCard>
 <GlassCard className="p-4">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
 <FileText className="w-5 h-5 text-purple-400" />
 </div>
 <div>
 <p className="text-2xl font-bold text-gray-800">{stats.prescriptions}</p>
 <p className="text-xs text-gray-600">Prescriptions</p>
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
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
 <input
 type="text"
 placeholder="Search records..."
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-800 placeholder:text-gray-500 focus:outline-none focus:border-primary-500"
 />
 </div>
 </div>

 {/* Type Filter */}
 <select
 value={typeFilter}
 onChange={(e) => setTypeFilter(e.target.value)}
 className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-800 focus:outline-none focus:border-primary-500"
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
 <h3 className="text-sm font-medium text-gray-600 mb-4">{monthYear}</h3>
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
 className="p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
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
 <h4 className="text-gray-800 font-medium">{record.title}</h4>
 <div className="flex items-center gap-3 mt-1">
 {record.doctor_name && (
 <span className="text-sm text-gray-600 flex items-center gap-1">
 <Stethoscope className="w-3 h-3" />
 Dr. {record.doctor_name}
 </span>
 )}
 <span className="text-sm text-gray-500 flex items-center gap-1">
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
 <p className="text-sm text-gray-600 mt-2 line-clamp-2">
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
 <label className="block text-sm text-gray-600 mb-2">Title *</label>
 <input
 type="text"
 value={uploadData.title}
 onChange={(e) => setUploadData(prev => ({ ...prev, title: e.target.value }))}
 className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-800 focus:outline-none focus:border-primary-500"
 placeholder="e.g., Blood Test Results"
 />
 </div>
 
 <div>
 <label className="block text-sm text-gray-600 mb-2">Type *</label>
 <select
 value={uploadData.type}
 onChange={(e) => setUploadData(prev => ({ ...prev, type: e.target.value }))}
 className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-800 focus:outline-none focus:border-primary-500"
 >
 {recordTypes.map(type => (
 <option key={type.id} value={type.id}>{type.label}</option>
 ))}
 </select>
 </div>
 
 <div>
 <label className="block text-sm text-gray-600 mb-2">Related Doctor (Optional)</label>
 <select
 value={uploadData.doctorId}
 onChange={(e) => setUploadData(prev => ({ ...prev, doctorId: e.target.value }))}
 className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-800 focus:outline-none focus:border-primary-500"
 >
 <option value="">Select doctor</option>
 {doctors.map(doctor => (
 <option key={doctor.id} value={doctor.id}>{doctor.full_name} - {doctor.specialization}</option>
 ))}
 </select>
 </div>
 
 <div>
 <label className="block text-sm text-gray-600 mb-2">Description / Notes</label>
 <textarea
 value={uploadData.description}
 onChange={(e) => setUploadData(prev => ({ ...prev, description: e.target.value }))}
 rows={4}
 className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-800 focus:outline-none focus:border-primary-500 resize-none"
 placeholder="Add any notes or description..."
 />
 </div>
 
 <div>
 <label className="block text-sm text-gray-600 mb-2">Upload File (Optional)</label>
 <div className="border-2 border-dashed border-white/20 rounded-lg p-4 text-center hover:border-white/40 transition-colors">
 <input
 type="file"
 accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
 onChange={handleFileSelect}
 className="hidden"
 id="file-upload"
 />
 <label htmlFor="file-upload" className="cursor-pointer">
 {selectedFile ? (
 <div className="flex items-center justify-center gap-2">
 <File className="w-5 h-5 text-green-400" />
 <span className="text-gray-800">{selectedFile.name}</span>
 </div>
 ) : (
 <div className="flex flex-col items-center">
 <Upload className="w-8 h-8 text-gray-500 mb-2" />
 <span className="text-sm text-gray-600">Click to upload file</span>
 <span className="text-xs text-gray-500">PDF, JPG, PNG, DOC</span>
 </div>
 )}
 </label>
 </div>
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
 <h3 className="text-lg font-semibold text-gray-800">{selectedRecord.title}</h3>
 <Badge variant="default" size="sm" className="mt-1">
 {getRecordTypeConfig(selectedRecord.type).label}
 </Badge>
 </div>
 </div>
 
 <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-gray-50">
 <div>
 <p className="text-sm text-gray-600">Date</p>
 <p className="text-gray-800">{format(new Date(selectedRecord.created_at), 'MMMM d, yyyy')}</p>
 </div>
 <div>
 <p className="text-sm text-gray-600">Time</p>
 <p className="text-gray-800">{format(new Date(selectedRecord.created_at), 'h:mm a')}</p>
 </div>
 {selectedRecord.doctor_name && (
 <div className="col-span-2">
 <p className="text-sm text-gray-600">Doctor</p>
 <p className="text-gray-800">Dr. {selectedRecord.doctor_name}</p>
 </div>
 )}
 </div>
 
 {selectedRecord.description && (
 <div>
 <p className="text-sm text-gray-600 mb-2">Description</p>
 <p className="text-gray-800 bg-gray-50 p-4 rounded-lg">{selectedRecord.description}</p>
 </div>
 )}
 
 {selectedRecord.file_url && (
 <div className="p-4 rounded-lg bg-gray-50">
 <p className="text-sm text-gray-600 mb-2">Attached File</p>
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
 
 <div className="flex gap-3 pt-4 border-t border-gray-200">
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

 {/* Share Modal */}
 <Modal
 isOpen={showShareModal}
 onClose={() => {
 setShowShareModal(false)
 setSelectedRecord(null)
 }}
 title="Share Record"
 >
 <div className="space-y-4">
 {selectedRecord && (
 <>
 <div className="p-4 rounded-lg bg-gray-50">
 <p className="text-sm text-gray-600 mb-1">Sharing</p>
 <p className="text-gray-800 font-medium">{selectedRecord.title}</p>
 <p className="text-xs text-gray-800/50">{getRecordTypeConfig(selectedRecord.type).label}</p>
 </div>

 <div>
 <label className="block text-sm text-gray-600 mb-2">Select Doctor *</label>
 <select
 value={shareRecipient}
 onChange={(e) => setShareRecipient(e.target.value)}
 className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-800 focus:outline-none focus:border-primary-500"
 >
 <option value="">Select a doctor</option>
 {doctors.map(doctor => (
 <option key={doctor.id} value={doctor.id}>
 Dr. {doctor.full_name} - {doctor.specialization}
 </option>
 ))}
 </select>
 </div>

 <div>
 <label className="block text-sm text-gray-600 mb-2">Note (Optional)</label>
 <textarea
 value={shareNote}
 onChange={(e) => setShareNote(e.target.value)}
 rows={3}
 className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-800 focus:outline-none focus:border-primary-500 resize-none"
 placeholder="Add a note for the doctor..."
 />
 </div>

 <div className="flex gap-3 pt-4">
 <Button
 variant="ghost"
 className="flex-1"
 onClick={() => setShowShareModal(false)}
 >
 Cancel
 </Button>
 <Button
 variant="primary"
 className="flex-1"
 onClick={handleShareSubmit}
 disabled={isSharing || !shareRecipient}
 >
 {isSharing ? 'Sharing...' : 'Share Record'}
 </Button>
 </div>
 </>
 )}
 </div>
 </Modal>
 </DashboardLayout>
 )
}

export default PatientMedicalRecordsPage



