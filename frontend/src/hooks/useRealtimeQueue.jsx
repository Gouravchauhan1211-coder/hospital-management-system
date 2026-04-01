import { useEffect, useCallback, useRef, useState } from 'react'
import { supabase } from '../services/supabase'

/**
 * Enhanced realtime subscription hook for queue management
 * Handles all core events: appointment approval, check-in, queue position changes,
 * consultation start/pause/stop, and next patient notification
 */
export const useRealtimeQueue = (options = {}) => {
  const {
    doctorId,
    patientId,
    onAppointmentApproved,
    onPatientCheckedIn,
    onQueuePositionChange,
    onConsultationStart,
    onConsultationPause,
    onConsultationStop,
    onNextPatient,
    initialFetch = true
  } = options

  const [isSubscribed, setIsSubscribed] = useState(false)
  const [subscriptionError, setSubscriptionError] = useState(null)
  const channelRef = useRef(null)
  
  // Track previous positions for detecting changes
  const previousPositionsRef = useRef({})

  // Subscribe to all required tables
  useEffect(() => {
    if (!doctorId && !patientId) return

    // Clean up previous subscription
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
    }

    // Build filter conditions
    const queueFilters = []
    if (doctorId) {
      queueFilters.push(`doctor_id=eq.${doctorId}`)
    }

    // Create combined channel for all queue-related updates
    const channel = supabase
      .channel(`realtime-queue-${doctorId || patientId}-${Date.now()}`)

    // Subscribe to appointment_queue changes
    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'appointment_queue',
        filter: queueFilters.length > 0 ? queueFilters.join(',') : undefined
      },
      (payload) => {
        handleQueueChange(payload)
      }
    )

    // Subscribe to walk_in_queue changes
    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'walk_in_queue',
        filter: queueFilters.length > 0 ? queueFilters.join(',') : undefined
      },
      (payload) => {
        handleWalkInChange(payload)
      }
    )

    // Subscribe to appointments for approval status changes
    if (patientId) {
      channel.on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'appointments',
          filter: `patient_id=eq.${patientId}`
        },
        (payload) => {
          handleAppointmentChange(payload)
        }
      )
    }

    // Subscribe to consultations table
    if (doctorId) {
      channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'consultations',
          filter: `doctor_id=eq.${doctorId}`
        },
        (payload) => {
          handleConsultationChange(payload)
        }
      )
    }

    // Subscribe to the channel
    channel.subscribe((status) => {
      console.log(`Realtime queue subscription status: ${status}`)
      setIsSubscribed(status === 'SUBSCRIBED')
      if (status === 'CHANNEL_ERROR') {
        setSubscriptionError('Failed to subscribe to queue updates')
      }
    })

    channelRef.current = channel

    // Cleanup on unmount
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
    }
  }, [doctorId, patientId])

  // Handle appointment_queue changes
  const handleQueueChange = useCallback((payload) => {
    const { eventType, new: newRecord, old: oldRecord } = payload

    console.log('Queue change detected:', eventType, newRecord)

    switch (eventType) {
      case 'INSERT':
        // New patient added to queue
        if (onPatientCheckedIn) {
          onPatientCheckedIn(newRecord)
        }
        break

      case 'UPDATE':
        // Check for status changes
        const oldStatus = oldRecord?.status
        const newStatus = newRecord.status

        // Check-in detection (status changed to 'waiting')
        if (oldStatus !== 'waiting' && newStatus === 'waiting') {
          if (onPatientCheckedIn) {
            onPatientCheckedIn(newRecord)
          }
        }

        // Queue position change
        if (oldRecord?.queue_position !== newRecord?.queue_position) {
          if (onQueuePositionChange) {
            onQueuePositionChange(newRecord)
          }
        }

        // Consultation started
        if (oldStatus !== 'in-progress' && newStatus === 'in-progress') {
          if (onConsultationStart) {
            onConsultationStart(newRecord)
          }
        }

        // Consultation paused
        if (newStatus === 'paused') {
          if (onConsultationPause) {
            onConsultationPause(newRecord)
          }
        }

        // Consultation completed
        if (oldStatus === 'in-progress' && newStatus === 'completed') {
          if (onConsultationStop) {
            const duration = newRecord.consultation_completed_at && newRecord.consultation_started_at
              ? (new Date(newRecord.consultation_completed_at) - new Date(newRecord.consultation_started_at)) / 1000 / 60
              : null
            onConsultationStop(newRecord, duration)
          }
          
          // Notify next patient
          if (onNextPatient) {
            onNextPatient(newRecord)
          }
        }
        break

      case 'DELETE':
        // Patient removed from queue
        if (onConsultationStop) {
          onConsultationStop(oldRecord, null)
        }
        break
    }
  }, [onPatientCheckedIn, onQueuePositionChange, onConsultationStart, onConsultationPause, onConsultationStop, onNextPatient])

  // Handle walk_in_queue changes
  const handleWalkInChange = useCallback((payload) => {
    const { eventType, new: newRecord } = payload

    console.log('Walk-in change detected:', eventType, newRecord)

    if (eventType === 'INSERT') {
      if (onPatientCheckedIn) {
        onPatientCheckedIn(newRecord)
      }
    } else if (eventType === 'UPDATE') {
      if (newRecord.status === 'in-progress' && onConsultationStart) {
        onConsultationStart(newRecord)
      } else if (newRecord.status === 'completed' && onConsultationStop) {
        onConsultationStop(newRecord)
      }
    }
  }, [onPatientCheckedIn, onConsultationStart, onConsultationStop])

  // Handle appointment status changes (approval)
  const handleAppointmentChange = useCallback((payload) => {
    const { eventType, new: newRecord, old: oldRecord } = payload

    console.log('Appointment change detected:', eventType, newRecord)

    if (eventType === 'UPDATE') {
      // Check if appointment was approved
      const oldStatus = oldRecord?.status
      const newStatus = newRecord.status

      if ((oldStatus === 'pending' || oldStatus === 'accepted') && 
          (newStatus === 'confirmed' || newStatus === 'accepted')) {
        if (onAppointmentApproved) {
          onAppointmentApproved(newRecord)
        }
      }

      // Check for check-in
      if (oldRecord?.checked_in !== newRecord?.checked_in && newRecord?.checked_in) {
        if (onPatientCheckedIn) {
          onPatientCheckedIn({ ...newRecord, isAppointment: true })
        }
      }
    }
  }, [onAppointmentApproved, onPatientCheckedIn])

  // Handle consultations table changes
  const handleConsultationChange = useCallback((payload) => {
    const { eventType, new: newRecord } = payload

    console.log('Consultation change detected:', eventType, newRecord)

    if (eventType === 'INSERT') {
      if (onConsultationStart) {
        onConsultationStart(newRecord)
      }
    } else if (eventType === 'UPDATE') {
      if (newRecord.status === 'in-progress' && onConsultationStart) {
        onConsultationStart(newRecord)
      } else if (newRecord.status === 'paused' && onConsultationPause) {
        onConsultationPause(newRecord)
      } else if (newRecord.status === 'completed' && onConsultationStop) {
        const duration = newRecord.end_time && newRecord.start_time
          ? (new Date(newRecord.end_time) - new Date(newRecord.start_time)) / 1000 / 60
          : null
        onConsultationStop(newRecord, duration)
      }
    }
  }, [onConsultationStart, onConsultationPause, onConsultationStop])

  // Manual refresh function
  const refresh = useCallback(async () => {
    try {
      // This would be implemented to fetch fresh data
      console.log('Refreshing queue data...')
      return { success: true }
    } catch (error) {
      console.error('Error refreshing queue:', error)
      return { success: false, error }
    }
  }, [])

  return {
    isSubscribed,
    subscriptionError,
    refresh
  }
}

/**
 * Hook for subscribing to specific patient's queue updates
 */
export const usePatientQueueUpdates = (appointmentId, patientId) => {
  const [queueData, setQueueData] = useState({
    position: null,
    status: null,
    estimatedWaitTime: null,
    tokenNumber: null
  })
  const [isSubscribed, setIsSubscribed] = useState(false)
  const channelRef = useRef(null)

  useEffect(() => {
    if (!appointmentId && !patientId) return

    // Clean up previous
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
    }

    const channel = supabase
      .channel(`patient-queue-updates-${appointmentId || patientId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointment_queue',
          filter: appointmentId 
            ? `appointment_id=eq.${appointmentId}`
            : `patient_id=eq.${patientId}`
        },
        (payload) => {
          const { eventType, new: newRecord } = payload
          
          if (eventType === 'UPDATE') {
            setQueueData(prev => ({
              ...prev,
              status: newRecord.status,
              tokenNumber: newRecord.token_number,
              queuePosition: newRecord.queue_position
            }))
          }
        }
      )
      .subscribe((status) => {
        setIsSubscribed(status === 'SUBSCRIBED')
      })

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
    }
  }, [appointmentId, patientId])

  return { queueData, isSubscribed }
}

/**
 * Hook for subscribing to doctor queue for real-time updates
 */
export const useDoctorQueueUpdates = (doctorId) => {
  const [queueData, setQueueData] = useState({
    currentPatient: null,
    nextPatient: null,
    waitingCount: 0,
    inProgressCount: 0
  })
  const [isSubscribed, setIsSubscribed] = useState(false)
  const channelRef = useRef(null)

  useEffect(() => {
    if (!doctorId) return

    const channel = supabase
      .channel(`doctor-queue-updates-${doctorId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointment_queue',
          filter: `doctor_id=eq.${doctorId}`
        },
        (payload) => {
          const { eventType, new: newRecord } = payload
          
          setQueueData(prev => {
            if (eventType === 'UPDATE') {
              const newData = { ...prev }
              
              if (newRecord.status === 'in-progress') {
                newData.currentPatient = newRecord
              } else if (newRecord.status === 'waiting' && !prev.currentPatient) {
                newData.nextPatient = newRecord
              }
              
              return newData
            }
            return prev
          })
        }
      )
      .subscribe((status) => {
        setIsSubscribed(status === 'SUBSCRIBED')
      })

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
    }
  }, [doctorId])

  return { queueData, isSubscribed }
}

export default useRealtimeQueue