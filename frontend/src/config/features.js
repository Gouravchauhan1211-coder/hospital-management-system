// ============================================================
// FEATURE FLAGS SYSTEM
// Use these to enable/disable features without removing routes
// ============================================================

// Patient Features
export const FEATURES = {
  // Patient features
  medicalRecords: true,
  prescriptions: true,
  labResults: true,
  billing: true,
  healthSummary: true,
  patientMessages: true,
  messages: true,
  
  // Doctor features
  earnings: true,
  statistics: true,
  doctorMessages: true,
  
  // Mediator features
  analytics: true,
  departments: true,
  branches: true,
  doctorVerification: true,
  
  // Shared features
  videoCall: false,
}

// Helper functions to check features
export const isFeatureEnabled = (feature) => {
  return FEATURES[feature] === true
}

export const getEnabledPatientFeatures = () => {
  return {
    records: FEATURES.medicalRecords,
    prescriptions: FEATURES.prescriptions,
    labResults: FEATURES.labResults,
    billing: FEATURES.billing,
    healthSummary: FEATURES.healthSummary,
    messages: FEATURES.patientMessages,
  }
}

export const getEnabledDoctorFeatures = () => {
  return {
    earnings: FEATURES.earnings,
    statistics: FEATURES.statistics,
    messages: FEATURES.doctorMessages,
  }
}

export const getEnabledMediatorFeatures = () => {
  return {
    analytics: FEATURES.analytics,
    departments: FEATURES.departments,
    branches: FEATURES.branches,
    doctorVerification: FEATURES.doctorVerification,
  }
}
