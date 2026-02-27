// Queue Management System API
// This file contains API functions for the Advanced Queue Management System

import { supabase } from './supabase'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

// Helper function to get auth token
const getAuthHeaders = async () => {
  const { data: { session } } = await supabase.auth.getSession()
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session?.access_token}`
  }
}

// ============================================================
// QUEUE TOKEN APIs
// ============================================================

/**
 * Generate a new queue token
 * @param {Object} tokenData - Token data
 * @param {string} tokenData.patient_id - Patient ID
 * @param {string} tokenData.doctor_id - Doctor ID
 * @param {string} tokenData.branch_id - Branch ID
 * @param {string} tokenData.department_id - Department ID
 * @param {string} [tokenData.appointment_id] - Appointment ID (optional)
 * @param {string} [tokenData.queue_type] - Queue type: walk_in, appointment, emergency
 * @param {string} [tokenData.priority] - Priority: emergency, high, normal, follow-up
 */
export const generateQueueToken = async (tokenData) => {
  const response = await fetch(`${API_URL}/queue/tokens`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify(tokenData)
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || 'Failed to generate token')
  return data
}

/**
 * Get queue tokens for a doctor
 * @param {string} doctorId - Doctor ID
 * @param {Object} filters - Optional filters (date, status)
 */
export const getDoctorQueue = async (doctorId, filters = {}) => {
  const params = new URLSearchParams(filters).toString()
  const response = await fetch(`${API_URL}/queue/doctor/${doctorId}?${params}`, {
    headers: await getAuthHeaders()
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || 'Failed to fetch queue')
  return data
}

/**
 * Get patient's queue tokens
 * @param {string} patientId - Patient ID
 */
export const getPatientQueue = async (patientId) => {
  const response = await fetch(`${API_URL}/queue/patient/${patientId}`, {
    headers: await getAuthHeaders()
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || 'Failed to fetch patient queue')
  return data
}

/**
 * Call a patient (update status to called)
 * @param {string} tokenId - Token ID
 * @param {string} [roomNumber] - Room number
 */
export const callPatient = async (tokenId, roomNumber) => {
  const response = await fetch(`${API_URL}/queue/tokens/${tokenId}/call`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify({ room_number: roomNumber })
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || 'Failed to call patient')
  return data
}

/**
 * Start consultation (update status to in_consultation)
 * @param {string} tokenId - Token ID
 */
export const startConsultation = async (tokenId) => {
  const response = await fetch(`${API_URL}/queue/tokens/${tokenId}/start`, {
    method: 'POST',
    headers: await getAuthHeaders()
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || 'Failed to start consultation')
  return data
}

/**
 * Complete consultation
 * @param {string} tokenId - Token ID
 * @param {Object} data - Completion data
 */
export const completeConsultation = async (tokenId, data) => {
  const response = await fetch(`${API_URL}/queue/tokens/${tokenId}/complete`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify(data)
  })
  const result = await response.json()
  if (!response.ok) throw new Error(result.error || 'Failed to complete consultation')
  return result
}

/**
 * Cancel token
 * @param {string} tokenId - Token ID
 * @param {string} reason - Cancellation reason
 */
export const cancelToken = async (tokenId, reason) => {
  const response = await fetch(`${API_URL}/queue/tokens/${tokenId}/cancel`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify({ reason })
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || 'Failed to cancel token')
  return data
}

/**
 * Mark as no-show
 * @param {string} tokenId - Token ID
 */
export const markNoShow = async (tokenId) => {
  const response = await fetch(`${API_URL}/queue/tokens/${tokenId}/no-show`, {
    method: 'POST',
    headers: await getAuthHeaders()
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || 'Failed to mark no-show')
  return data
}

// ============================================================
// DISPLAY BOARD APIs
// ============================================================

/**
 * Get display board data for branch
 * @param {string} branchId - Branch ID
 * @param {string} [departmentId] - Department ID (optional)
 */
export const getDisplayBoard = async (branchId, departmentId) => {
  const params = departmentId ? `?department_id=${departmentId}` : ''
  const response = await fetch(`${API_URL}/queue/display/branch/${branchId}${params}`, {
    headers: await getAuthHeaders()
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || 'Failed to fetch display board')
  return data
}

/**
 * Get display board data for doctor
 * @param {string} doctorId - Doctor ID
 */
export const getDoctorDisplayBoard = async (doctorId) => {
  const response = await fetch(`${API_URL}/queue/display/doctor/${doctorId}`, {
    headers: await getAuthHeaders()
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || 'Failed to fetch display board')
  return data
}

// ============================================================
// WAIT TIME API
// ============================================================

/**
 * Get estimated wait time
 * @param {string} doctorId - Doctor ID
 * @param {string} [patientId] - Patient ID (optional)
 */
export const getWaitTime = async (doctorId, patientId) => {
  const params = new URLSearchParams({ doctor_id: doctorId })
  if (patientId) params.append('patient_id', patientId)
  const response = await fetch(`${API_URL}/queue/wait-time?${params}`, {
    headers: await getAuthHeaders()
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || 'Failed to get wait time')
  return data
}

// ============================================================
// DEPARTMENT APIs
// ============================================================

/**
 * Get all departments
 */
export const getDepartments = async () => {
  const response = await fetch(`${API_URL}/departments`, {
    headers: await getAuthHeaders()
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || 'Failed to fetch departments')
  return data
}

/**
 * Get single department
 * @param {string} id - Department ID
 */
export const getDepartment = async (id) => {
  const response = await fetch(`${API_URL}/departments/${id}`, {
    headers: await getAuthHeaders()
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || 'Failed to fetch department')
  return data
}

/**
 * Create department
 * @param {Object} departmentData - Department data
 */
export const createDepartment = async (departmentData) => {
  const response = await fetch(`${API_URL}/departments`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify(departmentData)
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || 'Failed to create department')
  return data
}

/**
 * Update department
 * @param {string} id - Department ID
 * @param {Object} updates - Updates to apply
 */
export const updateDepartment = async (id, updates) => {
  const response = await fetch(`${API_URL}/departments/${id}`, {
    method: 'PUT',
    headers: await getAuthHeaders(),
    body: JSON.stringify(updates)
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || 'Failed to update department')
  return data
}

/**
 * Delete department
 * @param {string} id - Department ID
 */
export const deleteDepartment = async (id) => {
  const response = await fetch(`${API_URL}/departments/${id}`, {
    method: 'DELETE',
    headers: await getAuthHeaders()
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || 'Failed to delete department')
  return data
}

/**
 * Get doctors by department
 * @param {string} departmentId - Department ID
 */
export const getDepartmentDoctors = async (departmentId) => {
  const response = await fetch(`${API_URL}/departments/${departmentId}/doctors`, {
    headers: await getAuthHeaders()
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || 'Failed to fetch department doctors')
  return data
}

// ============================================================
// BRANCH APIs
// ============================================================

/**
 * Get all branches
 */
export const getBranches = async () => {
  const response = await fetch(`${API_URL}/branches`, {
    headers: await getAuthHeaders()
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || 'Failed to fetch branches')
  return data
}

/**
 * Get single branch
 * @param {string} id - Branch ID
 */
export const getBranch = async (id) => {
  const response = await fetch(`${API_URL}/branches/${id}`, {
    headers: await getAuthHeaders()
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || 'Failed to fetch branch')
  return data
}

/**
 * Create branch
 * @param {Object} branchData - Branch data
 */
export const createBranch = async (branchData) => {
  const response = await fetch(`${API_URL}/branches`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify(branchData)
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || 'Failed to create branch')
  return data
}

/**
 * Update branch
 * @param {string} id - Branch ID
 * @param {Object} updates - Updates to apply
 */
export const updateBranch = async (id, updates) => {
  const response = await fetch(`${API_URL}/branches/${id}`, {
    method: 'PUT',
    headers: await getAuthHeaders(),
    body: JSON.stringify(updates)
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || 'Failed to update branch')
  return data
}

/**
 * Delete branch
 * @param {string} id - Branch ID
 */
export const deleteBranch = async (id) => {
  const response = await fetch(`${API_URL}/branches/${id}`, {
    method: 'DELETE',
    headers: await getAuthHeaders()
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || 'Failed to delete branch')
  return data
}

/**
 * Get doctors at branch
 * @param {string} branchId - Branch ID
 */
export const getBranchDoctors = async (branchId) => {
  const response = await fetch(`${API_URL}/branches/${branchId}/doctors`, {
    headers: await getAuthHeaders()
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || 'Failed to fetch branch doctors')
  return data
}

/**
 * Assign doctor to branch
 * @param {string} branchId - Branch ID
 * @param {Object} assignmentData - Assignment data
 */
export const assignDoctorToBranch = async (branchId, assignmentData) => {
  const response = await fetch(`${API_URL}/branches/${branchId}/doctors`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify(assignmentData)
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || 'Failed to assign doctor to branch')
  return data
}

/**
 * Remove doctor from branch
 * @param {string} branchId - Branch ID
 * @param {string} doctorId - Doctor ID
 */
export const removeDoctorFromBranch = async (branchId, doctorId) => {
  const response = await fetch(`${API_URL}/branches/${branchId}/doctors/${doctorId}`, {
    method: 'DELETE',
    headers: await getAuthHeaders()
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || 'Failed to remove doctor from branch')
  return data
}

// ============================================================
// QUEUE STATUS UTILITIES
// ============================================================

/**
 * Get status color for queue token
 * @param {string} status - Token status
 */
export const getQueueStatusColor = (status) => {
  const colors = {
    waiting: 'bg-amber-100 text-amber-700 border-amber-200',
    called: 'bg-blue-100 text-blue-700 border-blue-200',
    in_consultation: 'bg-purple-100 text-purple-700 border-purple-200',
    completed: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    cancelled: 'bg-red-100 text-red-700 border-red-200',
    no_show: 'bg-gray-100 text-gray-700 border-gray-200'
  }
  return colors[status] || 'bg-gray-100 text-gray-700'
}

/**
 * Get priority color for queue token
 * @param {string} priority - Token priority
 */
export const getPriorityColor = (priority) => {
  const colors = {
    emergency: 'bg-red-500 text-white',
    high: 'bg-orange-500 text-white',
    normal: 'bg-blue-500 text-white',
    'follow-up': 'bg-green-500 text-white'
  }
  return colors[priority] || 'bg-gray-500 text-white'
}

/**
 * Format wait time
 * @param {number} minutes - Wait time in minutes
 */
export const formatWaitTime = (minutes) => {
  if (!minutes || minutes < 0) return 'N/A'
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
}
