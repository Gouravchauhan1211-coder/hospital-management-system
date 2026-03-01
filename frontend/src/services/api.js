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

export const updateUserProfile = async (table, userId, updates) => {
  const { data, error } = await supabase
    .from(table)
    .update(updates)
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
    .single()

  if (error) throw error
  return data
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
  let query = supabase
    .from('doctors')
    .select('*, profile:profiles!id(full_name, avatar_url)')

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
  // Flatten profile fields into the doctor object
  return (data || []).map(d => ({
    ...d,
    full_name: d.profile?.full_name || 'Unknown Doctor',
    avatar_url: d.profile?.avatar_url || null,
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

  // Get doctor's availability for the day
  const dayName = new Date(date).toLocaleDateString('en-US', { weekday: 'long' })
  const doctor = await getDoctorById(doctorId)

  // If doctor has custom availability, use it
  if (doctor?.availability && doctor.availability[dayName]) {
    const doctorSlots = doctor.availability[dayName]
    const bookedSlots = await getBookedSlots(doctorId, date)
    return doctorSlots.filter(slot => !bookedSlots.includes(slot))
  }

  // Otherwise use default slots minus booked ones
  const bookedSlots = await getBookedSlots(doctorId, date)
  return slotsToUse.filter(slot => !bookedSlots.includes(slot))
}

export const createAppointment = async (appointmentData) => {
  // First check if the slot is still available
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
    }])
    .select()
    .single()

  if (error) throw error

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

export const updateAppointment = async (appointmentId, updates) => {
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
  return data
}

export const cancelAppointment = async (appointmentId) => {
  return updateAppointment(appointmentId, { status: 'cancelled' })
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

export const getNextToken = async () => {
  const { data: queueData } = await supabase
    .from('walk_in_queue')
    .select('token')
    .order('created_at', { ascending: false })
    .limit(1)

  if (!queueData || queueData.length === 0) {
    return 'A001'
  }

  const lastToken = queueData[0].token
  const num = parseInt(lastToken.replace('A', '')) + 1
  return `A${num.toString().padStart(3, '0')}`
}

export const addToWalkInQueue = async (queueData) => {
  const token = await getNextToken()

  const { data, error } = await supabase
    .from('walk_in_queue')
    .insert([{
      name: queueData.name,
      age: queueData.age,
      reason: queueData.reason,
      doctor_id: queueData.doctorId || null,
      doctor_name: queueData.doctorName || 'Unassigned',
      token: token,
      status: 'waiting',
    }])
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
// REVIEWS APIs (Backend REST API)
// ============================================================

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

// Create a new review via backend API
export const createReviewApi = async (reviewData) => {
  const response = await fetch(`${API_BASE_URL}/reviews`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(reviewData)
  })
  const data = await response.json()
  if (!data.success) throw new Error(data.error)
  return data.review
}

// Get doctor reviews with pagination via backend API
export const getDoctorReviewsApi = async (doctorId, page = 1, limit = 10) => {
  const response = await fetch(`${API_BASE_URL}/reviews/doctor/${doctorId}?page=${page}&limit=${limit}`)
  const data = await response.json()
  if (!data.success) throw new Error(data.error)
  return data
}

// Get patient reviews via backend API
export const getPatientReviewsApi = async (patientId) => {
  const response = await fetch(`${API_BASE_URL}/reviews/patient/${patientId}`)
  const data = await response.json()
  if (!data.success) throw new Error(data.error)
  return data.reviews
}

// Update review via backend API
export const updateReviewApi = async (reviewId, reviewData) => {
  const response = await fetch(`${API_BASE_URL}/reviews/${reviewId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(reviewData)
  })
  const data = await response.json()
  if (!data.success) throw new Error(data.error)
  return data.review
}

// Delete review via backend API
export const deleteReviewApi = async (reviewId, patientId) => {
  const response = await fetch(`${API_BASE_URL}/reviews/${reviewId}?patient_id=${patientId}`, {
    method: 'DELETE'
  })
  const data = await response.json()
  if (!data.success) throw new Error(data.error)
  return data
}

// Check if can review appointment
export const canReviewAppointment = async (appointmentId, patientId) => {
  const response = await fetch(`${API_BASE_URL}/reviews/can-review/${appointmentId}?patient_id=${patientId}`)
  const data = await response.json()
  return data
}

// ============================================================
// MEDICAL RECORDS APIs (Backend REST API)
// ============================================================

// Create medical record via backend API
export const createMedicalRecordApi = async (recordData) => {
  const response = await fetch(`${API_BASE_URL}/medical-records`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(recordData)
  })
  const data = await response.json()
  if (!data.success) throw new Error(data.error)
  return data.record
}

// Get patient medical records via backend API
export const getPatientMedicalRecordsApi = async (patientId, filters = {}) => {
  const params = new URLSearchParams(filters)
  const response = await fetch(`${API_BASE_URL}/medical-records/patient/${patientId}?${params}`)
  const data = await response.json()
  if (!data.success) throw new Error(data.error)
  return data
}

// Get single medical record via backend API
export const getMedicalRecordApi = async (recordId) => {
  const response = await fetch(`${API_BASE_URL}/medical-records/${recordId}`)
  const data = await response.json()
  if (!data.success) throw new Error(data.error)
  return data.record
}

// Update medical record via backend API
export const updateMedicalRecordApi = async (recordId, recordData) => {
  const response = await fetch(`${API_BASE_URL}/medical-records/${recordId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(recordData)
  })
  const data = await response.json()
  if (!data.success) throw new Error(data.error)
  return data.record
}

// Delete medical record via backend API
export const deleteMedicalRecordApi = async (recordId) => {
  const response = await fetch(`${API_BASE_URL}/medical-records/${recordId}`, {
    method: 'DELETE'
  })
  const data = await response.json()
  if (!data.success) throw new Error(data.error)
  return data
}

// Upload medical record file
export const uploadMedicalRecordFile = async (patientId, file) => {
  const reader = new FileReader()
  return new Promise((resolve, reject) => {
    reader.onload = async () => {
      const base64 = reader.result.split(',')[1]
      const response = await fetch(`${API_BASE_URL}/medical-records/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: patientId,
          file_name: file.name,
          file_type: file.type,
          file_data: base64
        })
      })
      const data = await response.json()
      if (!data.success) reject(new Error(data.error))
      else resolve(data)
    }
    reader.readAsDataURL(file)
  })
}

// Get download URL for medical record
export const getMedicalRecordDownloadUrl = async (recordId) => {
  const response = await fetch(`${API_BASE_URL}/medical-records/${recordId}/download`)
  const data = await response.json()
  if (!data.success) throw new Error(data.error)
  return data
}

// Share medical record with doctor
export const shareMedicalRecord = async (recordId, doctorId, patientId) => {
  const response = await fetch(`${API_BASE_URL}/medical-records/${recordId}/share`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ doctor_id: doctorId, patient_id: patientId })
  })
  const data = await response.json()
  if (!data.success) throw new Error(data.error)
  return data
}

// ============================================================
// PRESCRIPTIONS APIs (Backend REST API)
// ============================================================

// Create prescription via backend API
export const createPrescriptionApi = async (prescriptionData) => {
  const response = await fetch(`${API_BASE_URL}/prescriptions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(prescriptionData)
  })
  const data = await response.json()
  if (!data.success) throw new Error(data.error)
  return data.prescription
}

// Get patient prescriptions via backend API
export const getPatientPrescriptionsApi = async (patientId, filters = {}) => {
  const params = new URLSearchParams(filters)
  const response = await fetch(`${API_BASE_URL}/prescriptions/patient/${patientId}?${params}`)
  const data = await response.json()
  if (!data.success) throw new Error(data.error)
  return data
}

// Get doctor prescriptions via backend API
export const getDoctorPrescriptionsApi = async (doctorId, filters = {}) => {
  const params = new URLSearchParams(filters)
  const response = await fetch(`${API_BASE_URL}/prescriptions/doctor/${doctorId}?${params}`)
  const data = await response.json()
  if (!data.success) throw new Error(data.error)
  return data
}

// Get single prescription via backend API
export const getPrescriptionApi = async (prescriptionId) => {
  const response = await fetch(`${API_BASE_URL}/prescriptions/${prescriptionId}`)
  const data = await response.json()
  if (!data.success) throw new Error(data.error)
  return data.prescription
}

// Update prescription via backend API
export const updatePrescriptionApi = async (prescriptionId, prescriptionData) => {
  const response = await fetch(`${API_BASE_URL}/prescriptions/${prescriptionId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(prescriptionData)
  })
  const data = await response.json()
  if (!data.success) throw new Error(data.error)
  return data.prescription
}

// Complete prescription
export const completePrescription = async (prescriptionId) => {
  const response = await fetch(`${API_BASE_URL}/prescriptions/${prescriptionId}/complete`, {
    method: 'POST'
  })
  const data = await response.json()
  if (!data.success) throw new Error(data.error)
  return data.prescription
}

// Get prescription for print
export const getPrescriptionForPrint = async (prescriptionId) => {
  const response = await fetch(`${API_BASE_URL}/prescriptions/${prescriptionId}/print`)
  const data = await response.json()
  if (!data.success) throw new Error(data.error)
  return data.print_data
}

// Get active medications
export const getActiveMedications = async (patientId) => {
  const response = await fetch(`${API_BASE_URL}/prescriptions/patient/${patientId}/active-medications`)
  const data = await response.json()
  if (!data.success) throw new Error(data.error)
  return data
}

// ============================================================
// DOCTOR VERIFICATION APIs (Mediator - Backend REST API)
// ============================================================

// Get pending doctor verifications
export const getPendingDoctors = async (page = 1, limit = 10, status = 'pending') => {
  const response = await fetch(`${API_BASE_URL}/mediator/doctors/pending?page=${page}&limit=${limit}&status=${status}`)
  const data = await response.json()
  if (!data.success) throw new Error(data.error)
  return data
}

// Get all doctors for mediator
export const getMediatorDoctors = async (filters = {}) => {
  const params = new URLSearchParams(filters)
  const response = await fetch(`${API_BASE_URL}/mediator/doctors?${params}`)
  const data = await response.json()
  if (!data.success) throw new Error(data.error)
  return data
}

// Get doctor details for verification
export const getDoctorForVerification = async (doctorId) => {
  const response = await fetch(`${API_BASE_URL}/mediator/doctors/${doctorId}`)
  const data = await response.json()
  if (!data.success) throw new Error(data.error)
  return data.doctor
}

// Verify doctor
export const verifyDoctor = async (doctorId, verified, reason, mediatorId) => {
  const response = await fetch(`${API_BASE_URL}/mediator/doctors/${doctorId}/verify`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ verified, reason, mediator_id: mediatorId })
  })
  const data = await response.json()
  if (!data.success) throw new Error(data.error)
  return data
}

// Update doctor status
export const updateDoctorStatusApi = async (doctorId, status, reason, mediatorId) => {
  const response = await fetch(`${API_BASE_URL}/mediator/doctors/${doctorId}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, reason, mediator_id: mediatorId })
  })
  const data = await response.json()
  if (!data.success) throw new Error(data.error)
  return data
}

// Get verification stats
export const getVerificationStats = async () => {
  const response = await fetch(`${API_BASE_URL}/mediator/verification-stats`)
  const data = await response.json()
  if (!data.success) throw new Error(data.error)
  return data.stats
}

// Bulk verify doctors
export const bulkVerifyDoctors = async (doctorIds, verified, reason, mediatorId) => {
  const response = await fetch(`${API_BASE_URL}/mediator/doctors/bulk-verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ doctor_ids: doctorIds, verified, reason, mediator_id: mediatorId })
  })
  const data = await response.json()
  if (!data.success) throw new Error(data.error)
  return data
}

// Get doctor documents
export const getDoctorDocuments = async (doctorId) => {
  const response = await fetch(`${API_BASE_URL}/mediator/doctors/${doctorId}/documents`)
  const data = await response.json()
  if (!data.success) throw new Error(data.error)
  return data
}

// ============================================================
// AVAILABILITY APIs (Backend REST API)
// ============================================================

// Get doctor availability via backend API
export const getDoctorAvailabilityApi = async (doctorId) => {
  const response = await fetch(`${API_BASE_URL}/availability/doctor/${doctorId}`)
  const data = await response.json()
  if (!data.success) throw new Error(data.error)
  return data
}

// Update doctor availability via backend API
export const updateDoctorAvailabilityRest = async (doctorId, availability, avgConsultationMinutes) => {
  const response = await fetch(`${API_BASE_URL}/availability/doctor/${doctorId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ availability, avg_consultation_minutes: avgConsultationMinutes })
  })
  const data = await response.json()
  if (!data.success) throw new Error(data.error)
  return data
}

// Get available slots for date
export const getAvailableSlots = async (doctorId, date, duration = 15) => {
  const response = await fetch(`${API_BASE_URL}/availability/doctor/${doctorId}/slots/${date}?duration=${duration}`)
  const data = await response.json()
  if (!data.success) throw new Error(data.error)
  return data
}

// Block time
export const blockDoctorTime = async (doctorId, blockData) => {
  const response = await fetch(`${API_BASE_URL}/availability/doctor/${doctorId}/block`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(blockData)
  })
  const data = await response.json()
  if (!data.success) throw new Error(data.error)
  return data
}

// Get blocked times
export const getBlockedTimes = async (doctorId, fromDate, toDate) => {
  const response = await fetch(`${API_BASE_URL}/availability/doctor/${doctorId}/blocked?from_date=${fromDate}&to_date=${toDate}`)
  const data = await response.json()
  if (!data.success) throw new Error(data.error)
  return data.blocked_times
}

// Set break time
export const setBreakTime = async (doctorId, day, startTime, endTime) => {
  const response = await fetch(`${API_BASE_URL}/availability/doctor/${doctorId}/break`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ day, start_time: startTime, end_time: endTime })
  })
  const data = await response.json()
  if (!data.success) throw new Error(data.error)
  return data
}
