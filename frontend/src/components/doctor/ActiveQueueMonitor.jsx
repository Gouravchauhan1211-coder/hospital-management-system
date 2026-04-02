import { useMemo } from 'react'
import { Check, X, Eye, Clock, AlertTriangle, Star, User } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { updateAppointment } from '../../services/api'

// Priority configuration
const priorityConfig = {
  emergency: { label: 'High', color: 'error', icon: 'warning' },
  high: { label: 'High', color: 'error', icon: 'warning' },
  vip: { label: 'VIP', color: 'secondary', icon: 'star' },
  medium: { label: 'Medium', color: 'tertiary', icon: 'schedule' },
  standard: { label: 'Standard', color: 'slate', icon: 'person' },
}

// Status configuration
const statusConfig = {
  waiting: { label: 'WAITING', color: 'secondary' },
  urgent: { label: 'URGENT', color: 'error' },
  'in-progress': { label: 'IN PROGRESS', color: 'primary' },
  confirmed: { label: 'CONFIRMED', color: 'primary' },
  pending: { label: 'PENDING', color: 'warning' },
}

const ActiveQueueMonitor = ({ 
  queueItems = [], 
  pendingAppointments = [], 
  onViewFullQueue,
  onAcceptAppointment,
  onRejectAppointment,
  onViewAppointment,
  isLoading = false
}) => {
  // Combine queue items and pending appointments
  const displayItems = useMemo(() => {
    const items = []
    
    // Add queue items (waiting/in-progress)
    queueItems.forEach(item => {
      items.push({
        ...item,
        type: 'queue',
        token: item.token_number ? `A${item.token_number}` : 'A000',
        name: item.patientName || item.patient_name || 'Patient',
        priority: item.priority || 'standard',
        status: item.status === 'in-progress' ? 'in-progress' : 'waiting'
      })
    })
    
    // Add pending appointments
    pendingAppointments.forEach((apt, index) => {
      const patientInitial = apt.patient_name ? apt.patient_name.charAt(0).toUpperCase() : 'P'
      items.push({
        ...apt,
        type: 'pending',
        token: `${patientInitial}${index + 1}`,
        name: apt.patient_name || 'Patient',
        priority: 'medium',
        status: 'pending'
      })
    })
    
    // Sort: pending first, then by priority
    const priorityOrder = { emergency: 0, high: 1, vip: 2, medium: 3, standard: 4 }
    return items.sort((a, b) => {
      // Pending appointments first
      if (a.type === 'pending' && b.type !== 'pending') return -1
      if (b.type === 'pending' && a.type !== 'pending') return 1
      return priorityOrder[a.priority] - priorityOrder[b.priority]
    })
  }, [queueItems, pendingAppointments])

  const waitingCount = displayItems.filter(item => item.status === 'waiting').length
  const pendingCount = pendingAppointments.length

  const handleAccept = async (appointment) => {
    try {
      await updateAppointment(appointment.id, { status: 'confirmed' })
      toast.success('Appointment accepted')
      onAcceptAppointment?.(appointment)
    } catch (error) {
      toast.error('Failed to accept appointment')
    }
  }

  const handleReject = async (appointment) => {
    try {
      await updateAppointment(appointment.id, { status: 'rejected' })
      toast.success('Appointment rejected')
      onRejectAppointment?.(appointment)
    } catch (error) {
      toast.error('Failed to reject appointment')
    }
  }

  const getPriorityStyles = (priority) => {
    switch (priority) {
      case 'emergency':
      case 'high':
        return {
          container: 'bg-red-50 border-l-4 border-red-500',
          badge: 'text-red-600 px-2 py-1 bg-red-100 rounded-lg',
          text: 'text-red-600',
          icon: 'bg-red-500 text-white'
        }
      case 'vip':
        return {
          container: 'bg-white hover:bg-gray-50 transition-colors group border border-gray-200',
          badge: 'text-amber-600 px-2 py-1 bg-amber-100 rounded-lg',
          text: 'text-gray-900 group-hover:text-blue-600 transition-colors',
          icon: 'bg-amber-400 text-amber-900'
        }
      case 'medium':
        return {
          container: 'bg-white hover:bg-gray-50 transition-colors group border border-gray-200',
          badge: 'text-blue-600 px-2 py-1 bg-blue-100 rounded-lg',
          text: 'text-gray-900 group-hover:text-blue-600 transition-colors',
          icon: 'bg-teal-400 text-teal-900'
        }
      default:
        return {
          container: 'bg-white hover:bg-gray-50 transition-colors group border border-gray-200',
          badge: 'text-gray-600 px-2 py-1 bg-gray-100 rounded-lg',
          text: 'text-gray-900 group-hover:text-blue-600 transition-colors',
          icon: 'bg-gray-300 text-gray-600'
        }
    }
  }

  return (
    <div className="lg:col-span-5">
      <div className="bg-white rounded-[2rem] p-8 shadow-lg border border-gray-300 h-full">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h3 className="font-bold text-xl text-gray-900 mb-1">Active Queue Monitor</h3>
            {pendingCount > 0 && (
              <span className="text-[10px] text-orange-600 font-bold">
                {pendingCount} pending request{pendingCount > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <span className="text-gray-600 font-bold text-xs bg-gray-200 px-3 py-1 rounded-full">
            {waitingCount} Waiting
          </span>
        </div>

        {/* Queue Items */}
        <div className="space-y-4 max-h-[400px] overflow-y-auto">
          {displayItems.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <User className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="font-medium">No patients in queue</p>
              <p className="text-xs">Queue is empty</p>
            </div>
          ) : (
            displayItems.slice(0, 4).map((item, index) => {
              const priorityInfo = priorityConfig[item.priority] || priorityConfig.standard
              const statusInfo = statusConfig[item.status] || statusConfig.waiting
              const styles = getPriorityStyles(item.priority)
              const PriorityIcon = priorityInfo.icon

              return (
                <div 
                  key={item.id || index} 
                  className={`flex items-center justify-between p-4 rounded-2xl ${styles.container}`}
                >
                  <div className="flex items-center gap-4">
                    {/* Token Number */}
                    <div className={`w-12 h-12 rounded-xl ${styles.icon} flex items-center justify-center font-bold text-sm`}>
                      {item.token}
                    </div>
                    
                    {/* Patient Info */}
                    <div>
                      <p className={`font-bold ${styles.text}`}>{item.name}</p>
                      <p className={`text-[10px] uppercase font-bold tracking-widest ${item.priority === 'emergency' || item.priority === 'high' ? 'text-red-600' : 'text-gray-500'}`}>
                        Priority: {priorityInfo.label}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Status Badge */}
                    <span className={`text-[10px] font-extrabold ${styles.badge}`}>
                      {statusInfo.label}
                    </span>

                    {/* Action Buttons for Pending */}
                    {item.type === 'pending' && (
                      <div className="flex gap-1 ml-2">
                        <button
                          onClick={() => handleAccept(item)}
                          className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors"
                          title="Accept"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleReject(item)}
                          className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                          title="Reject"
                        >
                          <X className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onViewAppointment?.(item)}
                          className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* View Full Queue Button */}
        <button 
          onClick={onViewFullQueue}
          className="w-full mt-6 py-4 border-2 border-dashed border-gray-300 rounded-2xl text-gray-600 font-bold text-sm hover:border-blue-400 hover:text-blue-600 transition-all"
        >
          View Full Queue ({displayItems.length})
        </button>
      </div>
    </div>
  )
}

export default ActiveQueueMonitor
