/**
 * Priority Queue Display Component
 * Shows patients with their priority scores in the queue
 */

import { useState } from 'react'
import { 
  ArrowUp, 
  ArrowDown, 
  Pause, 
  Clock, 
  AlertTriangle, 
  Star,
  User,
  Phone,
  MoreVertical,
  ChevronDown,
  X
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  QUEUE_STATUS, 
  PRIORITY_LEVELS,
  formatMinutes,
  getMinutesBetween,
  getCurrentIST
} from '../../services/queueEngine'

// Priority badge colors
const priorityColors = {
  emergency: 'bg-red-500 text-white',
  urgent: 'bg-orange-500 text-white',
  high: 'bg-yellow-500 text-white',
  normal: 'bg-slate-200 text-slate-700',
  low: 'bg-slate-100 text-slate-500'
}

// Status badge colors
const statusColors = {
  waiting: 'bg-blue-100 text-blue-700',
  called: 'bg-purple-100 text-purple-700',
  in_progress: 'bg-green-100 text-green-700',
  hold: 'bg-orange-100 text-orange-700',
  checked_in: 'bg-teal-100 text-teal-700'
}

const PriorityQueueDisplay = ({
  queue = [],
  onCallPatient,
  onMoveUp,
  onMoveDown,
  onHold,
  onChangePriority,
  showPriorityScore = true,
  showActions = true,
  compact = false
}) => {
  const [expandedPatient, setExpandedPatient] = useState(null)
  const [showPriorityMenu, setShowPriorityMenu] = useState(null)

  const currentTime = getCurrentIST()

  // Get wait time for a patient
  const getWaitTime = (patient) => {
    const checkedIn = patient.checked_in_at || patient.created_at
    return getMinutesBetween(currentTime, checkedIn)
  }

  // Get priority label
  const getPriorityLabel = (priority) => {
    return PRIORITY_LEVELS[priority?.toUpperCase()] || 'normal'
  }

  // Get status label
  const getStatusLabel = (status) => {
    const labels = {
      waiting: 'Waiting',
      called: 'Called',
      in_progress: 'In Progress',
      hold: 'On Hold',
      checked_in: 'Checked In'
    }
    return labels[status] || status
  }

  if (queue.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <User className="w-12 h-12 mx-auto mb-2 opacity-50" />
        <p>No patients in queue</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {queue.map((patient, index) => {
        const waitTime = getWaitTime(patient)
        const isExpanded = expandedPatient === patient.id
        const isPriorityMenuOpen = showPriorityMenu === patient.id

        return (
          <motion.div
            key={patient.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`
              bg-white rounded-xl border transition-all duration-200
              ${patient.status === 'in_progress' ? 'border-green-300 bg-green-50' : 'border-gray-100'}
              ${patient.priority === 'emergency' ? 'ring-2 ring-red-500 ring-opacity-50' : ''}
              hover:shadow-md
            `}
          >
            {/* Main Row */}
            <div 
              className="p-3 cursor-pointer"
              onClick={() => setExpandedPatient(isExpanded ? null : patient.id)}
            >
              <div className="flex items-center justify-between">
                {/* Patient Info */}
                <div className="flex items-center gap-3 flex-1">
                  {/* Queue Position */}
                  <div className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                    ${patient.status === 'in_progress' ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-700'}
                  `}>
                    {index + 1}
                  </div>

                  {/* Name and Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900 truncate">
                        {patient.patientName || patient.patient_name || 'Unknown'}
                      </span>
                      {patient.is_vip && (
                        <Star className="w-4 h-4 text-yellow-500 fill-current" />
                      )}
                      {patient.skip_count > 0 && (
                        <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded">
                          Skipped {patient.skip_count}x
                        </span>
                      )}
                    </div>
                    
                    {!compact && (
                      <div className="flex items-center gap-2 mt-0.5">
                        {/* Priority Badge */}
                        <span className={`
                          text-xs px-2 py-0.5 rounded-full font-medium
                          ${priorityColors[patient.priority] || priorityColors.normal}
                        `}>
                          {getPriorityLabel(patient.priority)}
                        </span>
                        
                        {/* Wait Time */}
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatMinutes(waitTime)}
                        </span>

                        {/* Status */}
                        <span className={`
                          text-xs px-2 py-0.5 rounded-full
                          ${statusColors[patient.status] || statusColors.waiting}
                        `}>
                          {getStatusLabel(patient.status)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Side - Score & Actions */}
                <div className="flex items-center gap-2">
                  {/* Priority Score */}
                  {showPriorityScore && (
                    <div className="text-right">
                      <div className="text-xs text-gray-500">Score</div>
                      <div className={`
                        text-lg font-bold
                        ${patient.priority_score > 500 ? 'text-red-600' : 
                          patient.priority_score > 200 ? 'text-orange-600' : 'text-gray-700'}
                      `}>
                        {patient.priority_score}
                      </div>
                    </div>
                  )}

                  {/* Expand Icon */}
                  <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </div>
              </div>
            </div>

            {/* Expanded Details */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="border-t border-gray-100 bg-gray-50 rounded-b-xl overflow-hidden"
                >
                  <div className="p-3 space-y-3">
                    {/* Details Grid */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-xs text-gray-500">Token #</span>
                        <p className="font-medium">{patient.token_number}</p>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500">Source</span>
                        <p className="font-medium capitalize">{patient.source || 'Walk-in'}</p>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500">Wait Time</span>
                        <p className="font-medium">{formatMinutes(waitTime)}</p>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500">Est. Position Time</span>
                        <p className="font-medium">
                          {patient.estimated_wait_time ? formatMinutes(patient.estimated_wait_time) : '--'}
                        </p>
                      </div>
                    </div>

                    {/* Priority Score Breakdown */}
                    {showPriorityScore && (
                      <div className="bg-white rounded-lg p-3">
                        <span className="text-xs text-gray-500 block mb-2">Priority Breakdown</span>
                        <div className="flex flex-wrap gap-2 text-xs">
                          <span className="bg-gray-100 px-2 py-1 rounded">
                            Base: {PRIORITY_LEVELS[patient.priority?.toUpperCase()] || 0}
                          </span>
                          <span className="bg-blue-100 px-2 py-1 rounded">
                            Wait: +{waitTime * 2}
                          </span>
                          {patient.is_vip && (
                            <span className="bg-yellow-100 px-2 py-1 rounded">
                              VIP: +300
                            </span>
                          )}
                          {patient.checked_in_at && (
                            <span className="bg-green-100 px-2 py-1 rounded">
                              Present: +200
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    {showActions && patient.status !== 'in_progress' && patient.status !== 'completed' && (
                      <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-200">
                        {/* Call Patient */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            onCallPatient?.(patient)
                          }}
                          className="flex-1 bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-1"
                        >
                          <Phone className="w-4 h-4" />
                          Call Patient
                        </button>

                        {/* Move Up */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            onMoveUp?.(patient.id)
                          }}
                          disabled={index === 0}
                          className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg disabled:opacity-50"
                        >
                          <ArrowUp className="w-4 h-4" />
                        </button>

                        {/* Move Down */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            onMoveDown?.(patient.id)
                          }}
                          disabled={index === queue.length - 1}
                          className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg disabled:opacity-50"
                        >
                          <ArrowDown className="w-4 h-4" />
                        </button>

                        {/* Hold */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            onHold?.(patient.id)
                          }}
                          className="p-2 bg-orange-100 hover:bg-orange-200 rounded-lg"
                        >
                          <Pause className="w-4 h-4 text-orange-600" />
                        </button>

                        {/* Priority Menu */}
                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setShowPriorityMenu(isPriorityMenuOpen ? null : patient.id)
                            }}
                            className="p-2 bg-purple-100 hover:bg-purple-200 rounded-lg"
                          >
                            <AlertTriangle className="w-4 h-4 text-purple-600" />
                          </button>
                          
                          {isPriorityMenuOpen && (
                            <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border py-1 z-10 min-w-32">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onChangePriority?.(patient.id, 'emergency')
                                  setShowPriorityMenu(null)
                                }}
                                className="w-full text-left px-3 py-2 text-sm hover:bg-red-50 text-red-600"
                              >
                                🚨 Emergency
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onChangePriority?.(patient.id, 'urgent')
                                  setShowPriorityMenu(null)
                                }}
                                className="w-full text-left px-3 py-2 text-sm hover:bg-orange-50 text-orange-600"
                              >
                                ⚠️ Urgent
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onChangePriority?.(patient.id, 'high')
                                  setShowPriorityMenu(null)
                                }}
                                className="w-full text-left px-3 py-2 text-sm hover:bg-yellow-50 text-yellow-600"
                              >
                                🔼 High
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onChangePriority?.(patient.id, 'normal')
                                  setShowPriorityMenu(null)
                                }}
                                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                              >
                                ➖ Normal
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onChangePriority?.(patient.id, 'low')
                                  setShowPriorityMenu(null)
                                }}
                                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 text-gray-500"
                              >
                                🔽 Low
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )
      })}
    </div>
  )
}

export default PriorityQueueDisplay
