import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
    Settings,
    User,
    Bell,
    Lock,
    Eye,
    EyeOff,
    Save,
    Shield,
    Smartphone,
    Mail,
    Moon,
    Sun,
    Globe,
    Trash2,
    AlertCircle,
    CheckCircle
} from 'lucide-react'
import toast from 'react-hot-toast'
import useAuthStore from '../../store/authStore'
import { getUserProfile, updateUserProfile } from '../../services/api'
import { supabase } from '../../services/supabase'
import { DashboardLayout } from '../../components/layout'
import useThemeStore from '../../store/themeStore'
import { GlassCard, Badge, Button, Modal, Input } from '../../components/ui'

const SettingsPage = () => {
    const { user, setUser, logout } = useAuthStore()
    const { theme, setTheme } = useThemeStore()

    // State
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [activeTab, setActiveTab] = useState('account')

    // Account settings
    const [accountSettings, setAccountSettings] = useState({
        email: user?.email || '',
        phone: '',
        twoFactorEnabled: false,
    })

    // Notification settings
    const [notificationSettings, setNotificationSettings] = useState({
        emailNotifications: true,
        pushNotifications: true,
        appointmentReminders: true,
        marketingEmails: false,
        weeklyReport: true,
    })

    // Privacy settings
    const [privacySettings, setPrivacySettings] = useState({
        profileVisibility: 'public',
        showEmail: false,
        showPhone: false,
        allowMessages: true,
    })


    // Password change
    const [showPasswordModal, setShowPasswordModal] = useState(false)
    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    })
    const [showPasswords, setShowPasswords] = useState({
        current: false,
        new: false,
        confirm: false,
    })

    // Delete account
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [deleteConfirmation, setDeleteConfirmation] = useState('')

    // Fetch settings
    useEffect(() => {
        const fetchSettings = async () => {
            if (!user?.id) return

            try {
                const tableName = user.role === 'doctor' ? 'doctors' :
                    user.role === 'mediator' ? 'mediators' : 'patients'
                const profile = await getUserProfile(tableName, user.id)

                if (profile?.settings) {
                    setNotificationSettings(prev => ({ ...prev, ...profile.settings.notifications }))
                    setPrivacySettings(prev => ({ ...prev, ...profile.settings.privacy }))
                }

                setAccountSettings(prev => ({
                    ...prev,
                    phone: profile?.phone || '',
                }))
            } catch (error) {
                console.error('Error fetching settings:', error)
            } finally {
                setIsLoading(false)
            }
        }

        fetchSettings()
    }, [user?.id, user?.role])

    // Save settings
    const handleSave = async () => {
        setIsSaving(true)
        try {
            const tableName = user.role === 'doctor' ? 'doctors' :
                user.role === 'mediator' ? 'mediators' : 'patients'

            await updateUserProfile(tableName, user.id, {
                phone: accountSettings.phone,
                settings: {
                    notifications: notificationSettings,
                    privacy: privacySettings,
                },
            })

            toast.success('Settings saved successfully')
        } catch (error) {
            toast.error('Failed to save settings')
        } finally {
            setIsSaving(false)
        }
    }

    // Change password
    const handleChangePassword = async () => {
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            toast.error('Passwords do not match')
            return
        }

        if (passwordData.newPassword.length < 6) {
            toast.error('Password must be at least 6 characters')
            return
        }

        try {
            const { error } = await supabase.auth.updateUser({
                password: passwordData.newPassword
            })

            if (error) throw error

            toast.success('Password updated successfully')
            setShowPasswordModal(false)
            setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
        } catch (error) {
            toast.error(error.message || 'Failed to update password')
        }
    }

    // Delete account
    const handleDeleteAccount = async () => {
        if (deleteConfirmation !== 'DELETE') {
            toast.error('Please type DELETE to confirm')
            return
        }

        try {
            // TODO: Implement account deletion logic
            toast.success('Account deletion request submitted')
            setShowDeleteModal(false)
            await logout()
        } catch (error) {
            toast.error('Failed to delete account')
        }
    }

    // Tabs configuration
    const tabs = [
        { id: 'account', label: 'Account', icon: User },
        { id: 'notifications', label: 'Notifications', icon: Bell },
        { id: 'privacy', label: 'Privacy', icon: Shield },
        { id: 'privacy', label: 'Privacy', icon: Shield },
    ]

    // Toggle switch component
    const ToggleSwitch = ({ enabled, onChange, disabled = false }) => (
        <button
            onClick={() => !disabled && onChange(!enabled)}
            disabled={disabled}
            className={`w-12 h-6 rounded-full transition-colors ${enabled ? 'bg-primary-500' : 'bg-white/20'
                } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
            <div className={`w-5 h-5 rounded-full bg-white shadow transform transition-transform ${enabled ? 'translate-x-6' : 'translate-x-0.5'
                }`} />
        </button>
    )

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
                            Settings
                        </motion.h1>
                        <motion.p
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="text-gray-600"
                        >
                            Manage your account settings and preferences
                        </motion.p>
                    </div>

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
            </div>

            <div className="grid grid-cols-1 gap-6">
                {/* Sidebar Tabs */}
                <div className="lg:col-span-1">
                    <GlassCard className="p-4">
                        <nav className="space-y-1">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === tab.id
                                        ? 'bg-primary-500/20 text-primary-400'
                                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
                                        }`}
                                >
                                    <tab.icon className="w-5 h-5" />
                                    <span className="font-medium">{tab.label}</span>
                                </button>
                            ))}
                        </nav>
                    </GlassCard>
                </div>

                {/* Content */}
                <div className="lg:col-span-3">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        </div>
                    ) : (
                        <>
                            {/* Account Settings */}
                            {activeTab === 'account' && (
                                <GlassCard className="p-6">
                                    <h2 className="text-lg font-semibold text-gray-800 mb-6">Account Settings</h2>

                                    <div className="space-y-6">
                                        {/* Email */}
                                        <div>
                                            <label className="block text-sm text-gray-600 mb-2">Email Address</label>
                                            <div className="flex items-center gap-3">
                                                <div className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-600">
                                                    {accountSettings.email}
                                                </div>
                                                <Badge variant="success">
                                                    <CheckCircle className="w-3 h-3" />
                                                    Verified
                                                </Badge>
                                            </div>
                                            <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                                        </div>

                                        {/* Phone */}
                                        <div>
                                            <label className="block text-sm text-gray-600 mb-2">Phone Number</label>
                                            <input
                                                type="tel"
                                                value={accountSettings.phone}
                                                onChange={(e) => setAccountSettings(prev => ({ ...prev, phone: e.target.value }))}
                                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-800 focus:outline-none focus:border-primary-500"
                                                placeholder="+1 234 567 8900"
                                            />
                                        </div>

                                        {/* Password */}
                                        <div>
                                            <label className="block text-sm text-gray-600 mb-2">Password</label>
                                            <div className="flex items-center gap-3">
                                                <div className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-600">
                                                    ••••••••••••
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    onClick={() => setShowPasswordModal(true)}
                                                >
                                                    <Lock className="w-4 h-4" />
                                                    Change
                                                </Button>
                                            </div>
                                        </div>

                                        {/* Two-Factor Authentication */}
                                        <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-primary-500/20 flex items-center justify-center">
                                                    <Smartphone className="w-5 h-5 text-primary-400" />
                                                </div>
                                                <div>
                                                    <p className="text-gray-800 font-medium">Two-Factor Authentication</p>
                                                    <p className="text-sm text-gray-600">Add an extra layer of security</p>
                                                </div>
                                            </div>
                                            <ToggleSwitch
                                                enabled={accountSettings.twoFactorEnabled}
                                                onChange={(enabled) => {
                                                    setAccountSettings(prev => ({ ...prev, twoFactorEnabled: enabled }))
                                                    toast.success(enabled ? '2FA enabled' : '2FA disabled')
                                                }}
                                            />
                                        </div>

                                        {/* Danger Zone */}
                                        <div className="pt-6 border-t border-gray-200">
                                            <h3 className="text-sm font-medium text-red-400 mb-4">Danger Zone</h3>
                                            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className="text-gray-800 font-medium">Delete Account</p>
                                                        <p className="text-sm text-gray-600">Permanently delete your account and all data</p>
                                                    </div>
                                                    <Button
                                                        variant="danger"
                                                        onClick={() => setShowDeleteModal(true)}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                        Delete
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </GlassCard>
                            )}

                            {/* Notification Settings */}
                            {activeTab === 'notifications' && (
                                <GlassCard className="p-6">
                                    <h2 className="text-lg font-semibold text-gray-800 mb-6">Notification Preferences</h2>

                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50">
                                            <div className="flex items-center gap-3">
                                                <Mail className="w-5 h-5 text-gray-600" />
                                                <div>
                                                    <p className="text-gray-800 font-medium">Email Notifications</p>
                                                    <p className="text-sm text-gray-600">Receive notifications via email</p>
                                                </div>
                                            </div>
                                            <ToggleSwitch
                                                enabled={notificationSettings.emailNotifications}
                                                onChange={(enabled) => setNotificationSettings(prev => ({ ...prev, emailNotifications: enabled }))}
                                            />
                                        </div>

                                        <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50">
                                            <div className="flex items-center gap-3">
                                                <Bell className="w-5 h-5 text-gray-600" />
                                                <div>
                                                    <p className="text-gray-800 font-medium">Push Notifications</p>
                                                    <p className="text-sm text-gray-600">Receive push notifications in browser</p>
                                                </div>
                                            </div>
                                            <ToggleSwitch
                                                enabled={notificationSettings.pushNotifications}
                                                onChange={(enabled) => setNotificationSettings(prev => ({ ...prev, pushNotifications: enabled }))}
                                            />
                                        </div>

                                        <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50">
                                            <div className="flex items-center gap-3">
                                                <Smartphone className="w-5 h-5 text-gray-600" />
                                                <div>
                                                    <p className="text-gray-800 font-medium">Appointment Reminders</p>
                                                    <p className="text-sm text-gray-600">Get reminded before appointments</p>
                                                </div>
                                            </div>
                                            <ToggleSwitch
                                                enabled={notificationSettings.appointmentReminders}
                                                onChange={(enabled) => setNotificationSettings(prev => ({ ...prev, appointmentReminders: enabled }))}
                                            />
                                        </div>

                                        <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50">
                                            <div className="flex items-center gap-3">
                                                <Mail className="w-5 h-5 text-gray-600" />
                                                <div>
                                                    <p className="text-gray-800 font-medium">Weekly Report</p>
                                                    <p className="text-sm text-gray-600">Receive weekly activity summary</p>
                                                </div>
                                            </div>
                                            <ToggleSwitch
                                                enabled={notificationSettings.weeklyReport}
                                                onChange={(enabled) => setNotificationSettings(prev => ({ ...prev, weeklyReport: enabled }))}
                                            />
                                        </div>

                                        <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50">
                                            <div className="flex items-center gap-3">
                                                <Mail className="w-5 h-5 text-gray-600" />
                                                <div>
                                                    <p className="text-gray-800 font-medium">Marketing Emails</p>
                                                    <p className="text-sm text-gray-600">Receive promotional content and updates</p>
                                                </div>
                                            </div>
                                            <ToggleSwitch
                                                enabled={notificationSettings.marketingEmails}
                                                onChange={(enabled) => setNotificationSettings(prev => ({ ...prev, marketingEmails: enabled }))}
                                            />
                                        </div>
                                    </div>
                                </GlassCard>
                            )}

                            {/* Privacy Settings */}
                            {activeTab === 'privacy' && (
                                <GlassCard className="p-6">
                                    <h2 className="text-lg font-semibold text-gray-800 mb-6">Privacy Settings</h2>

                                    <div className="space-y-6">
                                        <div>
                                            <label className="block text-sm text-gray-600 mb-2">Profile Visibility</label>
                                            <select
                                                value={privacySettings.profileVisibility}
                                                onChange={(e) => setPrivacySettings(prev => ({ ...prev, profileVisibility: e.target.value }))}
                                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-800 focus:outline-none focus:border-primary-500"
                                            >
                                                <option value="public">Public - Anyone can view</option>
                                                <option value="private">Private - Only you can view</option>
                                                <option value="contacts">Contacts Only - Only your contacts</option>
                                            </select>
                                        </div>

                                        <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50">
                                            <div>
                                                <p className="text-gray-800 font-medium">Show Email Address</p>
                                                <p className="text-sm text-gray-600">Display email on your public profile</p>
                                            </div>
                                            <ToggleSwitch
                                                enabled={privacySettings.showEmail}
                                                onChange={(enabled) => setPrivacySettings(prev => ({ ...prev, showEmail: enabled }))}
                                            />
                                        </div>

                                        <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50">
                                            <div>
                                                <p className="text-gray-800 font-medium">Show Phone Number</p>
                                                <p className="text-sm text-gray-600">Display phone on your public profile</p>
                                            </div>
                                            <ToggleSwitch
                                                enabled={privacySettings.showPhone}
                                                onChange={(enabled) => setPrivacySettings(prev => ({ ...prev, showPhone: enabled }))}
                                            />
                                        </div>

                                        <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50">
                                            <div>
                                                <p className="text-gray-800 font-medium">Allow Messages</p>
                                                <p className="text-sm text-gray-600">Let others send you messages</p>
                                            </div>
                                            <ToggleSwitch
                                                enabled={privacySettings.allowMessages}
                                                onChange={(enabled) => setPrivacySettings(prev => ({ ...prev, allowMessages: enabled }))}
                                            />
                                        </div>
                                    </div>
                                </GlassCard>
                            )}

                        </>
                    )}
                </div>
            </div>

            {/* Change Password Modal */}
            <Modal
                isOpen={showPasswordModal}
                onClose={() => {
                    setShowPasswordModal(false)
                    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
                }}
                title="Change Password"
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm text-gray-600 mb-2">New Password</label>
                        <div className="relative">
                            <input
                                type={showPasswords.new ? 'text' : 'password'}
                                value={passwordData.newPassword}
                                onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-800 focus:outline-none focus:border-primary-500 pr-10"
                                placeholder="Enter new password"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-800"
                            >
                                {showPasswords.new ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm text-gray-600 mb-2">Confirm New Password</label>
                        <div className="relative">
                            <input
                                type={showPasswords.confirm ? 'text' : 'password'}
                                value={passwordData.confirmPassword}
                                onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-800 focus:outline-none focus:border-primary-500 pr-10"
                                placeholder="Confirm new password"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-800"
                            >
                                {showPasswords.confirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <Button
                            variant="ghost"
                            className="flex-1"
                            onClick={() => {
                                setShowPasswordModal(false)
                                setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="primary"
                            className="flex-1"
                            onClick={handleChangePassword}
                        >
                            Update Password
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Delete Account Modal */}
            <Modal
                isOpen={showDeleteModal}
                onClose={() => {
                    setShowDeleteModal(false)
                    setDeleteConfirmation('')
                }}
                title="Delete Account"
            >
                <div className="space-y-4">
                    <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                        <div className="flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-gray-800 font-medium">Warning: This action cannot be undone</p>
                                <p className="text-sm text-gray-600 mt-1">
                                    All your data, appointments, and medical records will be permanently deleted.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm text-gray-600 mb-2">
                            Type <span className="text-red-400 font-bold">DELETE</span> to confirm
                        </label>
                        <input
                            type="text"
                            value={deleteConfirmation}
                            onChange={(e) => setDeleteConfirmation(e.target.value)}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-800 focus:outline-none focus:border-red-500"
                            placeholder="DELETE"
                        />
                    </div>

                    <div className="flex gap-3 pt-4">
                        <Button
                            variant="ghost"
                            className="flex-1"
                            onClick={() => {
                                setShowDeleteModal(false)
                                setDeleteConfirmation('')
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="danger"
                            className="flex-1"
                            onClick={handleDeleteAccount}
                            disabled={deleteConfirmation !== 'DELETE'}
                        >
                            Delete Account
                        </Button>
                    </div>
                </div>
            </Modal>
        </DashboardLayout>
    )
}

export default SettingsPage



