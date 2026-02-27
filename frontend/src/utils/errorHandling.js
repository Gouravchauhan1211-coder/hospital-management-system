import toast from 'react-hot-toast'

/**
 * Centralized error handling utility
 */

// Error types
export const ErrorTypes = {
  NETWORK: 'NETWORK_ERROR',
  AUTH: 'AUTHENTICATION_ERROR',
  VALIDATION: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  SERVER: 'SERVER_ERROR',
  UNKNOWN: 'UNKNOWN_ERROR'
}

// Error messages for users
const errorMessages = {
  [ErrorTypes.NETWORK]: 'Network error. Please check your internet connection.',
  [ErrorTypes.AUTH]: 'Authentication failed. Please log in again.',
  [ErrorTypes.VALIDATION]: 'Invalid data provided. Please check your input.',
  [ErrorTypes.NOT_FOUND]: 'The requested resource was not found.',
  [ErrorTypes.SERVER]: 'Server error. Please try again later.',
  [ErrorTypes.UNKNOWN]: 'An unexpected error occurred. Please try again.'
}

/**
 * Parse error and return standardized error object
 */
export const parseError = (error) => {
  // Supabase error
  if (error?.code) {
    return {
      type: getSupabaseErrorType(error.code),
      message: error.message || errorMessages[getSupabaseErrorType(error.code)],
      details: error.details || null,
      code: error.code
    }
  }

  // Network error
  if (error?.message?.includes('network') || error?.message?.includes('fetch')) {
    return {
      type: ErrorTypes.NETWORK,
      message: errorMessages[ErrorTypes.NETWORK],
      details: error.message,
      code: 'NETWORK_ERROR'
    }
  }

  // Generic error
  return {
    type: ErrorTypes.UNKNOWN,
    message: error?.message || errorMessages[ErrorTypes.UNKNOWN],
    details: null,
    code: 'UNKNOWN'
  }
}

/**
 * Map Supabase error codes to error types
 */
const getSupabaseErrorType = (code) => {
  const errorMap = {
    'PGRST116': ErrorTypes.NOT_FOUND,
    'PGRST301': ErrorTypes.NOT_FOUND,
    '23505': ErrorTypes.VALIDATION, // Unique violation
    '23503': ErrorTypes.VALIDATION, // Foreign key violation
    '23502': ErrorTypes.VALIDATION, // Not null violation
    '42501': ErrorTypes.AUTH, // Insufficient privilege
    'P0001': ErrorTypes.VALIDATION,
    '08006': ErrorTypes.NETWORK, // Connection failure
    '08001': ErrorTypes.NETWORK, // Connection does not exist
  }

  return errorMap[code] || ErrorTypes.SERVER
}

/**
 * Handle API error with toast notification
 */
export const handleApiError = (error, customMessage = null) => {
  const parsedError = parseError(error)
  
  // Log to console in development
  if (import.meta.env.DEV) {
    console.error('API Error:', parsedError, error)
  }

  // Show toast notification
  toast.error(customMessage || parsedError.message)

  return parsedError
}

/**
 * Async wrapper with error handling
 */
export const withErrorHandling = async (asyncFn, options = {}) => {
  const { 
    onSuccess = null, 
    onError = null, 
    showToast = true,
    customErrorMessage = null 
  } = options

  try {
    const result = await asyncFn()
    if (onSuccess) {
      onSuccess(result)
    }
    return { success: true, data: result, error: null }
  } catch (error) {
    const parsedError = parseError(error)
    
    if (import.meta.env.DEV) {
      console.error('Error:', parsedError, error)
    }

    if (showToast) {
      toast.error(customErrorMessage || parsedError.message)
    }

    if (onError) {
      onError(parsedError)
    }

    return { success: false, data: null, error: parsedError }
  }
}

/**
 * Retry function with exponential backoff
 */
export const withRetry = async (asyncFn, options = {}) => {
  const { 
    maxRetries = 3, 
    delay = 1000, 
    backoff = 2,
    onRetry = null 
  } = options

  let lastError = null

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await asyncFn()
    } catch (error) {
      lastError = error
      
      if (attempt < maxRetries) {
        const waitTime = delay * Math.pow(backoff, attempt)
        
        if (onRetry) {
          onRetry(attempt + 1, maxRetries, waitTime)
        }

        await new Promise(resolve => setTimeout(resolve, waitTime))
      }
    }
  }

  throw lastError
}

/**
 * Debounce function
 */
export const debounce = (func, wait) => {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

/**
 * Throttle function
 */
export const throttle = (func, limit) => {
  let inThrottle
  return function executedFunction(...args) {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}

/**
 * Check if error is a network error
 */
export const isNetworkError = (error) => {
  return error?.message?.includes('network') || 
         error?.message?.includes('fetch') ||
         error?.code === '08006' ||
         error?.code === '08001'
}

/**
 * Check if error is an authentication error
 */
export const isAuthError = (error) => {
  return error?.code === '42501' ||
         error?.message?.includes('JWT') ||
         error?.message?.includes('token') ||
         error?.status === 401
}

export default {
  ErrorTypes,
  parseError,
  handleApiError,
  withErrorHandling,
  withRetry,
  debounce,
  throttle,
  isNetworkError,
  isAuthError
}