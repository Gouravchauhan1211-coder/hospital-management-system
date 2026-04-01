import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../services/supabase'

const QueueContext = createContext(null)

// Provider component
export const QueueProvider = ({ children }) => {
  // Global queue state
  const [queue, setQueue] = useState({
    appointmentQueue: [],
    walkInQueue: [],
    stats: {
      waiting: 0,
      inProgress: 0,
      completed: 0
    }
  })

  // Active patient state
  const [activePatient, setActivePatient] = useState(null)
  
  // Consultation state
  const [consultationState, setConsultationState] = useState({
    status: 'idle', // idle, in-progress, paused, completed
    currentPatientId: null,
    startTime: null,
    pausedAt: null
  })

  // Subscriptions
  const [subscriptions, setSubscriptions] = useState({})

  // Subscribe to queue updates for a specific doctor
  const subscribeToDoctorQueue = useCallback(async (doctorId) => {
    if (!doctorId) return

    // Clean up existing subscription for this doctor
    const existingChannel = subscriptions[doctorId]
    if (existingChannel) {
      supabase.removeChannel(existingChannel)
    }

    const channel = supabase
      .channel(`global-queue-${doctorId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointment_queue',
          filter: `doctor_id=eq.${doctorId}`
        },
        (payload) => {
          const { eventType, new: newRecord, old: oldRecord } = payload
          handleQueueUpdate(eventType, newRecord, oldRecord)
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'walk_in_queue',
          filter: `doctor_id=eq.${doctorId}`
        },
        (payload) => {
          const { eventType, new: newRecord, old: oldRecord } = payload
          handleWalkInUpdate(eventType, newRecord, oldRecord)
        }
      )
      .subscribe((status) => {
        console.log(`Global queue subscription status for ${doctorId}: ${status}`)
      })

    setSubscriptions(prev => ({ ...prev, [doctorId]: channel }))
    return channel
  }, [subscriptions])

  // Handle queue updates
  const handleQueueUpdate = useCallback((eventType, newRecord, oldRecord) => {
    setQueue(prev => {
      const currentQueue = [...prev.appointmentQueue]

      switch (eventType) {
        case 'INSERT':
          // Add new entry to queue
          return {
            ...prev,
            appointmentQueue: [...currentQueue, newRecord].sort((a, b) => 
              (a.token_number || a.created_at) > (b.token_number || b.created_at) ? 1 : -1
            )
          }

        case 'UPDATE':
          // Update existing entry
          const updatedQueue = currentQueue.map(item => 
            item.id === newRecord.id ? newRecord : item
          )
          
          // Handle consultation state changes
          if (newRecord.status === 'in-progress') {
            setConsultationState({
              status: 'in-progress',
              currentPatientId: newRecord.patient_id,
              startTime: newRecord.consultation_started_at,
              pausedAt: null
            })
            setActivePatient(newRecord)
          } else if (newRecord.status === 'completed') {
            setConsultationState({
              status: 'completed',
              currentPatientId: null,
              startTime: null,
              pausedAt: null
            })
            setActivePatient(null)
          }
          
          return { ...prev, appointmentQueue: updatedQueue }

        case 'DELETE':
          // Remove entry
          return {
            ...prev,
            appointmentQueue: currentQueue.filter(item => item.id !== oldRecord.id)
          }

        default:
          return prev
      }
    })

    // Update stats
    updateQueueStats()
  }, [])

  // Handle walk-in queue updates
  const handleWalkInUpdate = useCallback((eventType, newRecord, oldRecord) => {
    setQueue(prev => {
      const currentQueue = [...prev.walkInQueue]

      switch (eventType) {
        case 'INSERT':
          return { ...prev, walkInQueue: [...currentQueue, newRecord] }

        case 'UPDATE':
          return {
            ...prev,
            walkInQueue: currentQueue.map(item => 
              item.id === newRecord.id ? newRecord : item
            )
          }

        case 'DELETE':
          return {
            ...prev,
            walkInQueue: currentQueue.filter(item => item.id !== oldRecord.id)
          }

        default:
          return prev
      }
    })
  }, [])

  // Update queue stats
  const updateQueueStats = useCallback(() => {
    setQueue(prev => {
      const waiting = prev.appointmentQueue.filter(q => q.status === 'waiting').length
      const inProgress = prev.appointmentQueue.filter(q => q.status === 'in-progress').length
      const completed = prev.appointmentQueue.filter(q => q.status === 'completed').length
      
      return {
        ...prev,
        stats: { waiting, inProgress, completed }
      }
    })
  }, [])

  // Subscribe to appointments for real-time updates
  const subscribeToAppointments = useCallback((filter = null) => {
    const channel = supabase
      .channel('global-appointments')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: filter || undefined
        },
        (payload) => {
          console.log('Appointment update received:', payload)
          // Emit event for listeners
          window.dispatchEvent(new CustomEvent('appointment-update', { detail: payload }))
        }
      )
      .subscribe()

    return channel
  }, [])

  // Subscribe to consultations for real-time updates
  const subscribeToConsultations = useCallback((doctorId) => {
    if (!doctorId) return

    const channel = supabase
      .channel('global-consultations')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'consultations',
          filter: `doctor_id=eq.${doctorId}`
        },
        (payload) => {
          console.log('Consultation update received:', payload)
          window.dispatchEvent(new CustomEvent('consultation-update', { detail: payload }))
        }
      )
      .subscribe()

    return channel
  }, [])

  // Update queue position for a patient
  const updateQueuePosition = useCallback((patientId, newPosition) => {
    setQueue(prev => ({
      ...prev,
      appointmentQueue: prev.appointmentQueue.map(item => 
        item.patient_id === patientId ? { ...item, queue_position: newPosition } : item
      )
    }))
  }, [])

  // Remove patient from queue
  const removeFromQueue = useCallback((patientId) => {
    setQueue(prev => ({
      ...prev,
      appointmentQueue: prev.appointmentQueue.filter(item => item.patient_id !== patientId)
    }))
  }, [])

  // Pause consultation
  const pauseConsultation = useCallback(() => {
    setConsultationState(prev => ({
      ...prev,
      status: 'paused',
      pausedAt: new Date().toISOString()
    }))
  }, [])

  // Resume consultation
  const resumeConsultation = useCallback(() => {
    setConsultationState(prev => ({
      ...prev,
      status: 'in-progress',
      pausedAt: null
    }))
  }, [])

  // Stop consultation
  const stopConsultation = useCallback(async (patientId, duration) => {
    try {
      // Update consultation state
      setConsultationState({
        status: 'completed',
        currentPatientId: null,
        startTime: null,
        pausedAt: null
      })
      
      setActivePatient(null)

      // Notify next patient (broadcast event)
      window.dispatchEvent(new CustomEvent('next-patient-notification', { 
        detail: { completedPatientId: patientId, duration }
      }))

      return { success: true }
    } catch (error) {
      console.error('Error stopping consultation:', error)
      return { success: false, error }
    }
  }, [])

  // Get queue for specific doctor
  const getDoctorQueue = useCallback((doctorId) => {
    return queue.appointmentQueue.filter(q => q.doctor_id === doctorId)
  }, [queue])

  // Get patient position in queue
  const getPatientPosition = useCallback((patientId) => {
    const waitingQueue = queue.appointmentQueue.filter(q => q.status === 'waiting')
    const position = waitingQueue.findIndex(q => q.patient_id === patientId)
    return position >= 0 ? position + 1 : null
  }, [queue])

  // Get estimated wait time for patient
  const getEstimatedWaitTime = useCallback((patientId, avgConsultTime = 15) => {
    const position = getPatientPosition(patientId)
    if (!position) return 0
    return (position - 1) * avgConsultTime
  }, [getPatientPosition])

  // Value object to provide to consumers
  const value = {
    // State
    queue,
    activePatient,
    consultationState,
    subscriptions,

    // Functions
    subscribeToDoctorQueue,
    subscribeToAppointments,
    subscribeToConsultations,
    updateQueuePosition,
    removeFromQueue,
    pauseConsultation,
    resumeConsultation,
    stopConsultation,
    getDoctorQueue,
    getPatientPosition,
    getEstimatedWaitTime,
    
    // Helpers
    refreshQueue: updateQueueStats
  }

  return (
    <QueueContext.Provider value={value}>
      {children}
    </QueueContext.Provider>
  )
}

// Hook to use queue context
export const useQueue = () => {
  const context = useContext(QueueContext)
  if (!context) {
    throw new Error('useQueue must be used within a QueueProvider')
  }
  return context
}

export default QueueContext