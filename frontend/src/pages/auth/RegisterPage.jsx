import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Mail, Lock, Eye, EyeOff, User, Phone, Stethoscope, ArrowRight } from 'lucide-react'
import toast from 'react-hot-toast'
import useAuthStore from '../../store/authStore'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'
import Select from '../../components/ui/Select'

const registerSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().min(10, 'Please enter a valid phone number'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
  gender: z.string().optional(),
  bloodGroup: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

const genderOptions = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
]

const bloodGroupOptions = [
  { value: 'A+', label: 'A+' },
  { value: 'A-', label: 'A-' },
  { value: 'B+', label: 'B+' },
  { value: 'B-', label: 'B-' },
  { value: 'AB+', label: 'AB+' },
  { value: 'AB-', label: 'AB-' },
  { value: 'O+', label: 'O+' },
  { value: 'O-', label: 'O-' },
]

const RegisterPage = () => {
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()
  const { signup, user } = useAuthStore()
  const currentRole = user?.role || 'patient'

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(registerSchema),
  })

  const onSubmit = async (data) => {
    try {
      setIsLoading(true)
      
      const result = await signup(data.email, data.password, data.fullName, currentRole)

      if (result.success) {
        toast.success('Account created successfully!')
        navigate('/login')
      } else {
        toast.error(result.error || 'Failed to create account. Please try again.')
      }
    } catch (error) {
      console.error('Registration error:', error)
      toast.error(error.message || 'Failed to create account. Please try again.')
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

        {/* Register Card */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Create Account</h1>
            <p className="text-gray-500">Sign up as a {currentRole || 'patient'}</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Full Name"
              type="text"
              placeholder="Enter your full name"
              icon={User}
              error={errors.fullName?.message}
              {...register('fullName')}
            />

            <Input
              label="Email Address"
              type="email"
              placeholder="Enter your email"
              icon={Mail}
              error={errors.email?.message}
              {...register('email')}
            />

            <Input
              label="Phone Number"
              type="tel"
              placeholder="Enter your phone number"
              icon={Phone}
              error={errors.phone?.message}
              {...register('phone')}
            />

            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Gender"
                options={genderOptions}
                placeholder="Select"
                {...register('gender')}
              />

              <Select
                label="Blood Group"
                options={bloodGroupOptions}
                placeholder="Select"
                {...register('bloodGroup')}
              />
            </div>

            <div className="relative">
              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Create a password"
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

            <Input
              label="Confirm Password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Confirm your password"
              icon={Lock}
              error={errors.confirmPassword?.message}
              {...register('confirmPassword')}
            />

            <Button
              type="submit"
              variant="primary"
              className="w-full"
              loading={isLoading}
            >
              Create Account
              <ArrowRight className="w-4 h-4" />
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-500">
              Already have an account?{' '}
              <Link to="/login" className="text-blue-600 hover:text-blue-700 font-medium">
                Sign in
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

export default RegisterPage



