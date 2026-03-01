import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Users, Clock, Phone, Play, CheckCircle, XCircle,
    AlertTriangle, Filter, RefreshCw, Calendar, UserPlus,
    ChevronRight, Search, Bell, Monitor, MoreVertical, Plus
} from 'lucide-react'
import useAuthStore from '../../store/authStore'
import {
    getDoctorQueue,
    callPatient,
    completeConsultation,
    cancelToken,
    markNoShow,
    getBranches,
    getDepartments,
    generateQueueToken
} from '../../services/queueApi'
import { getAllDoctors } from '../../services/api'
import QueueDisplayBoard from '../../components/queue/QueueDisplayBoard'
import { Badge } from '../../components/ui'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

const MediatorQueuePage = () => {
    const { profile } = useAuthStore()
    const [activeTab, setActiveTab] = useState('queue') // queue, display, manage
    const [selectedBranch, setSelectedBranch] = useState('')
    const [selectedDepartment, setSelectedDepartment] = useState('')
    const [selectedDoctor, setSelectedDoctor] = useState('')
    const [queueData, setQueueData] = useState(null)
    const [loading, setLoading] = useState(false)
    const [branches, setBranches] = useState([])
    const [departments, setDepartments] = useState([])
    const [doctors, setDoctors] = useState([])
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])

    // Modal states
    const [isTokenModalOpen, setIsTokenModalOpen] = useState(false)
    const [newTokenData, setNewTokenData] = useState({
        patient_name: '',
        age: '',
        reason: '',
        priority: 0,
        doctor_id: '',
        doctor_name: ''
    })

    useEffect(() => {
        loadFilters()
    }, [])

    useEffect(() => {
        if (selectedDoctor) {
            loadQueue()
        }
    }, [selectedDoctor, selectedDate])

    const loadFilters = async () => {
        try {
            const [branchesRes, departmentsRes, doctorsRes] = await Promise.all([
                getBranches(),
                getDepartments(),
                getAllDoctors()
            ])

            setBranches(branchesRes.branches || [])
            setDepartments(departmentsRes.departments || [])
            setDoctors(doctorsRes || [])

            if (branchesRes.branches?.length > 0) {
                setSelectedBranch(branchesRes.branches[0].id)
            }
        } catch (error) {
            console.error('Error loading filters:', error)
            toast.error('Failed to load filters')
        }
    }

    const loadQueue = async () => {
        if (!selectedDoctor) return

        setLoading(true)
        try {
            const data = await getDoctorQueue(selectedDoctor, { date: selectedDate })
            setQueueData(data)
        } catch (error) {
            toast.error('Failed to load queue')
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    const handleCallPatient = async (tokenId) => {
        try {
            await callPatient(tokenId)
            toast.success('Patient called')
            loadQueue()
        } catch (error) {
            toast.error(error.message)
        }
    }

    const handleCompleteConsultation = async (tokenId) => {
        try {
            await completeConsultation(tokenId, {})
            toast.success('Consultation completed')
            loadQueue()
        } catch (error) {
            toast.error(error.message)
        }
    }

    const handleCancelToken = async (tokenId) => {
        try {
            if (window.confirm('Are you sure you want to cancel this token?')) {
                await cancelToken(tokenId)
                toast.success('Token cancelled')
                loadQueue()
            }
        } catch (error) {
            toast.error(error.message)
        }
    }

    const handleGenerateToken = async (e) => {
        e.preventDefault()
        if (!newTokenData.patient_name || !newTokenData.doctor_id) {
            toast.error('Please fill in patient name and select a doctor')
            return
        }

        const doctor = doctors.find(d => d.id === newTokenData.doctor_id)
        const tokenStr = `T-${Math.floor(Math.random() * 900) + 100}`

        try {
            setLoading(true)
            await generateQueueToken({
                ...newTokenData,
                doctor_name: doctor?.full_name || 'Specialist',
                token: tokenStr
            })
            toast.success(`Token ${tokenStr} generated!`)
            setIsTokenModalOpen(false)
            if (selectedDoctor === newTokenData.doctor_id) {
                loadQueue()
            }
            setNewTokenData({ patient_name: '', age: '', reason: '', priority: 0, doctor_id: '', doctor_name: '' })
        } catch (error) {
            toast.error(error.message)
        } finally {
            setLoading(false)
        }
    }

    const getStatusBadge = (status) => {
        const variants = {
            'waiting': 'bg-amber-100 text-amber-700 border-amber-200',
            'in-progress': 'bg-blue-100 text-blue-700 border-blue-200',
            'completed': 'bg-green-100 text-green-700 border-green-200',
            'cancelled': 'bg-gray-100 text-gray-700 border-gray-200'
        }
        return (
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${variants[status] || variants.waiting}`}>
                {status.replace('-', ' ')}
            </span>
        )
    }

    const filteredDoctors = doctors.filter(d => {
        if (selectedDepartment && d.specialization !== selectedDepartment) return false
        return true
    })

    return (
        <div className="pb-20 max-w-lg mx-auto px-4 pt-4 min-h-screen bg-gray-50/50">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 tracking-tight">Queue</h1>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Live Management</p>
                </div>
                <button
                    onClick={loadQueue}
                    className="p-2.5 bg-white rounded-xl shadow-sm border border-gray-100 text-gray-400 hover:text-blue-600 active:scale-95 transition-all"
                >
                    <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin text-blue-500' : ''}`} />
                </button>
            </div>

            {/* Main Tabs */}
            <div className="flex bg-white p-1 rounded-2xl shadow-sm border border-gray-100 mb-6 font-bold text-xs uppercase tracking-wide">
                {[
                    { id: 'queue', label: 'Dashboard', icon: Users },
                    { id: 'display', label: 'Monitor', icon: Monitor },
                    { id: 'manage', label: 'Tokens', icon: Calendar }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl transition-all ${activeTab === tab.id
                                ? 'bg-blue-600 text-white shadow-md'
                                : 'text-gray-400 hover:text-gray-900'
                            }`}
                    >
                        <tab.icon className="w-5 h-5" />
                        <span>{tab.label}</span>
                    </button>
                ))}
            </div>

            <AnimatePresence mode="wait">
                {activeTab === 'queue' && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                        {/* Quick Stats Grid */}
                        {queueData?.stats && (
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100">
                                    <p className="text-[10px] font-black text-amber-600 uppercase mb-1 tracking-wider">Waiting</p>
                                    <p className="text-3xl font-black text-amber-700">{queueData.stats.waiting}</p>
                                </div>
                                <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                                    <p className="text-[10px] font-black text-blue-600 uppercase mb-1 tracking-wider">Active</p>
                                    <p className="text-3xl font-black text-blue-700">{queueData.stats.called + queueData.stats.in_consultation}</p>
                                </div>
                            </div>
                        )}

                        {/* Quick Filters */}
                        <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 space-y-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Selected Doctor</label>
                                <select
                                    value={selectedDoctor}
                                    onChange={(e) => setSelectedDoctor(e.target.value)}
                                    className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm font-bold text-gray-900 focus:ring-2 focus:ring-blue-500 transition-all appearance-none"
                                >
                                    <option value="">Select a Doctor</option>
                                    {doctors.map(doc => (
                                        <option key={doc.id} value={doc.id}>Dr. {doc.full_name} ({doc.specialization})</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Patient List */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between px-2">
                                <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Patient Flow</h3>
                                <span className="text-[10px] font-bold text-gray-400">{queueData?.queue?.length || 0} Total</span>
                            </div>

                            {!selectedDoctor ? (
                                <div className="text-center py-12 px-6 bg-white rounded-3xl border border-dashed border-gray-200">
                                    <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Users className="w-8 h-8 text-blue-500" />
                                    </div>
                                    <p className="text-sm font-bold text-gray-400">Please select a doctor to manage their live queue</p>
                                </div>
                            ) : queueData?.queue?.length > 0 ? (
                                queueData.queue.map((token, idx) => (
                                    <motion.div
                                        key={token.id}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                        className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 flex items-center justify-between group"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 border border-blue-100">
                                                <span className="text-lg font-black">{token.token || 'T-'}</span>
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-black text-gray-900 leading-none">{token.patient_name}</h4>
                                                <div className="flex items-center gap-2 mt-2">
                                                    {getStatusBadge(token.status)}
                                                    <span className="text-[10px] font-bold text-gray-400">{format(new Date(token.created_at), 'h:mm a')}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {token.status === 'waiting' && (
                                                <button
                                                    onClick={() => handleCallPatient(token.id)}
                                                    className="w-10 h-10 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200 active:scale-90 transition-all"
                                                >
                                                    <Play className="w-4 h-4 fill-current" />
                                                </button>
                                            )}
                                            {token.status === 'in-progress' && (
                                                <button
                                                    onClick={() => handleCompleteConsultation(token.id)}
                                                    className="w-10 h-10 bg-green-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-green-200 active:scale-90 transition-all"
                                                >
                                                    <CheckCircle className="w-4 h-4" />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleCancelToken(token.id)}
                                                className="w-10 h-10 bg-gray-50 text-gray-400 rounded-2xl flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition-all"
                                            >
                                                <XCircle className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </motion.div>
                                ))
                            ) : (
                                <div className="text-center py-12 px-6 bg-white rounded-3xl border border-gray-100">
                                    <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Queue is currently empty</p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}

                {activeTab === 'display' && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                        {selectedBranch ? (
                            <QueueDisplayBoard branchId={selectedBranch} departmentId={selectedDepartment} />
                        ) : (
                            <div className="bg-white rounded-3xl p-12 text-center border border-gray-100">
                                <Monitor className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                                <p className="text-sm font-bold text-gray-400">Display configuration unavailable</p>
                            </div>
                        )}
                    </motion.div>
                )}

                {activeTab === 'manage' && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                        <div className="bg-white rounded-3xl p-10 text-center border border-gray-100 shadow-sm overflow-hidden relative">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -mr-16 -mt-16 opacity-50" />
                            <div className="relative">
                                <div className="w-20 h-20 bg-blue-100 rounded-3xl flex items-center justify-center mx-auto mb-6 text-blue-600">
                                    <UserPlus className="w-10 h-10" />
                                </div>
                                <h3 className="text-xl font-black text-gray-900 mb-2">Token Management</h3>
                                <p className="text-sm font-bold text-gray-400 mb-8 max-w-[200px] mx-auto leading-relaxed uppercase tracking-wider">Generate new tokens for walk-in patients</p>
                                <button
                                    onClick={() => setIsTokenModalOpen(true)}
                                    className="w-full bg-blue-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-blue-100 flex items-center justify-center gap-2 active:scale-95 transition-all text-sm uppercase tracking-widest"
                                >
                                    <Plus className="w-5 h-5" />
                                    Create New Token
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Token Creation Modal (Bottom Sheet Style) */}
            <AnimatePresence>
                {isTokenModalOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setIsTokenModalOpen(false)}
                            className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[100]"
                        />
                        <motion.div
                            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[40px] z-[101] shadow-2xl p-8 max-w-lg mx-auto"
                        >
                            <div className="w-12 h-1 bg-gray-200 rounded-full mx-auto mb-8" />
                            <div className="mb-8">
                                <h2 className="text-2xl font-black text-gray-900 leading-none">New Token</h2>
                                <p className="text-xs font-black text-gray-400 uppercase tracking-widest mt-2">Registration Form</p>
                            </div>

                            <form onSubmit={handleGenerateToken} className="space-y-5">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Patient Name</label>
                                    <input
                                        type="text"
                                        required
                                        value={newTokenData.patient_name}
                                        onChange={(e) => setNewTokenData({ ...newTokenData, patient_name: e.target.value })}
                                        placeholder="Enter full name"
                                        className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm font-bold text-gray-900 focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Age</label>
                                        <input
                                            type="number"
                                            value={newTokenData.age}
                                            onChange={(e) => setNewTokenData({ ...newTokenData, age: e.target.value })}
                                            placeholder="Age"
                                            className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm font-bold text-gray-900 focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Priority</label>
                                        <select
                                            value={newTokenData.priority}
                                            onChange={(e) => setNewTokenData({ ...newTokenData, priority: parseInt(e.target.value) })}
                                            className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm font-bold text-gray-900 focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value={0}>Normal</option>
                                            <option value={1}>High</option>
                                            <option value={2}>Emergency</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Assign Doctor</label>
                                    <select
                                        required
                                        value={newTokenData.doctor_id}
                                        onChange={(e) => setNewTokenData({ ...newTokenData, doctor_id: e.target.value })}
                                        className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm font-bold text-gray-900 focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="">Select Doctor</option>
                                        {doctors.map(doc => (
                                            <option key={doc.id} value={doc.id}>Dr. {doc.full_name} ({doc.specialization})</option>
                                        ))}
                                    </select>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-blue-600 text-white font-black py-5 rounded-2xl shadow-xl shadow-blue-100 active:scale-95 transition-all text-sm uppercase tracking-widest mt-4"
                                >
                                    {loading ? 'Processing...' : 'Generate Token Now'}
                                </button>
                            </form>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    )
}

export default MediatorQueuePage
