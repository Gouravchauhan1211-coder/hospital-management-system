import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '../services/supabase'
import * as queueApi from '../services/queueApi'

/**
 * Custom hook for real-time queue subscriptions
 * Handles both appointment_queue and walk_in_queue tables
 * 
 * @param {string} type - 'appointment' | 'walk-in' | 'display'
 * @param {object} options - Configuration options
 * @param {string} options.doctorId - Doctor ID for filtering
 * @param {string} options.patientId - Patient ID for filtering
 * @param {string} options.date - Date in YYYY-MM-DD format
 * @param {function} options.onQueueUpdate - Callback when queue updates
 * @param {function} options.onTokenCalled - Callback when a token is called
 * @param {function} options.onTokenCompleted - Callback when a token is completed
 */
export const useQueueSubscription = (type, options = {}) => {
  const { doctorId, patientId, date, onQueueUpdate, onTokenCalled, onTokenCompleted } = options
  
  const [queue, setQueue] = useState([])
  const [currentToken, setCurrentToken] = useState(null)
  const [stats, setStats] = useState({ waiting: 0, inProgress: 0, completed: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isSubscribed, setIsSubscribed] = useState(false)
  
  const channelRef = useRef(null)
  const tableName = type === 'walk-in' ? 'walk_in_queue' : 'appointment_queue'

  // Fetch initial queue data
  const fetchQueue = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      let result
      if (type === 'appointment' && doctorId && date) {
        result = await queueApi.getDoctorAppointmentQueue(doctorId, date)
      } else if (type === 'walk-in' && doctorId) {
        result = await queueApi.getDoctorWalkInQueue(doctorId)
      } else if (type === 'display') {
        result = await queueApi.getDoctorDisplayBoard(doctorId)
      } else if (patientId) {
        result = await queueApi.getPatientQueue(patientId)
      }
      
      if (result?.success) {
        const queueData = result.queue || []
        setQueue(queueData)
        
        // Calculate stats
        const waiting = queueData.filter(q => q.status === 'waiting').length
        const inProgress = queueData.filter(q => q.status === 'in-progress').length
        const completed = queueData.filter(q => q.status === 'completed').length
        
        setStats({ waiting, inProgress, completed })
        
        // Set current token (in-progress)
        const current = queueData.find(q => q.status === 'in-progress')
        setCurrentToken(current)
        
        if (onQueueUpdate) {
          onQueueUpdate(queueData, { waiting, inProgress, completed })
        }
      }
    } catch (err) {
      console.error('Error fetching queue:', err)
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }, [type, doctorId, patientId, date, onQueueUpdate])

  // Set up real-time subscription
  useEffect(() => {
    // Clean up previous subscription
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
    }

    // Build filter conditions
    const filterConditions = []
    if (doctorId) {
      filterConditions.push(`doctor_id=eq.${doctorId}`)
    }
    if (patientId) {
      filterConditions.push(`patient_id=eq.${patientId}`)
    }

    const channel = supabase
      .channel(`queue-${type}-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: tableName,
          filter: filterConditions.length > 0 ? filterConditions.join(',') : undefined,
        },
        (payload) => {
          const { eventType, new: newRecord, old: oldRecord } = payload
          
          console.log(`Queue ${eventType} event:`, payload)
          
          switch (eventType) {
            case 'INSERT':
              setQueue(prev => {
                const updated = [...prev, newRecord].sort((a, b) => 
                  (a.token_number || a.created_at) > (b.token_number || b.created_at) ? 1 : -1
                )
                
                // Update stats
                const waiting = updated.filter(q => q.status === 'waiting').length
                const inProgress = updated.filter(q => q.status === 'in-progress').length
                setStats(prev => ({ ...prev, waiting }))
                
                if (onQueueUpdate) {
                  onQueueUpdate(updated, { ...stats, waiting })
                }
                return updated
              })
              break
              
            case 'UPDATE':
              setQueue(prev => {
                const updated = prev.map(item => 
                  item.id === newRecord.id ? newRecord : item
                )
                
                // Update stats and current token
                const waiting = updated.filter(q => q.status === 'waiting').length
                const inProgress = updated.filter(q => q.status === 'in-progress').length
                const completed = updated.filter(q => q.status === 'completed').length
                
                setStats({ waiting, inProgress, completed })
                
                const current = updated.find(q => q.status === 'in-progress')
                setCurrentToken(current)
                
                // Trigger callbacks
                if (newRecord.status === 'in-progress' && onTokenCalled) {
                  onTokenCalled(newRecord)
                }
                if (newRecord.status === 'completed' && onTokenCompleted) {
                  onTokenCompleted(newRecord)
                }
                
                if (onQueueUpdate) {
                  onQueueUpdate(updated, { waiting, inProgress, completed })
                }
                return updated
              })
              break
              
            case 'DELETE':
              setQueue(prev => {
                const updated = prev.filter(item => item.id !== oldRecord.id)
                
                // Update stats
                const waiting = updated.filter(q => q.status === 'waiting').length
                const inProgress = updated.filter(q => q.status === 'in-progress').length
                setStats({ ...stats, waiting, inProgress })
                
                if (onQueueUpdate) {
                  onQueueUpdate(updated, stats)
                }
                return updated
              })
              break
          }
        }
      )
      .subscribe((status) => {
        console.log(`Queue subscription status: ${status}`)
        setIsSubscribed(status === 'SUBSCRIBED')
        if (status === 'CHANNEL_ERROR') {
          setError('Failed to subscribe to queue updates')
        }
      })

    channelRef.current = channel

    // Initial fetch
    fetchQueue()

    // Cleanup
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
    }
  }, [type, doctorId, patientId, date, tableName])

  // Manual refresh
  const refresh = useCallback(() => {
    fetchQueue()
  }, [fetchQueue])

  return {
    queue,
    currentToken,
    stats,
    isLoading,
    error,
    isSubscribed,
    refresh,
  }
}

/**
 * Hook for patient-specific queue position tracking
 * Provides real-time updates for patient's position in queue
 */
export const usePatientQueuePosition = (appointmentId) => {
  const [position, setPosition] = useState(null)
  const [status, setStatus] = useState(null)
  const [estimatedWaitTime, setEstimatedWaitTime] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isSubscribed, setIsSubscribed] = useState(false)
  
  const channelRef = useRef(null)

  const fetchPosition = useCallback(async () => {
    try {
      setIsLoading(true)
      const result = await queueApi.getPatientAppointmentQueuePosition(appointmentId)
      
      if (result.success) {
        setPosition(result.position)
        setStatus(result.status)
        setEstimatedWaitTime({
          minutes: result.estimatedWaitTime,
          startTime: result.estimatedStartTime,
        })
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }, [appointmentId])

  useEffect(() => {
    if (!appointmentId) return

    // Initial fetch
    fetchPosition()

    // Set up real-time subscription for this specific queue entry
    const channel = supabase
      .channel(`patient-queue-${appointmentId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'appointment_queue',
          filter: `appointment_id=eq.${appointmentId}`,
        },
        (payload) => {
          const { new: newRecord } = payload
          console.log('Patient queue update:', newRecord)
          
          setStatus(newRecord.status)
          
          // Re-fetch position to get updated wait time
          fetchPosition()
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
  }, [appointmentId, fetchPosition])

  return {
    position,
    status,
    estimatedWaitTime,
    isLoading,
    error,
    isSubscribed,
    refresh: fetchPosition,
  }
}

/**
 * Hook for walk-in queue management (for mediators/admin)
 * Provides functions to manage walk-in queue
 */
export const useWalkInQueue = (doctorId) => {
  const [queue, setQueue] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isSubscribed, setIsSubscribed] = useState(false)
  
  const channelRef = useRef(null)

  const fetchQueue = useCallback(async () => {
    try {
      setIsLoading(true)
      const result = await queueApi.getDoctorWalkInQueue(doctorId)
      
      if (result?.success) {
        setQueue(result.queue || [])
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }, [doctorId])

  useEffect(() => {
    if (!doctorId) return

    // Initial fetch
    fetchQueue()

    // Set up real-time subscription
    const channel = supabase
      .channel(`walkin-queue-${doctorId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'walk_in_queue',
          filter: `doctor_id=eq.${doctorId}`,
        },
        (payload) => {
          const { eventType, new: newRecord, old: oldRecord } = payload
          
          switch (eventType) {
            case 'INSERT':
              setQueue(prev => [...prev, newRecord])
              break
            case 'UPDATE':
              setQueue(prev => 
                prev.map(item => item.id === newRecord.id ? newRecord : item)
              )
              break
            case 'DELETE':
              setQueue(prev => prev.filter(item => item.id !== oldRecord.id))
              break
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
  }, [doctorId, fetchQueue])

  // Queue management functions
  const addToQueue = useCallback(async (patientData) => {
    try {
      const result = await queueApi.addWalkInToken(doctorId, patientData)
      return result
    } catch (err) {
      setError(err.message)
      throw err
    }
  }, [doctorId])

  const callPatient = useCallback(async (tokenId) => {
    try {
      const result = await queueApi.callPatient(tokenId)
      return result
    } catch (err) {
      setError(err.message)
      throw err
    }
  }, [])

  const startConsultation = useCallback(async (tokenId) => {
    try {
      const result = await queueApi.startConsultation(tokenId)
      return result
    } catch (err) {
      setError(err.message)
      throw err
    }
  }, [])

  const completeConsultation = useCallback(async (tokenId, data) => {
    try {
      const result = await queueApi.completeConsultation(tokenId, data)
      return result
    } catch (err) {
      setError(err.message)
      throw err
    }
  }, [])

  const cancelToken = useCallback(async (tokenId, reason) => {
    try {
      const result = await queueApi.cancelToken(tokenId, reason)
      return result
    } catch (err) {
      setError(err.message)
      throw err
    }
  }, [])

  const markNoShow = useCallback(async (tokenId) => {
    try {
      const result = await queueApi.markNoShow(tokenId)
      return result
    } catch (err) {
      setError(err.message)
      throw err
    }
  }, [])

  return {
    queue,
    isLoading,
    error,
    isSubscribed,
    refresh: fetchQueue,
    addToQueue,
    callPatient,
    startConsultation,
    completeConsultation,
    cancelToken,
    markNoShow,
  }
}

/**
 * Hook for display board real-time updates
 * Optimized for large screen display
 */
export const useDisplayBoard = (doctorId) => {
  const [displayData, setDisplayData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [isSubscribed, setIsSubscribed] = useState(false)
  
  const channelRef = useRef(null)

  const fetchDisplayData = useCallback(async () => {
    try {
      setIsLoading(true)
      const result = await queueApi.getDoctorDisplayBoard(doctorId)
      
      if (result?.success) {
        setDisplayData(result)
        setLastUpdated(new Date())
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }, [doctorId])

  useEffect(() => {
    if (!doctorId) return

    // Initial fetch
    fetchDisplayData()

    // Set up real-time subscription
    const channel = supabase
      .channel(`display-board-${doctorId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'walk_in_queue',
          filter: `doctor_id=eq.${doctorId}`,
        },
        () => {
          // On any change, refresh the display data
          fetchDisplayData()
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
  }, [doctorId, fetchDisplayData])

  return {
    displayData,
    isLoading,
    error,
    lastUpdated,
    isSubscribed,
    refresh: fetchDisplayData,
  }
}

export default useQueueSubscription
