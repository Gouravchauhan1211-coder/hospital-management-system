import { useState } from 'react'
import Navbar from './Navbar'
import useAuthStore from '../../store/authStore'
import PatientBottomNav from './PatientBottomNav'
import DoctorBottomNav from './DoctorBottomNav'
import MediatorBottomNav from './MediatorBottomNav'

const DashboardLayout = ({ children }) => {
  const { user } = useAuthStore()
  const role = user?.role || 'patient'

  return (
    <div className="min-h-[100dvh] bg-gray-100 flex flex-col font-sans">
      <div className="flex-1 flex flex-col max-w-md w-full mx-auto bg-gray-50 relative shadow-2xl overflow-x-hidden pb-20">
        <Navbar />

        <main className="flex-1 p-4 overflow-y-auto">
          {children}
        </main>

        {/* Dynamic Bottom Navigation based on Role */}
        {role === 'patient' && <PatientBottomNav />}
        {role === 'doctor' && <DoctorBottomNav />}
        {role === 'mediator' && <MediatorBottomNav />}
      </div>
    </div>
  )
}

export default DashboardLayout


