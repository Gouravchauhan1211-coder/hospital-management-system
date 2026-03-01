import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
 Plus, Search, Edit, Trash2, Building2, 
 AlertCircle, CheckCircle, Stethoscope, X
} from 'lucide-react'
import { 
 getDepartments, 
 createDepartment, 
 updateDepartment, 
 deleteDepartment 
} from '../../services/queueApi'
import { Badge } from '../../components/ui'
import toast from 'react-hot-toast'

const MediatorDepartmentsPage = () => {
 const [departments, setDepartments] = useState([])
 const [loading, setLoading] = useState(true)
 const [searchTerm, setSearchTerm] = useState('')
 const [showModal, setShowModal] = useState(false)
 const [editingDepartment, setEditingDepartment] = useState(null)
 const [formData, setFormData] = useState({
 name: '',
 code: '',
 description: '',
 icon: 'Stethoscope',
 color: '#0EA5E9',
 default_consultation_minutes: 15,
 allow_online_booking: true,
 is_emergency: false,
 display_order: 0
 })

 useEffect(() => {
 loadDepartments()
 }, [])

 const loadDepartments = async () => {
 setLoading(true)
 try {
 const data = await getDepartments()
 setDepartments(data.departments || [])
 } catch (error) {
 toast.error('Failed to load departments')
 } finally {
 setLoading(false)
 }
 }

 const handleSubmit = async (e) => {
 e.preventDefault()
 try {
 if (editingDepartment) {
 await updateDepartment(editingDepartment.id, formData)
 toast.success('Department updated')
 } else {
 await createDepartment(formData)
 toast.success('Department created')
 }
 setShowModal(false)
 setEditingDepartment(null)
 resetForm()
 loadDepartments()
 } catch (error) {
 toast.error(error.message)
 }
 }

 const handleDelete = async (id) => {
 if (!confirm('Are you sure you want to delete this department?')) return
 
 try {
 await deleteDepartment(id)
 toast.success('Department deleted')
 loadDepartments()
 } catch (error) {
 toast.error(error.message)
 }
 }

 const handleEdit = (dept) => {
 setEditingDepartment(dept)
 setFormData({
 name: dept.name,
 code: dept.code,
 description: dept.description || '',
 icon: dept.icon || 'Stethoscope',
 color: dept.color || '#0EA5E9',
 default_consultation_minutes: dept.default_consultation_minutes || 15,
 allow_online_booking: dept.allow_online_booking !== false,
 is_emergency: dept.is_emergency || false,
 display_order: dept.display_order || 0
 })
 setShowModal(true)
 }

 const resetForm = () => {
 setFormData({
 name: '',
 code: '',
 description: '',
 icon: 'Stethoscope',
 color: '#0EA5E9',
 default_consultation_minutes: 15,
 allow_online_booking: true,
 is_emergency: false,
 display_order: 0
 })
 }

 const filteredDepartments = departments.filter(dept =>
 dept.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
 dept.code.toLowerCase().includes(searchTerm.toLowerCase())
 )

 const colors = [
 { name: 'Blue', value: '#0EA5E9' },
 { name: 'Red', value: '#EF4444' },
 { name: 'Green', value: '#10B981' },
 { name: 'Purple', value: '#8B5CF6' },
 { name: 'Orange', value: '#F59E0B' },
 { name: 'Pink', value: '#EC4899' },
 { name: 'Teal', value: '#14B8A6' },
 { name: 'Indigo', value: '#6366F1' }
 ]

 return (
 <div className="space-y-6">
 {/* Header */}
 <div className="flex items-center justify-between">
 <div>
 <h1 className="text-2xl font-bold text-gray-800">Departments</h1>
 <p className="text-gray-500">Manage hospital departments</p>
 </div>
 <button
 onClick={() => {
 resetForm()
 setEditingDepartment(null)
 setShowModal(true)
 }}
 className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-gray-800 rounded-lg hover:bg-primary-600"
 >
 <Plus className="w-4 h-4" />
 Add Department
 </button>
 </div>

 {/* Search */}
 <div className="bg-white rounded-xl p-4 shadow-card">
 <div className="relative">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
 <input
 type="text"
 placeholder="Search departments..."
 value={searchTerm}
 onChange={(e) => setSearchTerm(e.target.value)}
 className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
 />
 </div>
 </div>

 {/* Departments Grid */}
 {loading ? (
 <div className="flex items-center justify-center h-64">
 <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
 </div>
 ) : (
 <div className="grid grid-cols-1 gap-6">
 {filteredDepartments.map((dept, index) => (
 <motion.div
 key={dept.id}
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: index * 0.05 }}
 className="bg-white rounded-xl shadow-card overflow-hidden hover:shadow-medical-lg transition-shadow"
 >
 <div 
 className="h-2" 
 style={{ backgroundColor: dept.color || '#0EA5E9' }}
 />
 <div className="p-5">
 <div className="flex items-start justify-between mb-3">
 <div className="flex items-center gap-3">
 <div 
 className="w-10 h-10 rounded-lg flex items-center justify-center"
 style={{ backgroundColor: `${dept.color || '#0EA5E9'}20` }}
 >
 <Stethoscope 
 className="w-5 h-5" 
 style={{ color: dept.color || '#0EA5E9' }} 
 />
 </div>
 <div>
 <h3 className="font-semibold text-gray-800">{dept.name}</h3>
 <span className="text-sm text-gray-500">{dept.code}</span>
 </div>
 </div>
 <div className="flex items-center gap-1">
 <button
 onClick={() => handleEdit(dept)}
 className="p-2 text-gray-400 hover:text-primary-500 hover:bg-gray-100 rounded-lg"
 >
 <Edit className="w-4 h-4" />
 </button>
 <button
 onClick={() => handleDelete(dept.id)}
 className="p-2 text-gray-400 hover:text-red-500 hover:bg-gray-100 rounded-lg"
 >
 <Trash2 className="w-4 h-4" />
 </button>
 </div>
 </div>

 {dept.description && (
 <p className="text-sm text-gray-500 mb-3">{dept.description}</p>
 )}

 <div className="flex items-center gap-2 flex-wrap">
 {dept.is_emergency && (
 <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full font-medium">
 Emergency
 </span>
 )}
 {dept.allow_online_booking !== false && (
 <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
 Online Booking
 </span>
 )}
 <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full font-medium">
 {dept.default_consultation_minutes || 15} min
 </span>
 </div>
 </div>
 </motion.div>
 ))}
 </div>
 )}

 {/* Empty State */}
 {!loading && filteredDepartments.length === 0 && (
 <div className="bg-white rounded-xl p-8 text-center">
 <Building2 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
 <p className="text-gray-500">No departments found</p>
 </div>
 )}

 {/* Modal */}
 <AnimatePresence>
 {showModal && (
 <motion.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
 onClick={() => setShowModal(false)}
 >
 <motion.div
 initial={{ scale: 0.95, opacity: 0 }}
 animate={{ scale: 1, opacity: 1 }}
 exit={{ scale: 0.95, opacity: 0 }}
 className="bg-white rounded-2xl w-full max-w-lg"
 onClick={(e) => e.stopPropagation()}
 >
 <div className="flex items-center justify-between p-6 border-b border-gray-200">
 <h2 className="text-xl font-semibold text-gray-800">
 {editingDepartment ? 'Edit Department' : 'Add Department'}
 </h2>
 <button
 onClick={() => setShowModal(false)}
 className="p-2 hover:bg-gray-100 rounded-lg"
 >
 <X className="w-5 h-5 text-gray-500" />
 </button>
 </div>

 <form onSubmit={handleSubmit} className="p-6 space-y-4">
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 Department Name *
 </label>
 <input
 type="text"
 required
 value={formData.name}
 onChange={(e) => setFormData({ ...formData, name: e.target.value })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
 placeholder="Cardiology"
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 Code *
 </label>
 <input
 type="text"
 required
 value={formData.code}
 onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
 placeholder="CARD"
 />
 </div>
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 Description
 </label>
 <textarea
 value={formData.description}
 onChange={(e) => setFormData({ ...formData, description: e.target.value })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
 rows={2}
 placeholder="Brief description of the department"
 />
 </div>

 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 Consultation Time (min)
 </label>
 <input
 type="number"
 value={formData.default_consultation_minutes}
 onChange={(e) => setFormData({ ...formData, default_consultation_minutes: parseInt(e.target.value) })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
 min={5}
 max={120}
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 Display Order
 </label>
 <input
 type="number"
 value={formData.display_order}
 onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
 />
 </div>
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">
 Color
 </label>
 <div className="flex gap-2 flex-wrap">
 {colors.map((color) => (
 <button
 key={color.value}
 type="button"
 onClick={() => setFormData({ ...formData, color: color.value })}
 className={`w-8 h-8 rounded-full transition-transform ${
 formData.color === color.value ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : ''
 }`}
 style={{ backgroundColor: color.value }}
 />
 ))}
 </div>
 </div>

 <div className="flex gap-4">
 <label className="flex items-center gap-2 cursor-pointer">
 <input
 type="checkbox"
 checked={formData.allow_online_booking}
 onChange={(e) => setFormData({ ...formData, allow_online_booking: e.target.checked })}
 className="w-4 h-4 text-primary-500 rounded focus:ring-primary-500"
 />
 <span className="text-sm text-gray-700">Allow Online Booking</span>
 </label>
 <label className="flex items-center gap-2 cursor-pointer">
 <input
 type="checkbox"
 checked={formData.is_emergency}
 onChange={(e) => setFormData({ ...formData, is_emergency: e.target.checked })}
 className="w-4 h-4 text-primary-500 rounded focus:ring-primary-500"
 />
 <span className="text-sm text-gray-700">Emergency Department</span>
 </label>
 </div>

 <div className="flex justify-end gap-3 pt-4">
 <button
 type="button"
 onClick={() => setShowModal(false)}
 className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
 >
 Cancel
 </button>
 <button
 type="submit"
 className="px-4 py-2 bg-primary-500 text-gray-800 rounded-lg hover:bg-primary-600"
 >
 {editingDepartment ? 'Update' : 'Create'}
 </button>
 </div>
 </form>
 </motion.div>
 </motion.div>
 )}
 </AnimatePresence>
 </div>
 )
}

export default MediatorDepartmentsPage



