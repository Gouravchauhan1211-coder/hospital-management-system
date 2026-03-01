import { useNavigate } from 'react-router-dom'
import { HeartPulse, Tablet, Brain, Baby, Activity } from 'lucide-react'

const specialties = [
    { name: 'Cardiology', icon: HeartPulse, color: 'bg-red-50 text-red-500' },
    { name: 'Dental', icon: Tablet, color: 'bg-blue-50 text-blue-500' },
    { name: 'Neurology', icon: Brain, color: 'bg-purple-50 text-purple-500' },
    { name: 'Pediatrics', icon: Baby, color: 'bg-orange-50 text-orange-500' },
    { name: 'Orthopedics', icon: Activity, color: 'bg-green-50 text-green-500' },
    { name: 'General Medicine', icon: HeartPulse, color: 'bg-teal-50 text-teal-500' }
]

const SpecialtiesSection = () => {
    const navigate = useNavigate()

    return (
        <section className="mb-6">
            <div className="flex items-center justify-between mb-3 px-1">
                <h2 className="text-base font-bold text-gray-900">Specialties</h2>
                <button
                    onClick={() => navigate('/patient/doctors')}
                    className="text-xs font-bold text-blue-600 uppercase tracking-wider"
                >
                    See All
                </button>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-4 -mx-1 px-1 no-scrollbar">
                {specialties.map((specialty, i) => {
                    const Icon = specialty.icon
                    return (
                        <button
                            key={i}
                            onClick={() => navigate(`/patient/doctors?specialty=${specialty.name}`)}
                            className="flex flex-col items-center gap-2 min-w-[85px] group"
                        >
                            <div className={`w-14 h-14 rounded-2xl ${specialty.color} flex items-center justify-center shadow-sm border border-white group-hover:scale-105 transition-transform`}>
                                <Icon className="w-6 h-6" />
                            </div>
                            <span className="text-[10px] font-bold text-gray-700 text-center leading-tight whitespace-nowrap">{specialty.name}</span>
                        </button>
                    )
                })}
            </div>
        </section>
    )
}

export default SpecialtiesSection
