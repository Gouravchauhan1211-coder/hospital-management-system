import { useState, useEffect, useRef, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  MessageSquare, 
  Send, 
  ArrowLeft,
  Search,
  Stethoscope,
  MoreVertical,
  Phone,
  Video,
  Paperclip,
  Smile
} from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import toast from 'react-hot-toast'
import useAuthStore from '../../store/authStore'
import { getMessageThreads, getMessages, sendMessage, createMessageThread, getDoctors } from '../../services/api'
import { useMessages } from '../../hooks/useRealtimeSubscription'
import { DashboardLayout } from '../../components/layout'
import { GlassCard, Avatar, Button, Input, Badge } from '../../components/ui'
import { EmptyState } from '../../components/shared'
import { CardSkeleton } from '../../components/ui/Skeleton'

const PatientMessagesPage = () => {
  const { threadId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [threads, setThreads] = useState([])
  const [selectedThread, setSelectedThread] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showNewChat, setShowNewChat] = useState(false)
  const [doctors, setDoctors] = useState([])
  const messagesEndRef = useRef(null)

  // Real-time message subscription for selected thread
  const { data: realtimeMessages } = useMessages(selectedThread?.id)

  // Fetch threads on mount
  useEffect(() => {
    const fetchThreads = async () => {
      if (!user?.id) return
      
      try {
        const threadsData = await getMessageThreads(user.id, 'patient')
        setThreads(threadsData || [])
      } catch (error) {
        console.error('Error fetching threads:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchThreads()
  }, [user?.id])

  // Update messages when realtime data changes
  useEffect(() => {
    if (realtimeMessages) {
      setMessages(realtimeMessages)
    }
  }, [realtimeMessages])

  // Fetch messages when thread is selected
  useEffect(() => {
    const fetchMessages = async () => {
      if (!selectedThread?.id) return
      
      try {
        const messagesData = await getMessages(selectedThread.id)
        setMessages(messagesData || [])
      } catch (error) {
        console.error('Error fetching messages:', error)
      }
    }
    fetchMessages()
  }, [selectedThread?.id])

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Fetch doctors for new chat
  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const doctorsData = await getDoctors({})
        setDoctors(doctorsData || [])
      } catch (error) {
        console.error('Error fetching doctors:', error)
      }
    }
    
    if (showNewChat) {
      fetchDoctors()
    }
  }, [showNewChat])

  const handleSelectThread = (thread) => {
    setSelectedThread(thread)
    navigate(`/patient/messages/${thread.id}`, { replace: true })
  }

  const handleSendMessage = async (e) => {
    e.preventDefault()
    
    if (!newMessage.trim() || !selectedThread) return

    setIsSending(true)
    try {
      await sendMessage({
        threadId: selectedThread.id,
        senderId: user.id,
        senderType: 'patient',
        text: newMessage.trim()
      })
      setNewMessage('')
      // Real-time subscription will update the messages
    } catch (error) {
      console.error('Error sending message:', error)
      toast.error('Failed to send message')
    } finally {
      setIsSending(false)
    }
  }

  const handleStartNewChat = async (doctor) => {
    try {
      // Check if thread already exists
      const existingThread = threads.find(t => t.doctor_id === doctor.id)
      
      if (existingThread) {
        setSelectedThread(existingThread)
        navigate(`/patient/messages/${existingThread.id}`, { replace: true })
      } else {
        // Create new thread
        const newThread = await createMessageThread({
          patientId: user.id,
          doctorId: doctor.id,
          doctorName: doctor.full_name,
          doctorAvatar: doctor.avatar_url
        })
        
        setThreads(prev => [newThread, ...prev])
        setSelectedThread(newThread)
        navigate(`/patient/messages/${newThread.id}`, { replace: true })
      }
      
      setShowNewChat(false)
    } catch (error) {
      console.error('Error starting chat:', error)
      toast.error('Failed to start conversation')
    }
  }

  const filteredThreads = useMemo(() => {
    if (!searchQuery) return threads
    return threads.filter(t => 
      t.doctor_name?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [threads, searchQuery])

  return (
    <DashboardLayout>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-120px)]">
        {/* Threads List */}
        <div className={`${selectedThread ? 'hidden lg:block' : ''}`}>
          <GlassCard className="h-full flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-white/10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">Messages</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowNewChat(true)}
                >
                  <MessageSquare className="w-4 h-4" />
                </Button>
              </div>
              
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <input
                  type="text"
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-primary-500"
                />
              </div>
            </div>

            {/* Threads List */}
            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="p-4 space-y-3">
                  <CardSkeleton />
                  <CardSkeleton />
                </div>
              ) : filteredThreads.length > 0 ? (
                filteredThreads.map((thread) => (
                  <motion.button
                    key={thread.id}
                    onClick={() => handleSelectThread(thread)}
                    className={`w-full p-4 text-left hover:bg-white/5 transition-colors border-b border-white/5 ${
                      selectedThread?.id === thread.id ? 'bg-primary-500/10' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar name={thread.doctor_name} src={thread.doctor_avatar} size="md" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-white truncate">
                            Dr. {thread.doctor_name}
                          </p>
                          <span className="text-xs text-white/40">
                            {thread.last_message_at && formatDistanceToNow(new Date(thread.last_message_at), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-sm text-white/60 truncate">
                          {thread.last_message || 'No messages yet'}
                        </p>
                      </div>
                    </div>
                  </motion.button>
                ))
              ) : (
                <EmptyState
                  icon={MessageSquare}
                  title="No conversations"
                  description="Start a new conversation with a doctor"
                  action={
                    <Button variant="primary" size="sm" onClick={() => setShowNewChat(true)}>
                      New Chat
                    </Button>
                  }
                />
              )}
            </div>
          </GlassCard>
        </div>

        {/* Chat Window */}
        <div className={`${selectedThread ? '' : 'hidden lg:block'} lg:col-span-2`}>
          {selectedThread ? (
            <GlassCard className="h-full flex flex-col">
              {/* Chat Header */}
              <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSelectedThread(null)}
                    className="lg:hidden p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <Avatar name={selectedThread.doctor_name} src={selectedThread.doctor_avatar} size="md" />
                  <div>
                    <p className="font-medium text-white">Dr. {selectedThread.doctor_name}</p>
                    <p className="text-xs text-success">Online</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => navigate(`/call/${selectedThread.id}?type=audio`)}
                    title="Voice Call"
                  >
                    <Phone className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => navigate(`/call/${selectedThread.id}?type=video`)}
                    title="Video Call"
                  >
                    <Video className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length > 0 ? (
                  messages.map((message, index) => {
                    const isOwn = message.sender_id === user.id
                    return (
                      <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.02 }}
                        className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[70%] p-3 rounded-2xl ${
                            isOwn
                              ? 'bg-primary-500 text-white rounded-br-md'
                              : 'bg-white/10 text-white rounded-bl-md'
                          }`}
                        >
                          <p className="text-sm">{message.text}</p>
                          <p className={`text-xs mt-1 ${isOwn ? 'text-white/60' : 'text-white/40'}`}>
                            {message.created_at && format(new Date(message.created_at), 'h:mm a')}
                          </p>
                        </div>
                      </motion.div>
                    )
                  })
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <EmptyState
                      icon={MessageSquare}
                      title="Start the conversation"
                      description="Send a message to begin chatting"
                    />
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <form onSubmit={handleSendMessage} className="p-4 border-t border-white/10">
                <div className="flex items-center gap-2">
                  <Button type="button" variant="ghost" size="sm">
                    <Paperclip className="w-4 h-4" />
                  </Button>
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-primary-500"
                  />
                  <Button type="button" variant="ghost" size="sm">
                    <Smile className="w-4 h-4" />
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    disabled={!newMessage.trim() || isSending}
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </form>
            </GlassCard>
          ) : (
            <GlassCard className="h-full flex items-center justify-center">
              <EmptyState
                icon={MessageSquare}
                title="Select a conversation"
                description="Choose a conversation from the list to start messaging"
              />
            </GlassCard>
          )}
        </div>
      </div>

      {/* New Chat Modal */}
      <AnimatePresence>
        {showNewChat && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowNewChat(false)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="w-full max-w-md bg-black/30 backdrop-blur-xl border border-white/20 rounded-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <h3 className="font-semibold text-white">Start New Chat</h3>
                <Button variant="ghost" size="sm" onClick={() => setShowNewChat(false)}>
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              </div>
              <div className="p-4 max-h-96 overflow-y-auto">
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                  <input
                    type="text"
                    placeholder="Search doctors..."
                    className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-primary-500"
                  />
                </div>
                <div className="space-y-2">
                  {doctors.slice(0, 10).map((doctor) => (
                    <button
                      key={doctor.id}
                      onClick={() => handleStartNewChat(doctor)}
                      className="w-full p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors flex items-center gap-3"
                    >
                      <Avatar name={doctor.full_name} src={doctor.avatar_url} size="md" />
                      <div className="flex-1 text-left">
                        <p className="font-medium text-white">Dr. {doctor.full_name}</p>
                        <p className="text-sm text-white/60">{doctor.specialization}</p>
                      </div>
                      <MessageSquare className="w-4 h-4 text-white/40" />
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  )
}

export default PatientMessagesPage