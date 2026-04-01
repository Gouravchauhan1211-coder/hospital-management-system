/**
 * Queue Metrics Panel Component
 * Shows real-time queue statistics for Doctor/Mediator dashboards
 */

import { 
  Users, 
  Clock, 
  AlertTriangle, 
  CheckCircle,
  Activity,
  Zap,
  TrendingUp,
  TrendingDown
} from 'lucide-react'
import { motion } from 'framer-motion'
import { 
  QUEUE_CONFIG, 
  DOCTOR_STATUS,
  isWithinWorkingHours,
  formatMinutes
} from '../../services/queueEngine'

const QueueMetricsPanel = ({
  metrics = {},
  doctorStatus = DOCTOR_STATUS.AVAILABLE,
  avgConsultationTime = 15,
  onStatusChange,
  compact = false
}) => {
  const {
    totalWaiting = 0,
    averageWaitTime = 0,
    capacity = { isFull: false, currentCount: 0, maxCapacity: 50 },
    canAcceptNewPatients = true,
    fairnessIssues = null
  } = metrics

  const inWorkingHours = isWithinWorkingHours()

  const getStatusColor = () => {
    switch (doctorStatus) {
      case DOCTOR_STATUS.AVAILABLE:
        return 'bg-green-500'
      case DOCTOR_STATUS.IN_CONSULTATION:
        return 'bg-blue-500'
      case DOCTOR_STATUS.ON_BREAK:
        return 'bg-yellow-500'
      case DOCTOR_STATUS.OFFLINE:
        return 'bg-gray-500'
      default:
        return 'bg-gray-500'
    }
  }

  const getStatusLabel = () => {
    switch (doctorStatus) {
      case DOCTOR_STATUS.AVAILABLE:
        return 'Available'
      case DOCTOR_STATUS.IN_CONSULTATION:
        return 'In Consultation'
      case DOCTOR_STATUS.ON_BREAK:
        return 'On Break'
      case DOCTOR_STATUS.OFFLINE:
        return 'Offline'
      default:
        return 'Unknown'
    }
  }

  const getCapacityPercentage = () => {
    return Math.round((capacity.currentCount / capacity.maxCapacity) * 100)
  }

  const getCapacityColor = () => {
    const percentage = getCapacityPercentage()
    if (percentage >= 90) return 'text-red-600'
    if (percentage >= 70) return 'text-orange-600'
    return 'text-green-600'
  }

  if (compact) {
    return (
      <div className="flex items-center gap-4">
        {/* Waiting Count */}
        <div className="flex items-center gap-1.5">
          <Users className="w-4 h-4 text-gray-500" />
          <span className="font-semibold">{totalWaiting}</span>
          <span className="text-xs text-gray-500">waiting</span>
        </div>

        {/* Avg Wait */}
        <div className="flex items-center gap-1.5">
          <Clock className="w-4 h-4 text-gray-500" />
          <span className="font-semibold">{formatMinutes(averageWaitTime)}</span>
        </div>

        {/* Status */}
        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full ${getStatusColor()} bg-opacity-10`}>
          <div className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
          <span className={`text-xs font-medium ${getStatusColor().replace('bg-', 'text-')}`}>
            {getStatusLabel()}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {/* Waiting Patients */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm"
      >
        <div className="flex items-center justify-between mb-2">
          <Users className="w-5 h-5 text-blue-500" />
          <span className="text-xs text-gray-500">Waiting</span>
        </div>
        <div className="text-2xl font-bold text-gray-900">{totalWaiting}</div>
        <div className="text-xs text-gray-500 mt-1">patients in queue</div>
      </motion.div>

      {/* Average Wait Time */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm"
      >
        <div className="flex items-center justify-between mb-2">
          <Clock className="w-5 h-5 text-purple-500" />
          <span className="text-xs text-gray-500">Avg. Wait</span>
        </div>
        <div className="text-2xl font-bold text-gray-900">{formatMinutes(averageWaitTime)}</div>
        <div className="text-xs text-gray-500 mt-1">per patient</div>
      </motion.div>

      {/* Queue Capacity */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm"
      >
        <div className="flex items-center justify-between mb-2">
          <Activity className={`w-5 h-5 ${getCapacityColor()}`} />
          <span className="text-xs text-gray-500">Capacity</span>
        </div>
        <div className={`text-2xl font-bold ${getCapacityColor()}`}>
          {capacity.currentCount}/{capacity.maxCapacity}
        </div>
        <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2">
          <div 
            className={`h-1.5 rounded-full transition-all ${
              capacity.isFull ? 'bg-red-500' : 
              getCapacityPercentage() > 70 ? 'bg-orange-500' : 'bg-green-500'
            }`}
            style={{ width: `${getCapacityPercentage()}%` }}
          />
        </div>
      </motion.div>

      {/* Doctor Status */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3 }}
        className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm"
      >
        <div className="flex items-center justify-between mb-2">
          <div className={`w-3 h-3 rounded-full ${getStatusColor()} animate-pulse`} />
          <span className="text-xs text-gray-500">Status</span>
        </div>
        
        {/* Status Selector */}
        <select
          value={doctorStatus}
          onChange={(e) => onStatusChange?.(e.target.value)}
          className={`
            w-full mt-1 px-2 py-1.5 rounded-lg text-sm font-medium border-0 
            cursor-pointer focus:ring-2 focus:ring-offset-1
            ${getStatusColor().replace('bg-', 'bg-opacity-20 text-')}
          `}
          style={{
            backgroundColor: getStatusColor() + '20',
            color: getStatusColor().replace('bg-', '')
          }}
        >
          <option value={DOCTOR_STATUS.AVAILABLE}>🟢 Available</option>
          <option value={DOCTOR_STATUS.IN_CONSULTATION}>🔵 In Consultation</option>
          <option value={DOCTOR_STATUS.ON_BREAK}>🟡 On Break</option>
          <option value={DOCTOR_STATUS.OFFLINE}>⚫ Offline</option>
        </select>

        {/* Working Hours Indicator */}
        <div className="flex items-center gap-1 mt-2">
          {inWorkingHours ? (
            <>
              <Zap className="w-3 h-3 text-green-500" />
              <span className="text-xs text-green-600">Within working hours</span>
            </>
          ) : (
            <>
              <AlertTriangle className="w-3 h-3 text-red-500" />
              <span className="text-xs text-red-600">Outside working hours</span>
            </>
          )}
        </div>
      </motion.div>

      {/* Fairness Alert */}
      {fairnessIssues?.hasUnfairSkips && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="col-span-full bg-orange-50 border border-orange-200 rounded-xl p-3 flex items-center gap-3"
        >
          <AlertTriangle className="w-5 h-5 text-orange-500" />
          <div className="flex-1">
            <span className="font-medium text-orange-700">Fairness Alert</span>
            <span className="text-orange-600 text-sm ml-2">
              {fairnessIssues.patientsToBoost?.length || 0} patient(s) skipped too many times
            </span>
          </div>
          <button className="text-xs bg-orange-500 text-white px-3 py-1.5 rounded-lg hover:bg-orange-600">
            Review
          </button>
        </motion.div>
      )}

      {/* Not Accepting New Patients */}
      {!canAcceptNewPatients && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="col-span-full bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-3"
        >
          <AlertTriangle className="w-5 h-5 text-red-500" />
          <div className="flex-1">
            <span className="font-medium text-red-700">Not Accepting New Patients</span>
            <span className="text-red-600 text-sm ml-2">
              Doctor's working hours ending or queue at capacity
            </span>
          </div>
        </motion.div>
      )}
    </div>
  )
}

export default QueueMetricsPanel
