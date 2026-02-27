/**
 * Application Constants
 */

// API Configuration
export const API_CONFIG = {
  SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
  BACKEND_URL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
}

// User Roles
export const USER_ROLES = {
  PATIENT: 'patient',
  DOCTOR: 'doctor',
  MEDIATOR: 'mediator',
  ADMIN: 'admin'
}

// Appointment Status
export const APPOINTMENT_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  IN_PROGRESS: 'in-progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  NO_SHOW: 'no-show'
}

// Appointment Status Labels
export const APPOINTMENT_STATUS_LABELS = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  'in-progress': 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
  'no-show': 'No Show'
}

// Appointment Status Colors (for Badge variants)
export const APPOINTMENT_STATUS_COLORS = {
  pending: 'warning',
  confirmed: 'primary',
  'in-progress': 'info',
  completed: 'success',
  cancelled: 'error',
  'no-show': 'error'
}

// Walk-in Queue Status
export const QUEUE_STATUS = {
  WAITING: 'waiting',
  IN_PROGRESS: 'in-progress',
  COMPLETED: 'completed'
}

// Queue Status Labels
export const QUEUE_STATUS_LABELS = {
  waiting: 'Waiting',
  'in-progress': 'In Progress',
  completed: 'Completed'
}

// Notification Types
export const NOTIFICATION_TYPES = {
  APPOINTMENT_BOOKED: 'appointment_booked',
  APPOINTMENT_CONFIRMED: 'appointment_confirmed',
  APPOINTMENT_CANCELLED: 'appointment_cancelled',
  APPOINTMENT_REMINDER: 'appointment_reminder',
  WALK_IN_ADDED: 'walk_in_added',
  NEW_MESSAGE: 'new_message',
  INCOMING_CALL: 'incoming_call',
  SYSTEM: 'system'
}

// Time Slots (for appointment booking)
export const TIME_SLOTS = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30', '17:00', '17:30'
]

// Doctor Specializations
export const SPECIALIZATIONS = [
  { id: 'general', name: 'General Medicine', icon: 'Stethoscope' },
  { id: 'cardiology', name: 'Cardiology', icon: 'Heart' },
  { id: 'dermatology', name: 'Dermatology', icon: 'Sparkles' },
  { id: 'neurology', name: 'Neurology', icon: 'Brain' },
  { id: 'orthopedics', name: 'Orthopedics', icon: 'Bone' },
  { id: 'pediatrics', name: 'Pediatrics', icon: 'Baby' },
  { id: 'psychiatry', name: 'Psychiatry', icon: 'Brain' },
  { id: 'dentistry', name: 'Dentistry', icon: 'Smile' },
  { id: 'ophthalmology', name: 'Ophthalmology', icon: 'Eye' },
  { id: 'ent', name: 'ENT', icon: 'Ear' },
  { id: 'gynecology', name: 'Gynecology', icon: 'Heart' },
  { id: 'urology', name: 'Urology', icon: 'Droplets' }
]

// Consultation Types
export const CONSULTATION_TYPES = {
  IN_PERSON: 'in-person',
  VIDEO: 'video',
  AUDIO: 'audio'
}

// Consultation Type Labels
export const CONSULTATION_TYPE_LABELS = {
  'in-person': 'In-Person Visit',
  video: 'Video Call',
  audio: 'Audio Call'
}

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 10,
  MAX_PAGE_SIZE: 100
}

// Local Storage Keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'medicare_auth_token',
  USER_PREFERENCES: 'medicare_user_prefs',
  THEME: 'medicare_theme',
  LAST_VISITED: 'medicare_last_visited'
}

// Date Formats
export const DATE_FORMATS = {
  DISPLAY: 'MMM dd, yyyy',
  DISPLAY_WITH_TIME: 'MMM dd, yyyy h:mm a',
  TIME_ONLY: 'h:mm a',
  DATE_ONLY: 'yyyy-MM-dd',
  FULL: 'EEEE, MMMM dd, yyyy',
  RELATIVE: 'relative' // Use with formatDistanceToNow
}

// Validation Rules
export const VALIDATION = {
  PASSWORD_MIN_LENGTH: 8,
  NAME_MIN_LENGTH: 2,
  PHONE_LENGTH: 10,
  PINCODE_LENGTH: 6
}

// Error Messages
export const ERROR_MESSAGES = {
  REQUIRED_FIELD: 'This field is required',
  INVALID_EMAIL: 'Please enter a valid email address',
  INVALID_PHONE: 'Please enter a valid phone number',
  PASSWORD_TOO_SHORT: `Password must be at least ${VALIDATION.PASSWORD_MIN_LENGTH} characters`,
  PASSWORDS_DONT_MATCH: 'Passwords do not match',
  NETWORK_ERROR: 'Network error. Please check your connection.',
  SERVER_ERROR: 'Server error. Please try again later.',
  UNAUTHORIZED: 'You are not authorized to perform this action',
  SESSION_EXPIRED: 'Your session has expired. Please log in again.'
}

// Success Messages
export const SUCCESS_MESSAGES = {
  APPOINTMENT_BOOKED: 'Appointment booked successfully!',
  APPOINTMENT_CANCELLED: 'Appointment cancelled successfully',
  APPOINTMENT_UPDATED: 'Appointment updated successfully',
  PROFILE_UPDATED: 'Profile updated successfully',
  MESSAGE_SENT: 'Message sent',
  LOGIN_SUCCESS: 'Welcome back!',
  REGISTER_SUCCESS: 'Account created successfully!',
  WALK_IN_ADDED: 'Patient added to queue'
}

// Routes
export const ROUTES = {
  // Public
  HOME: '/',
  ONBOARDING: '/onboarding',
  ROLE_SELECTION: '/role-selection',
  LOGIN: '/login',
  REGISTER: '/register',
  
  // Patient
  PATIENT_DASHBOARD: '/patient/dashboard',
  PATIENT_DOCTORS: '/patient/doctors',
  PATIENT_DOCTOR_PROFILE: '/patient/doctors/:doctorId',
  PATIENT_APPOINTMENTS: '/patient/appointments',
  PATIENT_RECORDS: '/patient/records',
  PATIENT_MESSAGES: '/patient/messages',
  PATIENT_PROFILE: '/patient/profile',
  PATIENT_SETTINGS: '/patient/settings',
  
  // Doctor
  DOCTOR_DASHBOARD: '/doctor/dashboard',
  DOCTOR_APPOINTMENTS: '/doctor/appointments',
  DOCTOR_PATIENTS: '/doctor/patients',
  DOCTOR_MESSAGES: '/doctor/messages',
  DOCTOR_AVAILABILITY: '/doctor/availability',
  DOCTOR_EARNINGS: '/doctor/earnings',
  DOCTOR_PROFILE: '/doctor/profile',
  DOCTOR_SETTINGS: '/doctor/settings',
  
  // Admin/Mediator
  ADMIN_DASHBOARD: '/admin/dashboard',
  ADMIN_APPOINTMENTS: '/admin/appointments',
  ADMIN_WALK_IN: '/admin/walk-in',
  ADMIN_DOCTORS: '/admin/doctors',
  ADMIN_PATIENTS: '/admin/patients',
  ADMIN_ANALYTICS: '/admin/analytics',
  ADMIN_SETTINGS: '/admin/settings',
  
  // Shared
  CALL: '/call/:threadId'
}

export default {
  API_CONFIG,
  USER_ROLES,
  APPOINTMENT_STATUS,
  APPOINTMENT_STATUS_LABELS,
  APPOINTMENT_STATUS_COLORS,
  QUEUE_STATUS,
  QUEUE_STATUS_LABELS,
  NOTIFICATION_TYPES,
  TIME_SLOTS,
  SPECIALIZATIONS,
  CONSULTATION_TYPES,
  CONSULTATION_TYPE_LABELS,
  PAGINATION,
  STORAGE_KEYS,
  DATE_FORMATS,
  VALIDATION,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  ROUTES
}