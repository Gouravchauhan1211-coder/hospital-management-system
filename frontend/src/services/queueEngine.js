/**
 * ============================================================
 * ADVANCED QUEUE MANAGEMENT ENGINE
 * Real-World Hospital Queue System Implementation
 * ============================================================
 * 
 * Features:
 * - Priority Queue Algorithm with Dynamic Scoring
 * - 20+ Real-World Rules Implementation
 * - Multi-Source Queue Merge (Appointments + Walk-ins)
 * - Smart Buffer Adjustment
 * - Simulation Testing System
 * 
 * Priority Score Formula:
 * PRIORITY_SCORE = Emergency + Waiting Time + Appointment Deviation + Presence + Adjustments
 */

// ============================================================
// CONSTANTS & CONFIGURATION
// ============================================================

export const QUEUE_CONFIG = {
  // Grace periods (in minutes)
  GRACE_PERIOD: 15,                    // Late within grace period keeps position
  MAX_LATE_THRESHOLD: 30,               // Beyond this = NO_SHOW
  
  // No-show handling
  NO_SHOW_RESPONSE_TIME: 5,             // Minutes to respond before NO_SHOW
  NO_SHOW_RETRY_COUNT: 3,               // How many times to call
  
  // Queue limits
  MAX_QUEUE_CAPACITY: 50,               // Maximum patients in queue
  
  // Doctor working hours
  DOCTOR_START_TIME: '09:00',           // HH:MM format
  DOCTOR_END_TIME: '18:00',             // HH:MM format
  
  // Priority weights for scoring
  PRIORITY_WEIGHTS: {
    EMERGENCY: 1000,
    URGENT: 500,
    HIGH: 200,
    NORMAL: 0,
    LOW: -100
  },
  
  // Score modifiers
  WAIT_SCORE_MULTIPLIER: 2,             // minutes_waiting × 2
  LATE_SCORE_MULTIPLIER: 3,             // delay_minutes × 3
  CHECKED_IN_BONUS: 200,
  NOT_PRESENT_PENALTY: -500,
  NO_SHOW_RETURN_PENALTY: -100,
  VIP_BONUS: 300,
  FOLLOW_UP_BONUS: 100,
  
  // Fairness
  MAX_SKIP_COUNT: 3,                   // Max times a patient can be skipped
  
  // Dynamic adjustment
  BUFFER_ADJUSTMENT_THRESHOLD: 0.7,     // 70% of consultations exceed time = increase buffer
  BUFFER_INCREMENT: 2,                  // Minutes to add to buffer
  MAX_BUFFER: 30,                       // Maximum buffer time
  MIN_BUFFER: 5                         // Minimum buffer time
}

// Priority levels
export const PRIORITY_LEVELS = {
  EMERGENCY: 'emergency',
  URGENT: 'urgent',
  HIGH: 'high',
  NORMAL: 'normal',
  LOW: 'low'
}

// Queue statuses
export const QUEUE_STATUS = {
  NOT_ARRIVED: 'not_arrived',
  CHECKED_IN: 'checked_in',
  WAITING: 'waiting',
  CALLED: 'called',
  IN_PROGRESS: 'in_progress',
  HOLD: 'hold',
  COMPLETED: 'completed',
  NO_SHOW: 'no_show',
  CANCELLED: 'cancelled',
  RE_SCHEDULED: 're_scheduled'
}

// Doctor statuses
export const DOCTOR_STATUS = {
  AVAILABLE: 'available',
  IN_CONSULTATION: 'in_consultation',
  ON_BREAK: 'on_break',
  OFFLINE: 'offline'
}

// ============================================================
// TIME UTILITIES
// ============================================================

/**
 * Get current time in IST (Asia/Kolkata)
 * Returns the current UTC time plus 5.5 hours for India Standard Time
 */
export const getCurrentIST = () => {
  const now = new Date()
  const istOffset = 5.5 * 60 * 60 * 1000 // 5.5 hours in milliseconds
  return new Date(now.getTime() + istOffset)
}

/**
 * Parse time string to minutes from midnight
 */
export const parseTimeToMinutes = (timeStr) => {
  const [hours, minutes] = timeStr.split(':').map(Number)
  return hours * 60 + minutes
}

/**
 * Get minutes between two dates
 */
export const getMinutesBetween = (date1, date2) => {
  const diff = new Date(date1) - new Date(date2)
  return Math.floor(diff / (1000 * 60))
}

/**
 * Check if current time is within doctor working hours
 */
export const isWithinWorkingHours = (startTime = QUEUE_CONFIG.DOCTOR_START_TIME, 
                                      endTime = QUEUE_CONFIG.DOCTOR_END_TIME) => {
  const now = getCurrentIST()
  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  const startMinutes = parseTimeToMinutes(startTime)
  const endMinutes = parseTimeToMinutes(endTime)
  
  return currentMinutes >= startMinutes && currentMinutes < endMinutes
}

/**
 * Format minutes to readable string
 */
export const formatMinutes = (minutes) => {
  if (minutes < 0) return '0 min'
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
}

// ============================================================
// PRIORITY SCORE CALCULATOR
// ============================================================

/**
 * Calculate priority score for a patient
 * Higher score = higher priority
 */
export const calculatePriorityScore = (patient) => {
  const {
    priority = 'normal',
    checked_in_at,
    created_at,
    appointment_time,
    current_time,
    is_vip = false,
    is_follow_up = false,
    no_show_return = false,
    skip_count = 0
  } = patient

  let score = 0

  // 1. Emergency Level (Highest Impact)
  score += QUEUE_CONFIG.PRIORITY_WEIGHTS[priority.toUpperCase()] || 0

  // 2. Waiting Time Score (Fairness)
  if (checked_in_at && current_time) {
    const waitMinutes = getMinutesBetween(current_time, checked_in_at)
    score += waitMinutes * QUEUE_CONFIG.WAIT_SCORE_MULTIPLIER
  }

  // 3. Appointment Time Deviation
  if (appointment_time && current_time) {
    const appointmentMinutes = parseTimeToMinutes(appointment_time)
    const currentMinutes = getCurrentIST().getHours() * 60 + getCurrentIST().getMinutes()
    const delay = currentMinutes - appointmentMinutes
    
    if (delay > 0) {
      // Patient is late
      score += delay * QUEUE_CONFIG.LATE_SCORE_MULTIPLIER
    }
  }

  // 4. Presence Status
  if (checked_in_at) {
    score += QUEUE_CONFIG.CHECKED_IN_BONUS
  } else {
    score += QUEUE_CONFIG.NOT_PRESENT_PENALTY
  }

  // 5. Special Adjustments
  if (is_vip) score += QUEUE_CONFIG.VIP_BONUS
  if (is_follow_up) score += QUEUE_CONFIG.FOLLOW_UP_BONUS
  if (no_show_return) score += QUEUE_CONFIG.NO_SHOW_RETURN_PENALTY

  // 6. Fairness - patients skipped too many times get boosted
  if (skip_count >= QUEUE_CONFIG.MAX_SKIP_COUNT - 1) {
    score += 500
  }

  return score
}

/**
 * Sort patients by priority score (descending)
 * Uses arrival time as tie-breaker
 */
export const sortByPriorityScore = (patients) => {
  return [...patients].sort((a, b) => {
    const scoreA = calculatePriorityScore(a)
    const scoreB = calculatePriorityScore(b)
    
    if (scoreB !== scoreA) {
      return scoreB - scoreA  // Higher score first
    }
    
    // Tie-breaker: earlier arrival
    const timeA = new Date(a.checked_in_at || a.created_at)
    const timeB = new Date(b.checked_in_at || b.created_at)
    return timeA - timeB
  })
}

// ============================================================
// LATE PATIENT HANDLING (Rule 1)
// ============================================================

/**
 * Handle late patient arrival
 * Returns updated patient status and position adjustment
 */
export const handleLatePatient = (patient, currentTime) => {
  const { appointment_time, checked_in_at } = patient
  
  if (!appointment_time || !checked_in_at) {
    return { status: QUEUE_STATUS.CHECKED_IN, adjustment: 0 }
  }

  const appointmentMinutes = parseTimeToMinutes(appointment_time)
  const checkInMinutes = getCurrentIST().getHours() * 60 + getCurrentIST().getMinutes()
  const delay = checkInMinutes - appointmentMinutes

  if (delay <= QUEUE_CONFIG.GRACE_PERIOD) {
    // Within grace period - keep original position
    return { status: QUEUE_STATUS.CHECKED_IN, adjustment: 0, lateStatus: 'on_time' }
  } else if (delay <= QUEUE_CONFIG.MAX_LATE_THRESHOLD) {
    // Beyond grace period but within max threshold - mark as late, move back
    return { 
      status: QUEUE_STATUS.CHECKED_IN, 
      adjustment: 1,  // Move after currently waiting
      lateStatus: 'late'
    }
  } else {
    // Beyond max threshold - mark as no-show
    return { 
      status: QUEUE_STATUS.NO_SHOW, 
      adjustment: 'remove',
      lateStatus: 'no_show'
    }
  }
}

// ============================================================
// NO-SHOW AUTO HANDLING (Rule 2)
// ============================================================

/**
 * Check and handle no-show patients
 */
export const checkNoShow = (patient, currentTime) => {
  const { called_at, status } = patient
  
  if (status !== QUEUE_STATUS.CALLED || !called_at) {
    return { isNoShow: false }
  }

  const minutesSinceCall = getMinutesBetween(currentTime, called_at)
  
  if (minutesSinceCall > QUEUE_CONFIG.NO_SHOW_RESPONSE_TIME) {
    return { 
      isNoShow: true, 
      reason: 'no_response',
      minutesLate: minutesSinceCall
    }
  }

  return { isNoShow: false, minutesRemaining: QUEUE_CONFIG.NO_SHOW_RESPONSE_TIME - minutesSinceCall }
}

// ============================================================
// EMERGENCY OVERRIDE (Rule 3)
// ============================================================

/**
 * Insert emergency patient at position 1 (after current patient)
 */
export const insertEmergencyPatient = (queue, emergencyPatient) => {
  if (queue.length === 0) {
    return [emergencyPatient]
  }

  // Find position after current in-progress patient
  const inProgressIndex = queue.findIndex(p => p.status === QUEUE_STATUS.IN_PROGRESS)
  
  if (inProgressIndex >= 0) {
    // Insert after current patient
    const newQueue = [...queue]
    newQueue.splice(inProgressIndex + 1, 0, emergencyPatient)
    return newQueue
  }

  // If no in-progress, insert at position 1
  return [queue[0], emergencyPatient, ...queue.slice(1)]
}

// ============================================================
// DOCTOR BREAK / PAUSE (Rule 4)
// ============================================================

/**
 * Handle doctor break status
 */
export const handleDoctorBreak = (doctorStatus, queue) => {
  if (doctorStatus === DOCTOR_STATUS.ON_BREAK) {
    return {
      isPaused: true,
      message: 'Doctor on break',
      queueFreeze: true
    }
  }
  
  return { isPaused: false }
}

// ============================================================
// CONSULTATION OVERRUN HANDLING (Rule 5)
// ============================================================

/**
 * Handle consultation time overrun
 * Recalculate ETAs for all waiting patients
 */
export const handleConsultationOverrun = (currentPatient, avgConsultationTime) => {
  const { consultation_started_at } = currentPatient
  if (!consultation_started_at) return { overrun: false }

  const elapsedMinutes = getMinutesBetween(getCurrentIST(), consultation_started_at)
  const expectedMinutes = avgConsultationTime || 15
  
  if (elapsedMinutes > expectedMinutes) {
    const overrunMinutes = elapsedMinutes - expectedMinutes
    return {
      overrun: true,
      overrunMinutes,
      newRemainingTime: avgConsultationTime + overrunMinutes
    }
  }

  return { overrun: false }
}

// ============================================================
// EARLY COMPLETION OPTIMIZATION (Rule 6)
// ============================================================

/**
 * Handle early consultation completion
 */
export const handleEarlyCompletion = (completedAt, expectedTime) => {
  if (!completedAt || !expectedTime) return { savedMinutes: 0 }

  const actualMinutes = getMinutesBetween(completedAt, new Date())
  const savedMinutes = expectedTime - actualMinutes

  return {
    savedMinutes: Math.max(0, savedMinutes),
    shouldNotifyNext: true
  }
}

// ============================================================
// QUEUE REORDERING BY MEDIATOR (Rule 7)
// ============================================================

/**
 * Reorder queue based on mediator actions
 */
export const reorderQueueByMediator = (queue, mediatorActions) => {
  let newQueue = [...queue]
  
  mediatorActions.forEach(action => {
    const { patientId, newPosition, action: actionType } = action
    
    switch (actionType) {
      case 'move_up':
        movePatientUp(newQueue, patientId)
        break
      case 'move_down':
        movePatientDown(newQueue, patientId)
        break
      case 'set_position':
        setPatientPosition(newQueue, patientId, newPosition)
        break
      case 'hold':
        setPatientStatus(newQueue, patientId, QUEUE_STATUS.HOLD)
        break
      case 'change_priority':
        changePatientPriority(newQueue, patientId, action.newPriority)
        break
    }
  })

  return recalculateAllETAs(newQueue)
}

/**
 * Move patient up in queue
 */
const movePatientUp = (queue, patientId) => {
  const index = queue.findIndex(p => p.id === patientId)
  if (index > 0) {
    const patient = queue.splice(index, 1)[0]
    queue.splice(index - 1, 0, patient)
  }
}

/**
 * Move patient down in queue
 */
const movePatientDown = (queue, patientId) => {
  const index = queue.findIndex(p => p.id === patientId)
  if (index < queue.length - 1) {
    const patient = queue.splice(index, 1)[0]
    queue.splice(index + 1, 0, patient)
  }
}

/**
 * Set patient to specific position
 */
const setPatientPosition = (queue, patientId, position) => {
  const index = queue.findIndex(p => p.id === patientId)
  if (index >= 0 && position >= 0 && position < queue.length) {
    const patient = queue.splice(index, 1)[0]
    queue.splice(position, 0, patient)
  }
}

/**
 * Set patient status to HOLD
 */
const setPatientStatus = (queue, patientId, status) => {
  const patient = queue.find(p => p.id === patientId)
  if (patient) {
    patient.status = status
  }
}

/**
 * Change patient priority
 */
const changePatientPriority = (queue, patientId, newPriority) => {
  const patient = queue.find(p => p.id === patientId)
  if (patient) {
    patient.priority = newPriority
    patient.priority_score = calculatePriorityScore(patient)
  }
}

// ============================================================
// PATIENT "NOT READY" RULE (Rule 8)
// ============================================================

/**
 * Handle patient not ready when called
 * Move to temporary HOLD state, reinsert after 1-2 patients
 */
export const handlePatientNotReady = (queue, patientId) => {
  const index = queue.findIndex(p => p.id === patientId)
  if (index < 0) return queue

  const patient = queue[index]
  
  // Move to hold
  patient.status = QUEUE_STATUS.HOLD
  patient.hold_count = (patient.hold_count || 0) + 1
  
  // Remove from current position
  queue.splice(index, 1)
  
  // Reinsert after next 1-2 patients
  const reinsertPosition = Math.min(2, queue.length)
  queue.splice(reinsertPosition, 0, patient)
  
  return queue
}

// ============================================================
// RE-ENTRY RULE (Rule 9)
// ============================================================

/**
 * Allow no-show patient to re-enter queue
 */
export const requeueNoShowPatient = (patient, position = 'end') => {
  const newPatient = {
    ...patient,
    status: QUEUE_STATUS.WAITING,
    no_show_return: true,
    reentered_at: getCurrentIST().toISOString(),
    previous_no_show: true
  }

  if (position === 'end') {
    return { position: 'end', patient: newPatient }
  }

  return { position, patient: newPatient }
}

// ============================================================
// QUEUE CAPACITY LIMIT (Rule 10)
// ============================================================

/**
 * Check if queue is at capacity
 */
export const isQueueAtCapacity = (queue) => {
  const activePatients = queue.filter(p => 
    [QUEUE_STATUS.WAITING, QUEUE_STATUS.CALLED, QUEUE_STATUS.IN_PROGRESS, QUEUE_STATUS.CHECKED_IN].includes(p.status)
  )
  
  return activePatients.length >= QUEUE_CONFIG.MAX_QUEUE_CAPACITY
}

/**
 * Get queue availability status
 */
export const getQueueAvailability = (queue) => {
  const count = queue.filter(p => 
    [QUEUE_STATUS.WAITING, QUEUE_STATUS.CALLED, QUEUE_STATUS.IN_PROGRESS, QUEUE_STATUS.CHECKED_IN].includes(p.status)
  ).length

  return {
    isFull: count >= QUEUE_CONFIG.MAX_QUEUE_CAPACITY,
    currentCount: count,
    maxCapacity: QUEUE_CONFIG.MAX_QUEUE_CAPACITY,
    remainingSlots: Math.max(0, QUEUE_CONFIG.MAX_QUEUE_CAPACITY - count)
  }
}

// ============================================================
// HARD CUTOFF RULE (Rule 11)
// ============================================================

/**
 * Check if new patients can be accepted based on doctor end time
 */
export const canAcceptNewPatients = (avgConsultationTime, queueLength) => {
  const now = getCurrentIST()
  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  const endMinutes = parseTimeToMinutes(QUEUE_CONFIG.DOCTOR_END_TIME)
  
  // Calculate time needed for all waiting patients
  const timeNeeded = queueLength * (avgConsultationTime || 15)
  
  // Allow new patients if they can be seen before end time
  // Add 30 min buffer for unexpected overruns
  return (currentMinutes + timeNeeded + 30) < endMinutes
}

/**
 * Reschedule remaining appointments
 */
export const rescheduleRemainingAppointments = (queue) => {
  return queue.map(patient => ({
    ...patient,
    status: QUEUE_STATUS.RE_SCHEDULED,
    rescheduled_at: getCurrentIST().toISOString()
  }))
}

// ============================================================
// MULTI-SOURCE QUEUE MERGE (Rule 12)
// ============================================================

/**
 * Merge appointments and walk-ins into final queue
 * Based on: time slot, priority, arrival time
 */
export const mergeQueues = (appointmentQueue, walkInQueue, mergeStrategy = 'priority') => {
  // Add source标识
  const appointments = appointmentQueue.map(p => ({ ...p, source: 'appointment' }))
  const walkIns = walkInQueue.map(p => ({ ...p, source: 'walk_in' }))
  
  // Combine all patients
  let combined = [...appointments, ...walkIns]
  
  switch (mergeStrategy) {
    case 'fifo':
      // Strict FIFO - ignore priorities
      combined.sort((a, b) => {
        const timeA = new Date(a.checked_in_at || a.created_at)
        const timeB = new Date(b.checked_in_at || b.created_at)
        return timeA - timeB
      })
      break
      
    case 'priority':
      // Use priority scoring
      combined = sortByPriorityScore(combined)
      break
      
    case 'hybrid':
      // Respect appointment times when load is low, FIFO when high
      {
        const loadFactor = combined.length / QUEUE_CONFIG.MAX_QUEUE_CAPACITY
        if (loadFactor < 0.5) {
          combined = sortByPriorityScore(combined)
        } else {
          combined.sort((a, b) => {
            const timeA = new Date(a.checked_in_at || a.created_at)
            const timeB = new Date(b.checked_in_at || b.created_at)
            return timeA - timeB
          })
        }
      }
      break
      
    default:
      combined = sortByPriorityScore(combined)
  }
  
  return combined
}

// ============================================================
// SMART BUFFER ADJUSTMENT (Rule 13)
// ============================================================

/**
 * Dynamically adjust consultation time buffer
 * Based on doctor's historical performance
 */
export const adjustSmartBuffer = (recentConsultations, currentBuffer) => {
  if (!recentConsultations || recentConsultations.length < 5) {
    return currentBuffer
  }

  // Calculate percentage of consultations that exceeded expected time
  const exceededCount = recentConsultations.filter(c => 
    c.actual_time > c.expected_time
  ).length
  
  const exceedPercentage = exceededCount / recentConsultations.length

  if (exceedPercentage > QUEUE_CONFIG.BUFFER_ADJUSTMENT_THRESHOLD) {
    // Frequently exceeds time - increase buffer
    return Math.min(
      currentBuffer + QUEUE_CONFIG.BUFFER_INCREMENT,
      QUEUE_CONFIG.MAX_BUFFER
    )
  } else if (exceedPercentage < 0.3) {
    // Consistently finishes early - decrease buffer
    return Math.max(
      currentBuffer - QUEUE_CONFIG.BUFFER_INCREMENT,
      QUEUE_CONFIG.MIN_BUFFER
    )
  }

  return currentBuffer
}

// ============================================================
// PATIENT CALL RETRY (Rule 14)
// ============================================================

/**
 * Handle patient call retry logic
 */
export const handleCallRetry = (patient) => {
  const retryCount = (patient.call_retry_count || 0) + 1
  
  if (retryCount >= QUEUE_CONFIG.NO_SHOW_RETRY_COUNT) {
    return {
      shouldMarkNoShow: true,
      retryCount,
      message: 'Max retries exceeded'
    }
  }

  return {
    shouldMarkNoShow: false,
    retryCount,
    shouldRetry: true,
    message: `Retry ${retryCount} of ${QUEUE_CONFIG.NO_SHOW_RETRY_COUNT}`
  }
}

// ============================================================
// ARRIVAL-BASED ACTIVATION (Rule 15)
// ============================================================

/**
 * Only include checked-in patients in active queue
 * Prevents ghost delays
 */
export const getActiveQueue = (queue) => {
  return queue.filter(patient => {
    // Must have checked in
    if (!patient.checked_in_at) return false
    
    // Exclude no-shows, cancelled, completed
    const excludedStatuses = [
      QUEUE_STATUS.NO_SHOW,
      QUEUE_STATUS.CANCELLED,
      QUEUE_STATUS.COMPLETED,
      QUEUE_STATUS.RE_SCHEDULED
    ]
    
    return !excludedStatuses.includes(patient.status)
  })
}

// ============================================================
// PHYSICAL PRESENCE PRIORITY (Rule 16)
// ============================================================

/**
 * Prioritize physically present patients over late appointment patients
 */
export const applyPhysicalPresencePriority = (queue) => {
  const now = getCurrentIST()
  
  return queue.map(patient => {
    // If patient has appointment but not checked in, and walk-in is present
    if (patient.source === 'appointment' && !patient.checked_in_at) {
      const appointmentTime = parseTimeToMinutes(patient.appointment_time || '00:00')
      const currentMinutes = now.getHours() * 60 + now.getMinutes()
      
      // If appointment time has passed and patient hasn't checked in
      if (currentMinutes > appointmentTime + QUEUE_CONFIG.GRACE_PERIOD) {
        // Lower priority to allow present walk-ins to go first
        patient.presence_penalty = true
      }
    }
    return patient
  })
}

// ============================================================
// DYNAMIC QUEUE TYPE SWITCHING (Rule 17)
// ============================================================

/**
 * Switch queue strategy based on load
 */
export const getDynamicQueueStrategy = (queueLength) => {
  const loadFactor = queueLength / QUEUE_CONFIG.MAX_QUEUE_CAPACITY
  
  if (loadFactor > 0.7) {
    return {
      strategy: 'fifo',
      reason: 'high_load',
      description: 'Switching to FIFO for fair distribution under high load'
    }
  } else if (loadFactor > 0.4) {
    return {
      strategy: 'hybrid',
      reason: 'medium_load',
      description: 'Using hybrid approach'
    }
  } else {
    return {
      strategy: 'priority',
      reason: 'low_load',
      description: 'Using priority-based queue for best patient experience'
    }
  }
}

// ============================================================
// FAIRNESS RULE (Rule 18)
// ============================================================

/**
 * Ensure no patient is skipped more than N times
 */
export const checkFairness = (queue) => {
  const skippedPatients = queue.filter(p => 
    p.skip_count >= QUEUE_CONFIG.MAX_SKIP_COUNT
  )
  
  if (skippedPatients.length > 0) {
    // Boost priority of most skipped patients
    return {
      hasUnfairSkips: true,
      patientsToBoost: skippedPatients,
      action: 'boost_priority'
    }
  }
  
  return { hasUnfairSkips: false }
}

/**
 * Record a skip and check if max reached
 */
export const recordSkip = (patient) => {
  const newSkipCount = (patient.skip_count || 0) + 1
  return {
    skip_count: newSkipCount,
    hasReachedMax: newSkipCount >= QUEUE_CONFIG.MAX_SKIP_COUNT
  }
}

// ============================================================
// DOUBLE BOOKING PROTECTION (Rule 19)
// ============================================================

/**
 * Check if patient is already in queue or has active appointment
 */
export const checkDoubleBooking = (patientId, existingQueue, existingAppointments) => {
  // Check if in queue
  const inQueue = existingQueue.find(p => p.patient_id === patientId)
  if (inQueue) {
    return {
      isDuplicate: true,
      reason: 'already_in_queue',
      existingStatus: inQueue.status
    }
  }
  
  // Check if has active appointment
  const hasAppointment = existingAppointments?.find(a => 
    a.patient_id === patientId && 
    ['scheduled', 'confirmed'].includes(a.status)
  )
  
  if (hasAppointment) {
    return {
      isDuplicate: true,
      reason: 'has_active_appointment',
      appointmentId: hasAppointment.id
    }
  }
  
  return { isDuplicate: false }
}

// ============================================================
// IDLE DOCTOR OPTIMIZATION (Rule 20)
// ============================================================

/**
 * Auto-call next patient if doctor is idle
 */
export const getNextPatientForDoctor = (queue, doctorStatus) => {
  // Doctor must be available
  if (doctorStatus !== DOCTOR_STATUS.AVAILABLE) {
    return null
  }
  
  // Get next waiting patient
  const nextPatient = queue.find(p => 
    p.status === QUEUE_STATUS.WAITING || 
    p.status === QUEUE_STATUS.CHECKED_IN
  )
  
  return nextPatient || null
}

// ============================================================
// ETA CALCULATION
// ============================================================

/**
 * Recalculate ETAs for all patients in queue
 */
export const recalculateAllETAs = (queue, avgConsultationTime = 15) => {
  let cumulativeTime = 0
  
  return queue.map((patient, index) => {
    const patientETA = {
      ...patient,
      queue_position: index + 1,
      estimated_wait_time: cumulativeTime,
      estimated_start_time: new Date(getCurrentIST().getTime() + cumulativeTime * 60 * 1000).toISOString()
    }
    
    // Update cumulative time for next patient
    if (patient.status === QUEUE_STATUS.WAITING || patient.status === QUEUE_STATUS.CHECKED_IN) {
      cumulativeTime += avgConsultationTime
    }
    
    return patientETA
  })
}

/**
 * Calculate estimated wait time for a specific position
 */
export const calculateWaitTime = (position, avgConsultationTime = 15, currentInProgress = false) => {
  let waitTime = 0
  
  if (currentInProgress) {
    // Subtract one since current patient is being served
    waitTime = (position - 1) * avgConsultationTime
  } else {
    waitTime = position * avgConsultationTime
  }
  
  return waitTime
}

// ============================================================
// MASTER RULE - RECALCULATE EVERYTHING
// ============================================================

/**
 * Master function to recalculate all queue metrics
 * Called at every queue change event
 */
export const recalculateQueueState = (queue, doctor, config = {}) => {
  const {
    avgConsultationTime = 15,
    mergeStrategy = 'priority',
    doctorStatus = DOCTOR_STATUS.AVAILABLE
  } = config

  // 1. Get active queue (only checked-in patients)
  let activeQueue = getActiveQueue(queue)
  
  // 2. Apply physical presence priority
  activeQueue = applyPhysicalPresencePriority(activeQueue)
  
  // 3. Get dynamic strategy
  const { strategy } = getDynamicQueueStrategy(activeQueue.length)
  
  // 4. Sort by strategy
  if (strategy === 'fifo') {
    activeQueue.sort((a, b) => 
      new Date(a.checked_in_at || a.created_at) - new Date(b.checked_in_at || b.created_at)
    )
  } else {
    activeQueue = sortByPriorityScore(activeQueue)
  }
  
  // 5. Check fairness
  const fairnessCheck = checkFairness(activeQueue)
  
  // 6. Recalculate ETAs
  const queueWithETAs = recalculateAllETAs(activeQueue, avgConsultationTime)
  
  // 7. Check capacity
  const capacity = getQueueAvailability(queueWithETAs)
  
  // 8. Check doctor availability
  const canAccept = canAcceptNewPatients(avgConsultationTime, queueWithETAs.length)
  
  // 9. Get next patient
  const nextPatient = getNextPatientForDoctor(queueWithETAs, doctorStatus)
  
  return {
    queue: queueWithETAs,
    metrics: {
      totalWaiting: queueWithETAs.length,
      averageWaitTime: calculateAverageWait(queueWithETAs),
      fairnessIssues: fairnessCheck,
      capacity,
      canAcceptNewPatients: canAccept
    },
    nextPatient,
    strategy
  }
}

/**
 * Calculate average wait time
 */
const calculateAverageWait = (queue) => {
  if (queue.length === 0) return 0
  
  const totalWait = queue.reduce((sum, p) => sum + (p.estimated_wait_time || 0), 0)
  return Math.round(totalWait / queue.length)
}

// ============================================================
// SIMULATION TESTING SYSTEM
// ============================================================

/**
 * Queue Simulation Class for testing
 */
export class QueueSimulator {
  constructor(config = {}) {
    this.config = {
      patientCount: config.patientCount || 100,
      doctorCount: config.doctorCount || 3,
      consultationTimeMin: config.consultationTimeMin || 5,
      consultationTimeMax: config.consultationTimeMax || 20,
      arrivalDelayMin: config.arrivalDelayMin || -10,
      arrivalDelayMax: config.arrivalDelayMax || 30,
      noShowProbability: config.noShowProbability || 0.1,
      emergencyProbability: config.emergencyProbability || 0.05,
      ...config
    }
    
    this.queue = []
    this.metrics = {
      totalWaitTimes: [],
      maxWaitTime: 0,
      queueLengths: [],
      noShowCount: 0,
      doctorIdleTime: 0,
      emergencyCount: 0
    }
  }

  /**
   * Simulate a single minute of operation
   */
  async simulateMinute() {
    // 1. Add new patients (randomly)
    this.addRandomPatients()
    
    // 2. Update waiting times
    this.updateWaitingTimes()
    
    // 3. Randomly trigger events
    this.triggerRandomEvents()
    
    // 4. Recalculate priority scores
    this.recalculatePriorities()
    
    // 5. Update metrics
    this.updateMetrics()
  }

  /**
   * Add random patients
   */
  addRandomPatients() {
    // Probability of new patient arriving
    if (Math.random() < 0.1) { // 10% chance per minute
      const isEmergency = Math.random() < this.config.emergencyProbability
      const patient = this.createSimulatedPatient(isEmergency)
      this.queue.push(patient)
    }
  }

  /**
   * Create a simulated patient
   */
  createSimulatedPatient(isEmergency = false) {
    const now = new Date()
    const delay = Math.random() * 
      (this.config.arrivalDelayMax - this.config.arrivalDelayMin) + 
      this.config.arrivalDelayMin
    
    return {
      id: `sim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      patientName: `Patient_${Math.random().toString(36).substr(2, 6)}`,
      priority: isEmergency ? 'emergency' : 'normal',
      checked_in_at: new Date(now.getTime() - delay * 60 * 1000).toISOString(),
      created_at: now.toISOString(),
      status: 'waiting',
      skip_count: 0,
      call_retry_count: 0
    }
  }

  /**
   * Update waiting times
   */
  updateWaitingTimes() {
    const now = new Date()
    this.queue.forEach(patient => {
      if (patient.status === 'waiting') {
        patient.minutes_waiting = getMinutesBetween(now, patient.checked_in_at)
      }
    })
  }

  /**
   * Trigger random events
   */
  triggerRandomEvents() {
    // Random no-show
    if (Math.random() < this.config.noShowProbability * 0.01) {
      const waitingPatient = this.queue.find(p => p.status === 'waiting')
      if (waitingPatient) {
        waitingPatient.status = 'no_show'
        this.metrics.noShowCount++
      }
    }

    // Random emergency
    if (Math.random() < this.config.emergencyProbability * 0.1) {
      const emergencyPatient = this.createSimulatedPatient(true)
      emergencyPatient.status = 'waiting'
      this.queue = insertEmergencyPatient(this.queue, emergencyPatient)
      this.metrics.emergencyCount++
    }
  }

  /**
   * Recalculate priorities
   */
  recalculatePriorities() {
    this.queue = sortByPriorityScore(this.queue)
  }

  /**
   * Update simulation metrics
   */
  updateMetrics() {
    const waitingPatients = this.queue.filter(p => p.status === 'waiting')
    
    if (waitingPatients.length > 0) {
      const waitTimes = waitingPatients.map(p => p.minutes_waiting || 0)
      this.metrics.totalWaitTimes.push(...waitTimes)
      this.metrics.maxWaitTime = Math.max(this.metrics.maxWaitTime, ...waitTimes)
    }
    
    this.metrics.queueLengths.push(waitingPatients.length)
  }

  /**
   * Run full simulation
   */
  async runSimulation(minutes = 60) {
    console.log(`Starting simulation for ${minutes} minutes...`)
    
    for (let i = 0; i < minutes; i++) {
      await this.simulateMinute()
      
      // Log progress every 10 minutes
      if (i % 10 === 0) {
        console.log(`Minute ${i}: Queue length = ${this.queue.length}`)
      }
    }
    
    return this.getSimulationResults()
  }

  /**
   * Get simulation results
   */
  getSimulationResults() {
    const avgWaitTime = this.metrics.totalWaitTimes.length > 0
      ? this.metrics.totalWaitTimes.reduce((a, b) => a + b, 0) / this.metrics.totalWaitTimes.length
      : 0
    
    const avgQueueLength = this.metrics.queueLengths.length > 0
      ? this.metrics.queueLengths.reduce((a, b) => a + b, 0) / this.metrics.queueLengths.length
      : 0

    return {
      averageWaitingTime: Math.round(avgWaitTime * 10) / 10,
      maxWaitingTime: this.metrics.maxWaitTime,
      averageQueueLength: Math.round(avgQueueLength * 10) / 10,
      noShowRate: this.metrics.noShowCount / this.config.patientCount,
      emergencyCount: this.metrics.emergencyCount,
      finalQueueLength: this.queue.length,
      doctorIdleTime: this.metrics.doctorIdleTime
    }
  }

  /**
   * Run chaos scenarios
   */
  async runChaosScenario(scenario) {
    console.log(`Running chaos scenario: ${scenario}`)
    
    switch (scenario) {
      case 'all_late':
        // All patients arrive late
        this.queue = Array(50).fill(null).map(() => ({
          ...this.createSimulatedPatient(),
          checked_in_at: new Date(Date.now() - 30 * 60 * 1000).toISOString()
        }))
        break
        
      case 'doctor_slow':
        // Doctor runs 2x slower
        this.config.consultationTimeMax *= 2
        break
        
      case 'emergency_flood':
        // 30% emergency probability
        this.config.emergencyProbability = 0.3
        break
        
      case 'high_no_show':
        // 40% no-show rate
        this.config.noShowProbability = 0.4
        break
        
      case 'peak_overload':
        // Add 300 patients quickly
        for (let i = 0; i < 300; i++) {
          this.queue.push(this.createSimulatedPatient())
        }
        break
    }
    
    return this.runSimulation(60)
  }
}

/**
 * Quick simulation test
 */
export const runQuickSimulation = async () => {
  const simulator = new QueueSimulator({
    patientCount: 100,
    doctorCount: 3,
    consultationTimeMin: 5,
    consultationTimeMax: 20,
    noShowProbability: 0.1,
    emergencyProbability: 0.05
  })
  
  const results = await simulator.runSimulation(60)
  
  console.log('=== Simulation Results ===')
  console.log(`Average Waiting Time: ${results.averageWaitingTime} min`)
  console.log(`Max Waiting Time: ${results.maxWaitingTime} min`)
  console.log(`Average Queue Length: ${results.averageQueueLength}`)
  console.log(`No-Show Rate: ${(results.noShowRate * 100).toFixed(1)}%`)
  console.log(`Emergency Cases: ${results.emergencyCount}`)
  
  return results
}

// ============================================================
// EXPORTS
// ============================================================

export default {
  QUEUE_CONFIG,
  PRIORITY_LEVELS,
  QUEUE_STATUS,
  DOCTOR_STATUS,
  calculatePriorityScore,
  sortByPriorityScore,
  mergeQueues,
  recalculateQueueState,
  QueueSimulator,
  runQuickSimulation,
  // Rule functions
  handleLatePatient,
  checkNoShow,
  insertEmergencyPatient,
  handleDoctorBreak,
  handleConsultationOverrun,
  handleEarlyCompletion,
  reorderQueueByMediator,
  handlePatientNotReady,
  requeueNoShowPatient,
  isQueueAtCapacity,
  getQueueAvailability,
  canAcceptNewPatients,
  adjustSmartBuffer,
  handleCallRetry,
  getActiveQueue,
  applyPhysicalPresencePriority,
  getDynamicQueueStrategy,
  checkFairness,
  checkDoubleBooking,
  getNextPatientForDoctor,
  // Utilities
  getCurrentIST,
  isWithinWorkingHours,
  formatMinutes
}
