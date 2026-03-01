import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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
    Key,
    ChevronRight,
    Camera,
    Sun,
    Moon,
    Laptop
} from 'lucide-react'
import toast from 'react-hot-toast'
import useAuthStore from '../../store/authStore'
import useThemeStore from '../../store/themeStore'
import { DashboardLayout } from '../../components/layout'
import { GlassCard, Avatar, Button, Input, Badge } from '../../components/ui'

const PatientProfilePage = () => {
    const { user, updateProfile } = useAuthStore()
    const { theme, setTheme } = useThemeStore()
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

    // Sync formData with user when user changes (e.g. after update)
    useEffect(() => {
        if (user) {
            setFormData({
                fullName: user.fullName || '',
                email: user.email || '',
                phone: user.phone || '',
                address: user.address || '',
                dateOfBirth: user.dateOfBirth || '',
                bloodGroup: user.bloodGroup || '',
                emergencyContact: user.emergencyContact || '',
                allergies: user.allergies || ''
            })
        }
    }, [user])

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }))
    }

    const handleSave = async () => {
        setIsLoading(true)
        try {
            const result = await updateProfile(formData)
            if (result.success) {
                toast.success('Profile updated successfully!')
                setIsEditing(false)
            } else {
                toast.error(result.error || 'Failed to update profile')
            }
        } catch (error) {
            toast.error('An unexpected error occurred')
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
            <div className="max-w-xl mx-auto pb-24 px-4 pt-2">
                {/* Header Section */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight leading-none transition-colors">Profile</h1>
                        <p className="text-xs font-black text-gray-400 uppercase tracking-widest mt-2 px-0.5">Settings & Records</p>
                    </div>
                    {!isEditing ? (
                        <button
                            onClick={() => setIsEditing(true)}
                            className="p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-700 active:scale-95 transition-all"
                        >
                            <Edit2 className="w-5 h-5" />
                        </button>
                    ) : (
                        <div className="flex gap-2">
                            <button
                                onClick={handleCancel}
                                className="p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 text-gray-400"
                            >
                                <X className="w-5 h-5" />
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={isLoading}
                                className="p-3 bg-blue-600 rounded-2xl shadow-md text-white active:scale-95 transition-all disabled:opacity-50"
                            >
                                <Save className="w-5 h-5" />
                            </button>
                        </div>
                    )}
                </div>

                {/* Profile Card */}
                <div className="space-y-6">
                    <div className="bg-white dark:bg-slate-900 rounded-[40px] shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden transition-colors">
                        <div className="bg-gradient-to-br from-blue-600 to-blue-700 h-24 relative">
                            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '16px 16px' }} />
                        </div>

                        <div className="px-8 pb-8 -mt-12">
                            <div className="flex flex-col items-center">
                                <div className="relative group">
                                    <Avatar
                                        src={user?.avatar}
                                        name={formData.fullName}
                                        size="xl"
                                        className="w-24 h-24 md:w-28 md:h-28 text-4xl shadow-2xl ring-4 ring-white dark:ring-slate-900 transition-all"
                                    />
                                    {isEditing && (
                                        <button className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Camera className="w-6 h-6" />
                                        </button>
                                    )}
                                </div>
                                <div className="text-center mt-4">
                                    <h2 className="text-xl font-black text-gray-900 dark:text-white">{formData.fullName || 'Patient Name'}</h2>
                                    <Badge variant="primary" className="mt-2 px-3 py-1 text-[10px] font-black uppercase tracking-widest border-2 border-blue-100 dark:border-blue-900/30 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
                                        Active Patient
                                    </Badge>
                                </div>
                            </div>

                            {/* Data Grid */}
                            <div className="mt-10 space-y-8">
                                {/* Section: Personal */}
                                <div className="space-y-5">
                                    <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-4 bg-blue-500 rounded-full" />
                                        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">General Info</h3>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="bg-gray-50/80 dark:bg-slate-800/50 p-5 rounded-3xl border border-gray-100/50 dark:border-slate-700/50 transition-colors">
                                            <label className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest block mb-2">Full Name</label>
                                            {isEditing ? (
                                                <input
                                                    value={formData.fullName}
                                                    onChange={(e) => handleChange('fullName', e.target.value)}
                                                    className="w-full bg-white dark:bg-slate-800 border-none rounded-2xl p-3 text-sm font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 transition-colors"
                                                    placeholder="Your full name"
                                                />
                                            ) : (
                                                <p className="text-sm font-bold text-gray-900 dark:text-white">{formData.fullName || 'Not provided'}</p>
                                            )}
                                        </div>

                                        <div className="bg-gray-50/80 dark:bg-slate-800/50 p-5 rounded-3xl border border-gray-100/50 dark:border-slate-700/50">
                                            <label className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest block mb-2">Email Address</label>
                                            <div className="flex items-center gap-3">
                                                <Mail className="w-4 h-4 text-gray-400" />
                                                <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{formData.email}</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-gray-50/80 dark:bg-slate-800/50 p-5 rounded-3xl border border-gray-100/50 dark:border-slate-700/50 relative">
                                                <label className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest block mb-2">Phone</label>
                                                {isEditing ? (
                                                    <input
                                                        value={formData.phone}
                                                        onChange={(e) => handleChange('phone', e.target.value)}
                                                        className="w-full bg-white dark:bg-slate-800 border-none rounded-xl p-2 text-sm font-bold text-gray-900 dark:text-white transition-colors"
                                                    />
                                                ) : (
                                                    <p className="text-sm font-bold text-gray-900 dark:text-white">{formData.phone || 'N/A'}</p>
                                                )}
                                                <Phone className="absolute top-5 right-5 w-4 h-4 text-gray-200 dark:text-slate-700" />
                                            </div>
                                            <div className="bg-gray-50/80 dark:bg-slate-800/50 p-5 rounded-3xl border border-gray-100/50 dark:border-slate-700/50 relative">
                                                <label className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest block mb-2">Wait Type</label>
                                                <p className="text-sm font-bold text-blue-600 dark:text-blue-400">Standard</p>
                                                <Calendar className="absolute top-5 right-5 w-4 h-4 text-gray-200 dark:text-slate-700" />
                                            </div>
                                        </div>

                                        <div className="bg-gray-50/80 dark:bg-slate-800/50 p-5 rounded-3xl border border-gray-100/50 dark:border-slate-700/50 relative">
                                            <label className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest block mb-2">Residential Address</label>
                                            {isEditing ? (
                                                <textarea
                                                    rows={2}
                                                    value={formData.address}
                                                    onChange={(e) => handleChange('address', e.target.value)}
                                                    className="w-full bg-white dark:bg-slate-800 border-none rounded-2xl p-3 text-sm font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 transition-colors"
                                                />
                                            ) : (
                                                <div className="flex items-start gap-3">
                                                    <MapPin className="w-4 h-4 text-gray-400 mt-1" />
                                                    <p className="text-sm font-bold text-gray-900 dark:text-white leading-relaxed">{formData.address || 'Not provided'}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Section: Medical */}
                                <div className="space-y-5">
                                    <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-4 bg-red-500 rounded-full" />
                                        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Medical Info</h3>
                                    </div>

                                    <div className="bg-gray-50/80 dark:bg-slate-800/50 p-6 rounded-[32px] border border-gray-100/50 dark:border-slate-700/50 space-y-6 transition-colors">
                                        <div className="flex justify-between items-center group">
                                            <div className="space-y-1 w-full">
                                                <span className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest">Blood Type</span>
                                                {isEditing ? (
                                                    <select
                                                        value={formData.bloodGroup}
                                                        onChange={(e) => handleChange('bloodGroup', e.target.value)}
                                                        className="w-full bg-white dark:bg-slate-800 border-none rounded-xl p-2 text-sm font-bold text-gray-900 dark:text-white mt-1 transition-colors"
                                                    >
                                                        <option value="">Select</option>
                                                        {bloodGroups.map(group => (
                                                            <option key={group} value={group}>{group}</option>
                                                        ))}
                                                    </select>
                                                ) : (
                                                    <p className="text-sm font-bold text-gray-900 dark:text-white">{formData.bloodGroup || 'Select'}</p>
                                                )}
                                            </div>
                                            {!isEditing && <Badge className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-100 dark:border-red-900/30 font-bold px-3 py-1 rounded-xl">Vital</Badge>}
                                        </div>

                                        <div className="h-px bg-gray-200/50 dark:bg-slate-700/50" />

                                        <div className="space-y-1">
                                            <span className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest">Known Allergies</span>
                                            {isEditing ? (
                                                <input
                                                    value={formData.allergies}
                                                    onChange={(e) => handleChange('allergies', e.target.value)}
                                                    className="w-full bg-white dark:bg-slate-800 border-none rounded-xl p-2 text-sm font-bold text-gray-900 dark:text-white mt-1 transition-colors"
                                                    placeholder="e.g. Peanuts, Aspirin"
                                                />
                                            ) : (
                                                <p className="text-sm font-bold text-gray-900 dark:text-white">{formData.allergies || 'None reported'}</p>
                                            )}
                                        </div>

                                        <div className="h-px bg-gray-200/50 dark:bg-slate-700/50" />

                                        <div className="space-y-1">
                                            <span className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest">Emergency Contact</span>
                                            {isEditing ? (
                                                <input
                                                    value={formData.emergencyContact}
                                                    onChange={(e) => handleChange('emergencyContact', e.target.value)}
                                                    className="w-full bg-white dark:bg-slate-800 border-none rounded-xl p-2 text-sm font-bold text-gray-900 dark:text-white mt-1 transition-colors"
                                                />
                                            ) : (
                                                <p className="text-sm font-bold text-green-600 dark:text-green-400">{formData.emergencyContact || 'Add contact'}</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Quick Settings */}
                    <div className="space-y-6 pt-2">

                        <div className="space-y-3">
                            <h3 className="px-5 text-xs font-black text-gray-400 uppercase tracking-widest">App Settings</h3>

                            <div className="bg-white dark:bg-slate-900 rounded-[32px] p-2 border border-gray-100 dark:border-slate-800 shadow-sm space-y-1 transition-colors">
                                <button className="w-full flex items-center justify-between p-4 bg-white dark:bg-slate-900 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-2xl transition-all group">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400 transition-colors group-hover:bg-blue-100 dark:group-hover:bg-blue-900/40">
                                            <Bell className="w-6 h-6" />
                                        </div>
                                        <div className="text-left">
                                            <p className="text-sm font-black text-gray-900 dark:text-white">Notifications</p>
                                            <p className="text-[10px] font-bold text-gray-400 dark:text-slate-500">Manage alerts & updates</p>
                                        </div>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-gray-300 dark:text-slate-700" />
                                </button>

                                <button className="w-full flex items-center justify-between p-4 bg-white dark:bg-slate-900 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-2xl transition-all group">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-gray-50 dark:bg-slate-800/50 rounded-2xl flex items-center justify-center text-gray-400 dark:text-slate-500 transition-colors group-hover:bg-gray-100 dark:group-hover:bg-slate-800">
                                            <Key className="w-6 h-6" />
                                        </div>
                                        <div className="text-left">
                                            <p className="text-sm font-black text-gray-900 dark:text-white">Security</p>
                                            <p className="text-[10px] font-bold text-gray-400 dark:text-slate-500">Password & Privacy</p>
                                        </div>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-gray-300 dark:text-slate-700" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    )
}

export default PatientProfilePage
