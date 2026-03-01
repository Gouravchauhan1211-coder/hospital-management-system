import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { 
 Search,
 Plus,
 Edit,
 Trash2,
 Eye,
 Stethoscope,
 Calendar,
 Clock,
 Star,
 Filter,
 ChevronLeft,
 ChevronRight,
 Mail,
 Phone,
 User
} from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import useAuthStore from '../../store/authStore'
import { getDoctors } from '../../services/api'
import { DashboardLayout } from '../../components/layout'
import { GlassCard, Badge, Button, Modal, Input } from '../../components/ui'
import { EmptyState } from '../../components/shared'
import { CardSkeleton } from '../../components/ui/Skeleton'

const MediatorDoctorsPage = () => {
 const { user } = useAuthStore()
 const [isLoading, setIsLoading] = useState(true)
 const [doctors, setDoctors] = useState([])
 const [searchQuery, setSearchQuery] = useState('')
 const [specializationFilter, setSpecializationFilter] = useState('')
 const [selectedDoctor, setSelectedDoctor] = useState(null)
 const [showDetailsModal, setShowDetailsModal] = useState(false)

 useEffect(() => {
 fetchDoctors()
 }, [])

 const fetchDoctors = async () => {
 try {
 setIsLoading(true)
 const data = await getDoctors({})
 setDoctors(data || [])
 } catch (error) {
 console.error('Error fetching doctors:', error)
 toast.error('Failed to load doctors')
 } finally {
 setIsLoading(false)
 }
 }

 const filteredDoctors = doctors.filter(doctor => {
 const matchesSearch = doctor.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
 doctor.specialization?.toLowerCase().includes(searchQuery.toLowerCase())
 const matchesSpecialization = !specializationFilter || doctor.specialization === specializationFilter
 return matchesSearch && matchesSpecialization
 })

 const specializations = [...new Set(doctors.map(d => d.specialization).filter(Boolean))]

 return (
 <DashboardLayout>
 <div className="mb-8">
 <motion.h1
 initial={{ opacity: 0, y: -10 }}
 animate={{ opacity: 1, y: 0 }}
 className="text-2xl font-bold text-gray-800 mb-2"
 >
 Manage Doctors
 </motion.h1>
 <motion.p
 initial={{ opacity: 0, y: -10 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: 0.1 }}
 className="text-gray-600"
 >
 View and manage doctor profiles and availability
 </motion.p>
 </div>

 {/* Stats */}
 <div className="grid grid-cols-1 gap-4 mb-8">
 <GlassCard className="p-4">
 <div className="flex items-center gap-3">
 <div className="w-12 h-12 rounded-xl bg-primary-500/20 flex items-center justify-center">
 <Stethoscope className="w-6 h-6 text-primary-400" />
 </div>
 <div>
 <p className="text-2xl font-bold text-gray-800">{doctors.length}</p>
 <p className="text-sm text-gray-600">Total Doctors</p>
 </div>
 </div>
 </GlassCard>
 <GlassCard className="p-4">
 <div className="flex items-center gap-3">
 <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
 <Calendar className="w-6 h-6 text-green-400" />
 </div>
 <div>
 <p className="text-2xl font-bold text-gray-800">
 {doctors.filter(d => d.is_available).length}
 </p>
 <p className="text-sm text-gray-600">Available</p>
 </div>
 </div>
 </GlassCard>
 <GlassCard className="p-4">
 <div className="flex items-center gap-3">
 <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center">
 <Clock className="w-6 h-6 text-yellow-400" />
 </div>
 <div>
 <p className="text-2xl font-bold text-gray-800">
 {doctors.filter(d => !d.is_available).length}
 </p>
 <p className="text-sm text-gray-600">Unavailable</p>
 </div>
 </div>
 </GlassCard>
 </div>

 {/* Filters */}
 <GlassCard className="p-4 mb-6">
 <div className="flex flex-wrap gap-4">
 <div className="flex-1 min-w-[200px]">
 <div className="relative">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
 <input
 type="text"
 placeholder="Search doctors..."
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-800 placeholder:text-gray-500 focus:outline-none focus:border-primary-500"
 />
 </div>
 </div>
 <select
 value={specializationFilter}
 onChange={(e) => setSpecializationFilter(e.target.value)}
 className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-800 focus:outline-none focus:border-primary-500"
 >
 <option value="">All Specializations</option>
 {specializations.map(spec => (
 <option key={spec} value={spec}>{spec}</option>
 ))}
 </select>
 </div>
 </GlassCard>

 {/* Doctors Grid */}
 {isLoading ? (
 <div className="grid grid-cols-1 gap-6">
 <CardSkeleton />
 <CardSkeleton />
 <CardSkeleton />
 </div>
 ) : filteredDoctors.length > 0 ? (
 <div className="grid grid-cols-1 gap-6">
 {filteredDoctors.map((doctor, index) => (
 <motion.div
 key={doctor.id}
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: index * 0.05 }}
 >
 <GlassCard className="p-6 h-full">
 <div className="flex items-start justify-between mb-4">
 <div className="w-16 h-16 rounded-2xl bg-primary-500/20 flex items-center justify-center">
 <User className="w-8 h-8 text-primary-400" />
 </div>
 <Badge variant={doctor.is_available ? 'success' : 'warning'}>
 {doctor.is_available ? 'Available' : 'Unavailable'}
 </Badge>
 </div>

 <h3 className="text-lg font-semibold text-gray-800 mb-1">
 Dr. {doctor.full_name}
 </h3>
 <p className="text-sm text-gray-600 mb-3">{doctor.specialization}</p>

 <div className="space-y-2 mb-4">
 <div className="flex items-center gap-2 text-sm text-gray-600">
 <Mail className="w-4 h-4" />
 <span className="truncate">{doctor.email}</span>
 </div>
 {doctor.phone && (
 <div className="flex items-center gap-2 text-sm text-gray-600">
 <Phone className="w-4 h-4" />
 <span>{doctor.phone}</span>
 </div>
 )}
 </div>

 <div className="flex gap-2">
 <Button
 variant="ghost"
 size="sm"
 className="flex-1"
 onClick={() => {
 setSelectedDoctor(doctor)
 setShowDetailsModal(true)
 }}
 >
 <Eye className="w-4 h-4 mr-1" />
 View
 </Button>
 </div>
 </GlassCard>
 </motion.div>
 ))}
 </div>
 ) : (
 <EmptyState
 icon={Stethoscope}
 title="No doctors found"
 description="Try adjusting your search or filters"
 />
 )}

 {/* Doctor Details Modal */}
 <Modal
 isOpen={showDetailsModal}
 onClose={() => {
 setShowDetailsModal(false)
 setSelectedDoctor(null)
 }}
 title="Doctor Details"
 >
 {selectedDoctor && (
 <div className="space-y-4">
 <div className="flex items-center gap-4">
 <div className="w-20 h-20 rounded-2xl bg-primary-500/20 flex items-center justify-center">
 <User className="w-10 h-10 text-primary-400" />
 </div>
 <div>
 <h3 className="text-xl font-semibold text-gray-800">
 Dr. {selectedDoctor.full_name}
 </h3>
 <p className="text-gray-600">{selectedDoctor.specialization}</p>
 <Badge variant={selectedDoctor.is_available ? 'success' : 'warning'} className="mt-2">
 {selectedDoctor.is_available ? 'Available' : 'Unavailable'}
 </Badge>
 </div>
 </div>

 <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
 <div>
 <p className="text-sm text-gray-600">Email</p>
 <p className="text-gray-800">{selectedDoctor.email}</p>
 </div>
 <div>
 <p className="text-sm text-gray-600">Phone</p>
 <p className="text-gray-800">{selectedDoctor.phone || 'N/A'}</p>
 </div>
 <div>
 <p className="text-sm text-gray-600">Experience</p>
 <p className="text-gray-800">{selectedDoctor.experience || 'N/A'} years</p>
 </div>
 <div>
 <p className="text-sm text-gray-600">Rating</p>
 <p className="text-gray-800 flex items-center gap-1">
 <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
 {selectedDoctor.rating || 'N/A'}
 </p>
 </div>
 </div>

 {selectedDoctor.bio && (
 <div>
 <p className="text-sm text-gray-600 mb-1">Bio</p>
 <p className="text-gray-800">{selectedDoctor.bio}</p>
 </div>
 )}
 </div>
 )}
 </Modal>
 </DashboardLayout>
 )
}

export default MediatorDoctorsPage



