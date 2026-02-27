import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '../services/supabase'

/**
 * Custom hook for Supabase real-time subscriptions
 * @param {string} table - The table name to subscribe to
 * @param {object} options - Configuration options
 * @param {function} options.filter - Filter function for the query
 * @param {string} options.event - Event type ('INSERT', 'UPDATE', 'DELETE', '*')
 * @param {function} options.onInsert - Callback for insert events
 * @param {function} options.onUpdate - Callback for update events
 * @param {function} options.onDelete - Callback for delete events
 */
export const useRealtimeSubscription = (table, options = {}) => {
  const {
    filter = null,
    event = '*',
    onInsert,
    onUpdate,
    onDelete,
    initialFetch = true,
  } = options

  const [data, setData] = useState([])
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [error, setError] = useState(null)
  const channelRef = useRef(null)

  useEffect(() => {
    if (!table) return

    // Initial fetch
    const fetchData = async () => {
      try {
        let query = supabase.from(table).select('*')
        if (filter) query = filter(query)
        const { data: initialData, error: fetchError } = await query
        
        if (fetchError) throw fetchError
        setData(initialData || [])
      } catch (err) {
        console.error(`Error fetching ${table}:`, err)
        setError(err.message)
      }
    }

    if (initialFetch) {
      fetchData()
    }

    // Create channel for real-time updates
    const channel = supabase
      .channel(`${table}-changes-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: event,
          schema: 'public',
          table: table,
        },
        (payload) => {
          const { eventType, new: newRecord, old: oldRecord } = payload

          switch (eventType) {
            case 'INSERT':
              if (onInsert) {
                onInsert(newRecord)
              } else {
                setData((prev) => [...prev, newRecord])
              }
              break
            case 'UPDATE':
              if (onUpdate) {
                onUpdate(newRecord, oldRecord)
              } else {
                setData((prev) =>
                  prev.map((item) =>
                    item.id === newRecord.id ? newRecord : item
                  )
                )
              }
              break
            case 'DELETE':
              if (onDelete) {
                onDelete(oldRecord)
              } else {
                setData((prev) =>
                  prev.filter((item) => item.id !== oldRecord.id)
                )
              }
              break
          }
        }
      )
      .subscribe((status) => {
        setIsSubscribed(status === 'SUBSCRIBED')
        if (status === 'CHANNEL_ERROR') {
          setError('Subscription failed')
        }
      })

    channelRef.current = channel

    // Cleanup
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
    }
  }, [table])

  // Manual refresh function
  const refresh = useCallback(async () => {
    try {
      let query = supabase.from(table).select('*')
      if (filter) query = filter(query)
      const { data: newData, error: fetchError } = await query
      
      if (fetchError) throw fetchError
      setData(newData || [])
    } catch (err) {
      console.error(`Error refreshing ${table}:`, err)
      setError(err.message)
    }
  }, [table, filter])

  return { data, isSubscribed, error, refresh, setData }
}

/**
 * Hook for subscribing to appointments for a specific doctor
 */
export const useDoctorAppointments = (doctorId) => {
  const filter = useCallback(
    (query) => query.eq('doctor_id', doctorId).order('date', { ascending: true }),
    [doctorId]
  )

  return useRealtimeSubscription('appointments', { filter, initialFetch: !!doctorId })
}

/**
 * Hook for subscribing to appointments for a specific patient
 */
export const usePatientAppointments = (patientId) => {
  const filter = useCallback(
    (query) => query.eq('patient_id', patientId).order('date', { ascending: true }),
    [patientId]
  )

  return useRealtimeSubscription('appointments', { filter, initialFetch: !!patientId })
}

/**
 * Hook for subscribing to walk-in queue
 */
export const useWalkInQueue = (doctorId = null) => {
  const filter = useCallback(
    (query) => {
      let q = query.order('created_at', { ascending: true })
      if (doctorId) {
        q = q.eq('doctor_id', doctorId)
      }
      return q
    },
    [doctorId]
  )

  return useRealtimeSubscription('walk_in_queue', { filter })
}

/**
 * Hook for subscribing to notifications for a specific user
 */
export const useNotifications = (userId) => {
  const filter = useCallback(
    (query) => query.eq('user_id', userId).order('created_at', { ascending: false }),
    [userId]
  )

  const { data, isSubscribed, error, refresh, setData } = useRealtimeSubscription('notifications', {
    filter,
    initialFetch: !!userId,
  })

  const unreadCount = data?.filter((n) => !n.read).length || 0

  const markAsRead = useCallback(
    async (notificationId) => {
      try {
        const { error: updateError } = await supabase
          .from('notifications')
          .update({ read: true })
          .eq('id', notificationId)

        if (updateError) throw updateError

        setData((prev) =>
          prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
        )
      } catch (err) {
        console.error('Error marking notification as read:', err)
      }
    },
    [setData]
  )

  const markAllAsRead = useCallback(async () => {
    try {
      const { error: updateError } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', userId)
        .eq('read', false)

      if (updateError) throw updateError

      setData((prev) => prev.map((n) => ({ ...n, read: true })))
    } catch (err) {
      console.error('Error marking all notifications as read:', err)
    }
  }, [userId, setData])

  return { data, isSubscribed, error, refresh, setData, unreadCount, markAsRead, markAllAsRead }
}

/**
 * Hook for subscribing to messages in a thread
 */
export const useMessages = (threadId) => {
  const filter = useCallback(
    (query) => query.eq('thread_id', threadId).order('created_at', { ascending: true }),
    [threadId]
  )

  return useRealtimeSubscription('messages', { filter, initialFetch: !!threadId })
}

/**
 * Hook for subscribing to message threads for a user
 */
export const useMessageThreads = (userId, userType) => {
  const filter = useCallback(
    (query) => {
      let q = query.order('last_message_at', { ascending: false })
      if (userType === 'patient') {
        q = q.eq('patient_id', userId)
      } else if (userType === 'doctor') {
        q = q.eq('doctor_id', userId)
      }
      return q
    },
    [userId, userType]
  )

  return useRealtimeSubscription('message_threads', { filter, initialFetch: !!userId })
}

export default useRealtimeSubscription
