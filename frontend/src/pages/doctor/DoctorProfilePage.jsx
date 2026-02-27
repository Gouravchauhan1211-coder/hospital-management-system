import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Award,
  FileText,
  Edit2,
  Save,
  X,
  Camera,
  Briefcase,
  GraduationCap,
  Clock,
  DollarSign,
  Star,
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import useAuthStore from '../../store/authStore'
import { getUserProfile, updateUserProfile } from '../../services/api'
import { DashboardLayout } from '../../components/layout'
import { GlassCard, Badge, Button, Modal, Input } from '../../components/ui'

// Specializations list
const specializations = [
  'Cardiology',
  'Dermatology',
  'Neurology',
  'Orthopedics',
  'Pediatrics',
  'Psychiatry',
  'General Medicine',
  'Surgery',
  'Gynecology',
  'Ophthalmology',
  'ENT',
  'Dental',
  'Oncology',
  'Urology',
  'Radiology',
  'Anesthesiology',
]

const DoctorProfilePage = () => {
  const { user, setUser } = useAuthStore()
  
  // State
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [profile, setProfile] = useState(null)
  const [editData, setEditData] = useState({})
  
  // Modal state
  const [showAvatarModal, setShowAvatarModal] = useState(false)
  const [showQualificationModal, setShowQualificationModal] = useState(false)
  const [newQualification, setNewQualification] = useState({ degree: '', institution: '', year: '' })

  // Fetch profile
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.id) return
      
      try {
        const data = await getUserProfile('doctors', user.id)
        setProfile(data)
        setEditData({
          full_name: data?.full_name || '',
          email: data?.email || '',
          phone: data?.phone || '',
          specialization: data?.specialization || '',
          location: data?.location || '',
          bio: data?.bio || '',
          consultation_fee: data?.consultation_fee || 0,
          experience: data?.experience || 0,
          qualifications: data?.qualifications || [],
          languages: data?.languages || [],
        })
      } catch (error) {
        console.error('Error fetching profile:', error)
        toast.error('Failed to load profile')
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchProfile()
  }, [user?.id])

  // Handle save
  const handleSave = async () => {
    setIsSaving(true)
    try {
      const updatedProfile = await updateUserProfile('doctors', user.id, {
        full_name: editData.full_name,
        phone: editData.phone,
        specialization: editData.specialization,
        location: editData.location,
        bio: editData.bio,
        consultation_fee: editData.consultation_fee,
        experience: editData.experience,
        qualifications: editData.qualifications,
        languages: editData.languages,
      })
      
      setProfile(updatedProfile)
      setIsEditing(false)
      
      // Update auth store if name changed
      if (editData.full_name !== user.fullName) {
        setUser({ ...user, fullName: editData.full_name })
      }
      
      toast.success('Profile updated successfully')
    } catch (error) {
      toast.error('Failed to update profile')
    } finally {
      setIsSaving(false)
    }
  }

  // Add qualification
  const handleAddQualification = () => {
    if (!newQualification.degree || !newQualification.institution || !newQualification.year) {
      toast.error('Please fill all fields')
      return
    }
    
    setEditData(prev => ({
      ...prev,
      qualifications: [...(prev.qualifications || []), newQualification]
    }))
    
    setNewQualification({ degree: '', institution: '', year: '' })
    setShowQualificationModal(false)
    toast.success('Qualification added')
  }

  // Remove qualification
  const handleRemoveQualification = (index) => {
    setEditData(prev => ({
      ...prev,
      qualifications: prev.qualifications.filter((_, i) => i !== index)
    }))
  }

  // Add language
  const handleAddLanguage = (language) => {
    if (!language.trim()) return
    if (editData.languages?.includes(language)) {
      toast.error('Language already added')
      return
    }
    
    setEditData(prev => ({
      ...prev,
      languages: [...(prev.languages || []), language.trim()]
    }))
  }

  // Remove language
  const handleRemoveLanguage = (language) => {
    setEditData(prev => ({
      ...prev,
      languages: prev.languages.filter(l => l !== language)
    }))
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    )
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
              My Profile
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-white/60"
            >
              Manage your professional profile and settings
            </motion.p>
          </div>
          
          {!isEditing ? (
            <Button
              variant="primary"
              onClick={() => setIsEditing(true)}
            >
              <Edit2 className="w-4 h-4" />
              Edit Profile
            </Button>
          ) : (
            <div className="flex gap-3">
              <Button
                variant="ghost"
                onClick={() => {
                  setIsEditing(false)
                  setEditData({
                    full_name: profile?.full_name || '',
                    email: profile?.email || '',
                    phone: profile?.phone || '',
                    specialization: profile?.specialization || '',
                    location: profile?.location || '',
                    bio: profile?.bio || '',
                    consultation_fee: profile?.consultation_fee || 0,
                    experience: profile?.experience || 0,
                    qualifications: profile?.qualifications || [],
                    languages: profile?.languages || [],
                  })
                }}
              >
                <X className="w-4 h-4" />
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <GlassCard className="p-6">
          <div className="text-center">
            {/* Avatar */}
            <div className="relative inline-block">
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary-500 to-accent-purple flex items-center justify-center mx-auto">
                {profile?.avatar_url ? (
                  <img 
                    src={profile.avatar_url} 
                    alt={profile.full_name}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <span className="text-4xl font-bold text-white">
                    {profile?.full_name?.charAt(0)?.toUpperCase() || 'D'}
                  </span>
                )}
              </div>
              {isEditing && (
                <button
                  onClick={() => setShowAvatarModal(true)}
                  className="absolute bottom-0 right-0 w-10 h-10 rounded-full bg-primary-500 flex items-center justify-center text-white shadow-lg hover:bg-primary-600 transition-colors"
                >
                  <Camera className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Name & Verification */}
            <div className="mt-4">
              <div className="flex items-center justify-center gap-2">
                <h2 className="text-xl font-bold text-white">{profile?.full_name}</h2>
                {profile?.verified && (
                  <CheckCircle className="w-5 h-5 text-blue-400" />
                )}
              </div>
              <p className="text-white/60 mt-1">{profile?.specialization}</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-white/10">
              <div>
                <p className="text-2xl font-bold text-white">{profile?.rating || '4.8'}</p>
                <p className="text-xs text-white/60 flex items-center justify-center gap-1">
                  <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                  Rating
                </p>
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{profile?.total_patients || 0}</p>
                <p className="text-xs text-white/60">Patients</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{profile?.experience || 0}+</p>
                <p className="text-xs text-white/60">Years</p>
              </div>
            </div>

            {/* Quick Info */}
            <div className="mt-6 space-y-3 text-left">
              <div className="flex items-center gap-3 text-white/80">
                <Mail className="w-4 h-4 text-white/40" />
                <span className="text-sm">{profile?.email}</span>
              </div>
              <div className="flex items-center gap-3 text-white/80">
                <Phone className="w-4 h-4 text-white/40" />
                <span className="text-sm">{profile?.phone || 'Not provided'}</span>
              </div>
              <div className="flex items-center gap-3 text-white/80">
                <MapPin className="w-4 h-4 text-white/40" />
                <span className="text-sm">{profile?.location || 'Not provided'}</span>
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <GlassCard className="p-6">
            <h3 className="text-lg font-semibold text-white mb-6">Basic Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Full Name */}
              <div>
                <label className="block text-sm text-white/60 mb-2">Full Name</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editData.full_name}
                    onChange={(e) => setEditData(prev => ({ ...prev, full_name: e.target.value }))}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-primary-500"
                  />
                ) : (
                  <p className="text-white">{profile?.full_name}</p>
                )}
              </div>

              {/* Email (Read-only) */}
              <div>
                <label className="block text-sm text-white/60 mb-2">Email</label>
                <p className="text-white/60">{profile?.email}</p>
                <p className="text-xs text-white/40 mt-1">Email cannot be changed</p>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm text-white/60 mb-2">Phone Number</label>
                {isEditing ? (
                  <input
                    type="tel"
                    value={editData.phone}
                    onChange={(e) => setEditData(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-primary-500"
                    placeholder="+1 234 567 8900"
                  />
                ) : (
                  <p className="text-white">{profile?.phone || 'Not provided'}</p>
                )}
              </div>

              {/* Specialization */}
              <div>
                <label className="block text-sm text-white/60 mb-2">Specialization</label>
                {isEditing ? (
                  <select
                    value={editData.specialization}
                    onChange={(e) => setEditData(prev => ({ ...prev, specialization: e.target.value }))}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-primary-500"
                  >
                    <option value="">Select specialization</option>
                    {specializations.map(spec => (
                      <option key={spec} value={spec}>{spec}</option>
                    ))}
                  </select>
                ) : (
                  <p className="text-white">{profile?.specialization || 'Not specified'}</p>
                )}
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm text-white/60 mb-2">Location</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editData.location}
                    onChange={(e) => setEditData(prev => ({ ...prev, location: e.target.value }))}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-primary-500"
                    placeholder="City, Country"
                  />
                ) : (
                  <p className="text-white">{profile?.location || 'Not provided'}</p>
                )}
              </div>

              {/* Experience */}
              <div>
                <label className="block text-sm text-white/60 mb-2">Experience (Years)</label>
                {isEditing ? (
                  <input
                    type="number"
                    value={editData.experience}
                    onChange={(e) => setEditData(prev => ({ ...prev, experience: parseInt(e.target.value) || 0 }))}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-primary-500"
                    min="0"
                  />
                ) : (
                  <p className="text-white">{profile?.experience || 0} years</p>
                )}
              </div>
            </div>

            {/* Bio */}
            <div className="mt-6">
              <label className="block text-sm text-white/60 mb-2">About / Bio</label>
              {isEditing ? (
                <textarea
                  value={editData.bio}
                  onChange={(e) => setEditData(prev => ({ ...prev, bio: e.target.value }))}
                  rows={4}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-primary-500 resize-none"
                  placeholder="Write a brief description about yourself..."
                />
              ) : (
                <p className="text-white">{profile?.bio || 'No bio provided'}</p>
              )}
            </div>
          </GlassCard>

          {/* Professional Details */}
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white">Professional Details</h3>
              {isEditing && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowQualificationModal(true)}
                >
                  <GraduationCap className="w-4 h-4" />
                  Add Qualification
                </Button>
              )}
            </div>

            {/* Consultation Fee */}
            <div className="mb-6">
              <label className="block text-sm text-white/60 mb-2">Consultation Fee ($)</label>
              {isEditing ? (
                <input
                  type="number"
                  value={editData.consultation_fee}
                  onChange={(e) => setEditData(prev => ({ ...prev, consultation_fee: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-primary-500"
                  min="0"
                  step="0.01"
                />
              ) : (
                <p className="text-white text-2xl font-bold">${profile?.consultation_fee || 0}</p>
              )}
            </div>

            {/* Qualifications */}
            <div className="mb-6">
              <label className="block text-sm text-white/60 mb-2">Qualifications</label>
              {editData.qualifications?.length > 0 ? (
                <div className="space-y-3">
                  {editData.qualifications.map((qual, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 rounded-lg bg-white/5"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary-500/20 flex items-center justify-center">
                          <GraduationCap className="w-5 h-5 text-primary-400" />
                        </div>
                        <div>
                          <p className="text-white font-medium">{qual.degree}</p>
                          <p className="text-sm text-white/60">{qual.institution}, {qual.year}</p>
                        </div>
                      </div>
                      {isEditing && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveQualification(index)}
                        >
                          <X className="w-4 h-4 text-red-400" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-white/40">No qualifications added</p>
              )}
            </div>

            {/* Languages */}
            <div>
              <label className="block text-sm text-white/60 mb-2">Languages Spoken</label>
              {isEditing ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {editData.languages?.map((lang, index) => (
                      <Badge
                        key={index}
                        variant="primary"
                        className="flex items-center gap-1"
                      >
                        {lang}
                        <button
                          onClick={() => handleRemoveLanguage(lang)}
                          className="ml-1 hover:text-red-400"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Add language"
                      className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-primary-500"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleAddLanguage(e.target.value)
                          e.target.value = ''
                        }
                      }}
                    />
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {profile?.languages?.length > 0 ? (
                    profile.languages.map((lang, index) => (
                      <Badge key={index} variant="primary">{lang}</Badge>
                    ))
                  ) : (
                    <p className="text-white/40">No languages specified</p>
                  )}
                </div>
              )}
            </div>
          </GlassCard>

          {/* Verification Status */}
          <GlassCard className="p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Verification Status</h3>
            
            <div className="flex items-center gap-4 p-4 rounded-lg bg-white/5">
              {profile?.verified ? (
                <>
                  <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-green-400" />
                  </div>
                  <div>
                    <p className="text-white font-medium">Verified Doctor</p>
                    <p className="text-sm text-white/60">Your profile has been verified by the administration</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center">
                    <AlertCircle className="w-6 h-6 text-yellow-400" />
                  </div>
                  <div>
                    <p className="text-white font-medium">Verification Pending</p>
                    <p className="text-sm text-white/60">Your profile is under review. You'll be notified once verified.</p>
                  </div>
                </>
              )}
            </div>
          </GlassCard>
        </div>
      </div>

      {/* Avatar Modal */}
      <Modal
        isOpen={showAvatarModal}
        onClose={() => setShowAvatarModal(false)}
        title="Update Profile Photo"
      >
        <div className="space-y-4">
          <p className="text-white/60 text-sm">
            Enter a URL for your profile photo or upload an image.
          </p>
          <Input
            label="Avatar URL"
            placeholder="https://example.com/avatar.jpg"
            value={editData.avatar_url || ''}
            onChange={(e) => setEditData(prev => ({ ...prev, avatar_url: e.target.value }))}
          />
          <div className="flex gap-3 pt-4">
            <Button
              variant="ghost"
              className="flex-1"
              onClick={() => setShowAvatarModal(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              className="flex-1"
              onClick={() => {
                setShowAvatarModal(false)
                toast.success('Avatar URL updated. Save to apply changes.')
              }}
            >
              Update
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add Qualification Modal */}
      <Modal
        isOpen={showQualificationModal}
        onClose={() => {
          setShowQualificationModal(false)
          setNewQualification({ degree: '', institution: '', year: '' })
        }}
        title="Add Qualification"
      >
        <div className="space-y-4">
          <Input
            label="Degree"
            placeholder="e.g., MBBS, MD, MS"
            value={newQualification.degree}
            onChange={(e) => setNewQualification(prev => ({ ...prev, degree: e.target.value }))}
          />
          <Input
            label="Institution"
            placeholder="e.g., Harvard Medical School"
            value={newQualification.institution}
            onChange={(e) => setNewQualification(prev => ({ ...prev, institution: e.target.value }))}
          />
          <Input
            label="Year of Completion"
            placeholder="e.g., 2020"
            value={newQualification.year}
            onChange={(e) => setNewQualification(prev => ({ ...prev, year: e.target.value }))}
          />
          <div className="flex gap-3 pt-4">
            <Button
              variant="ghost"
              className="flex-1"
              onClick={() => {
                setShowQualificationModal(false)
                setNewQualification({ degree: '', institution: '', year: '' })
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              className="flex-1"
              onClick={handleAddQualification}
            >
              Add Qualification
            </Button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  )
}

export default DoctorProfilePage
