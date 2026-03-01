import { Link, useLocation } from 'react-router-dom'
import { Home, Stethoscope, Calendar, MessageSquare, User } from 'lucide-react'

const PatientBottomNav = () => {
    const location = useLocation()

    const isActive = (path) => location.pathname === path

    const navItems = [
        { name: 'Home', path: '/patient/dashboard', icon: Home },
        { name: 'Doctors', path: '/patient/doctors', icon: Stethoscope },
        { name: 'Visits', path: '/patient/appointments', icon: Calendar },
        { name: 'Chat', path: '/patient/messages', icon: MessageSquare },
        { name: 'Profile', path: '/patient/profile', icon: User }
    ]

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-6 py-3 flex justify-between items-center z-50 max-w-md mx-auto shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)]">
            {navItems.map((item) => {
                const Icon = item.icon
                const active = isActive(item.path)

                return (
                    <Link
                        key={item.name}
                        to={item.path}
                        className={`flex flex-col items-center gap-1 transition-colors ${active ? 'text-blue-600' : 'text-gray-400 hover:text-gray-900'
                            }`}
                    >
                        <Icon className="w-6 h-6" />
                        <span className={`text-[10px] ${active ? 'font-bold' : 'font-semibold'}`}>
                            {item.name}
                        </span>
                    </Link>
                )
            })}
        </div>
    )
}

export default PatientBottomNav
