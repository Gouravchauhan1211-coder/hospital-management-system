import { Star, ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const TopDoctorsSection = ({ doctors, isLoading }) => {
    const navigate = useNavigate()

    if (isLoading) {
        return (
            <section className="mb-6">
                <h2 className="text-base font-bold text-gray-900 mb-3 px-1">Top Doctors</h2>
                <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="bg-white p-3 rounded-2xl shadow-sm border border-gray-50 flex gap-3 items-center animate-pulse">
                            <div className="w-14 h-14 bg-gray-100 rounded-xl" />
                            <div className="flex-1 space-y-2">
                                <div className="h-4 bg-gray-100 rounded w-1/3" />
                                <div className="h-3 bg-gray-100 rounded w-1/2" />
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        )
    }

    return (
        <section className="mb-6">
            <div className="flex items-center justify-between mb-3 px-1">
                <h2 className="text-base font-bold text-gray-900">Top Doctors</h2>
                <button
                    onClick={() => navigate('/patient/doctors')}
                    className="text-xs font-bold text-blue-600 uppercase tracking-wider"
                >
                    See All
                </button>
            </div>
            <div className="space-y-3">
                {doctors.map((doctor) => (
                    <div
                        key={doctor.id}
                        className="bg-white p-3 rounded-2xl shadow-sm border border-gray-50 flex gap-3 items-center hover:border-blue-100 transition-all group"
                    >
                        {doctor.avatar_url ? (
                            <img
                                src={doctor.avatar_url}
                                alt={doctor.full_name}
                                className="w-14 h-14 rounded-xl object-cover shadow-sm"
                            />
                        ) : (
                            <div className="w-14 h-14 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-lg border border-blue-100">
                                {doctor.full_name?.charAt(0) || 'D'}
                            </div>
                        )}
                        <div className="flex-1">
                            <h4 className="text-sm font-bold text-gray-900 leading-tight">Dr. {doctor.full_name}</h4>
                            <p className="text-[11px] text-gray-500 font-medium mb-1">{doctor.specialization}</p>
                            <div className="flex items-center gap-1">
                                <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                                <span className="text-[11px] font-bold text-gray-700">{doctor.rating || '4.8'}</span>
                            </div>
                        </div>
                        <button
                            onClick={() => navigate(`/patient/doctors/${doctor.id}`)}
                            className="bg-blue-600 text-white text-[10px] font-bold py-2 px-4 rounded-xl shadow-sm hover:bg-blue-700 active:scale-95 transition-all uppercase tracking-wider"
                        >
                            Book
                        </button>
                    </div>
                ))}
            </div>
        </section>
    )
}

export default TopDoctorsSection
