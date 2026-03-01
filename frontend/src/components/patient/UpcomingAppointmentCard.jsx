import { Link } from 'react-router-dom'
import { Calendar, User, Clock } from 'lucide-react'

const UpcomingAppointmentCard = ({ appointment, queueInfo, formatAppointmentDate, statusConfig }) => {
    if (!appointment && !queueInfo?.isWalkIn) {
        return (
            <div className="bg-white dark:bg-slate-900 rounded-[32px] p-8 shadow-sm border border-gray-100 dark:border-slate-800 text-center transition-colors">
                <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Calendar className="w-10 h-10 text-blue-500 dark:text-blue-400" />
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white mb-2">No upcoming visits</h3>
                <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">Book a consultation with our experienced doctors.</p>
                <Link
                    to="/patient/doctors"
                    className="inline-flex bg-blue-600 text-white font-black py-3 px-8 rounded-2xl shadow-lg shadow-blue-200 dark:shadow-none hover:bg-blue-700 active:scale-95 transition-all text-sm uppercase tracking-widest"
                >
                    Book Appointment
                </Link>
            </div>
        )
    }

    return (
        <div className="bg-white dark:bg-slate-900 rounded-[32px] p-6 shadow-sm border border-gray-100 dark:border-slate-800 relative text-center transition-colors">
            {/* Live Indicator */}
            <div className="flex items-center justify-center gap-2 mb-4">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                <span className="text-[10px] font-black tracking-widest text-green-600 dark:text-green-400 uppercase">Live Queue Status</span>
            </div>

            {/* Token Hero */}
            <div className="mb-6">
                <p className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-1">Your Token Number</p>
                <div className="inline-block bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-8 py-3 rounded-3xl font-black text-4xl shadow-sm border border-blue-100 dark:border-blue-900/30">
                    #{queueInfo?.token || (appointment ? 'A-12' : '--')}
                </div>
            </div>

            {/* Queue Details Grid */}
            <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-3xl border border-gray-100/50 dark:border-slate-700/50 transition-colors">
                    <div className="flex items-center justify-center gap-1.5 mb-1 text-blue-600 dark:text-blue-400">
                        <User className="w-4 h-4" />
                        <p className="text-xs font-bold uppercase tracking-wide">Position</p>
                    </div>
                    <p className="text-2xl font-black text-gray-900 dark:text-white">{queueInfo ? `${queueInfo.patientsAhead + 1}` : '--'}</p>
                    <p className="text-[10px] font-bold text-gray-400 dark:text-slate-500">{queueInfo?.patientsAhead || 0} ahead</p>
                </div>
                <div className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-3xl border border-gray-100/50 dark:border-slate-700/50 transition-colors">
                    <div className="flex items-center justify-center gap-1.5 mb-1 text-orange-500 dark:text-orange-400">
                        <Clock className="w-4 h-4" />
                        <p className="text-xs font-bold uppercase tracking-wide">Wait Time</p>
                    </div>
                    <p className="text-2xl font-black text-gray-900 dark:text-white">~{queueInfo?.estimatedWait || '15'}</p>
                    <p className="text-[10px] font-bold text-gray-400 dark:text-slate-500">Minutes</p>
                </div>
            </div>

            {/* Appointment Detail (Small Footer) */}
            <div className="flex items-center justify-between pt-5 border-t border-dashed border-gray-100 dark:border-slate-800 text-left">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400 font-black text-sm">
                        {(appointment?.doctor_name || queueInfo?.doctor_name || 'D').charAt(0)}
                    </div>
                    <div>
                        <h4 className="text-sm font-black text-gray-900 dark:text-white leading-none">Dr. {appointment?.doctor_name || queueInfo?.doctor_name || 'Specialist'}</h4>
                        <p className="text-[10px] font-bold text-gray-400 dark:text-slate-500 mt-1.5 uppercase tracking-wider">{appointment?.time || 'Walk-in'} • {appointment ? formatAppointmentDate(appointment.date) : 'Today'}</p>
                    </div>
                </div>
                {appointment && (
                    <span className={`text-[9px] font-black px-2 py-1 rounded-lg uppercase border ${statusConfig[appointment.status]?.color}`}>
                        {statusConfig[appointment.status]?.label}
                    </span>
                )}
            </div>
        </div>
    )
}

export default UpcomingAppointmentCard
