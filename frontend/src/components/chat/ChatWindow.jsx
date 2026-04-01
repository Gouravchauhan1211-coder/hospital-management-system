import { useState, useEffect, useRef, useCallback } from 'react'
import { ArrowLeft } from 'lucide-react'
import { supabase } from '../../services/supabase'
import useAuthStore from '../../store/authStore'
import MessageBubble from './MessageBubble'
import MessageInput from './MessageInput'
import { Avatar } from '../ui'

const ChatWindow = ({ thread, onBack, onUnreadCleared }) => {
    const { user } = useAuthStore()
    const [messages, setMessages] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [isSending, setIsSending] = useState(false)
    const [error, setError] = useState(null)
    const bottomRef = useRef(null)
    const userRole = user?.role

    const otherName = userRole === 'patient'
        ? (thread.doctor_name || 'Doctor')
        : (thread.patient_name || 'Patient')

    // Scroll to the bottom of messages
    const scrollToBottom = useCallback(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [])

    // Fetch messages and mark as read
    useEffect(() => {
        if (!thread?.id) return
        setIsLoading(true)
        setError(null)

        const load = async () => {
            try {
                const { data, error: fetchErr } = await supabase
                    .from('messages')
                    .select('*')
                    .eq('thread_id', thread.id)
                    .order('created_at', { ascending: true })

                if (fetchErr) throw fetchErr
                setMessages(data || [])

                // Mark unread messages from the other person as read
                await supabase
                    .from('messages')
                    .update({ is_read: true })
                    .eq('thread_id', thread.id)
                    .neq('sender_id', user.id)
                    .or('is_read.is.null,is_read.eq.false')
                
                // Call callback to clear unread count
                if (onUnreadCleared) {
                    onUnreadCleared(thread.id)
                }
            } catch (err) {
                setError('Failed to load messages.')
                console.error(err)
            } finally {
                setIsLoading(false)
            }
        }

        load()
    }, [thread?.id, user?.id])

    // Scroll when messages change
    useEffect(() => {
        scrollToBottom()
    }, [messages, scrollToBottom])

    // Real-time subscription
    useEffect(() => {
        if (!thread?.id) return

        const channel = supabase
            .channel(`chat-${thread.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `thread_id=eq.${thread.id}`,
                },
                (payload) => {
                    const newMsg = payload.new
                    setMessages(prev => {
                        // Avoid duplicates
                        if (prev.find(m => m.id === newMsg.id)) return prev
                        return [...prev, newMsg]
                    })
                    // Mark as read if sent by the other person
                    if (newMsg.sender_id !== user.id) {
                        supabase.from('messages').update({ is_read: true }).eq('id', newMsg.id).or('is_read.is.null,is_read.eq.false')
                        if (onUnreadCleared) {
                            onUnreadCleared(thread.id)
                        }
                    }
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [thread?.id, user?.id])

    const handleSend = async (text) => {
        if (!text.trim() || isSending) return
        setIsSending(true)
        try {
            // Optimistic insert
            const optimistic = {
                id: `temp-${Date.now()}`,
                thread_id: thread.id,
                sender_id: user.id,
                sender_type: userRole,
                text: text.trim(),
                is_read: false,
                created_at: new Date().toISOString(),
            }
            setMessages(prev => [...prev, optimistic])

            const { data: inserted, error: msgErr } = await supabase
                .from('messages')
                .insert({
                    thread_id: thread.id,
                    sender_id: user.id,
                    sender_type: userRole,
                    text: text.trim(),
                    is_read: true, // Mark sender's own message as read
                })
                .select()
                .single()

            if (msgErr) throw msgErr

            // Replace optimistic with real
            setMessages(prev => prev.map(m => m.id === optimistic.id ? inserted : m))

            // Update thread's last_message
            await supabase
                .from('message_threads')
                .update({ last_message: text.trim(), last_message_at: new Date().toISOString() })
                .eq('id', thread.id)
        } catch (err) {
            console.error('Send failed:', err)
            // Remove optimistic on failure
            setMessages(prev => prev.filter(m => !m.id.toString().startsWith('temp-')))
        } finally {
            setIsSending(false)
        }
    }

    return (
        <div className="flex flex-col h-full bg-gray-50">
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200 shrink-0">
                <button
                    onClick={onBack}
                    className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <Avatar name={otherName} size="md" />
                <div>
                    <p className="font-semibold text-gray-900 text-sm">{otherName}</p>
                    <p className="text-xs text-gray-500">
                        {userRole === 'patient' ? 'Doctor' : 'Patient'}
                    </p>
                </div>
            </div>

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto px-4 py-3">
                {isLoading ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="animate-spin w-8 h-8 border-t-2 border-blue-500 rounded-full" />
                    </div>
                ) : error ? (
                    <div className="flex items-center justify-center h-full text-red-500 text-sm">{error}</div>
                ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full gap-2 text-gray-400">
                        <p className="text-sm">No messages yet. Say hello! 👋</p>
                    </div>
                ) : (
                    messages.map(msg => (
                        <MessageBubble
                            key={msg.id}
                            message={msg}
                            isOwn={msg.sender_id === user.id}
                        />
                    ))
                )}
                <div ref={bottomRef} />
            </div>

            {/* Input */}
            <MessageInput onSend={handleSend} disabled={isSending} />
        </div>
    )
}

export default ChatWindow
