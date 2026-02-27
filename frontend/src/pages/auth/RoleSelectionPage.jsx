import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { User, Stethoscope, Users, ArrowRight } from 'lucide-react'
import useAuthStore from '../../store/authStore'
import GlassCard from '../../components/ui/GlassCard'

const roles = [
  {
    id: 'patient',
    icon: User,
    title: 'Patient',
    description: 'Book appointments, manage your health records, and connect with doctors.',
    color: 'from-primary-500 to-primary-600',
    features: ['Find & book doctors', 'Medical records', 'Online consultations'],
  },
  {
    id: 'doctor',
    icon: Stethoscope,
    title: 'Doctor',
    description: 'Manage appointments, patients, and your professional profile.',
    color: 'from-accent-purple to-accent-pink',
    features: ['Patient management', 'Appointment scheduling', 'Earnings dashboard'],
  },
  {
    id: 'mediator',
    icon: Users,
    title: 'Mediator',
    description: 'Manage hospital operations, doctors, and patient flow.',
    color: 'from-accent-teal to-success',
    features: ['Walk-in queue', 'Doctor management', 'Analytics dashboard'],
  },
]

const RoleSelectionPage = () => {
  const navigate = useNavigate()
  const { setRole, user } = useAuthStore()
  const isAuthenticated = !!user

  const handleRoleSelect = (selectedRole) => {
    setRole(selectedRole)
    
    if (isAuthenticated) {
      // If already authenticated, redirect to appropriate dashboard
      const dashboardPath = selectedRole === 'doctor' 
        ? '/doctor/dashboard' 
        : selectedRole === 'mediator' 
          ? '/admin/dashboard' 
          : '/patient/dashboard'
      navigate(dashboardPath)
    } else {
      navigate('/login')
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      {/* Animated background blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{
            x: [0, 100, 0],
            y: [0, -50, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: 'linear',
          }}
          className="absolute -top-40 -left-40 w-80 h-80 bg-primary-500/30 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            x: [0, -100, 0],
            y: [0, 100, 0],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: 'linear',
          }}
          className="absolute top-1/2 -right-40 w-96 h-96 bg-accent-purple/30 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            x: [0, 50, 0],
            y: [0, -100, 0],
          }}
          transition={{
            duration: 30,
            repeat: Infinity,
            ease: 'linear',
          }}
          className="absolute -bottom-40 left-1/3 w-72 h-72 bg-accent-pink/30 rounded-full blur-3xl"
        />
      </div>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <h1 className="text-3xl font-bold text-white mb-3 font-display">
          Choose Your Role
        </h1>
        <p className="text-white/70 max-w-md">
          Select how you want to use MediCare. You can change this later in your profile settings.
        </p>
      </motion.div>

      {/* Role cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl">
        {roles.map((role, index) => {
          const Icon = role.icon
          return (
            <motion.div
              key={role.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <GlassCard
                hover
                className="p-6 cursor-pointer h-full group"
                onClick={() => handleRoleSelect(role.id)}
              >
                {/* Icon */}
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${role.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <Icon className="w-7 h-7 text-white" />
                </div>

                {/* Title */}
                <h3 className="text-xl font-semibold text-white mb-2">
                  {role.title}
                </h3>

                {/* Description */}
                <p className="text-white/60 text-sm mb-4">
                  {role.description}
                </p>

                {/* Features */}
                <ul className="space-y-2 mb-4">
                  {role.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-white/70">
                      <div className="w-1.5 h-1.5 rounded-full bg-white/40" />
                      {feature}
                    </li>
                  ))}
                </ul>

                {/* Select indicator */}
                <div className="flex items-center gap-2 text-primary-400 group-hover:text-primary-300 transition-colors">
                  <span className="text-sm font-medium">Select</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </GlassCard>
            </motion.div>
          )
        })}
      </div>

      {/* Back link */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        onClick={() => navigate('/')}
        className="mt-8 text-white/50 hover:text-white transition-colors"
      >
        ← Back to welcome
      </motion.button>
    </div>
  )
}

export default RoleSelectionPage
