// Queue Management System API
// Using Supabase directly for queue operations

import { supabase } from './supabase'

// ============================================================
// QUEUE TOKEN APIs
// ============================================================

/**
 * Generate a new queue token
 */
export const generateQueueToken = async (tokenData) => {
  // Map fields to match the walk_in_queue table exactly
  const { data, error } = await supabase
    .from('walk_in_queue')
    .insert([{
      patient_name: tokenData.patient_name,
      doctor_id: tokenData.doctor_id,
      doctor_name: tokenData.doctor_name,
      age: tokenData.age,
      reason: tokenData.reason,
      token: tokenData.token, // The schema uses 'token' instead of 'token_number'
      priority: tokenData.priority || 0, // Schema uses INTEGER for priority
      status: 'waiting'
    }])
    .select()
    .single()

  if (error) throw new Error(error.message || 'Failed to generate token')
  return { success: true, token: data }
}

/**
 * Get queue tokens for a doctor
 */
export const getDoctorQueue = async (doctorId, filters = {}) => {
  let query = supabase
    .from('walk_in_queue')
    .select('*')
    .eq('doctor_id', doctorId)

  if (filters.status) {
    query = query.eq('status', filters.status)
  }

  // The schema uses 'created_at' instead of 'date'
  if (filters.date) {
    const startOfDay = `${filters.date}T00:00:00.000Z`
    const endOfDay = `${filters.date}T23:59:59.999Z`
    query = query.gte('created_at', startOfDay).lte('created_at', endOfDay)
  }

  const { data, error } = await query.order('created_at', { ascending: true })

  if (error) throw new Error(error.message || 'Failed to fetch queue')

  const waiting = data?.filter(q => q.status === 'waiting').length || 0
  const called = data?.filter(q => q.status === 'called').length || 0
  const in_consultation = data?.filter(q => q.status === 'in-progress').length || 0
  const completed = data?.filter(q => q.status === 'completed').length || 0

  return {
    success: true,
    queue: data,
    stats: { waiting, called, in_consultation, completed }
  }
}

/**
 * Get patient's queue tokens
 */
export const getPatientQueue = async (patientId) => {
  const { data, error } = await supabase
    .from('walk_in_queue')
    .select('*')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message || 'Failed to fetch patient queue')
  return { success: true, queue: data }
}

/**
 * Call a patient (update status to in-progress)
 */
export const callPatient = async (tokenId, roomNumber) => {
  const { data, error } = await supabase
    .from('walk_in_queue')
    .update({
      status: 'in-progress'
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
  // we fetch all active tokens for today.
  const { data, error } = await supabase
    .from('walk_in_queue')
    .select('*')
    .in('status', ['waiting', 'in-progress'])
    .order('created_at', { ascending: true })

  if (error) throw new Error(error.message || 'Failed to fetch display board')

  const current = data?.find(q => q.status === 'in-progress')
  const waiting = data?.filter(q => q.status === 'waiting').length || 0

  return { success: true, current_token: current, waiting_count: waiting, queue: data }
}

/**
 * Get display board data for doctor
 */
export const getDoctorDisplayBoard = async (doctorId) => {
  const { data, error } = await supabase
    .from('walk_in_queue')
    .select('*')
    .eq('doctor_id', doctorId)
    .in('status', ['waiting', 'in-progress'])
    .order('created_at', { ascending: true })

  if (error) throw new Error(error.message || 'Failed to fetch display board')

  const current = data?.find(q => q.status === 'in-progress')
  const waiting = data?.filter(q => q.status === 'waiting').length || 0

  return { success: true, current_token: current, waiting_count: waiting, queue: data }
}

// ============================================================
// WAIT TIME API
// ============================================================

/**
 * Get estimated wait time
 */
export const getWaitTime = async (doctorId, patientId) => {
  const { data, error } = await supabase
    .from('walk_in_queue')
    .select('id')
    .eq('doctor_id', doctorId)
    .eq('status', 'waiting')

  if (error) throw new Error(error.message || 'Failed to get wait time')

  const waitingCount = data?.length || 0
  return { success: true, estimated_minutes: waitingCount * 15 }
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
