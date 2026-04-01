// ============================================================
// SUPABASE API SERVICE LAYER
// All database operations for the hospital management system
// ============================================================

import { supabase } from './supabase'

// ============================================================
// AUTHENTICATION
// ============================================================

export const signUp = async (email, password, userData) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: userData.fullName,
        role: userData.role,
      },
    },
  })

  if (error) throw error

  // Create profile in the appropriate table based on role
  if (data.user) {
    await createUserProfile(data.user.id, userData)
  }

  return data
}

export const signIn = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) throw error
  return data
}

export const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// ============================================================
// USER PROFILES
// ============================================================

export const createUserProfile = async (userId, userData) => {
  const { error } = await supabase
    .from(userData.role === 'doctor' ? 'doctors' : userData.role === 'mediator' ? 'mediators' : 'patients')
    .insert([{
      id: userId,
      email: userData.email,
      full_name: userData.fullName,
      phone: userData.phone || null,
      gender: userData.gender || null,
      blood_group: userData.bloodGroup || null,
    }])

  if (error) throw error
  return true
}

// Valid columns for each table - filter out invalid ones
const validColumns = {
  doctors: ['id', 'full_name', 'phone', 'address', 'date_of_birth', 'gender', 'avatar_url', 'specialization', 'qualifications', 'experience_years', 'consultation_fee', 'languages', 'location', 'bio', 'is_verified', 'is_available', 'rating', 'total_reviews', 'avg_consultation_minutes', 'availability', 'created_at', 'updated_at'],
  patients: ['id', 'full_name', 'phone', 'address', 'date_of_birth', 'gender', 'avatar_url', 'blood_group', 'allergies', 'medical_conditions', 'current_medications', 'emergency_contact', 'created_at', 'updated_at'],
  profiles: ['id', 'role', 'full_name', 'email', 'phone', 'avatar_url', 'date_of_birth', 'gender', 'address', 'created_at', 'updated_at']
}

export const updateUserProfile = async (table, userId, updates) => {
  // Fix column names and filter invalid ones
  let fixedUpdates = {}
  const allowedCols = validColumns[table] || []
  
  for (const [key, value] of Object.entries(updates)) {
    // Map frontend names to database column names
    let dbKey = key
    if (key === 'experience') dbKey = 'experience_years'
    
    // Only include if it's a valid column or we don't have a list (backwards compat)
    if (allowedCols.length === 0 || allowedCols.includes(dbKey)) {
      fixedUpdates[dbKey] = value
    }
  }
  
  const { data, error } = await supabase
    .from(table)
    .update(fixedUpdates)
    .eq('id', userId)
    .select()
    .single()

  if (error) throw error
  return data
}

export const getUserProfile = async (table, userId) => {
  const { data, error } = await supabase
    .from(table)
    .select('*')
    .eq('id', userId)
    .maybeSingle()

  if (error && error.code !== 'PGRST116') {
    // PGRST116 means no rows returned, which is fine for new users
    throw error
  }
  return data || null
}

export const getAllPatients = async (filters = {}) => {
  let query = supabase
    .from('patients')
    .select('*')

  if (filters.search) {
    query = query.or(`full_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`)
  }

  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export const getAllDoctors = async (filters = {}) => {
  let query = supabase
    .from('doctors')
    .select('*')

  if (filters.specialization) {
    query = query.eq('specialization', filters.specialization)
  }

  if (filters.location) {
    query = query.ilike('location', `%${filters.location}%`)
  }

  if (filters.search) {
    query = query.or(`full_name.ilike.%${filters.search}%,specialization.ilike.%${filters.search}%`)
  }

  const { data, error } = await query.order('rating', { ascending: false })

  if (error) throw error
  return data
}

// ============================================================
// DOCTORS
// ============================================================

export const getDoctors = async (filters = {}) => {
  // Doctors table has medical info; names/avatars are in profiles
  // First get doctors, then get their profile info
  let query = supabase
    .from('doctors')
    .select('*')

  if (filters.specialization) {
    query = query.eq('specialization', filters.specialization)
  }

  if (filters.location) {
    query = query.ilike('location', `%${filters.location}%`)
  }

  const { data, error } = await query.order('rating', { ascending: false })

  if (error) {
    console.error('Error fetching doctors:', error)
    return []
  }
  
  // Get profile data for each doctor
  const doctorIds = (data || []).map(d => d.id)
  let profileData = {}
  if (doctorIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .in('id', doctorIds)
    
    if (profiles) {
      profiles.forEach(p => {
        profileData[p.id] = p
      })
    }
  }
  
  // Flatten profile fields into the doctor object
  return (data || []).map(d => ({
    ...d,
    full_name: profileData[d.id]?.full_name || 'Unknown Doctor',
    avatar_url: profileData[d.id]?.avatar_url || null,
  }))
}

export const getDoctorById = async (doctorId) => {
  const { data, error } = await supabase
    .from('doctors')
    .select('*, profile:profiles!id(full_name, avatar_url)')
    .eq('id', doctorId)
    .single()

  if (error) throw error
  return {
    ...data,
    full_name: data.profile?.full_name || 'Unknown Doctor',
    avatar_url: data.profile?.avatar_url || null,
  }
}

export const getDoctorReviews = async (doctorId) => {
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('doctor_id', doctorId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export const addDoctorReview = async (reviewData) => {
  const { data, error } = await supabase
    .from('reviews')
    .insert([{
      doctor_id: reviewData.doctorId,
      patient_id: reviewData.patientId,
      patient_name: reviewData.patientName,
      rating: reviewData.rating,
      comment: reviewData.comment,
    }])
    .select()
    .single()

  if (error) throw error
  return data
}

export const getSpecializations = async () => {
  const { data, error } = await supabase
    .from('doctors')
    .select('specialization')

  if (error) {
    console.error('Error fetching specializations:', error)
    return []
  }

  // Get unique specializations
  const specializations = [...new Set(data.map(d => d.specialization).filter(Boolean))]
  return specializations
}

// ============================================================
// PATIENTS
// ============================================================

export const getPatients = async (filters = {}) => {
  // Join with profiles to get full_name and email
  let query = supabase
    .from('patients')
    .select(`
      *,
      profiles:profile_id (
        full_name,
        email,
        phone,
        avatar_url
      )
    `)

  if (filters.search) {
    // Search via profiles table - need to do a different approach
    // First get matching profile IDs, then fetch patients
    const { data: profileData } = await supabase
      .from('profiles')
      .select('id')
      .or(`full_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`)
      .eq('role', 'patient')
    
    if (profileData && profileData.length > 0) {
      const patientIds = profileData.map(p => p.id)
      query = query.in('id', patientIds)
    }
  }

  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export const getPatientById = async (patientId) => {
  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .eq('id', patientId)
    .single()

  if (error) throw error
  return data
}

// ============================================================
// APPOINTMENTS
// ============================================================

// Check if a time slot is available for booking
export const checkSlotAvailability = async (doctorId, date, time, excludeAppointmentId = null) => {
  let query = supabase
    .from('appointments')
    .select('id')
    .eq('doctor_id', doctorId)
    .eq('date', date)
    .eq('time', time)
    .in('status', ['pending', 'confirmed'])

  if (excludeAppointmentId) {
    query = query.neq('id', excludeAppointmentId)
  }

  const { data, error } = await query

  if (error) throw error
  return data.length === 0 // true if available (no existing appointments)
}

// Get booked slots for a doctor on a specific date
export const getBookedSlots = async (doctorId, date) => {
  const { data, error } = await supabase
    .from('appointments')
    .select('time, status')
    .eq('doctor_id', doctorId)
    .eq('date', date)
    .in('status', ['pending', 'confirmed'])

  if (error) throw error
  return data.map(apt => apt.time)
}

// Get available time slots for a doctor on a specific date
export const getAvailableTimeSlots = async (doctorId, date, allSlots = null) => {
  // Default time slots if not provided
  const defaultSlots = [
    '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
    '12:00 PM', '12:30 PM', '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM',
    '04:00 PM', '04:30 PM', '05:00 PM', '05:30 PM'
  ]

  const slotsToUse = allSlots || defaultSlots

  try {
    // Get doctor's availability for the day
    const dayName = new Date(date).toLocaleDateString('en-US', { weekday: 'long' })
    const doctor = await getDoctorById(doctorId)

    // If doctor has custom availability and it's enabled for this day, use it
    if (doctor?.availability && doctor.availability[dayName]?.enabled) {
      const doctorSlots = doctor.availability[dayName]?.slots || []
      if (doctorSlots.length > 0) {
        const bookedSlots = await getBookedSlots(doctorId, date)
        return doctorSlots.filter(slot => !bookedSlots.includes(slot))
      }
    }

    // Otherwise use default slots minus booked ones
    const bookedSlots = await getBookedSlots(doctorId, date)
    return slotsToUse.filter(slot => !bookedSlots.includes(slot))
  } catch (error) {
    console.error('Error getting available slots:', error)
    // Return default slots if there's an error
    return slotsToUse
  }
}

export const createAppointment = async (appointmentData) => {
  // Generate idempotency key to prevent duplicate bookings on retry
  const idempotencyKey = appointmentData.idempotencyKey || 
    `${appointmentData.patientId}_${appointmentData.doctorId}_${appointmentData.date}_${appointmentData.time}`

  // Try atomic booking first (preferred method after migration)
  try {
    const { data: atomicResult, error: atomicError } = await supabase.rpc(
      'book_appointment_atomic',
      {
        p_patient_id: appointmentData.patientId,
        p_doctor_id: appointmentData.doctorId,
        p_date: appointmentData.date,
        p_time: appointmentData.time,
        p_amount: appointmentData.amount || 0,
        p_symptoms: appointmentData.symptoms,
        p_mode: appointmentData.mode || 'offline',
        p_payment_id: appointmentData.paymentId || null
      }
    )

    if (!atomicError && atomicResult && atomicResult.length > 0) {
      const result = atomicResult[0]
      if (result.success) {
        // Fetch the created appointment to return full data
        const { data: appointmentDataResult, error: fetchError } = await supabase
          .from('appointments')
          .select('*')
          .eq('id', result.appointment_id)
          .single()
        
        if (fetchError) throw fetchError
        return appointmentDataResult
      } else {
        throw new Error(result.error_message || 'Failed to book appointment')
      }
    }
    // If RPC fails, fall through to legacy method
  } catch (rpcError) {
    console.warn('Atomic booking not available, using legacy method:', rpcError.message)
  }

  // Legacy method: Check availability then insert (has race condition - kept for backward compatibility)
  const isAvailable = await checkSlotAvailability(
    appointmentData.doctorId,
    appointmentData.date,
    appointmentData.time
  )

  if (!isAvailable) {
    throw new Error('This time slot is no longer available. Please select another time.')
  }

  const { data, error } = await supabase
    .from('appointments')
    .insert([{
      patient_id: appointmentData.patientId,
      patient_name: appointmentData.patientName,
      doctor_id: appointmentData.doctorId,
      doctor_name: appointmentData.doctorName,
      specialization: appointmentData.specialization,
      date: appointmentData.date,
      time: appointmentData.time,
      mode: appointmentData.mode || 'offline',
      symptoms: appointmentData.symptoms,
      amount: appointmentData.amount || 0,
      status: 'pending',
      payment_status: 'pending',
      idempotency_key: idempotencyKey
    }])
    .select()
    .single()

  // Check for unique constraint violation (double booking)
  if (error) {
    if (error.code === '23505') {
      throw new Error('This time slot is no longer available. Please select another time.')
    }
    throw error
  }

  // Create notification for doctor
  try {
    await supabase
      .from('notifications')
      .insert([{
        user_id: appointmentData.doctorId,
        type: 'appointment',
        title: 'New Appointment',
        message: `You have a new appointment from ${appointmentData.patientName} on ${appointmentData.date} at ${appointmentData.time}`,
        read: false,
      }])
  } catch (notifError) {
    console.error('Failed to create notification:', notifError)
    // Don't fail the appointment if notification fails
  }

  return data
}

export const getAppointments = async (filters = {}) => {
  let query = supabase
    .from('appointments')
    .select('*')

  if (filters.patientId) {
    query = query.eq('patient_id', filters.patientId)
  }

  if (filters.doctorId) {
    query = query.eq('doctor_id', filters.doctorId)
  }

  if (filters.status) {
    query = query.eq('status', filters.status)
  }

  if (filters.date) {
    query = query.eq('date', filters.date)
  }

  const { data, error } = await query.order('date', { ascending: true })

  if (error) throw error
  return data
}

export const getAppointmentById = async (appointmentId) => {
  const { data, error } = await supabase
    .from('appointments')
    .select('*')
    .eq('id', appointmentId)
    .single()

  if (error) throw error
  return data
}

// Generate token number (A001, A002, etc.)
const generateTokenNumber = (count) => {
  const prefix = 'A'
  const number = count + 1
  return `${prefix}${String(number).padStart(3, '0')}`
}

// Get next token number for a doctor on a specific date (legacy - prefer atomic function)
const getNextTokenNumber = async (doctorId, date) => {
  // Try atomic token generation first
  try {
    const { data: tokenResult, error: tokenError } = await supabase.rpc(
      'generate_appointment_token',
      {
        p_doctor_id: doctorId,
        p_patient_id: null, // Will be set in the actual insert
        p_appointment_id: null
      }
    )
    
    if (!tokenError && tokenResult && tokenResult.length > 0) {
      return tokenResult[0].token_number
    }
  } catch (e) {
    console.warn('Atomic token generation not available:', e.message)
  }
  
  // Fallback to legacy method
  const { data, error } = await supabase
    .from('appointment_queue')
    .select('token_number')
    .eq('doctor_id', doctorId)
    .gte('created_at', new Date(date + 'T00:00:00').toISOString())
    .lte('created_at', new Date(date + 'T23:59:59').toISOString())

  if (error) throw error
  
  const tokens = data.map(q => q.token_number)
  const maxToken = tokens.length > 0 ? Math.max(...tokens) : 0
  return maxToken + 1
}

export const updateAppointment = async (appointmentId, updates) => {
  // First, get the appointment to get doctor_id and patient_id if status is being updated to accepted
  const { data: appointmentData, error: fetchError } = await supabase
    .from('appointments')
    .select('id, doctor_id, patient_id, patient_name, doctor_name, date')
    .eq('id', appointmentId)
    .single()

  if (fetchError) throw fetchError

  // Update appointment
  const { data, error } = await supabase
    .from('appointments')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', appointmentId)
    .select()
    .single()

  if (error) throw error

  // If status is accepted, add to appointment queue
  if (updates.status === 'accepted') {
    let queueCreated = false
    
    // First, check if queue entry already exists for this appointment
    const { data: existingQueue } = await supabase
      .from('appointment_queue')
      .select('id')
      .eq('appointment_id', appointmentId)
      .single()
    
    if (existingQueue) {
      // Queue entry already exists, skip creation
      console.warn('Queue entry already exists for appointment:', appointmentId)
      queueCreated = true
    } else {
      // Try atomic token generation first (which also creates the queue entry)
      try {
        const { data: tokenResult, error: tokenError } = await supabase.rpc(
          'generate_appointment_token',
          {
            p_doctor_id: appointmentData.doctor_id,
            p_patient_id: appointmentData.patient_id,
            p_appointment_id: appointmentId
          }
        )
        
        if (!tokenError && tokenResult && tokenResult.length > 0) {
          // RPC successfully created the queue entry
          queueCreated = true
        }
      } catch (e) {
        console.warn('Atomic token generation failed, using legacy:', e.message)
      }
    }
    
    // Only manually insert if RPC didn't create the queue entry
    if (!queueCreated) {
      const tokenNumber = await getNextTokenNumber(appointmentData.doctor_id, appointmentData.date)
      
      const { error: queueError } = await supabase
        .from('appointment_queue')
        .insert({
          appointment_id: appointmentId,
          doctor_id: appointmentData.doctor_id,
          patient_id: appointmentData.patient_id,
          token_number: tokenNumber,
          status: 'waiting'
        })

      if (queueError) {
        console.error('Error adding to queue:', queueError)
        // Don't fail the appointment update if queue insertion fails
      }
    }
  }

  return data
}

export const cancelAppointment = async (appointmentId) => {
  return updateAppointment(appointmentId, { status: 'cancelled' })
}

// ============================================================
// APPOINTMENT QUEUE
// ============================================================
export const getAppointmentQueue = async (filters = {}) => {
  let query = supabase
    .from('appointment_queue')
    .select('*')

  if (filters.status) {
    query = query.eq('status', filters.status)
  }

  if (filters.doctorId) {
    query = query.eq('doctor_id', filters.doctorId)
  }

  if (filters.patientId) {
    query = query.eq('patient_id', filters.patientId)
  }

  if (filters.appointmentId) {
    query = query.eq('appointment_id', filters.appointmentId)
  }

  const { data, error } = await query.order('token_number', { ascending: true })

  if (error) throw error
  return data
}

export const updateAppointmentQueueStatus = async (queueId, status) => {
  const updates = {
    status,
    updated_at: new Date().toISOString()
  }
  
  // Set consultation start time when starting consultation
  if (status === 'in-progress') {
    updates.consultation_started_at = new Date().toISOString()
  }
  
  // Set consultation completion time when completing
  if (status === 'completed') {
    updates.consultation_completed_at = new Date().toISOString()
  }

  const { data, error } = await supabase
    .from('appointment_queue')
    .update(updates)
    .eq('id', queueId)
    .select()
    .single()

  if (error) throw error
  return data
}

// ============================================================
// WALK-IN QUEUE
// ============================================================

export const getWalkInQueue = async (filters = {}) => {
  let query = supabase
    .from('walk_in_queue')
    .select('*')

  if (filters.status) {
    query = query.eq('status', filters.status)
  }

  if (filters.doctorId) {
    query = query.eq('doctor_id', filters.doctorId)
  }

  const { data, error } = await query.order('created_at', { ascending: true })

  if (error) throw error
  return data
}

// Generate a random token (fallback when DB query fails)
const generateRandomToken = () => {
  const num = Math.floor(Math.random() * 900) + 100
  return `A${num}`
}

export const getNextToken = async () => {
  try {
    const { data: queueData, error } = await supabase
      .from('walk_in_queue')
      .select('token')
      .order('created_at', { ascending: false })
      .limit(1)

    if (error || !queueData || queueData.length === 0) {
      return generateRandomToken()
    }

    const lastToken = queueData[0].token
    const num = parseInt(lastToken.replace(/[A-Z]/g, '')) + 1
    return `A${num.toString().padStart(3, '0')}`
  } catch (err) {
    console.warn('Error getting next token, using random:', err)
    return generateRandomToken()
  }
}

export const addToWalkInQueue = async (queueData) => {
  const token = await getNextToken()

  // Only insert required fields that we know exist
  const insertData = {
    patient_name: queueData.name,
    doctor_id: queueData.doctorId || null,
    doctor_name: queueData.doctorName || 'Unassigned',
    token: token,
    status: 'waiting',
  }

  // Only add optional fields if they exist in the table
  if (queueData.reason) insertData.reason = queueData.reason
  if (queueData.priority) insertData.priority = queueData.priority

  const { data, error } = await supabase
    .from('walk_in_queue')
    .insert([insertData])
    .select()
    .single()

  if (error) throw error
  return data
}

export const updateWalkInQueue = async (queueId, updates) => {
  const { data, error } = await supabase
    .from('walk_in_queue')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', queueId)
    .select()
    .single()

  if (error) throw error
  return data
}

// ============================================================
// NOTIFICATIONS
// ============================================================

export const getNotifications = async (userId) => {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export const markNotificationRead = async (notificationId) => {
  const { data, error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', notificationId)
    .select()
    .single()

  if (error) throw error
  return data
}

export const createNotification = async (notificationData) => {
  const { data, error } = await supabase
    .from('notifications')
    .insert([{
      user_id: notificationData.userId,
      type: notificationData.type,
      title: notificationData.title,
      message: notificationData.message,
    }])
    .select()
    .single()

  if (error) throw error
  return data
}

// ============================================================
// MESSAGES
// ============================================================

export const getMessageThreads = async (userId, userType) => {
  let query = supabase
    .from('message_threads')
    .select('*')

  if (userType === 'patient') {
    query = query.eq('patient_id', userId)
  } else if (userType === 'doctor') {
    query = query.eq('doctor_id', userId)
  }

  const { data, error } = await query.order('last_message_at', { ascending: false })

  if (error) throw error
  return data
}

export const getMessages = async (threadId) => {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data
}

export const sendMessage = async (messageData) => {
  const { data: message, error: msgError } = await supabase
    .from('messages')
    .insert([{
      thread_id: messageData.threadId,
      sender_id: messageData.senderId,
      sender_type: messageData.senderType,
      text: messageData.text,
    }])
    .select()
    .single()

  if (msgError) throw msgError

  // Update thread's last_message
  await supabase
    .from('message_threads')
    .update({
      last_message: messageData.text,
      last_message_at: new Date().toISOString(),
    })
    .eq('id', messageData.threadId)

  return message
}

export const createMessageThread = async (threadData) => {
  // Look up patient name from profiles if not provided
  let patientName = threadData.patientName
  let patientAvatar = threadData.patientAvatar || null

  if (!patientName) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, avatar_url')
      .eq('id', threadData.patientId)
      .single()
    patientName = profile?.full_name || 'Patient'
    patientAvatar = profile?.avatar_url || null
  }

  // Check if thread already exists (handle the unique constraint gracefully)
  const { data: existing } = await supabase
    .from('message_threads')
    .select('*')
    .eq('patient_id', threadData.patientId)
    .eq('doctor_id', threadData.doctorId)
    .single()

  if (existing) return existing

  const { data, error } = await supabase
    .from('message_threads')
    .insert([{
      patient_id: threadData.patientId,
      patient_name: patientName,
      patient_avatar: patientAvatar,
      doctor_id: threadData.doctorId,
      doctor_name: threadData.doctorName,
      doctor_avatar: threadData.doctorAvatar || null,
    }])
    .select()
    .single()

  if (error) throw error
  return data
}

// ============================================================
// MEDICAL RECORDS
// ============================================================

export const getMedicalRecords = async (patientId) => {
  const { data, error } = await supabase
    .from('medical_records')
    .select('*')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export const getMedicalRecordById = async (recordId) => {
  const { data, error } = await supabase
    .from('medical_records')
    .select('*')
    .eq('id', recordId)
    .single()

  if (error) throw error
  return data
}

export const createMedicalRecord = async (recordData) => {
  const { data, error } = await supabase
    .from('medical_records')
    .insert([{
      patient_id: recordData.patientId,
      doctor_id: recordData.doctorId || null,
      doctor_name: recordData.doctorName || null,
      record_type: recordData.type || 'consultation',
      title: recordData.title,
      description: recordData.description || null,
      file_url: recordData.fileUrl || null,
    }])
    .select()
    .single()

  if (error) throw error
  return data
}

// ============================================================
// FILE UPLOAD (Medical Records, Lab Results, etc.)
// ============================================================

export const uploadFile = async (file, folder = 'documents') => {
  const fileExt = file.name.split('.').pop()
  const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`
  const filePath = `${folder}/${fileName}`

  const { data, error } = await supabase.storage
    .from('hospital-files')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    })

  if (error) throw error

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('hospital-files')
    .getPublicUrl(filePath)

  return urlData.publicUrl
}

export const deleteFile = async (fileUrl) => {
  // Extract file path from URL
  const urlParts = fileUrl.split('/')
  const fileName = urlParts[urlParts.length - 1]
  const folder = urlParts[urlParts.length - 2]
  const filePath = `${folder}/${fileName}`

  const { error } = await supabase.storage
    .from('hospital-files')
    .remove([filePath])

  if (error) throw error
  return true
}

// ============================================================
// SHARE RECORDS (Send to Doctor or Other Users)
// ============================================================

export const shareRecord = async (shareData) => {
  const { data, error } = await supabase
    .from('shared_records')
    .insert([{
      record_id: shareData.recordId,
      record_type: shareData.recordType,
      patient_id: shareData.patientId,
      recipient_id: shareData.recipientId,
      recipient_type: shareData.recipientType,
      recipient_name: shareData.recipientName,
      share_note: shareData.shareNote || null,
      access_token: shareData.accessToken || null,
      expires_at: shareData.expiresAt || null,
    }])
    .select()
    .single()

  if (error) throw error

  // Create notification for recipient
  await supabase
    .from('notifications')
    .insert([{
      user_id: shareData.recipientId,
      type: 'share',
      title: 'New Shared Record',
      message: `You have received a shared ${shareData.recordType} from a patient`,
      read: false,
    }])

  return data
}

export const getSharedRecords = async (userId, userType) => {
  let query = supabase
    .from('shared_records')
    .select('*')

  if (userType === 'patient') {
    query = query.eq('patient_id', userId)
  } else {
    query = query.eq('recipient_id', userId)
  }

  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export const revokeSharedRecord = async (shareId) => {
  const { data, error } = await supabase
    .from('shared_records')
    .update({ revoked: true, revoked_at: new Date().toISOString() })
    .eq('id', shareId)
    .select()
    .single()

  if (error) throw error
  return data
}

// PRESCRIPTIONS
// ============================================================

export const getPrescriptions = async (patientId) => {
  const { data, error } = await supabase
    .from('prescriptions')
    .select('*')
    .eq('patient_id', patientId)
    .order('prescribed_date', { ascending: false })

  if (error) throw error
  return data
}

export const createPrescription = async (prescriptionData) => {
  const { data, error } = await supabase
    .from('prescriptions')
    .insert([{
      patient_id: prescriptionData.patientId,
      doctor_id: prescriptionData.doctorId || null,
      doctor_name: prescriptionData.doctorName || null,
      medication_name: prescriptionData.medicationName,
      dosage: prescriptionData.dosage || null,
      frequency: prescriptionData.frequency || null,
      duration: prescriptionData.duration || null,
      notes: prescriptionData.notes || null,
      status: 'active',
    }])
    .select()
    .single()

  if (error) throw error
  return data
}

// ============================================================
// ANALYTICS
// ============================================================

export const getAnalytics = async () => {
  // Get counts
  const [patientsResult, doctorsResult, appointmentsResult] = await Promise.all([
    supabase.from('patients').select('id', { count: 'exact', head: true }),
    supabase.from('doctors').select('id', { count: 'exact', head: true }),
    supabase.from('appointments').select('id', { count: 'exact', head: true }),
  ])

  const totalPatients = patientsResult.count || 0
  const totalDoctors = doctorsResult.count || 0
  const totalAppointments = appointmentsResult.count || 0

  // Get today's appointments
  const today = new Date().toISOString().split('T')[0]
  const { count: todayAppointments } = await supabase
    .from('appointments')
    .select('id', { count: 'exact', head: true })
    .eq('date', today)

  // Get pending doctor verifications
  const { count: pendingVerifications } = await supabase
    .from('doctors')
    .select('id', { count: 'exact', head: true })
    .eq('verified', false)

  // Get appointment status breakdown
  const { data: statusData } = await supabase
    .from('appointments')
    .select('status')

  const statusCounts = statusData?.reduce((acc, curr) => {
    acc[curr.status] = (acc[curr.status] || 0) + 1
    return acc
  }, {}) || {}

  // Get total revenue
  const { data: earningsData } = await supabase
    .from('appointments')
    .select('amount, payment_status, date, patient_name')

  const totalRevenue = earningsData
    ?.filter(e => e.payment_status === 'paid')
    .reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0) || 0

  return {
    totalPatients,
    totalDoctors,
    totalAppointments,
    appointmentsToday: todayAppointments || 0,
    pendingVerifications: pendingVerifications || 0,
    revenue: totalRevenue,
    statusCounts,
  }
}

// ============================================================
// DOCTOR EARNINGS
// ============================================================

export const getDoctorEarnings = async (doctorId) => {
  const { data, error } = await supabase
    .from('appointments')
    .select('amount, payment_status, date, patient_name')
    .eq('doctor_id', doctorId)
    .eq('payment_status', 'paid')
    .order('date', { ascending: false })

  if (error) throw error

  const totalEarnings = data?.reduce((sum, appt) => sum + (parseFloat(appt.amount) || 0), 0) || 0

  // This month's earnings
  const thisMonth = new Date().toISOString().slice(0, 7)
  const thisMonthEarnings = data
    ?.filter(appt => appt.date.startsWith(thisMonth))
    .reduce((sum, appt) => sum + (parseFloat(appt.amount) || 0), 0) || 0

  // Pending payments
  const { data: pendingData } = await supabase
    .from('appointments')
    .select('amount')
    .eq('doctor_id', doctorId)
    .eq('payment_status', 'pending')

  const pendingPayout = pendingData
    ?.reduce((sum, appt) => sum + (parseFloat(appt.amount) || 0), 0) || 0

  return {
    totalEarnings,
    thisMonth: thisMonthEarnings,
    pendingPayout,
    transactions: data || [],
  }
}

// ============================================================
// MEDIATOR/ADMIN SPECIFIC FUNCTIONS
// ============================================================

// Get all appointments with full details for mediator
export const getAllAppointmentsDetailed = async (filters = {}) => {
  let query = supabase
    .from('appointments')
    .select(`
      *,
      patient:patients(id, full_name, email, phone),
      doctor:doctors(id, full_name, specialization, email)
    `)

  if (filters.doctorId) {
    query = query.eq('doctor_id', filters.doctorId)
  }

  if (filters.patientId) {
    query = query.eq('patient_id', filters.patientId)
  }

  if (filters.status) {
    query = query.eq('status', filters.status)
  }

  if (filters.date) {
    query = query.eq('date', filters.date)
  }

  if (filters.startDate) {
    query = query.gte('date', filters.startDate)
  }

  if (filters.endDate) {
    query = query.lte('date', filters.endDate)
  }

  const { data, error } = await query.order('date', { ascending: false })

  if (error) throw error
  return data
}

// Get appointment statistics for mediator dashboard
export const getAppointmentStats = async (period = 'week') => {
  const now = new Date()
  let startDate, endDate

  if (period === 'week') {
    startDate = startOfWeek(now)
    endDate = endOfWeek(now)
  } else if (period === 'month') {
    startDate = startOfMonth(now)
    endDate = endOfMonth(now)
  } else {
    startDate = subDays(now, 6)
    endDate = now
  }

  const { data, error } = await supabase
    .from('appointments')
    .select('status, date, amount, payment_status')
    .gte('date', format(startDate, 'yyyy-MM-dd'))
    .lte('date', format(endDate, 'yyyy-MM-dd'))

  if (error) throw error

  const stats = {
    total: data.length,
    pending: data.filter(a => a.status === 'pending').length,
    confirmed: data.filter(a => a.status === 'confirmed').length,
    completed: data.filter(a => a.status === 'completed').length,
    cancelled: data.filter(a => a.status === 'cancelled').length,
    revenue: data.filter(a => a.payment_status === 'paid').reduce((sum, a) => sum + (parseFloat(a.amount) || 0), 0),
  }

  return stats
}

// ============================================================
// DOCTOR SPECIFIC FUNCTIONS
// ============================================================

// Update doctor availability
export const updateDoctorAvailability = async (doctorId, availability) => {
  const { data, error } = await supabase
    .from('doctors')
    .update({
      availability,
      updated_at: new Date().toISOString(),
    })
    .eq('id', doctorId)
    .select()
    .single()

  if (error) throw error
  return data
}

// Set doctor unavailable dates
export const setDoctorUnavailableDates = async (doctorId, unavailableDates) => {
  const { data, error } = await supabase
    .from('doctors')
    .update({
      unavailable_dates: unavailableDates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', doctorId)
    .select()
    .single()

  if (error) throw error
  return data
}

// ============================================================
// DOCTOR VERIFICATION (Using Supabase)
// ============================================================

export const getPendingDoctors = async (page = 1, limit = 10, status = 'pending') => {
  let query = supabase
    .from('doctors')
    .select('*, profiles:profile_id(full_name, email, avatar_url)')
    .eq('is_verified', status === 'pending' ? false : true)
    .order('created_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1)

  const { data, error } = await query
  
  if (error) throw error
  
  return {
    doctors: data || [],
    pagination: {
      totalPages: Math.ceil(data?.length / limit) || 1
    }
  }
}

export const getDoctorForVerification = async (doctorId) => {
  const { data, error } = await supabase
    .from('doctors')
    .select('*, profiles:profile_id(*)')
    .eq('id', doctorId)
    .single()

  if (error) throw error
  return data
}

export const verifyDoctor = async (doctorId, verified, reason, mediatorId) => {
  const { data, error } = await supabase
    .from('doctors')
    .update({
      is_verified: verified,
      updated_at: new Date().toISOString()
    })
    .eq('id', doctorId)
    .select()
    .single()

  if (error) throw error
  return data
}

export const getVerificationStats = async () => {
  const [pending, verified] = await Promise.all([
    supabase.from('doctors').select('id', { count: 'exact', head: true }).eq('is_verified', false),
    supabase.from('doctors').select('id', { count: 'exact', head: true }).eq('is_verified', true)
  ])

  return {
    pending: pending.count || 0,
    verified: verified.count || 0
  }
}

export const updateDoctorStatusApi = async (doctorId, status, reason, mediatorId) => {
  const { data, error } = await supabase
    .from('doctors')
    .update({
      is_available: status === 'available',
      updated_at: new Date().toISOString()
    })
    .eq('id', doctorId)
    .select()
    .single()

  if (error) throw error
  return data
}

export const getDoctorDocuments = async (doctorId) => {
  // Documents are stored in medical_records or as part of doctor profile
  // Return empty for now as this was backend-specific
  return []
}

// Get doctor's patients (unique patients from appointments)
export const getDoctorPatients = async (doctorId) => {
  const { data, error } = await supabase
    .from('appointments')
    .select(`
      patient_id,
      patient_name,
      patient:patients(id, full_name, email, phone, gender, blood_group, date_of_birth)
    `)
    .eq('doctor_id', doctorId)

  if (error) throw error

  // Get unique patients
  const patientMap = new Map()
  data.forEach(apt => {
    if (!patientMap.has(apt.patient_id)) {
      patientMap.set(apt.patient_id, apt.patient)
    }
  })

  return Array.from(patientMap.values())
}

// ============================================================
// PATIENT MEDICAL RECORDS (Extended)
// ============================================================

// Update patient medical history
export const updatePatientMedicalHistory = async (patientId, updates) => {
  const { data, error } = await supabase
    .from('patients')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', patientId)
    .select()
    .single()

  if (error) throw error
  return data
}

// ============================================================
// HELPER FUNCTIONS FOR DATE CALCULATIONS
// ============================================================

// Helper functions imported from date-fns concepts (simplified versions)
const startOfWeek = (date) => {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  return new Date(d.setDate(diff))
}

const endOfWeek = (date) => {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + 7
  return new Date(d.setDate(diff))
}

const startOfMonth = (date) => {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

const endOfMonth = (date) => {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0)
}

const subDays = (date, days) => {
  const result = new Date(date)
  result.setDate(result.getDate() - days)
  return result
}

const format = (date, formatStr) => {
  const d = new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')

  if (formatStr === 'yyyy-MM-dd') {
    return `${year}-${month}-${day}`
  }

  // Default format
  return `${year}-${month}-${day}`
}

// ============================================================
// REVIEWS APIs (Using Supabase)
// ============================================================

// Note: getDoctorReviews and addDoctorReview are defined earlier in this file

// ============================================================
// MEDICAL RECORDS APIs (Using Supabase)
// ============================================================

// Note: getMedicalRecords, createMedicalRecord, uploadFile are defined earlier in this file
