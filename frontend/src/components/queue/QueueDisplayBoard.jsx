import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Users, Clock, ChevronRight, Activity, 
  Phone, CheckCircle, AlertCircle, XCircle,
  Wifi
} from 'lucide-react'
import { getDisplayBoard } from '../../services/queueApi'
import { useDisplayBoard } from '../../hooks/useQueueSubscription'

const QueueDisplayBoard = ({ branchId, departmentId, doctorId, autoRefresh = true, refreshInterval = 5000 }) => {
  // Use the real-time hook if doctorId is provided, otherwise use polling
  const { 
    displayData, 
    isLoading, 
    error, 
    lastUpdated, 
    isSubscribed,
    refresh 
  } = doctorId ? useDisplayBoard(doctorId) : {
    displayData: null,
    isLoading: true,
    error: null,
    lastUpdated: null,
    isSubscribed: false,
    refresh: () => {}
  }

  // Fallback to polling if no real-time subscription
  const [fallbackData, setFallbackData] = useState(null)
  const [fallbackLoading, setFallbackLoading] = useState(!doctorId)
  const [fallbackError, setFallbackError] = useState(null)
  const [fallbackLastUpdated, setFallbackLastUpdated] = useState(null)

  const fetchData = async () => {
    try {
      const data = await getDisplayBoard(branchId, departmentId)
      setFallbackData(data)
      setFallbackLastUpdated(new Date())
      setFallbackError(null)
    } catch (err) {
      setFallbackError(err.message)
    } finally {
      setFallbackLoading(false)
    }
  }

  useEffect(() => {
    if (!doctorId) {
      fetchData()
      
      if (autoRefresh) {
        const interval = setInterval(fetchData, refreshInterval)
        return () => clearInterval(interval)
      }
    }
  }, [branchId, departmentId, autoRefresh, refreshInterval, doctorId])

  // Use fallback data if no doctorId
  const activeData = doctorId ? displayData : fallbackData
  const loading = doctorId ? isLoading : fallbackLoading
  const activeError = doctorId ? error : fallbackError
  const activeLastUpdated = doctorId ? lastUpdated : fallbackLastUpdated

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  if (activeError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
        <p className="text-red-700">Failed to load display board</p>
        <p className="text-red-500 text-sm mt-1">{activeError}</p>
        <button 
          onClick={refresh || fetchData}
          className="mt-4 px-4 py-2 bg-red-500 text-gray-800 rounded-lg hover:bg-red-600"
        >
          Retry
        </button>
      </div>
    )
  }

  const { current_token, upcoming_tokens, queue_summary, last_updated } = activeData || {}

  return (
    <div className="bg-white rounded-2xl shadow-medical-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-500 to-primary-600 px-6 py-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Activity className="w-6 h-6" />
            Queue Display Board
          </h2>
          <div className="text-gray-700 text-sm flex items-center gap-3">
            {/* Real-time indicator */}
            {doctorId && (
              <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                isSubscribed 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-gray-200 text-gray-600'
              }`}>
                <Wifi className="w-3 h-3" />
                {isSubscribed ? 'Live' : 'Connecting...'}
              </div>
            )}
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {activeLastUpdated ? activeLastUpdated.toLocaleTimeString() : 'Loading...'}
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Stats Bar */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-amber-50 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-amber-600">{queue_summary?.waiting || 0}</div>
            <div className="text-amber-700 text-sm">Waiting</div>
          </div>
          <div className="bg-blue-50 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{queue_summary?.called || 0}</div>
            <div className="text-blue-700 text-sm">Called</div>
          </div>
          <div className="bg-purple-50 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">{queue_summary?.in_consultation || 0}</div>
            <div className="text-purple-700 text-sm">In Progress</div>
          </div>
          <div className="bg-emerald-50 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-emerald-600">
              {queue_summary?.avg_wait_minutes || 0}
            </div>
            <div className="text-emerald-700 text-sm">Avg Wait (min)</div>
          </div>
        </div>

        {/* Current Token */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <Users className="w-5 h-5 text-primary-500" />
            Currently Serving
          </h3>
          {current_token ? (
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl p-6 text-gray-800"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-700 mb-1">Token Number</div>
                  <div className="text-5xl font-bold mb-2">{current_token.queue_number}</div>
                  <div className="text-lg">{current_token.patient_name}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-700 mb-1">Doctor</div>
                  <div className="text-xl font-semibold mb-2">{current_token.doctor_name}</div>
                  <div className="bg-white/20 rounded-lg px-4 py-2">
                    Room {current_token.room_number}
                  </div>
                  <div className="text-sm text-gray-700 mt-2">
                    {current_token.elapsed_minutes} min elapsed
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="bg-gray-100 rounded-2xl p-8 text-center">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">No patient currently being served</p>
            </div>
          )}
        </div>

        {/* Upcoming Tokens */}
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <ChevronRight className="w-5 h-5 text-primary-500" />
            Up Next
          </h3>
          <div className="space-y-2">
            {upcoming_tokens && upcoming_tokens.length > 0 ? (
              upcoming_tokens.map((token, index) => (
                <motion.div
                  key={token.queue_number}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between bg-gray-50 rounded-xl p-4"
                >
                  <div className="flex items-center gap-4">
                    <div className={`
                      w-10 h-10 rounded-full flex items-center justify-center font-bold text-gray-800
                      ${token.priority === 'emergency' ? 'bg-red-500' : 
                        token.priority === 'high' ? 'bg-orange-500' : 'bg-primary-500'}
                    `}>
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-800">
                        {token.queue_number}
                      </div>
                      <div className="text-sm text-gray-500">{token.patient_name}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {token.priority !== 'normal' && (
                      <span className={`
                        px-2 py-1 rounded-full text-xs font-medium
                        ${token.priority === 'emergency' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}
                      `}>
                        {token.priority}
                      </span>
                    )}
                    <span className="text-gray-500 text-sm flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {token.wait_minutes} min
                    </span>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <CheckCircle className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                <p>No patients waiting</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-gray-200 text-center text-gray-400 text-sm">
          Last updated: {activeLastUpdated ? activeLastUpdated.toLocaleTimeString() : 'Loading...'}
        </div>
      </div>
    </div>
  )
}

export default QueueDisplayBoard


