import { useEffect, useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import useAuthStore from './store/authStore'

// Layout
import { DashboardLayout } from './components/layout'

// Shared Components
import { ProtectedRoute } from './components/shared'

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
import PatientMessagesPage from './pages/patient/PatientMessagesPage'
import PatientProfilePage from './pages/patient/PatientProfilePage'
import PatientMedicalRecordsPage from './pages/patient/PatientMedicalRecordsPage'
import PatientPrescriptionsPage from './pages/patient/PatientPrescriptionsPage'
import PatientLabResultsPage from './pages/patient/PatientLabResultsPage'
import PatientBillingPage from './pages/patient/PatientBillingPage'
import PatientHealthSummaryPage from './pages/patient/PatientHealthSummaryPage'

// Doctor Pages
import DoctorDashboard from './pages/doctor/DoctorDashboard'
import DoctorMessagesPage from './pages/doctor/DoctorMessagesPage'
import DoctorAppointmentsPage from './pages/doctor/DoctorAppointmentsPage'
import DoctorAvailabilityPage from './pages/doctor/DoctorAvailabilityPage'
import DoctorPatientsPage from './pages/doctor/DoctorPatientsPage'
import DoctorProfilePage from './pages/doctor/DoctorProfilePage'
import DoctorEarningsPage from './pages/doctor/DoctorEarningsPage'
import DoctorStatisticsPage from './pages/doctor/DoctorStatisticsPage'

// Mediator Pages
import MediatorDashboard from './pages/mediator/MediatorDashboard'
import MediatorAppointmentsPage from './pages/mediator/MediatorAppointmentsPage'
import MediatorQueuePage from './pages/mediator/MediatorQueuePage'
import MediatorDepartmentsPage from './pages/mediator/MediatorDepartmentsPage'
import MediatorDoctorsPage from './pages/mediator/MediatorDoctorsPage'
import MediatorPatientsPage from './pages/mediator/MediatorPatientsPage'
import MediatorAnalyticsPage from './pages/mediator/MediatorAnalyticsPage'
import MediatorBranchesPage from './pages/mediator/MediatorBranchesPage'
import MediatorDoctorVerificationPage from './pages/mediator/MediatorDoctorVerificationPage'

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard'
import WalkInManagementPage from './pages/admin/WalkInManagementPage'

// Shared Pages
import CallPage from './pages/shared/CallPage'
import SettingsPage from './pages/shared/SettingsPage'
import QueueDisplayBoardPage from './pages/shared/QueueDisplayBoardPage'

function App() {
  const [isReady, setIsReady] = useState(false)
  const { initialize } = useAuthStore()

  useEffect(() => {
    // Initialize session on app start
    initialize()
    const timer = setTimeout(() => {
      setIsReady(true)
    }, 100)
    return () => clearTimeout(timer)
  }, [initialize])

  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-white mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading MediCare...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(10px)',
            color: '#fff',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
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
          
          {/* Public Queue Display - No auth required */}
          <Route path="/queue-display" element={<QueueDisplayBoardPage />} />
          <Route path="/queue-display/branch/:branchId" element={<QueueDisplayBoardPage />} />
          <Route path="/queue-display/doctor/:doctorId" element={<QueueDisplayBoardPage />} />

          {/* Patient Routes - Mobile Layout */}
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
          <Route
            path="/patient/records"
            element={
              <ProtectedRoute allowedRoles={['patient']}>
                <PatientMedicalRecordsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/patient/prescriptions"
            element={
              <ProtectedRoute allowedRoles={['patient']}>
                <PatientPrescriptionsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/patient/lab-results"
            element={
              <ProtectedRoute allowedRoles={['patient']}>
                <PatientLabResultsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/patient/billing"
            element={
              <ProtectedRoute allowedRoles={['patient']}>
                <PatientBillingPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/patient/health-summary"
            element={
              <ProtectedRoute allowedRoles={['patient']}>
                <PatientHealthSummaryPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/patient/messages"
            element={
              <ProtectedRoute allowedRoles={['patient']}>
                <PatientMessagesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/patient/messages/:threadId"
            element={
              <ProtectedRoute allowedRoles={['patient']}>
                <PatientMessagesPage />
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

          {/* Doctor Routes */}
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
            path="/doctor/earnings"
            element={
              <ProtectedRoute allowedRoles={['doctor']}>
                <DoctorEarningsPage />
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
          <Route
            path="/doctor/messages"
            element={
              <ProtectedRoute allowedRoles={['doctor']}>
                <DoctorMessagesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/doctor/statistics"
            element={
              <ProtectedRoute allowedRoles={['doctor']}>
                <DoctorStatisticsPage />
              </ProtectedRoute>
            }
          />

          {/* Call Routes (accessible by both patient and doctor) */}
          <Route
            path="/call/:threadId"
            element={
              <ProtectedRoute allowedRoles={['patient', 'doctor']}>
                <CallPage />
              </ProtectedRoute>
            }
          />

          {/* Mediator Routes */}
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
          <Route
            path="/mediator/queue"
            element={
              <ProtectedRoute allowedRoles={['mediator']}>
                <MediatorQueuePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/mediator/departments"
            element={
              <ProtectedRoute allowedRoles={['mediator']}>
                <MediatorDepartmentsPage />
              </ProtectedRoute>
            }
          />
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
            path="/mediator/analytics"
            element={
              <ProtectedRoute allowedRoles={['mediator']}>
                <MediatorAnalyticsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/mediator/branches"
            element={
              <ProtectedRoute allowedRoles={['mediator']}>
                <MediatorBranchesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/mediator/doctor-verification"
            element={
              <ProtectedRoute allowedRoles={['mediator']}>
                <MediatorDoctorVerificationPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/mediator/settings"
            element={
              <ProtectedRoute allowedRoles={['mediator']}>
                <MediatorDashboard />
              </ProtectedRoute>
            }
          />

          {/* Admin Routes - Redirect to Mediator Dashboard */}
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
            path="/admin/analytics"
            element={
              <ProtectedRoute allowedRoles={['mediator']}>
                <MediatorAnalyticsPage />
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
          <Route
            path="/mediator/settings"
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
    </>
  )
}

export default App
