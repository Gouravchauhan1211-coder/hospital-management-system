import { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Edit2, 
  Save, 
  X,
  Shield,
  Bell,
  Key
} from 'lucide-react'
import toast from 'react-hot-toast'
import useAuthStore from '../../store/authStore'
import { DashboardLayout } from '../../components/layout'
import { GlassCard, Avatar, Button, Input, Badge } from '../../components/ui'

const PatientProfilePage = () => {
  const { user, updateProfile } = useAuthStore()
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    fullName: user?.fullName || '',
    email: user?.email || '',
    phone: user?.phone || '',
    address: user?.address || '',
    dateOfBirth: user?.dateOfBirth || '',
    bloodGroup: user?.bloodGroup || '',
    emergencyContact: user?.emergencyContact || '',
    allergies: user?.allergies || ''
  })

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSave = async () => {
    setIsLoading(true)
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Update local state
      if (updateProfile) {
        await updateProfile(formData)
      }
      
      toast.success('Profile updated successfully!')
      setIsEditing(false)
    } catch (error) {
      toast.error('Failed to update profile')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    setFormData({
      fullName: user?.fullName || '',
      email: user?.email || '',
      phone: user?.phone || '',
      address: user?.address || '',
      dateOfBirth: user?.dateOfBirth || '',
      bloodGroup: user?.bloodGroup || '',
      emergencyContact: user?.emergencyContact || '',
      allergies: user?.allergies || ''
    })
    setIsEditing(false)
  }

  const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">My Profile</h1>
            <p className="text-white/60">Manage your personal information</p>
          </div>
          {!isEditing ? (
            <Button 
              variant="secondary" 
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2"
            >
              <Edit2 className="w-4 h-4" />
              Edit Profile
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button 
                variant="ghost" 
                onClick={handleCancel}
                className="flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                Cancel
              </Button>
              <Button 
                variant="primary" 
                onClick={handleSave}
                disabled={isLoading}
                className="flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {isLoading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          )}
        </div>

        {/* Profile Card */}
        <GlassCard className="p-6">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Avatar Section */}
            <div className="flex flex-col items-center">
              <Avatar 
                src={user?.avatar} 
                name={user?.fullName} 
                size="xl"
                className="w-32 h-32 text-4xl"
              />
              <Badge variant="primary" className="mt-3">
                Patient
              </Badge>
            </div>

            {/* Info Section */}
            <div className="flex-1 space-y-6">
              {/* Personal Information */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <User className="w-5 h-5 text-primary-400" />
                  Personal Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-white/60 mb-1">Full Name</label>
                    {isEditing ? (
                      <Input
                        value={formData.fullName}
                        onChange={(e) => handleChange('fullName', e.target.value)}
                        placeholder="Enter your full name"
                      />
                    ) : (
                      <p className="text-white">{formData.fullName || 'Not provided'}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm text-white/60 mb-1">Email</label>
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-white/40" />
                      <p className="text-white">{formData.email || 'Not provided'}</p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-white/60 mb-1">Phone</label>
                    {isEditing ? (
                      <Input
                        value={formData.phone}
                        onChange={(e) => handleChange('phone', e.target.value)}
                        placeholder="Enter your phone number"
                        icon={Phone}
                      />
                    ) : (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-white/40" />
                        <p className="text-white">{formData.phone || 'Not provided'}</p>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm text-white/60 mb-1">Date of Birth</label>
                    {isEditing ? (
                      <Input
                        type="date"
                        value={formData.dateOfBirth}
                        onChange={(e) => handleChange('dateOfBirth', e.target.value)}
                      />
                    ) : (
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-white/40" />
                        <p className="text-white">{formData.dateOfBirth || 'Not provided'}</p>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm text-white/60 mb-1">Blood Group</label>
                    {isEditing ? (
                      <select
                        value={formData.bloodGroup}
                        onChange={(e) => handleChange('bloodGroup', e.target.value)}
                        className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-primary-500"
                      >
                        <option value="">Select Blood Group</option>
                        {bloodGroups.map(group => (
                          <option key={group} value={group}>{group}</option>
                        ))}
                      </select>
                    ) : (
                      <p className="text-white">{formData.bloodGroup || 'Not provided'}</p>
                    )}
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm text-white/60 mb-1">Address</label>
                    {isEditing ? (
                      <Input
                        value={formData.address}
                        onChange={(e) => handleChange('address', e.target.value)}
                        placeholder="Enter your address"
                        icon={MapPin}
                      />
                    ) : (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-white/40" />
                        <p className="text-white">{formData.address || 'Not provided'}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Medical Information */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary-400" />
                  Medical Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-white/60 mb-1">Emergency Contact</label>
                    {isEditing ? (
                      <Input
                        value={formData.emergencyContact}
                        onChange={(e) => handleChange('emergencyContact', e.target.value)}
                        placeholder="Emergency contact number"
                      />
                    ) : (
                      <p className="text-white">{formData.emergencyContact || 'Not provided'}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm text-white/60 mb-1">Known Allergies</label>
                    {isEditing ? (
                      <Input
                        value={formData.allergies}
                        onChange={(e) => handleChange('allergies', e.target.value)}
                        placeholder="List any known allergies"
                      />
                    ) : (
                      <p className="text-white">{formData.allergies || 'None reported'}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Quick Settings */}
        <GlassCard className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Quick Settings</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary-500/20 flex items-center justify-center">
                  <Bell className="w-5 h-5 text-primary-400" />
                </div>
                <div>
                  <p className="text-white font-medium">Notifications</p>
                  <p className="text-sm text-white/60">Manage your notification preferences</p>
                </div>
              </div>
              <Button variant="ghost" size="sm">Manage</Button>
            </div>
            <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary-500/20 flex items-center justify-center">
                  <Key className="w-5 h-5 text-primary-400" />
                </div>
                <div>
                  <p className="text-white font-medium">Change Password</p>
                  <p className="text-sm text-white/60">Update your password regularly</p>
                </div>
              </div>
              <Button variant="ghost" size="sm">Change</Button>
            </div>
          </div>
        </GlassCard>
      </div>
    </DashboardLayout>
  )
}

export default PatientProfilePage
