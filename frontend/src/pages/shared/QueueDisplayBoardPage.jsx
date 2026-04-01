import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../services/supabase'

const QueueDisplayBoard = ({ branchId, doctorId, autoRefresh = true, refreshInterval = 5000 }) => {
 const [queueData, setQueueData] = useState([])
 const [currentToken, setCurrentToken] = useState(null)
 const [stats, setStats] = useState({
 waiting: 0,
 inProgress: 0,
 completed: 0
 })
 const [loading, setLoading] = useState(true)
 const [lastUpdate, setLastUpdate] = useState(new Date())
 const [announcement, setAnnouncement] = useState(null)

 const fetchQueueData = useCallback(async () => {
 try {
 const today = new Date().toISOString().split('T')[0]
 
 let query = supabase
 .from('queue_tokens')
 .select(`
 *,
 patient:patients(full_name),
 doctor:doctors(full_name, specialization),
 department:departments(name, code)
 `)
 .eq('date', today)
 .in('status', ['waiting', 'called', 'in_consultation'])
 .order('priority', { ascending: true })
 .order('queue_number', { ascending: true })

 if (branchId) {
 query = query.eq('branch_id', branchId)
 }
 if (doctorId) {
 query = query.eq('doctor_id', doctorId)
 }

 const { data, error } = await query

 if (error) throw error

 // Find current token (in_consultation or called)
 const current = data?.find(t => 
 t.status === 'in_consultation' || t.status === 'called'
 )

 // Check if current token changed (for announcement)
 if (current && currentToken && current.id !== currentToken.id) {
 playAnnouncement(current)
 }

 setCurrentToken(current || null)
 setQueueData(data || [])

 // Calculate stats
 const waiting = data?.filter(t => t.status === 'waiting').length || 0
 const inProgress = data?.filter(t => 
 t.status === 'called' || t.status === 'in_consultation'
 ).length || 0

 setStats({
 waiting,
 inProgress,
 completed: 0 // Would need separate query for this
 })

 setLastUpdate(new Date())
 } catch (error) {
 console.error('Error fetching queue data:', error)
 } finally {
 setLoading(false)
 }
 }, [branchId, doctorId, currentToken])

 useEffect(() => {
 fetchQueueData()

 if (autoRefresh) {
 const interval = setInterval(fetchQueueData, refreshInterval)
 return () => clearInterval(interval)
 }
 }, [fetchQueueData, autoRefresh, refreshInterval])

 // Real-time subscription
 useEffect(() => {
 const channel = supabase
 .channel('queue-display')
 .on('postgres_changes', {
 event: '*',
 schema: 'public',
 table: 'queue_tokens'
 }, () => {
 fetchQueueData()
 })
 .subscribe()

 return () => {
 supabase.removeChannel(channel)
 }
 }, [fetchQueueData])

 const playAnnouncement = (token) => {
 setAnnouncement({
 token: token.queue_number,
 room: token.room_number || token.opd_number,
 patient: token.patient?.full_name
 })

 // Text-to-speech announcement
 if ('speechSynthesis' in window) {
 const utterance = new SpeechSynthesisUtterance(
 `Token ${token.queue_number}, please proceed to room ${token.room_number || token.opd_number}`
 )
 utterance.lang = 'en-US'
 utterance.rate = 0.9
 speechSynthesis.speak(utterance)
 }

 // Clear announcement after 10 seconds
 setTimeout(() => setAnnouncement(null), 10000)
 }

 const formatTime = (date) => {
 return new Date(date).toLocaleTimeString('en-US', {
 hour: '2-digit',
 minute: '2-digit',
 second: '2-digit'
 })
 }

 const getNextTokens = () => {
 return queueData
 .filter(t => t.status === 'waiting')
 .slice(0, 5)
 }

 if (loading) {
 return (
 <div className="min-h-screen bg-gradient-to-br from-blue-900 to-blue-700 flex items-center justify-center">
 <div className="text-gray-800 text-4xl animate-pulse">Loading...</div>
 </div>
 )
 }

 return (
 <div className="min-h-screen bg-gradient-to-br from-blue-900 to-blue-700 text-gray-800 p-8">
 {/* Header */}
 <div className="flex justify-between items-center mb-8">
 <div>
 <h1 className="text-4xl font-bold">Queue Display</h1>
 <p className="text-blue-200 text-xl mt-1">
 {branchId ? 'Branch Queue' : doctorId ? 'Doctor Queue' : 'Hospital Queue'}
 </p>
 </div>
 <div className="text-right">
 <div className="text-5xl font-mono font-bold">
 {formatTime(new Date())}
 </div>
 <div className="text-blue-200 mt-1">
 Last updated: {formatTime(lastUpdate)}
 </div>
 </div>
 </div>

 {/* Announcement Banner */}
 {announcement && (
 <div className="bg-yellow-500 text-black rounded-xl p-6 mb-8 animate-pulse">
 <div className="flex items-center justify-center gap-4">
 <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
 </svg>
 <div className="text-center">
 <div className="text-3xl font-bold">NOW SERVING</div>
 <div className="text-5xl font-bold mt-2">{announcement.token}</div>
 <div className="text-2xl mt-1">Room {announcement.room}</div>
 </div>
 <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
 </svg>
 </div>
 </div>
 )}

 {/* Main Content */}
 <div className="grid grid-cols-1 gap-8">
 {/* Current Token */}
 <div className="lg:col-span-2">
 <div className="bg-gray-100 backdrop-blur rounded-2xl p-8">
 <h2 className="text-2xl font-semibold text-blue-200 mb-4">Currently Serving</h2>
 {currentToken ? (
 <div className="text-center py-8">
 <div className="text-8xl font-bold mb-4 animate-pulse">
 {currentToken.queue_number}
 </div>
 <div className="text-3xl text-blue-200">
 {currentToken.doctor?.full_name}
 </div>
 <div className="text-xl text-blue-300 mt-2">
 {currentToken.department?.name}
 </div>
 {currentToken.room_number && (
 <div className="mt-4 inline-block bg-green-500 text-gray-800 px-6 py-2 rounded-full text-xl">
 Room {currentToken.room_number}
 </div>
 )}
 </div>
 ) : (
 <div className="text-center py-12 text-blue-200">
 <svg className="w-24 h-24 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
 </svg>
 <div className="text-2xl">No patient currently being served</div>
 </div>
 )}
 </div>
 </div>

 {/* Stats */}
 <div className="space-y-4">
 <div className="bg-gray-100 backdrop-blur rounded-xl p-6">
 <div className="text-blue-200 text-lg">Waiting</div>
 <div className="text-5xl font-bold mt-2">{stats.waiting}</div>
 </div>
 <div className="bg-gray-100 backdrop-blur rounded-xl p-6">
 <div className="text-blue-200 text-lg">In Progress</div>
 <div className="text-5xl font-bold mt-2">{stats.inProgress}</div>
 </div>
 </div>
 </div>

 {/* Up Next */}
 <div className="mt-8">
 <h2 className="text-2xl font-semibold text-blue-200 mb-4">Coming Up Next</h2>
 <div className="grid grid-cols-1 gap-4">
 {getNextTokens().map((token, index) => (
 <div
 key={token.id}
 className={`bg-gray-100 backdrop-blur rounded-xl p-4 text-center ${
 index === 0 ? 'ring-2 ring-yellow-400' : ''
 }`}
 >
 <div className="text-3xl font-bold">{token.queue_number}</div>
 <div className="text-blue-200 text-sm mt-1">
 {token.department?.name}
 </div>
 {index === 0 && (
 <div className="mt-2 text-yellow-400 text-sm font-medium">
 NEXT UP
 </div>
 )}
 </div>
 ))}
 {getNextTokens().length === 0 && (
 <div className="col-span-5 text-center text-blue-200 py-8">
 No patients in queue
 </div>
 )}
 </div>
 </div>

 {/* Footer */}
 <div className="mt-8 text-center text-blue-300">
 <p>This display auto-refreshes every {refreshInterval / 1000} seconds</p>
 </div>
 </div>
 )
}

export default QueueDisplayBoard


