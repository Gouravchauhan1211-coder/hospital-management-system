import { useState, useEffect, useRef, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  MessageSquare, 
  Send, 
  ArrowLeft,
  Search,
  User,
  MoreVertical,
  Phone,
  Video,
  Paperclip,
  Smile,
  VideoIcon
} from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import toast from 'react-hot-toast'
import useAuthStore from '../../store/authStore'
import { getMessageThreads, getMessages, sendMessage } from '../../services/api'
import { useMessages } from '../../hooks/useRealtimeSubscription'
import { DashboardLayout } from '../../components/layout'
import { GlassCard, Avatar, Button, Badge } from '../../components/ui'
import { EmptyState } from '../../components/shared'
import { CardSkeleton } from '../../components/ui/Skeleton'

const DoctorMessagesPage = () => {
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
  const messagesEndRef = useRef(null)

  // Real-time message subscription for selected thread
  const { data: realtimeMessages } = useMessages(selectedThread?.id)

  // Fetch threads on mount
  useEffect(() => {
    const fetchThreads = async () => {
      if (!user?.id) return
      
      try {
        const threadsData = await getMessageThreads(user.id, 'doctor')
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

  const handleSelectThread = (thread) => {
    setSelectedThread(thread)
    navigate(`/doctor/messages/${thread.id}`, { replace: true })
  }

  const handleSendMessage = async (e) => {
    e.preventDefault()
    
    if (!newMessage.trim() || !selectedThread) return

    setIsSending(true)
    try {
      await sendMessage({
        threadId: selectedThread.id,
        senderId: user.id,
        senderType: 'doctor',
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

  const handleStartCall = (type) => {
    if (!selectedThread) return
    
    // Navigate to call page or open call modal
    navigate(`/doctor/call/${selectedThread.id}?type=${type}`)
  }

  const filteredThreads = useMemo(() => {
    if (!searchQuery) return threads
    return threads.filter(t => 
      t.patient_name?.toLowerCase().includes(searchQuery.toLowerCase())
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
                <h2 className="text-lg font-semibold text-white">Patient Messages</h2>
                <Badge variant="primary">{threads.length}</Badge>
              </div>
              
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <input
                  type="text"
                  placeholder="Search patients..."
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
                      <Avatar name={thread.patient_name} src={thread.patient_avatar} size="md" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-white truncate">
                            {thread.patient_name}
                          </p>
                          <span className="text-xs text-white/40">
                            {thread.last_message_at && formatDistanceToNow(new Date(thread.last_message_at), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-sm text-white/60 truncate">
                          {thread.last_message || 'No messages yet'}
                        </p>
                      </div>
                      {thread.unread_count > 0 && (
                        <Badge variant="error" size="sm">{thread.unread_count}</Badge>
                      )}
                    </div>
                  </motion.button>
                ))
              ) : (
                <EmptyState
                  icon={MessageSquare}
                  title="No conversations"
                  description="Patients will appear here when they message you"
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
                  <Avatar name={selectedThread.patient_name} src={selectedThread.patient_avatar} size="md" />
                  <div>
                    <p className="font-medium text-white">{selectedThread.patient_name}</p>
                    <p className="text-xs text-white/60">Patient</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleStartCall('audio')}
                  >
                    <Phone className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleStartCall('video')}
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
                      description="Send a message to your patient"
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
                description="Choose a patient conversation from the list"
              />
            </GlassCard>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}

export default DoctorMessagesPage