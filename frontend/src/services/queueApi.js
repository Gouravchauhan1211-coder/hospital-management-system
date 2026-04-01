// Queue Management System API
// Using Supabase directly for queue operations

import { supabase } from './supabase'
import { getTokenPrefix, formatTokenNumber } from '../utils/tokenPrefix'



// ============================================================
// QUEUE TOKEN APIs
// ============================================================

/**
 * Generate a new queue token for appointment queue
 */
export const generateAppointmentQueueToken = async (appointmentId, doctorId, patientId) => {
  // First, check if a queue entry already exists for this appointment
  const { data: existingQueue, error: checkError } = await supabase
    .from('appointment_queue')
    .select('id, token_number, status')
    .eq('appointment_id', appointmentId)
    .maybeSingle()

  if (existingQueue) {
    // Queue entry already exists, return it
    return { success: true, token: existingQueue }
  }

  // Second check: also check by patient_id to avoid duplicate entries
  const { data: existingByPatient, error: checkError2 } = await supabase
    .from('appointment_queue')
    .select('id, token_number, status')
    .eq('patient_id', patientId)
    .eq('doctor_id', doctorId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existingByPatient) {
    // Another entry exists for this patient/doctor combo, return it
    return { success: true, token: existingByPatient }
  }

  // First, get the current date from the appointment
  const { data: appointmentData, error: aptError } = await supabase
    .from('appointments')
    .select('date')
    .eq('id', appointmentId)
    .single()

  if (aptError) throw new Error('Failed to get appointment details')

  // Get next token number for the doctor on that date using the appointment date
  const appointmentDate = appointmentData.date // This is in 'YYYY-MM-DD' format
  const startOfDay = `${appointmentDate}T00:00:00.000Z`
  const endOfDay = `${appointmentDate}T23:59:59.999Z`
  
  // Try atomic token generation first (preferred after migration)
  // Note: This RPC also creates the queue entry in the database
  let queueCreated = false
  try {
    const { data: tokenResult, error: tokenError } = await supabase.rpc(
      'generate_appointment_token',
      {
        p_doctor_id: doctorId,
        p_patient_id: patientId,
        p_appointment_id: appointmentId
      }
    )
    
    if (!tokenError && tokenResult && tokenResult.length > 0) {
      const result = tokenResult[0]
      // Fetch the created queue entry
      const { data: queueData, error: fetchError } = await supabase
        .from('appointment_queue')
        .select('*')
        .eq('id', result.queue_id)
        .single()
      
      if (!fetchError && queueData) {
        return { success: true, token: queueData }
      }
      queueCreated = true
    }
  } catch (e) {
    console.warn('Atomic token generation not available, using legacy:', e.message)
  }

  // Only use legacy method if RPC didn't create the queue entry
  if (!queueCreated) {
    // Get doctor details to find specialization for token prefix
    let prefix = 'A' // default prefix
    try {
      const { data: doctorData } = await supabase
        .from('doctors')
        .select('specialization')
        .eq('id', doctorId)
        .maybeSingle()
      
      if (doctorData?.specialization) {
        prefix = getTokenPrefix(doctorData.specialization)
      }
    } catch (e) {
      console.warn('Could not fetch doctor specialization:', e.message)
    }

    // Legacy method: Get next token number for the doctor on that date
    // Use token_number as per DB schema (now with department prefix)
    const { data: existingTokens, error: tokensError } = await supabase
      .from('appointment_queue')
      .select('token_number')
      .eq('doctor_id', doctorId)
      .gte('created_at', startOfDay)
      .lte('created_at', endOfDay)

    if (tokensError) throw new Error('Failed to get existing tokens')

    // Find the highest token number with same prefix for today
    const todayTokens = existingTokens?.filter(t => t.token_number?.startsWith(prefix)) || []
    const tokenNumbers = todayTokens?.map(token => parseInt(token.token_number?.replace(prefix, ''))) || []
    const nextNumber = tokenNumbers.length > 0 ? Math.max(...tokenNumbers) + 1 : 1
    
    // Format token with department prefix (e.g., C01, GM03, A05)
    const tokenNumber = formatTokenNumber(nextNumber, prefix)

    // Create queue entry - use token_number as per DB schema
    try {
      const { data, error } = await supabase
        .from('appointment_queue')
        .insert([{
          appointment_id: appointmentId,
          doctor_id: doctorId,
          patient_id: patientId,
          token_number: tokenNumber,
          status: 'waiting'
        }])
        .select()
        .single()

      if (error) {
        // Check if it's a duplicate key error (23505 is PostgreSQL unique violation code)
        if (error.code === '23505' || error.message?.includes('duplicate')) {
          // Fetch the existing entry and return it
          const { data: existing, error: fetchError } = await supabase
            .from('appointment_queue')
            .select('id, token_number, status')
            .eq('appointment_id', appointmentId)
            .maybeSingle()
          
          if (existing) {
            return { success: true, token: existing }
          }
        }
        throw new Error(error.message || 'Failed to generate token')
      }
      return { success: true, token: data }
    } catch (insertError) {
      // If insert failed, try to fetch existing entry
      const { data: existingEntry } = await supabase
        .from('appointment_queue')
        .select('id, token_number, status')
        .eq('appointment_id', appointmentId)
        .maybeSingle()
      
      if (existingEntry) {
        return { success: true, token: existingEntry }
      }
      throw insertError
    }
  }

  // This should not be reached, but just in case
  throw new Error('Failed to generate token')
}

/**
 * Get appointment queue for a doctor
 */
export const getDoctorAppointmentQueue = async (doctorId, date) => {
  // Use local date with timezone adjustment
  const today = new Date(date)
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString()
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString()

  // Fetch all for today, filter client-side
  const { data: rawData, error } = await supabase
    .from('appointment_queue')
    .select('*')
    .eq('doctor_id', doctorId)
    .gte('created_at', startOfDay)
    .lt('created_at', endOfDay)
    .order('token_number', { ascending: true })

  if (error) throw new Error(error.message || 'Failed to fetch queue')

  // Filter client-side for active statuses
  const data = rawData?.filter(q => ['waiting', 'in-progress'].includes(q.status)) || []

  const waiting = data?.filter(q => q.status === 'waiting').length || 0
  const in_consultation = data?.filter(q => q.status === 'in-progress').length || 0
  const completed = 0 // Not included in this query

  return {
    success: true,
    queue: data,
    stats: { waiting, in_consultation, completed }
  }
}

/**
 * Get patient's queue position in appointment queue
 */
export const getPatientAppointmentQueuePosition = async (appointmentId) => {
  const { data: queueData, error: queueError } = await supabase
    .from('appointment_queue')
    .select('id, token_number, status')
    .eq('appointment_id', appointmentId)
    .single()

  if (queueError) throw new Error('Patient not in queue')

  // Get all waiting and in-progress tokens for the same doctor and day
  const { data: appointmentData, error: aptError } = await supabase
    .from('appointments')
    .select('doctor_id, date')
    .eq('id', appointmentId)
    .single()

  if (aptError) throw new Error('Failed to get appointment details')

  const startOfDay = `${appointmentData.date}T00:00:00.000Z`
  const endOfDay = `${appointmentData.date}T23:59:59.999Z`

  // Fetch all for today, filter client-side
  const { data: allQueueDataRaw, error: allQueueError } = await supabase
    .from('appointment_queue')
    .select('token_number, status')
    .eq('doctor_id', appointmentData.doctor_id)
    .gte('created_at', startOfDay)
    .lte('created_at', endOfDay)
    .order('token_number', { ascending: true })

  if (allQueueError) throw new Error('Failed to get queue data')

  // Filter client-side for active statuses
  const allQueueData = allQueueDataRaw?.filter(q => ['waiting', 'in-progress'].includes(q.status)) || []

  const position = allQueueData.findIndex(q => q.token_number === queueData.token_number) + 1

  // Get average consultation time from last 10 completed consultations
  const avgConsultationTime = await calculateAverageConsultationTime(appointmentData.doctor_id)
  const estimatedWaitTime = (position - 1) * avgConsultationTime

  // Calculate estimated start time based on current Indian time
  const now = new Date()
  const istOffset = 5.5 * 60 * 60 * 1000 // 5.5 hours in milliseconds
  const currentIST = new Date(now.getTime() + istOffset)
  const estimatedStartTimeDate = new Date(currentIST.getTime() + estimatedWaitTime * 60 * 1000)
  
  // Format times for display
  const formatISTTime = (date) => {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
      return '--'
    }
    try {
      return date.toLocaleTimeString('en-IN', { 
        hour: '2-digit', 
        minute: '2-digit', 
        hour12: true,
        timeZone: 'Asia/Kolkata'
      })
    } catch (e) {
      return '--'
    }
  }

  const estimatedStartTime = formatISTTime(estimatedStartTimeDate)
  const currentISTTime = formatISTTime(currentIST)

  return {
    success: true,
    tokenNumber: queueData.token_number,
    position,
    estimatedWaitTime,
    estimatedStartTime,
    currentISTTime,
    averageConsultationTime: avgConsultationTime,
    status: queueData.status
  }
}

/**
 * Calculate average consultation time from last 10 completed consultations for a doctor
 * Returns time in minutes
 */
export const calculateAverageConsultationTime = async (doctorId, limit = 10) => {
  try {
    // Get last 10 completed consultations for this doctor
    const { data, error } = await supabase
      .from('appointment_queue')
      .select('consultation_started_at, consultation_completed_at')
      .eq('doctor_id', doctorId)
      .eq('status', 'completed')
      .not('consultation_started_at', 'is', null)
      .not('consultation_completed_at', 'is', null)
      .order('consultation_completed_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error fetching consultation times:', error)
      // Return default 10 minutes if there's an error
      return 10
    }

    if (!data || data.length === 0) {
      // Return default 10 minutes if no completed consultations
      return 10
    }

    // Calculate average consultation time
    let totalMinutes = 0
    let validCount = 0

    data.forEach(record => {
      if (record.consultation_started_at && record.consultation_completed_at) {
        const start = new Date(record.consultation_started_at)
        const end = new Date(record.consultation_completed_at)
        const diffMs = end - start
        const diffMinutes = diffMs / (1000 * 60)
        
        // Only count positive durations
        if (diffMinutes > 0 && diffMinutes < 180) { // Max 3 hours to filter outliers
          totalMinutes += diffMinutes
          validCount++
        }
      }
    })

    // Return default if no valid consultations
    if (validCount === 0) {
      return 10
    }

    const avgMinutes = Math.round(totalMinutes / validCount)
    // Ensure minimum of 5 minutes, maximum of 30 minutes
    return Math.max(5, Math.min(30, avgMinutes))
  } catch (error) {
    console.error('Error calculating average consultation time:', error)
    return 10 // Default fallback
  }
}

/**
 * Call patient for appointment (start consultation)
 * Updates status to 'in-progress' and records consultation start time
 */
export const callPatientAppointment = async (tokenId) => {
  const { data, error } = await supabase
    .from('appointment_queue')
    .update({
      status: 'in-progress',
      consultation_started_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', tokenId)
    .select()
    .single()

  if (error) throw new Error(error.message || 'Failed to call patient')
  return { success: true, token: data }
}

/**
 * Complete appointment consultation
 * Updates status to 'completed' and records consultation end time
 */
export const completeAppointmentConsultation = async (tokenId) => {
  const { data, error } = await supabase
    .from('appointment_queue')
    .update({
      status: 'completed',
      consultation_completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', tokenId)
    .select()
    .single()

  if (error) throw new Error(error.message || 'Failed to complete consultation')
  return { success: true, token: data }
}

/**
 * Get patient's queue tokens from appointment queue
 */
export const getPatientQueue = async (patientId) => {
  const { data, error } = await supabase
    .from('appointment_queue')
    .select('*')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message || 'Failed to fetch patient queue')
  return { success: true, queue: data }
}

// ============================================================
// WALK-IN QUEUE APIs
// ============================================================

/**
 * Generate a new walk-in token
 */
export const addWalkInToken = async (doctorId, patientData) => {
  // Get next token number for the doctor today
  const today = new Date()
  const startOfDay = today.toISOString().split('T')[0] + 'T00:00:00.000Z'
  const endOfDay = today.toISOString().split('T')[0] + 'T23:59:59.999Z'

  const { data: existingTokens, error: tokensError } = await supabase
    .from('walk_in_queue')
    .select('token_number')
    .eq('doctor_id', doctorId)
    .gte('created_at', startOfDay)
    .lte('created_at', endOfDay)

  if (tokensError) throw new Error('Failed to get existing tokens')

  const tokenNumbers = existingTokens?.map(token => parseInt(token.token_number)) || []
  const nextNumber = tokenNumbers.length > 0 ? Math.max(...tokenNumbers) + 1 : 1

  // Create walk-in token
  const { data, error } = await supabase
    .from('walk_in_queue')
    .insert([{
      doctor_id: doctorId,
      patient_name: patientData.patientName,
      patient_phone: patientData.patientPhone || null,
      symptoms: patientData.symptoms || null,
      token_number: nextNumber,
      status: 'waiting',
      priority: patientData.priority || 'normal'
    }])
    .select()
    .single()

  if (error) throw new Error(error.message || 'Failed to generate walk-in token')
  return { success: true, token: data }
}

/**
 * Get walk-in queue for a doctor
 */
export const getDoctorWalkInQueue = async (doctorId) => {
  const { data: rawData, error } = await supabase
    .from('walk_in_queue')
    .select('*')
    .eq('doctor_id', doctorId)
    .order('created_at', { ascending: true })

  if (error) throw new Error(error.message || 'Failed to fetch walk-in queue')

  // Filter client-side for active statuses
  const data = rawData?.filter(q => ['waiting', 'in-progress'].includes(q.status)) || []

  const waiting = data?.filter(q => q.status === 'waiting').length || 0
  const inProgress = data?.filter(q => q.status === 'in-progress').length || 0
  const completed = 0

  return {
    success: true,
    queue: data,
    stats: { waiting, inProgress, completed }
  }
}

/**
 * Get patient's walk-in queue position
 */
export const getPatientWalkInQueuePosition = async (patientPhone) => {
  const { data: queueData, error } = await supabase
    .from('walk_in_queue')
    .select('id, token_number, status, doctor_id, created_at')
    .eq('patient_phone', patientPhone)
    .in('status', ['waiting', 'in-progress'])
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (error || !queueData) {
    return { success: false, error: 'Not in queue' }
  }

  // Get position
  const { data: allQueueData } = await supabase
    .from('walk_in_queue')
    .select('token_number, status')
    .eq('doctor_id', queueData.doctor_id)
    .in('status', ['waiting', 'in-progress'])
    .order('token_number', { ascending: true })

  const position = allQueueData?.findIndex(q => q.token_number === queueData.token_number) + 1 || 1

  return {
    success: true,
    tokenNumber: queueData.token_number,
    position,
    status: queueData.status,
    doctorId: queueData.doctor_id
  }
}

/**
 * Call a patient (update status to in-progress)
 */
export const callPatient = async (tokenId, roomNumber) => {
  const { data, error } = await supabase
    .from('walk_in_queue')
    .update({
      status: 'in-progress',
      called_at: new Date().toISOString()
    })
    .eq('id', tokenId)
    .select()
    .single()

  if (error) throw new Error(error.message || 'Failed to call patient')
  return { success: true, token: data }
}

/**
 * Start consultation (remain in-progress)
 */
export const startConsultation = async (tokenId) => {
  return { success: true, message: 'Consultation already in-progress' }
}

/**
 * Complete consultation
 */
export const completeConsultation = async (tokenId, data) => {
  const { data: result, error } = await supabase
    .from('walk_in_queue')
    .update({
      status: 'completed'
    })
    .eq('id', tokenId)
    .select()
    .single()

  if (error) throw new Error(error.message || 'Failed to complete consultation')
  return { success: true, token: result }
}

/**
 * Cancel token
 */
export const cancelToken = async (tokenId, reason) => {
  const { data, error } = await supabase
    .from('walk_in_queue')
    .update({
      status: 'cancelled'
    })
    .eq('id', tokenId)
    .select()
    .single()

  if (error) throw new Error(error.message || 'Failed to cancel token')
  return { success: true, token: data }
}

/**
 * Mark as no-show
 */
export const markNoShow = async (tokenId) => {
  const { data, error } = await supabase
    .from('walk_in_queue')
    .update({
      status: 'no_show'
    })
    .eq('id', tokenId)
    .select()
    .single()

  if (error) throw new Error(error.message || 'Failed to mark no-show')
  return { success: true, token: data }
}

// ============================================================
// DISPLAY BOARD APIs
// ============================================================

/**
 * Get display board data for branch (Unified for today's active queue)
 */
export const getDisplayBoard = async (branchId, departmentId) => {
  // Since branch_id and department_id don't exist in walk_in_queue, 
  // we fetch all and filter client-side.
  const { data: rawData, error } = await supabase
    .from('walk_in_queue')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) throw new Error(error.message || 'Failed to fetch display board')

  // Filter client-side for active statuses
  const data = rawData?.filter(q => ['waiting', 'in-progress'].includes(q.status)) || []

  const current = data?.find(q => q.status === 'in-progress')
  const waiting = data?.filter(q => q.status === 'waiting').length || 0

  return { success: true, current_token: current, waiting_count: waiting, queue: data }
}

/**
 * Get display board data for doctor
 */
export const getDoctorDisplayBoard = async (doctorId) => {
  // Fetch all and filter client-side
  const { data: rawData, error } = await supabase
    .from('walk_in_queue')
    .select('*')
    .eq('doctor_id', doctorId)
    .order('created_at', { ascending: true })

  if (error) throw new Error(error.message || 'Failed to fetch display board')

  // Filter client-side for active statuses
  const data = rawData?.filter(q => ['waiting', 'in-progress'].includes(q.status)) || []

  const current = data?.find(q => q.status === 'in-progress')
  const waiting = data?.filter(q => q.status === 'waiting').length || 0

  return { success: true, current_token: current, waiting_count: waiting, queue: data }
}

/**
 * Format date to IST time string (HH:MM AM/PM)
 */
const formatISTTime = (date) => {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    return '--'
  }
  try {
    return date.toLocaleTimeString('en-IN', { 
      hour: '2-digit', 
      minute: '2-digit', 
      hour12: true,
      timeZone: 'Asia/Kolkata'
    })
  } catch (e) {
    return '--'
  }
}

// ============================================================
// WAIT TIME API
// ============================================================

/**
 * Get estimated wait time with enhanced logic
 * Uses current patient progress for accurate estimates
 * 
 * @param {string} doctorId - Doctor ID
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {number} delayMinutes - Optional delay offset (doctor running late)
 * @returns {Promise<{success: boolean, waitTimeMinutes: number, patientsAhead: number, estimatedStartTime: string, estimatedStartDate: Date}>}
 */
export const getWaitTime = async (doctorId, date, delayMinutes = 0) => {
  try {
    // Get queue for the doctor
    const { success, queue, stats } = await getDoctorAppointmentQueue(doctorId, date)
    if (!success) {
      throw new Error('Failed to get queue data')
    }

    // Get average consultation time
    const avgConsultationTime = await calculateAverageConsultationTime(doctorId)

    // Calculate patients ahead (waiting only, not in-progress)
    const waitingPatients = queue?.filter(p => p.status === 'waiting') || []
    const patientsAhead = waitingPatients.length

    // Get current patient if exists
    const currentPatient = queue?.find(p => p.status === 'in-progress')
    let currentPatientElapsed = 0

    if (currentPatient?.consultation_started_at) {
      const startTime = new Date(currentPatient.consultation_started_at)
      currentPatientElapsed = Math.floor((Date.now() - startTime.getTime()) / 60000)
    }

    // Calculate wait time using advanced formula:
    // remainingTimeCurrentPatient + (patientsAhead - 1) * avgConsultationTime
    const remainingTimeCurrent = Math.max(0, avgConsultationTime - currentPatientElapsed)
    const totalWaitMinutes = delayMinutes + remainingTimeCurrent + 
      Math.max(0, patientsAhead - 1) * avgConsultationTime

    // Calculate estimated start time
    const now = new Date()
    const estimatedStart = new Date(now.getTime() + totalWaitMinutes * 60000)

    // Format to IST HH:MM
    const formattedTime = formatISTTime(estimatedStart)

    return {
      success: true,
      waitTimeMinutes: totalWaitMinutes,
      patientsAhead,
      estimatedStartTime: formattedTime,
      estimatedStartDate: estimatedStart,
      averageConsultationTime: avgConsultationTime,
      currentPatientElapsed,
      delayMinutes
    }
  } catch (error) {
    console.error('Error calculating wait time:', error)
    return {
      success: false,
      error: error.message,
      waitTimeMinutes: 0,
      patientsAhead: 0,
      estimatedStartTime: '--',
      estimatedStartDate: null
    }
  }
}

// ============================================================
// DEPARTMENT APIs
// ============================================================

/**
 * Get all departments
 */
export const getDepartments = async () => {
  const { data, error } = await supabase
    .from('departments')
    .select('*')
    .order('name')

  if (error) throw new Error(error.message || 'Failed to fetch departments')
  return { success: true, departments: data }
}

/**
 * Get single department
 */
export const getDepartment = async (id) => {
  const { data, error } = await supabase
    .from('departments')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw new Error(error.message || 'Failed to fetch department')
  return { success: true, department: data }
}

/**
 * Create department
 */
export const createDepartment = async (departmentData) => {
  const { data, error } = await supabase
    .from('departments')
    .insert([departmentData])
    .select()
    .single()

  if (error) throw new Error(error.message || 'Failed to create department')
  return { success: true, department: data }
}

/**
 * Update department
 */
export const updateDepartment = async (id, departmentData) => {
  const { data, error } = await supabase
    .from('departments')
    .update(departmentData)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(error.message || 'Failed to update department')
  return { success: true, department: data }
}

/**
 * Delete department
 */
export const deleteDepartment = async (id) => {
  const { error } = await supabase
    .from('departments')
    .delete()
    .eq('id', id)

  if (error) throw new Error(error.message || 'Failed to delete department')
  return { success: true }
}

// ============================================================
// BRANCH APIs
// ============================================================

/**
 * Get all branches
 */
export const getBranches = async () => {
  try {
    const { data, error } = await supabase
      .from('branches')
      .select('*')
      .order('name')
    if (error) throw error
    return { success: true, branches: data }
  } catch (err) {
    return { success: true, branches: [{ id: 'main', name: 'Main Branch' }] }
  }
}

/**
 * Get single branch
 */
export const getBranch = async (id) => {
  const { data, error } = await supabase
    .from('branches')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw new Error(error.message || 'Failed to fetch branch')
  return { success: true, branch: data }
}

/**
 * Create branch
 */
export const createBranch = async (branchData) => {
  const { data, error } = await supabase
    .from('branches')
    .insert([branchData])
    .select()
    .single()

  if (error) throw new Error(error.message || 'Failed to create branch')
  return { success: true, branch: data }
}

/**
 * Update branch
 */
export const updateBranch = async (id, branchData) => {
  const { data, error } = await supabase
    .from('branches')
    .update(branchData)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(error.message || 'Failed to update branch')
  return { success: true, branch: data }
}

/**
 * Delete branch
 */
export const deleteBranch = async (id) => {
  const { error } = await supabase
    .from('branches')
    .delete()
    .eq('id', id)

  if (error) throw new Error(error.message || 'Failed to delete branch')
  return { success: true }
}

// ============================================================
// PATIENT QUEUE DETAILS - Get comprehensive queue info for a patient
// ============================================================

/**
 * Get comprehensive queue details for a patient with today's appointment
 * Includes: doctor info, token number, current token, patients ahead, estimated wait, next patient
 */
export const getPatientQueueDetails = async (patientId, doctorId, date) => {
  try {
    const startOfDay = `${date}T00:00:00.000Z`
    const endOfDay = `${date}T23:59:59.999Z`

    // Get doctor's info
    const { data: doctorData } = await supabase
      .from('profiles')
      .select('full_name, specialization')
      .eq('id', doctorId)
      .maybeSingle()

    // Get patient's token in appointment queue
    const { data: patientTokenRaw } = await supabase
      .from('appointment_queue')
      .select('id, token_number, status, created_at')
      .eq('patient_id', patientId)
      .eq('doctor_id', doctorId)
      .gte('created_at', startOfDay)
      .lte('created_at', endOfDay)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    // Filter client-side for active statuses
    const patientToken = patientTokenRaw && ['waiting', 'in-progress'].includes(patientTokenRaw.status) ? patientTokenRaw : null

    // Get all tokens in queue for this doctor today (fetch all, filter client-side)
    const { data: allTokensRaw } = await supabase
      .from('appointment_queue')
      .select('id, token_number, status, patient_id')
      .eq('doctor_id', doctorId)
      .gte('created_at', startOfDay)
      .lte('created_at', endOfDay)
      .order('token_number', { ascending: true })

    // Filter client-side for active statuses
    const allTokens = allTokensRaw?.filter(t => ['waiting', 'in-progress'].includes(t.status)) || []

    // Find current token being served (in-progress)
    const currentToken = allTokens?.find(t => t.status === 'in-progress')

    // Find next patient (first waiting after current)
    const nextToken = allTokens?.find(t => t.status === 'waiting')

    // Calculate patients ahead
    let patientsAhead = 0
    let yourPosition = 0
    if (patientToken) {
      const sortedTokens = [...(allTokens || [])].sort((a, b) => {
        const aNum = a.token_number
        const bNum = b.token_number
        return aNum - bNum
      })
      yourPosition = sortedTokens.findIndex(t => t.id === patientToken.id) + 1
      const currentIndex = sortedTokens.findIndex(t => t.status === 'in-progress')
      patientsAhead = currentIndex >= 0 ? yourPosition - currentIndex - 1 : yourPosition - 1
      if (patientsAhead < 0) patientsAhead = 0
    }

    // Get average consultation time from last 10 completed consultations
    const avgConsultationTime = await calculateAverageConsultationTime(doctorId)
    const consultationTime = avgConsultationTime > 0 ? avgConsultationTime : 15
    const estimatedWaitTime = patientsAhead * consultationTime

    // Calculate estimated start time based on current Indian time
    const now = new Date()
    const istOffset = 5.5 * 60 * 60 * 1000 // 5.5 hours in milliseconds
    const currentIST = new Date(now.getTime() + istOffset)
    const estimatedStartTimeDate = new Date(currentIST.getTime() + estimatedWaitTime * 60 * 1000)
    
    // Format times for display
    const formatISTTime = (date) => {
      if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
        return '--'
      }
      try {
        return date.toLocaleTimeString('en-IN', { 
          hour: '2-digit', 
          minute: '2-digit', 
          hour12: true,
          timeZone: 'Asia/Kolkata'
        })
      } catch (e) {
        return '--'
      }
    }

    const estimatedStartTime = formatISTTime(estimatedStartTimeDate)
    const currentISTTime = formatISTTime(currentIST)

    return {
      success: true,
      queueDetails: {
        doctorName: doctorData?.full_name || 'Doctor',
        doctorSpecialization: doctorData?.specialization || 'General',
        tokenNumber: patientToken?.token_number || null,
        currentToken: currentToken?.token_number || null,
        nextToken: nextToken?.token_number || null,
        patientsAhead,
        yourPosition,
        estimatedWaitTime,
        estimatedStartTime,
        currentISTTime,
        averageConsultationTime: consultationTime,
        status: patientToken?.status || 'not_in_queue'
      }
    }
  } catch (error) {
    console.error('Error getting patient queue details:', error)
    return { success: false, error: error.message, queueDetails: null }
  }
}

/**
 * Get patient's appointment queue position
 */
export const getPatientAppointmentPosition = async (patientId, doctorId, date) => {
  try {
    // Use local timezone for date queries
    const localDate = new Date(date + 'T00:00:00')
    const startOfDay = new Date(localDate.getTime() - localDate.getTimezoneOffset() * 60000).toISOString()
    const endOfDay = new Date(localDate.getTime() + (24 * 60 * 60 * 1000) - 1 - localDate.getTimezoneOffset() * 60000).toISOString()

    // Get current IST time - use toLocaleString to get correct IST representation
    const now = new Date()
    const currentISTStr = now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
    const currentIST = new Date(currentISTStr)

    // First, get the appointment details to know the scheduled time
    const { data: appointmentData } = await supabase
      .from('appointments')
      .select('id, date, time, status')
      .eq('patient_id', patientId)
      .eq('doctor_id', doctorId)
      .eq('date', date)
      .in('status', ['pending', 'accepted', 'confirmed'])
      .maybeSingle()

    // Get patient's token
    const { data: patientTokenRaw } = await supabase
      .from('appointment_queue')
      .select('id, token_number, status, created_at')
      .eq('patient_id', patientId)
      .eq('doctor_id', doctorId)
      .gte('created_at', startOfDay)
      .lte('created_at', endOfDay)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    // Filter client-side for active statuses
    const patientToken = patientTokenRaw && ['waiting', 'in-progress'].includes(patientTokenRaw.status) ? patientTokenRaw : null

    // Calculate time until appointment
    let timeUntilAppointment = 0
    if (appointmentData?.time) {
      const [hours, minutes] = appointmentData.time.split(':').map(Number)
      const appointmentDateTime = new Date(currentIST)
      appointmentDateTime.setHours(hours, minutes, 0, 0)
      
      // If appointment time is in the past today, set to 0
      if (appointmentDateTime < currentIST) {
        timeUntilAppointment = 0
      } else {
        timeUntilAppointment = Math.round((appointmentDateTime - currentIST) / (1000 * 60)) // minutes
      }
    }

    // If no token and no appointment, not in queue
    if (!patientToken && !appointmentData) {
      return { success: true, inQueue: false, queueDetails: null }
    }

    // If has appointment but not checked in (no token), show time until appointment
    if (!patientToken && appointmentData) {
      // Get doctor info
      const { data: doctorData } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', doctorId)
        .maybeSingle()

      const { data: doctorSpecialization } = await supabase
        .from('doctors')
        .select('specialization')
        .eq('id', doctorId)
        .maybeSingle()

      // Calculate estimated start time
      // If appointment time + wait is in the past, use current time + wait
      console.log('DEBUG appointmentData.time:', appointmentData?.time)
      console.log('DEBUG currentIST:', currentIST)
      let estimatedStartTimeValue = '--'
      if (appointmentData?.time) {
        const timeParts = appointmentData.time.split(':')
        const hours = parseInt(timeParts[0], 10)
        const minutes = timeParts[1] ? parseInt(timeParts[1], 10) : 0
        console.log('DEBUG hours:', hours, 'minutes:', minutes)
        
        // Get today's date at midnight, then set the hours and minutes
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        console.log('DEBUG today midnight:', today)
        
        // Create appointment date object
        const appointmentDateTime = new Date(today.getTime() + hours * 60 * 60 * 1000 + minutes * 60 * 1000)
        console.log('DEBUG appointmentDateTime:', appointmentDateTime)
        
        // Add default wait time (15 min) if appointment passed
        const expectedFromAppointment = new Date(appointmentDateTime.getTime() + 15 * 60 * 1000)
        console.log('DEBUG expectedFromAppointment:', expectedFromAppointment)
        
        if (appointmentDateTime < currentIST) {
          console.log('DEBUG: appointment passed, using current time')
          // Use current time + 15 min wait
          estimatedStartTimeValue = new Date(currentIST.getTime() + 15 * 60 * 1000)
          console.log('DEBUG estimatedStartTimeValue (passed):', estimatedStartTimeValue)
        } else {
          console.log('DEBUG: appointment not passed, using appointment time')
          // Use appointment time
          estimatedStartTimeValue = appointmentDateTime
          console.log('DEBUG estimatedStartTimeValue (not passed):', estimatedStartTimeValue)
        }
      }

      const formatISTTime = (date) => {
        if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
          return '--'
        }
        try {
          return date.toLocaleTimeString('en-IN', { 
            hour: '2-digit', 
            minute: '2-digit', 
            hour12: true,
            timeZone: 'Asia/Kolkata'
          })
        } catch (e) {
          return '--'
        }
      }

      return {
        success: true,
        inQueue: false,
        queueDetails: {
          doctorName: doctorData?.full_name || 'Doctor',
          doctorSpecialization: doctorSpecialization?.specialization || 'General',
          hasAppointment: true,
          appointmentTime: appointmentData?.time || null,
          timeUntilAppointment,
          estimatedWaitTime: timeUntilAppointment,
          estimatedStartTime: estimatedStartTimeValue instanceof Date ? formatISTTime(estimatedStartTimeValue) : '--',
          currentISTTime: currentIST.toLocaleTimeString('en-IN', { 
            hour: '2-digit', 
            minute: '2-digit', 
            hour12: true,
            timeZone: 'Asia/Kolkata'
          }),
          status: 'appointment-not-checked-in'
        }
      }
    }

    // Get all tokens (fetch all, filter client-side)
    const { data: allTokensRaw } = await supabase
      .from('appointment_queue')
      .select('id, token_number, status')
      .eq('doctor_id', doctorId)
      .gte('created_at', startOfDay)
      .lte('created_at', endOfDay)
      .order('token_number', { ascending: true })

    // Filter client-side for active statuses
    const allTokens = allTokensRaw?.filter(t => ['waiting', 'in-progress'].includes(t.status)) || []

    const currentToken = allTokens?.find(t => t.status === 'in-progress')
    const nextToken = allTokens?.find(t => t.status === 'waiting')

    const sortedTokens = [...(allTokens || [])].sort((a, b) => {
      const aNum = a.token_number
      const bNum = b.token_number
      return aNum - bNum
    })

    const yourPosition = sortedTokens.findIndex(t => t.id === patientToken.id) + 1
    const currentIndex = sortedTokens.findIndex(t => t.status === 'in-progress')
    let patientsAhead = currentIndex >= 0 ? yourPosition - currentIndex - 1 : yourPosition - 1
    if (patientsAhead < 0) patientsAhead = 0

    // Get average consultation time from last 10 completed consultations
    const avgConsultationTime = await calculateAverageConsultationTime(doctorId)
    const consultationTime = avgConsultationTime > 0 ? avgConsultationTime : 15
    const queueWaitTime = patientsAhead * consultationTime
    
    // Smart waiting time: time until appointment + queue wait time
    // If timeUntilAppointment > queueWaitTime, show timeUntilAppointment (patient should come at their appointment time)
    // Otherwise show queueWaitTime (they can come earlier and wait)
    let smartEstimatedWaitTime = Math.max(timeUntilAppointment, queueWaitTime)
    
    // Guard against NaN
    if (isNaN(smartEstimatedWaitTime) || !isFinite(smartEstimatedWaitTime)) {
      smartEstimatedWaitTime = patientsAhead * 15 // fallback to 15 min per patient
    }
    
    // Calculate estimated start time based on appointment time or current time
    // If has appointment time and it's not in the past, use appointment time + smart wait time
    // If appointment time + wait time is already past, use current time + wait time
    // This ensures patient knows when they'll be seen based on their scheduled time
    console.log('DEBUG2: appointmentData?.time:', appointmentData?.time)
    console.log('DEBUG2: smartEstimatedWaitTime:', smartEstimatedWaitTime)
    let estimatedStartTimeDate
    if (appointmentData?.time) {
      // Parse appointment time (format: "HH:MM" or "HH:MM:SS")
      const timeParts = appointmentData.time.split(':')
      const hours = parseInt(timeParts[0], 10)
      const minutes = timeParts[1] ? parseInt(timeParts[1], 10) : 0
      console.log('DEBUG2: hours:', hours, 'minutes:', minutes)
      
      // Get today's date at midnight, then set the hours and minutes
      // This ensures we don't accidentally create tomorrow's date
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      console.log('DEBUG2: today midnight:', today)
      
      // Create appointment date object by adding to today's midnight
      const appointmentDateTime = new Date(today.getTime() + hours * 60 * 60 * 1000 + minutes * 60 * 1000)
      console.log('DEBUG2: appointmentDateTime:', appointmentDateTime)
      
      // Calculate expected time from appointment
      const expectedFromAppointment = new Date(appointmentDateTime.getTime() + smartEstimatedWaitTime * 60 * 1000)
      console.log('DEBUG2: expectedFromAppointment:', expectedFromAppointment)
      
      // If expected time is in the past, use current time instead
      if (expectedFromAppointment < currentIST) {
        console.log('DEBUG2: expected time passed, using current time')
        estimatedStartTimeDate = new Date(currentIST.getTime() + smartEstimatedWaitTime * 60 * 1000)
      } else {
        console.log('DEBUG2: expected time not passed, using appointment + wait')
        estimatedStartTimeDate = expectedFromAppointment
      }
    } else {
      // No appointment - use current time + smart wait time
      console.log('DEBUG2: no appointment time, using current time')
      estimatedStartTimeDate = new Date(currentIST.getTime() + smartEstimatedWaitTime * 60 * 1000)
    }
    console.log('DEBUG2: final estimatedStartTimeDate:', estimatedStartTimeDate)
    
    // Format times for display
    const formatISTTime = (date) => {
      if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
        return '--'
      }
      try {
        return date.toLocaleTimeString('en-IN', { 
          hour: '2-digit', 
          minute: '2-digit', 
          hour12: true,
          timeZone: 'Asia/Kolkata'
        })
      } catch (e) {
        return '--'
      }
    }
    
    const estimatedStartTime = formatISTTime(estimatedStartTimeDate)
    const currentISTTime = formatISTTime(currentIST)
    
    // Get doctor info
    const { data: doctorData } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', doctorId)
      .maybeSingle()
    
    // Get specialization from doctors table
    const { data: doctorSpecialization } = await supabase
      .from('doctors')
      .select('specialization')
      .eq('id', doctorId)
      .maybeSingle()

    return {
      success: true,
      inQueue: true,
      queueDetails: {
        doctorName: doctorData?.full_name || 'Doctor',
        doctorSpecialization: doctorSpecialization?.specialization || 'General',
        hasAppointment: !!appointmentData,
        appointmentTime: appointmentData?.time || null,
        tokenNumber: String(patientToken.token_number),
        currentToken: currentToken?.token_number ? String(currentToken.token_number) : null,
        nextToken: nextToken?.token_number ? String(nextToken.token_number) : null,
        patientsAhead,
        yourPosition,
        estimatedWaitTime: smartEstimatedWaitTime,
        estimatedStartTime,
        currentISTTime,
        averageConsultationTime: consultationTime,
        status: patientToken.status
      }
    }
  } catch (error) {
    console.error('Error getting appointment position:', error)
    return { success: false, error: error.message, inQueue: false, queueDetails: null }
  }
}

/**
 * Get patient's walk-in queue details
 */
export const getPatientWalkInQueueDetails = async (patientId, patientName) => {
  try {
    // Get patient's walk-in token
    const { data: patientTokenRaw, error: tableError } = await supabase
      .from('walk_in_queue')
      .select('*')
      .eq('patient_name', patientName)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    // Filter client-side for active statuses
    const patientToken = patientTokenRaw && ['waiting', 'in-progress'].includes(patientTokenRaw.status) ? patientTokenRaw : null

    // If table doesn't exist (404), return not in queue
    if (tableError && tableError.code === 'PGRST116') {
      return { success: true, inQueue: false, error: 'Walk-in queue not available', queueDetails: null }
    }

    // Handle other errors
    if (tableError) {
      console.warn('Walk-in queue table error:', tableError.message)
      return { success: true, inQueue: false, error: tableError.message, queueDetails: null }
    }

    if (!patientToken) {
      return { success: true, inQueue: false, error: 'Not in walk-in queue', queueDetails: null }
    }

    // Get doctor info if assigned
    let doctorName = patientToken.doctor_name || 'Unassigned'
    let doctorSpecialization = ''
    
    if (patientToken.doctor_id) {
      const { data: doctorData } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', patientToken.doctor_id)
        .single()
      
      // Get specialization from doctors table
      const { data: doctorSpecData } = await supabase
        .from('doctors')
        .select('specialization')
        .eq('id', patientToken.doctor_id)
        .maybeSingle()
      
      if (doctorData) {
        doctorName = doctorData.full_name
        doctorSpecialization = doctorSpecData?.specialization || ''
      }
    }

    // Get all tokens for this doctor
    let allTokens = []
    if (patientToken.doctor_id) {
      const { data: tokensDataRaw } = await supabase
        .from('walk_in_queue')
        .select('id, token, status')
        .eq('doctor_id', patientToken.doctor_id)
        .order('created_at', { ascending: true })

      // Filter client-side for active statuses
      allTokens = tokensDataRaw?.filter(t => ['waiting', 'in-progress'].includes(t.status)) || []
    } else {
      // No doctor assigned yet, show all waiting
      const { data: tokensData } = await supabase
        .from('walk_in_queue')
        .select('id, token, status')
        .eq('status', 'waiting')
        .order('created_at', { ascending: true })

      allTokens = tokensData || []
    }

    // Find current token being served
    const currentToken = allTokens.find(t => t.status === 'in-progress')

    // Find next patient
    const nextToken = allTokens.find(t => t.status === 'waiting')

    // Calculate position and patients ahead
    const yourIndex = allTokens.findIndex(t => t.id === patientToken.id)
    const yourPosition = yourIndex >= 0 ? yourIndex + 1 : 1
    const currentIndex = allTokens.findIndex(t => t.status === 'in-progress')
    const patientsAhead = currentIndex >= 0 ? yourIndex - currentIndex - 1 : yourIndex
    const finalPatientsAhead = patientsAhead >= 0 ? patientsAhead : 0

    // Calculate estimated wait time
    const AVG_CONSULT_MINUTES = 15
    let estimatedWaitTime = finalPatientsAhead * AVG_CONSULT_MINUTES
    
    // Guard against NaN
    if (isNaN(estimatedWaitTime) || !isFinite(estimatedWaitTime)) {
      estimatedWaitTime = finalPatientsAhead > 0 ? finalPatientsAhead * 15 : 0
    }

    return {
      success: true,
      inQueue: true,
      queueDetails: {
        doctorName,
        doctorSpecialization,
        tokenNumber: String(patientToken.token),
        currentToken: currentToken?.token ? String(currentToken.token) : null,
        nextToken: nextToken?.token ? String(nextToken.token) : null,
        patientsAhead: finalPatientsAhead,
        yourPosition,
        estimatedWaitTime,
        status: patientToken.status,
        isWalkIn: true
      }
    }
  } catch (error) {
    console.error('Error getting walk-in queue details:', error)
    return { success: false, error: error.message, inQueue: false, queueDetails: null }
  }
}

// ============================================================
// ALIAS EXPORTS for backward compatibility
// ============================================================

export const getDoctorQueue = getDoctorAppointmentQueue
export const generateQueueToken = generateAppointmentQueueToken









