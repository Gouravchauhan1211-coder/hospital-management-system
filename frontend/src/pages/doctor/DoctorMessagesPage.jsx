import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import useAuthStore from '../../store/authStore'
import { supabase } from '../../services/supabase'
import { DashboardLayout } from '../../components/layout'
import { ThreadList, ChatWindow } from '../../components/chat'

const DoctorMessagesPage = () => {
    const { threadId } = useParams()
    const navigate = useNavigate()
    const { user } = useAuthStore()

    const [threads, setThreads] = useState([])
    const [selectedThread, setSelectedThread] = useState(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [isLoading, setIsLoading] = useState(true)

    // Load threads
    useEffect(() => {
        if (!user?.id) return
        const load = async () => {
            setIsLoading(true)
            try {
                const { data, error } = await supabase
                    .from('message_threads')
                    .select('*')
                    .eq('doctor_id', user.id)
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

    const filteredThreads = useMemo(() =>
        threads.filter(t =>
            (t.patient_name || '').toLowerCase().includes(searchQuery.toLowerCase())
        ), [threads, searchQuery])

    const handleSelectThread = (thread) => {
        setSelectedThread(thread)
        navigate(`/doctor/messages/${thread.id}`, { replace: true })
    }

    return (
        <DashboardLayout>
            <div className="flex flex-col h-[calc(100vh-130px)] bg-white rounded-2xl overflow-hidden shadow-sm">
                {selectedThread ? (
                    <ChatWindow
                        thread={selectedThread}
                        onBack={() => {
                            setSelectedThread(null)
                            navigate('/doctor/messages', { replace: true })
                        }}
                    />
                ) : (
                    <>
                        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                            <h1 className="text-base font-semibold text-gray-900">Patient Messages</h1>
                            <span className="bg-blue-100 text-blue-600 text-xs font-bold px-2 py-0.5 rounded-full">
                                {threads.reduce((sum, t) => sum + (t.unread_count || 0), 0)} unread
                            </span>
                        </div>

                        <ThreadList
                            threads={filteredThreads}
                            currentUserId={user?.id}
                            userRole="doctor"
                            onSelect={handleSelectThread}
                            selectedThreadId={selectedThread?.id}
                            searchQuery={searchQuery}
                            onSearchChange={setSearchQuery}
                            isLoading={isLoading}
                        />
                    </>
                )}
            </div>
        </DashboardLayout>
    )
}

export default DoctorMessagesPage
