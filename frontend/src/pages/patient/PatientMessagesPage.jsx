import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Plus } from 'lucide-react'
import toast from 'react-hot-toast'
import useAuthStore from '../../store/authStore'
import { supabase } from '../../services/supabase'
import { getDoctors } from '../../services/api'
import { DashboardLayout } from '../../components/layout'
import { ThreadList, ChatWindow } from '../../components/chat'
import { Avatar } from '../../components/ui'

const PatientMessagesPage = () => {
    const { threadId } = useParams()
    const navigate = useNavigate()
    const { user } = useAuthStore()

    const [threads, setThreads] = useState([])
    const [selectedThread, setSelectedThread] = useState(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [isLoading, setIsLoading] = useState(true)
    const [showNewChat, setShowNewChat] = useState(false)
    const [doctors, setDoctors] = useState([])
    const [doctorSearch, setDoctorSearch] = useState('')
    const [isStarting, setIsStarting] = useState(false)

    // Load threads
    useEffect(() => {
        if (!user?.id) return
        const load = async () => {
            setIsLoading(true)
            try {
                const { data, error } = await supabase
                    .from('message_threads')
                    .select('*')
                    .eq('patient_id', user.id)
                    .order('last_message_at', { ascending: false, nullsFirst: false })
                if (error) throw error

                // Attach unread counts
                const withCounts = await Promise.all(
                    (data || []).map(async (t) => {
                        const { count } = await supabase
                            .from('messages')
                            .select('*', { count: 'exact', head: true })
                            .eq('thread_id', t.id)
                            .eq('is_read', false)
                            .neq('sender_id', user.id)
                        return { ...t, unread_count: count || 0 }
                    })
                )
                setThreads(withCounts)

                // Auto-select if threadId in URL
                if (threadId) {
                    const found = withCounts.find(t => t.id === threadId)
                    if (found) setSelectedThread(found)
                }
            } catch (err) {
                console.error(err)
            } finally {
                setIsLoading(false)
            }
        }
        load()
    }, [user?.id, threadId])

    // Load doctors when modal opens
    useEffect(() => {
        if (!showNewChat) return
        getDoctors({}).then(setDoctors).catch(console.error)
    }, [showNewChat])

    const filteredThreads = useMemo(() =>
        threads.filter(t =>
            (t.doctor_name || '').toLowerCase().includes(searchQuery.toLowerCase())
        ), [threads, searchQuery])

    const filteredDoctors = useMemo(() =>
        doctors.filter(d =>
            (d.full_name || '').toLowerCase().includes(doctorSearch.toLowerCase()) ||
            (d.specialization || '').toLowerCase().includes(doctorSearch.toLowerCase())
        ), [doctors, doctorSearch])

    const handleSelectThread = (thread) => {
        setSelectedThread(thread)
        navigate(`/patient/messages/${thread.id}`, { replace: true })
    }

    const handleStartChat = async (doctor) => {
        if (isStarting) return
        setIsStarting(true)
        try {
            // Get patient name from profiles
            const { data: profile } = await supabase
                .from('profiles')
                .select('full_name')
                .eq('id', user.id)
                .single()
            const patientName = profile?.full_name || user.fullName || user.full_name || user.email?.split('@')[0] || 'Patient'

            // Try insert first
            let thread = null
            const { data: inserted, error: insertErr } = await supabase
                .from('message_threads')
                .insert({
                    patient_id: user.id,
                    doctor_id: doctor.id,
                    patient_name: patientName,
                    doctor_name: doctor.full_name,
                })
                .select()
                .single()

            if (!insertErr) {
                thread = inserted
            } else if (insertErr.code === '23505') {
                // Unique constraint — fetch existing
                const { data: existing } = await supabase
                    .from('message_threads')
                    .select('*')
                    .eq('patient_id', user.id)
                    .eq('doctor_id', doctor.id)
                    .single()
                thread = existing
            } else {
                throw insertErr
            }

            if (!thread) throw new Error('Could not create or find thread')

            // Add to list if not already there
            setThreads(prev => {
                if (prev.find(t => t.id === thread.id)) return prev
                return [{ ...thread, unread_count: 0 }, ...prev]
            })
            setShowNewChat(false)
            setSelectedThread(thread)
            navigate(`/patient/messages/${thread.id}`, { replace: true })
        } catch (err) {
            console.error(err)
            toast.error('Failed to start conversation')
        } finally {
            setIsStarting(false)
        }
    }

    return (
        <DashboardLayout>
            <div className="flex flex-col h-[calc(100vh-130px)] bg-white rounded-2xl overflow-hidden shadow-sm">
                {selectedThread ? (
                    <ChatWindow
                        thread={selectedThread}
                        onBack={() => {
                            setSelectedThread(null)
                            navigate('/patient/messages', { replace: true })
                        }}
                    />
                ) : (
                    <>
                        {/* Header */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                            <h1 className="text-base font-semibold text-gray-900">Messages</h1>
                            <button
                                onClick={() => setShowNewChat(true)}
                                className="flex items-center gap-1 bg-blue-500 text-white px-3 py-1.5 rounded-full text-xs font-medium"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                New Chat
                            </button>
                        </div>

                        <ThreadList
                            threads={filteredThreads}
                            currentUserId={user?.id}
                            userRole="patient"
                            onSelect={handleSelectThread}
                            selectedThreadId={selectedThread?.id}
                            searchQuery={searchQuery}
                            onSearchChange={setSearchQuery}
                            isLoading={isLoading}
                        />
                    </>
                )}
            </div>

            {/* New Chat Modal */}
            {showNewChat && (
                <div
                    className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center"
                    onClick={() => setShowNewChat(false)}
                >
                    <div
                        className="w-full max-w-md bg-white rounded-t-2xl max-h-[70vh] flex flex-col"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                            <h2 className="font-semibold text-gray-900">Choose a Doctor</h2>
                            <button onClick={() => setShowNewChat(false)} className="text-gray-400 text-lg">✕</button>
                        </div>
                        <div className="px-4 py-2">
                            <input
                                type="text"
                                placeholder="Search doctors..."
                                value={doctorSearch}
                                onChange={e => setDoctorSearch(e.target.value)}
                                className="w-full px-3 py-2 bg-gray-100 rounded-full text-sm focus:outline-none"
                            />
                        </div>
                        <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
                            {filteredDoctors.length === 0 ? (
                                <p className="text-center py-8 text-sm text-gray-400">No doctors found</p>
                            ) : filteredDoctors.map(doc => (
                                <button
                                    key={doc.id}
                                    disabled={isStarting}
                                    onClick={() => handleStartChat(doc)}
                                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                                >
                                    <Avatar name={doc.full_name} size="md" />
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">{doc.full_name}</p>
                                        <p className="text-xs text-gray-500">{doc.specialization || 'Doctor'}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    )
}

export default PatientMessagesPage
