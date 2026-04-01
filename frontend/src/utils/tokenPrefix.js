// Department token prefix mapping
// Maps doctor specialization to token prefix
// Format: {specialization_key}: {prefix}

export const DEPARTMENT_TOKEN_PREFIXES = {
  // Cardiology
  'cardiology': 'C',
  'cardiologist': 'C',
  'heart': 'C',
  
  // Dermatology
  'dermatology': 'D',
  'dermatologist': 'D',
  'skin': 'D',
  'cosmetology': 'D',
  
  // ENT (Ear, Nose, Throat)
  'ent': 'EN',
  'otolaryngology': 'EN',
  'ear nose throat': 'EN',
  
  // General Medicine
  'general medicine': 'GM',
  'general physician': 'GM',
  'internal medicine': 'GM',
  'gp': 'GM',
  'medicine': 'GM',
  
  // Neurology
  'neurology': 'N',
  'neurologist': 'N',
  'neuro': 'N',
  
  // Ophthalmology
  'ophthalmology': 'OP',
  'ophthalmologist': 'OP',
  'eye': 'OP',
  
  // Orthopedics
  'orthopedics': 'O',
  'orthopedic': 'O',
  'orthopaedics': 'O',
  'bones': 'O',
  
  // Pediatrics
  'pediatrics': 'P',
  'pediatric': 'P',
  'children': 'P',
  'child specialist': 'P',
  
  // Gynecology
  'gynecology': 'GYN',
  'gynecologist': 'GYN',
  'women': 'GYN',
  
  // Psychiatry
  'psychiatry': 'PSY',
  'psychiatrist': 'PSY',
  'mental': 'PSY',
  
  // Urology
  'urology': 'U',
  'urologist': 'U',
  
  // Surgery
  'surgery': 'S',
  'surgeon': 'S',
  'general surgery': 'S',
  
  // Radiology
  'radiology': 'RAD',
  'radiologist': 'RAD',
  
  // Default fallback
  'default': 'A'
}

/**
 * Get the token prefix for a doctor's specialization
 * @param {string} specialization - Doctor's specialization (case-insensitive)
 * @returns {string} Token prefix (e.g., 'C', 'D', 'GM', etc.)
 */
export const getTokenPrefix = (specialization) => {
  if (!specialization) {
    return DEPARTMENT_TOKEN_PREFIXES.default
  }
  
  const normalizedSpec = specialization.toLowerCase().trim()
  
  // Check for exact match or partial match
  for (const [key, prefix] of Object.entries(DEPARTMENT_TOKEN_PREFIXES)) {
    if (key === 'default') continue
    
    if (normalizedSpec.includes(key)) {
      return prefix
    }
  }
  
  // Default fallback
  return DEPARTMENT_TOKEN_PREFIXES.default
}

/**
 * Format token number with prefix and zero-padding
 * @param {number} tokenNumber - The sequential token number
 * @param {string} prefix - The department prefix
 * @returns {string} Formatted token (e.g., 'C01', 'GM03', 'A12')
 */
export const formatTokenNumber = (tokenNumber, prefix) => {
  const paddedNumber = String(tokenNumber).padStart(2, '0')
  return `${prefix}${paddedNumber}`
}

/**
 * Generate a complete token string with department prefix
 * @param {string} specialization - Doctor's specialization
 * @param {number} tokenNumber - The sequential token number
 * @returns {string} Complete token string (e.g., 'C01')
 */
export const generateToken = (specialization, tokenNumber) => {
  const prefix = getTokenPrefix(specialization)
  return formatTokenNumber(tokenNumber, prefix)
}

export default DEPARTMENT_TOKEN_PREFIXES