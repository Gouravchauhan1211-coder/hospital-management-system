import { motion, AnimatePresence } from 'framer-motion'
import { X, MapPin, Clock, Bell, BellOff, ChevronRight } from 'lucide-react'
import { useState, useEffect } from 'react'

const AppointmentDetailModal = ({ appointment, queueDetails, isOpen, onClose }) => {
  const [smartAlertEnabled, setSmartAlertEnabled] = useState(false)
  const [alertPatientsRemaining, setAlertPatientsRemaining] = useState(3)

  if (!appointment) return null

  const patientsAhead = queueDetails?.patientsAhead || 0
  const yourToken = queueDetails?.tokenNumber || '--'
  const waitTime = queueDetails?.estimatedWaitTime || 0
  const currentToken = queueDetails?.currentToken || '--'
  const progressPercent = patientsAhead > 0 ? Math.max(10, 100 - (patientsAhead * 15)) : 65

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end justify-center"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="bg-surface-container-low w-full max-w-md rounded-t-[2rem] p-6 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-surface-container flex items-center justify-center"
            >
              <X className="w-5 h-5 text-on-surface" />
            </button>

            {/* Doctor Assignment Header */}
            <div className="flex items-center justify-between bg-surface-container-low rounded-[2rem] p-5 mb-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl overflow-hidden shadow-sm">
                  {appointment.doctor_avatar ? (
                    <img 
                      alt={appointment.doctor_name} 
                      className="w-full h-full object-cover" 
                      src={appointment.doctor_avatar} 
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary to-primary-dim flex items-center justify-center">
                      <span className="text-white font-bold text-xl">
                        {appointment.doctor_name?.charAt(0) || 'D'}
                      </span>
                    </div>
                  )}
                </div>
                <div>
                  <h2 className="font-bold text-on-surface text-lg leading-tight">
                    Dr. {appointment.doctor_name || 'Doctor'}
                  </h2>
                  <p className="text-on-surface-variant text-sm font-medium">
                    {appointment.specialization || 'General Medicine'}
                  </p>
                </div>
              </div>
              <div className="bg-surface-container-lowest px-4 py-2 rounded-xl shadow-sm">
                <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-0.5">Location</p>
                <p className="font-bold text-on-surface">{appointment.room_number || 'Room --'}</p>
              </div>
            </div>

            {/* Main Now Serving Display */}
            <div className="relative bg-gradient-to-br from-primary to-primary/80 rounded-[2.5rem] p-8 mb-6 text-center shadow-[0_32px_64px_rgba(0,104,123,0.15)] overflow-hidden">
              <div className="absolute -top-12 -right-12 w-32 h-32 bg-white/10 blur-3xl rounded-full"></div>
              <div className="flex flex-col items-center gap-2 mb-6">
                <div className="flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full">
                  <div className="w-2 h-2 rounded-full bg-white animate-pulse"></div>
                  <span className="text-white text-[10px] font-bold uppercase tracking-[0.2em]">Now Serving</span>
                </div>
                <h3 className="font-bold text-white text-7xl tracking-tighter">
                  {currentToken.replace('A', '').replace('V', '').replace('E', '') || '--'}
                </h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-md">
                  <p className="text-white/70 text-[11px] font-medium uppercase tracking-wider mb-1">Your Token</p>
                  <p className="font-bold text-white text-2xl">
                    {yourToken.replace('A', '').replace('V', '').replace('E', '') || '--'}
                  </p>
                </div>
                <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-md">
                  <p className="text-white/70 text-[11px] font-medium uppercase tracking-wider mb-1">Wait Time</p>
                  <p className="font-bold text-white text-2xl">{waitTime} <span className="text-xs">min</span></p>
                </div>
              </div>
            </div>

            {/* Progress Tracker */}
            <div className="bg-surface-container-low rounded-[2rem] p-6 mb-6">
              <div className="flex justify-between items-center mb-6">
                <h4 className="font-bold text-on-surface">Queue Progress</h4>
                <div className="flex items-center gap-1.5 px-3 py-1 bg-secondary-container rounded-full">
                  <span className="text-on-secondary-container text-xs font-bold uppercase tracking-wide">
                    {patientsAhead} Patients ahead
                  </span>
                </div>
              </div>
              <div className="relative h-4 bg-surface-container-highest rounded-full mb-6">
                <div 
                  className="absolute top-0 left-0 h-full bg-gradient-to-r from-primary to-primary-container rounded-full relative"
                  style={{ width: `${progressPercent}%` }}
                >
                  <div className="absolute -right-3 -top-2.5 w-10 h-10 bg-surface-container-lowest rounded-full flex items-center justify-center shadow-lg ring-4 ring-primary/10">
                    <svg className="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                    </svg>
                  </div>
                </div>
              </div>
              <div className="flex justify-between text-xs font-bold text-on-surface-variant uppercase tracking-widest px-1">
                <span>Start</span>
                <span className="text-primary">You</span>
                <span>Doctor</span>
              </div>
            </div>

            {/* Notifications Control */}
            <div className="bg-surface-container-lowest border border-outline-variant/10 rounded-3xl p-5 flex items-center justify-between shadow-[0_8px_32px_rgba(0,0,0,0.02)]">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-tertiary-container/10 flex items-center justify-center">
                  {smartAlertEnabled ? (
                    <Bell className="w-6 h-6 text-tertiary" />
                  ) : (
                    <BellOff className="w-6 h-6 text-on-surface-variant" />
                  )}
                </div>
                <div>
                  <h5 className="font-bold text-on-surface leading-none mb-1">Smart Alert</h5>
                  <p className="text-on-surface-variant text-xs font-medium">
                    Notify me when {alertPatientsRemaining} patients remain
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setSmartAlertEnabled(!smartAlertEnabled)}
                className={`relative inline-flex h-7 w-12 items-center rounded-full shadow-inner transition-colors ${
                  smartAlertEnabled ? 'bg-primary' : 'bg-surface-container-high'
                }`}
              >
                <span 
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform ${
                    smartAlertEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Status Badge */}
            <div className="mt-6 flex justify-center">
              {appointment.status === 'confirmed' && (
                <span className="inline-flex items-center gap-1 px-4 py-2 rounded-full text-sm font-medium bg-green-100 text-green-700">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Confirmed
                </span>
              )}
              {appointment.status === 'pending' && (
                <span className="inline-flex items-center gap-1 px-4 py-2 rounded-full text-sm font-medium bg-yellow-100 text-yellow-700">
                  <svg className="w-4 h-4 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                  </svg>
                  Pending Approval
                </span>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default AppointmentDetailModal
