/**
 * Priority Queue Hook
 * Integrates queueEngine with real-time data for Doctor and Mediator dashboards
 */

import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from '../services/supabase'
import {
  calculatePriorityScore,
  sortByPriorityScore,
  mergeQueues,
  recalculateQueueState,
  QUEUE_STATUS,
  DOCTOR_STATUS,
  getCurrentIST,
  isWithinWorkingHours,
  getQueueAvailability,
  handleLatePatient,
  checkNoShow,
  handlePatientNotReady,
  reorderQueueByMediator,
  formatMinutes
} from '../services/queueEngine'

export const usePriorityQueue = (doctorId, options = {}) => {
  const {
    includeWalkIns = true,
    includeAppointments = true,
    autoRefresh = true,
    refreshInterval = 30000 // 30 seconds
  } = options

  const [queue, setQueue] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [doctorStatus, setDoctorStatus] = useState(DOCTOR_STATUS.AVAILABLE)
  const [avgConsultationTime, setAvgConsultationTime] = useState(15)
  const [queueMetrics, setQueueMetrics] = useState({
    totalWaiting: 0,
    averageWaitTime: 0,
    capacity: { isFull: false, currentCount: 0, maxCapacity: 50 },
    canAcceptNewPatients: true
  })

  // Fetch queue data
  const fetchQueueData = useCallback(async () => {
    if (!doctorId) return

    try {
      setIsLoading(true)
      const today = new Date().toISOString().split('T')[0]
      let appointmentQueue = []
      let walkInQueue = []

      // Fetch appointment queue
      if (includeAppointments) {
        const { data: aptData } = await supabase
          .from('appointment_queue')
          .select('*')
          .eq('doctor_id', doctorId)
          .gte('created_at', `${today}T00:00:00.000Z`)
          .lte('created_at', `${today}T23:59:59.999Z`)
          .in('status', ['waiting', 'in-progress', 'called', 'checked_in'])
          .order('created_at', { ascending: true })

        appointmentQueue = aptData || []
      }

      // Fetch walk-in queue
      if (includeWalkIns) {
        const { data: walkData } = await supabase
          .from('walk_in_queue')
          .select('*')
          .eq('doctor_id', doctorId)
          .gte('created_at', `${today}T00:00:00.000Z`)
          .lte('created_at', `${today}T23:59:59.999Z`)
          .in('status', ['waiting', 'in-progress', 'called'])
          .order('created_at', { ascending: true })

        walkInQueue = walkData || []
      }

      // Enrich data with priority scores
      const currentTime = getCurrentIST()
      
      const enrichedAppointments = await Promise.all(
        appointmentQueue.map(async (patient) => {
          // Get patient profile for additional info
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, phone')
            .eq('id', patient.patient_id)
            .single()

          // Get appointment details
          const { data: appointment } = await supabase
            .from('appointments')
            .select('time, date')
            .eq('id', patient.appointment_id)
            .single()

          const enrichedPatient = {
            ...patient,
            source: 'appointment',
            patientName: profile?.full_name || 'Unknown',
            patientPhone: profile?.phone || '',
            appointment_time: appointment?.time || null,
            checked_in_at: patient.checked_in_at || patient.created_at,
            current_time: currentTime.toISOString(),
            priority: patient.priority || 'normal',
            is_vip: patient.is_vip || false,
            is_follow_up: patient.is_follow_up || false,
            skip_count: patient.skip_count || 0
          }

          enrichedPatient.priority_score = calculatePriorityScore(enrichedPatient)
          return enrichedPatient
        })
      )

      const enrichedWalkIns = walkInQueue.map((patient) => {
        const enrichedPatient = {
          ...patient,
          source: 'walk_in',
          patient_id: patient.patient_id || null,
          appointment_time: null,
          checked_in_at: patient.created_at,
          current_time: currentTime.toISOString(),
          priority: patient.priority || 'normal',
          is_vip: patient.priority === 'vip',
          is_follow_up: false,
          skip_count: 0
        }

        enrichedPatient.priority_score = calculatePriorityScore(enrichedPatient)
        return enrichedPatient
      })

      // Merge queues using priority scoring
      const mergedQueue = mergeQueues(enrichedAppointments, enrichedWalkIns, 'priority')

      // Calculate metrics
      const queueState = recalculateQueueState(mergedQueue, null, {
        avgConsultationTime,
        doctorStatus
      })

      setQueue(queueState.queue)
      setQueueMetrics(queueState.metrics)

    } catch (err) {
      console.error('Error fetching priority queue:', err)
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }, [doctorId, includeAppointments, includeWalkIns, avgConsultationTime, doctorStatus])

  // Auto-refresh
  useEffect(() => {
    if (autoRefresh && doctorId) {
      fetchQueueData()
      const interval = setInterval(fetchQueueData, refreshInterval)
      return () => clearInterval(interval)
    }
  }, [doctorId, autoRefresh, refreshInterval, fetchQueueData])

  // Get next patient based on priority
  const getNextPatient = useCallback(() => {
    const waitingPatients = queue.filter(p => 
      p.status === QUEUE_STATUS.WAITING || p.status === QUEUE_STATUS.CHECKED_IN
    )
    
    if (waitingPatients.length === 0) return null
    
    // Sort by priority score and return highest
    const sorted = sortByPriorityScore(waitingPatients)
    return sorted[0]
  }, [queue])

  // Handle late patient arrival
  const handleLateArrival = useCallback(async (patientId) => {
    const patient = queue.find(p => p.id === patientId)
    if (!patient) return

    const result = handleLatePatient(patient, getCurrentIST())
    
    if (result.status === QUEUE_STATUS.NO_SHOW) {
      // Mark as no-show in database
      const table = patient.source === 'appointment' ? 'appointment_queue' : 'walk_in_queue'
      await supabase
        .from(table)
        .update({ status: QUEUE_STATUS.NO_SHOW })
        .eq('id', patientId)
    }

    await fetchQueueData()
    return result
  }, [queue, fetchQueueData])

  // Handle patient not ready
  const handleNotReady = useCallback(async (patientId) => {
    const patient = queue.find(p => p.id === patientId)
    if (!patient) return

    const table = patient.source === 'appointment' ? 'appointment_queue' : 'walk_in_queue'
    
    // Update in database
    await supabase
      .from(table)
      .update({ 
        status: QUEUE_STATUS.HOLD,
        hold_count: (patient.hold_count || 0) + 1
      })
      .eq('id', patientId)

    await fetchQueueData()
  }, [queue, fetchQueueData])

  // Mediator reordering
  const reorderQueue = useCallback(async (actions) => {
    const newQueue = reorderQueueByMediator(queue, actions)
    
    // Update positions in database
    for (let i = 0; i < newQueue.length; i++) {
      const patient = newQueue[i]
      const table = patient.source === 'appointment' ? 'appointment_queue' : 'walk_in_queue'
      
      await supabase
        .from(table)
        .update({ queue_position: i + 1 })
        .eq('id', patient.id)
    }

    await fetchQueueData()
  }, [queue, fetchQueueData])

  // Move patient up
  const movePatientUp = useCallback(async (patientId) => {
    await reorderQueue([{ patientId, action: 'move_up' }])
  }, [reorderQueue])

  // Move patient down
  const movePatientDown = useCallback(async (patientId) => {
    await reorderQueue([{ patientId, action: 'move_down' }])
  }, [reorderQueue])

  // Set patient on hold
  const setPatientHold = useCallback(async (patientId) => {
    await handleNotReady(patientId)
  }, [handleNotReady])

  // Change patient priority
  const changePriority = useCallback(async (patientId, newPriority) => {
    const patient = queue.find(p => p.id === patientId)
    if (!patient) return

    const table = patient.source === 'appointment' ? 'appointment_queue' : 'walk_in_queue'
    
    await supabase
      .from(table)
      .update({ priority: newPriority })
      .eq('id', patientId)

    await fetchQueueData()
  }, [queue, fetchQueueData])

  // Set doctor status
  const setDoctorAvailabilityStatus = useCallback(async (status) => {
    setDoctorStatus(status)
    // Could also update doctor profile in database
  }, [])

  // Check capacity
  const checkCapacity = useCallback(() => {
    return getQueueAvailability(queue)
  }, [queue])

  // Check if within working hours
  const checkWorkingHours = useCallback(() => {
    return isWithinWorkingHours()
  }, [])

  return {
    queue,
    isLoading,
    error,
    doctorStatus,
    queueMetrics,
    avgConsultationTime,
    setAvgConsultationTime,
    setDoctorStatus: setDoctorAvailabilityStatus,
    refreshQueue: fetchQueueData,
    getNextPatient,
    handleLateArrival,
    handleNotReady,
    movePatientUp,
    movePatientDown,
    setPatientHold,
    changePriority,
    reorderQueue,
    checkCapacity,
    checkWorkingHours,
    calculatePriorityScore
  }
}

export default usePriorityQueue
