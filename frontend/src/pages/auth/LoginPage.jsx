import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Mail, Lock, Eye, EyeOff, Stethoscope, Users } from 'lucide-react'
import toast from 'react-hot-toast'
import useAuthStore from '../../store/authStore'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'
import Select from '../../components/ui/Select'

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.string().optional(),
})

const roleOptions = [
  { value: 'patient', label: 'Patient' },
  { value: 'doctor', label: 'Doctor' },
  { value: 'mediator', label: 'Mediator' },
]

const LoginPage = () => {
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedRole, setSelectedRole] = useState('patient')
  const navigate = useNavigate()
  const { login, setRole } = useAuthStore()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data) => {
    if (!data.email || !data.password) {
      toast.error('Please enter both email and password')
      return
    }
    
    if (!data.email.includes('@')) {
      toast.error('Please enter a valid email address')
      return
    }
    
    if (data.password.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }
    
    try {
      setIsLoading(true)
      const result = await login(data.email, data.password)
      
      if (result.success) {
        // Use selected role if profile doesn't have one, or override with selected
        const userRole = selectedRole || result.user?.role || 'patient'
        
        // Update role in store
        setRole(userRole)
        
        toast.success('Welcome back!')
        const dashboardPath = userRole === 'doctor' 
          ? '/doctor/dashboard' 
          : userRole === 'mediator' 
            ? '/mediator/dashboard' 
            : '/patient/dashboard'
        navigate(dashboardPath)
      } else {
        toast.error(result.error || 'Failed to login. Please check your credentials.')
      }
    } catch (error) {
      console.error('Login error:', error)
      toast.error(error.message || 'Failed to login. Please check your credentials.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center">
            <Stethoscope className="w-6 h-6 text-gray-800" />
          </div>
          <span className="text-2xl font-bold text-gray-800">MediCare</span>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Welcome Back</h1>
            <p className="text-gray-500">Sign in to continue to your dashboard</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Email Address"
              type="email"
              placeholder="Enter your email"
              icon={Mail}
              error={errors.email?.message}
              {...register('email')}
            />

            <div className="relative">
              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                icon={Lock}
                error={errors.password?.message}
                {...register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-9 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            <Select
              label="Login As"
              options={roleOptions}
              placeholder="Select your role"
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
            />

            <div className="flex items-center justify-end text-sm">
              <Link to="/forgot-password" className="text-blue-600 hover:text-blue-700">
                Forgot password?
              </Link>
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full"
              loading={isLoading}
            >
              Sign In
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-500">
              Don't have an account?{' '}
              <Link to="/register" className="text-blue-600 hover:text-blue-700 font-medium">
                Sign up
              </Link>
            </p>
          </div>
        </div>

        {/* Back link */}
        <div className="text-center mt-6">
          <Link to="/role-selection" className="text-gray-500 hover:text-gray-700">
            ← Choose a different role
          </Link>
        </div>
      </div>
    </div>
  )
}

export default LoginPage



