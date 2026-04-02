import { useEffect, useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import useAuthStore from './store/authStore'
import useThemeStore from './store/themeStore'
import { QueueProvider } from './store/queueStore.jsx'

// Layout
import { DashboardLayout } from './components/layout'

// Shared Components
import { ProtectedRoute } from './components/shared'
import ComingSoon from './components/shared/ComingSoon'

// Feature Flags
import { isFeatureEnabled } from './config/features'

// Auth Pages
import OnboardingPage from './pages/auth/OnboardingPage'
import RoleSelectionPage from './pages/auth/RoleSelectionPage'
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'

// Patient Pages
import PatientDashboard from './pages/patient/PatientDashboard'
import PatientDoctorsPage from './pages/patient/PatientDoctorsPage'
import PatientDoctorProfilePage from './pages/patient/PatientDoctorProfilePage'
import PatientAppointmentsPage from './pages/patient/PatientAppointmentsPage'
import PatientProfilePage from './pages/patient/PatientProfilePage'
import PatientMedicalRecordsPage from './pages/patient/PatientMedicalRecordsPage'
import PatientPrescriptionsPage from './pages/patient/PatientPrescriptionsPage'
import PatientLabResultsPage from './pages/patient/PatientLabResultsPage'
import PatientBillingPage from './pages/patient/PatientBillingPage'
import PatientHealthSummaryPage from './pages/patient/PatientHealthSummaryPage'
import PatientMessagesPage from './pages/patient/PatientMessagesPage'

// Doctor Pages
import DoctorDashboard from './pages/doctor/DoctorDashboard'
import DoctorAppointmentsPage from './pages/doctor/DoctorAppointmentsPage'
import DoctorAvailabilityPage from './pages/doctor/DoctorAvailabilityPage'
import DoctorPatientsPage from './pages/doctor/DoctorPatientsPage'
import DoctorProfilePage from './pages/doctor/DoctorProfilePage'
import DoctorMessagesPage from './pages/doctor/DoctorMessagesPage'

// Mediator Pages
import MediatorDashboard from './pages/mediator/MediatorDashboard'
import MediatorAppointmentsPage from './pages/mediator/MediatorAppointmentsPage'
import MediatorDoctorsPage from './pages/mediator/MediatorDoctorsPage'
import MediatorPatientsPage from './pages/mediator/MediatorPatientsPage'
import MediatorDoctorVerificationPage from './pages/mediator/MediatorDoctorVerificationPage'

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard'
import WalkInManagementPage from './pages/admin/WalkInManagementPage'

// Shared Pages
import SettingsPage from './pages/shared/SettingsPage'
import QueueDisplayBoardPage from './pages/shared/QueueDisplayBoardPage'
import CallPage from './pages/shared/CallPage'

// Simple Loading Component
const LoadingScreen = () => (
  <div className="min-h-screen bg-gray-100 flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-blue-600 mx-auto mb-4"></div>
      <p className="text-gray-600">Loading...</p>
    </div>
  </div>
)

function App() {
  const [isReady, setIsReady] = useState(false)
  const { initialize } = useAuthStore()
  const { initTheme } = useThemeStore()

  useEffect(() => {
    const init = async () => {
      initTheme()
      await initialize()
      setIsReady(true)
    }
    init()
  }, [initialize, initTheme])

  if (!isReady) {
    return <LoadingScreen />
  }

  return (
    <QueueProvider>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#1f2937',
            color: '#fff',
            borderRadius: '8px',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />

      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Navigate to="/onboarding" replace />} />
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/role-selection" element={<RoleSelectionPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Public Queue Display */}
          <Route path="/queue-display" element={<QueueDisplayBoardPage />} />
          <Route path="/queue-display/branch/:branchId" element={<QueueDisplayBoardPage />} />
          <Route path="/queue-display/doctor/:doctorId" element={<QueueDisplayBoardPage />} />

          {/* ========== PATIENT ROUTES ========== */}
          <Route
            path="/patient/dashboard"
            element={
              <ProtectedRoute allowedRoles={['patient']}>
                <PatientDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/patient/doctors"
            element={
              <ProtectedRoute allowedRoles={['patient']}>
                <PatientDoctorsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/patient/doctors/:doctorId"
            element={
              <ProtectedRoute allowedRoles={['patient']}>
                <PatientDoctorProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/patient/appointments"
            element={
              <ProtectedRoute allowedRoles={['patient']}>
                <PatientAppointmentsPage />
              </ProtectedRoute>
            }
          />
          {/* Feature-gated patient routes */}
          <Route
            path="/patient/records"
            element={
              <ProtectedRoute allowedRoles={['patient']}>
                {isFeatureEnabled('medicalRecords') ? (
                  <PatientMedicalRecordsPage />
                ) : (
                  <ComingSoon featureName="Medical Records" />
                )}
              </ProtectedRoute>
            }
          />
          <Route
            path="/patient/prescriptions"
            element={
              <ProtectedRoute allowedRoles={['patient']}>
                {isFeatureEnabled('prescriptions') ? (
                  <PatientPrescriptionsPage />
                ) : (
                  <ComingSoon featureName="Prescriptions" />
                )}
              </ProtectedRoute>
            }
          />
          <Route
            path="/patient/lab-results"
            element={
              <ProtectedRoute allowedRoles={['patient']}>
                {isFeatureEnabled('labResults') ? (
                  <PatientLabResultsPage />
                ) : (
                  <ComingSoon featureName="Lab Results" />
                )}
              </ProtectedRoute>
            }
          />
          <Route
            path="/patient/billing"
            element={
              <ProtectedRoute allowedRoles={['patient']}>
                {isFeatureEnabled('billing') ? (
                  <PatientBillingPage />
                ) : (
                  <ComingSoon featureName="Billing" />
                )}
              </ProtectedRoute>
            }
          />
          <Route
            path="/patient/health-summary"
            element={
              <ProtectedRoute allowedRoles={['patient']}>
                {isFeatureEnabled('healthSummary') ? (
                  <PatientHealthSummaryPage />
                ) : (
                  <ComingSoon featureName="Health Summary" />
                )}
              </ProtectedRoute>
            }
          />
          <Route
            path="/patient/messages"
            element={
              <ProtectedRoute allowedRoles={['patient']}>
                {isFeatureEnabled('messages') ? (
                  <PatientMessagesPage />
                ) : (
                  <ComingSoon featureName="Messages" />
                )}
              </ProtectedRoute>
            }
          />
          <Route
            path="/patient/messages/:threadId"
            element={
              <ProtectedRoute allowedRoles={['patient']}>
                {isFeatureEnabled('messages') ? (
                  <PatientMessagesPage />
                ) : (
                  <ComingSoon featureName="Messages" />
                )}
              </ProtectedRoute>
            }
          />
          <Route
            path="/patient/profile"
            element={
              <ProtectedRoute allowedRoles={['patient']}>
                <PatientProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/patient/settings"
            element={
              <ProtectedRoute allowedRoles={['patient']}>
                <SettingsPage />
              </ProtectedRoute>
            }
          />

          {/* ========== DOCTOR ROUTES ========== */}
          <Route
            path="/doctor/dashboard"
            element={
              <ProtectedRoute allowedRoles={['doctor']}>
                <DoctorDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/doctor/appointments"
            element={
              <ProtectedRoute allowedRoles={['doctor']}>
                <DoctorAppointmentsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/doctor/patients"
            element={
              <ProtectedRoute allowedRoles={['doctor']}>
                <DoctorPatientsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/doctor/availability"
            element={
              <ProtectedRoute allowedRoles={['doctor']}>
                <DoctorAvailabilityPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/doctor/profile"
            element={
              <ProtectedRoute allowedRoles={['doctor']}>
                <DoctorProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/doctor/settings"
            element={
              <ProtectedRoute allowedRoles={['doctor']}>
                <SettingsPage />
              </ProtectedRoute>
            }
          />
          {/* Feature-gated doctor routes */}
          <Route
            path="/doctor/messages"
            element={
              <ProtectedRoute allowedRoles={['doctor']}>
                {isFeatureEnabled('messages') ? (
                  <DoctorMessagesPage />
                ) : (
                  <ComingSoon featureName="Messages" />
                )}
              </ProtectedRoute>
            }
          />
          <Route
            path="/doctor/messages/:threadId"
            element={
              <ProtectedRoute allowedRoles={['doctor']}>
                {isFeatureEnabled('messages') ? (
                  <DoctorMessagesPage />
                ) : (
                  <ComingSoon featureName="Messages" />
                )}
              </ProtectedRoute>
            }
          />

          {/* Video Call Route */}
          <Route
            path="/call/:threadId"
            element={
              <ProtectedRoute allowedRoles={['patient', 'doctor']}>
                {isFeatureEnabled('videoCall') ? (
                  <CallPage />
                ) : (
                  <ComingSoon featureName="Video Calls" />
                )}
              </ProtectedRoute>
            }
          />

          {/* ========== MEDIATOR ROUTES ========== */}
          <Route
            path="/mediator/dashboard"
            element={
              <ProtectedRoute allowedRoles={['mediator']}>
                <MediatorDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/mediator/appointments"
            element={
              <ProtectedRoute allowedRoles={['mediator']}>
                <MediatorAppointmentsPage />
              </ProtectedRoute>
            }
          />
          {/* Feature-gated mediator routes */}
          <Route
            path="/mediator/doctors"
            element={
              <ProtectedRoute allowedRoles={['mediator']}>
                <MediatorDoctorsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/mediator/patients"
            element={
              <ProtectedRoute allowedRoles={['mediator']}>
                <MediatorPatientsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/mediator/doctor-verification"
            element={
              <ProtectedRoute allowedRoles={['mediator']}>
                {isFeatureEnabled('doctorVerification') ? (
                  <MediatorDoctorVerificationPage />
                ) : (
                  <ComingSoon featureName="Doctor Verification" />
                )}
              </ProtectedRoute>
            }
          />
          <Route
            path="/mediator/settings"
            element={
              <ProtectedRoute allowedRoles={['mediator']}>
                <SettingsPage />
              </ProtectedRoute>
            }
          />

          {/* ========== ADMIN ROUTES (Alias for Mediator) ========== */}
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute allowedRoles={['mediator']}>
                <MediatorDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/appointments"
            element={
              <ProtectedRoute allowedRoles={['mediator']}>
                <MediatorAppointmentsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/walk-in"
            element={
              <ProtectedRoute allowedRoles={['mediator']}>
                <WalkInManagementPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/doctors"
            element={
              <ProtectedRoute allowedRoles={['mediator']}>
                <MediatorDoctorsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/patients"
            element={
              <ProtectedRoute allowedRoles={['mediator']}>
                <MediatorPatientsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/settings"
            element={
              <ProtectedRoute allowedRoles={['mediator']}>
                <SettingsPage />
              </ProtectedRoute>
            }
          />

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/onboarding" replace />} />
        </Routes>
      </Router>
    </QueueProvider>
  )
}

export default App

