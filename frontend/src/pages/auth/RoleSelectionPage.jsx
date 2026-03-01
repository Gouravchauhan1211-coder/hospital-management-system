import { useNavigate } from 'react-router-dom'
import { User, Stethoscope, Users, ArrowRight } from 'lucide-react'
import useAuthStore from '../../store/authStore'

const roles = [
 {
 id: 'patient',
 icon: User,
 title: 'Patient',
 description: 'Book appointments, manage your health records, and connect with doctors.',
 color: 'bg-blue-500',
 features: ['Find & book doctors', 'Medical records', 'View appointments'],
 },
 {
 id: 'doctor',
 icon: Stethoscope,
 title: 'Doctor',
 description: 'Manage appointments, patients, and your professional profile.',
 color: 'bg-purple-500',
 features: ['Patient management', 'Appointment scheduling', 'Availability'],
 },
 {
 id: 'mediator',
 icon: Users,
 title: 'Mediator',
 description: 'Manage hospital operations, doctors, and patient flow.',
 color: 'bg-teal-500',
 features: ['Walk-in queue', 'Doctor management', 'Appointments'],
 },
]

const RoleSelectionPage = () => {
 const navigate = useNavigate()
 const { setRole, user } = useAuthStore()
 const isAuthenticated = !!user

 const handleRoleSelect = (selectedRole) => {
 setRole(selectedRole)
 
 if (isAuthenticated) {
 const dashboardPath = selectedRole === 'doctor' 
 ? '/doctor/dashboard' 
 : selectedRole === 'mediator' 
 ? '/mediator/dashboard' 
 : '/patient/dashboard'
 navigate(dashboardPath)
 } else {
 navigate('/login')
 }
 }

 return (
 <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-6">
 {/* Header */}
 <div className="text-center mb-8">
 <h1 className="text-2xl font-bold text-gray-800 mb-3">
 Choose Your Role
 </h1>
 <p className="text-gray-500 max-w-md">
 Select how you want to use MediCare.
 </p>
 </div>

 {/* Role cards - Stack on mobile, grid on larger screens */}
 <div className="grid grid-cols-1 gap-4 w-full max-w-4xl">
 {roles.map((role) => {
 const Icon = role.icon
 return (
 <div
 key={role.id}
 onClick={() => handleRoleSelect(role.id)}
 className="bg-white rounded-xl p-5 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
 >
 {/* Icon */}
 <div className={`w-12 h-12 rounded-xl ${role.color} flex items-center justify-center mb-4`}>
 <Icon className="w-6 h-6 text-gray-800" />
 </div>

 {/* Title */}
 <h3 className="text-lg font-semibold text-gray-800 mb-2">
 {role.title}
 </h3>

 {/* Description */}
 <p className="text-gray-500 text-sm mb-4">
 {role.description}
 </p>

 {/* Features */}
 <ul className="space-y-1 mb-4">
 {role.features.map((feature, i) => (
 <li key={i} className="flex items-center gap-2 text-sm text-gray-500">
 <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />
 {feature}
 </li>
 ))}
 </ul>

 {/* Select indicator */}
 <div className="flex items-center gap-1 text-blue-600 text-sm font-medium">
 <span>Select</span>
 <ArrowRight className="w-4 h-4" />
 </div>
 </div>
 )
 })}
 </div>

 {/* Back link */}
 <button
 onClick={() => navigate('/')}
 className="mt-8 text-gray-500 hover:text-gray-700"
 >
 ← Back
 </button>
 </div>
 )
}

export default RoleSelectionPage



