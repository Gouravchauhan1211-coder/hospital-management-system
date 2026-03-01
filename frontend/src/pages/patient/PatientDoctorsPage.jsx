import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
    Search,
    MapPin,
    Star,
    ArrowRight,
    Filter,
    Stethoscope,
    Clock,
    Building,
    X
} from 'lucide-react'
import toast from 'react-hot-toast'
import useAuthStore from '../../store/authStore'
import { getDoctors, getSpecializations } from '../../services/api'
import { DashboardLayout } from '../../components/layout'
import { GlassCard, Avatar, Button } from '../../components/ui'
import { CardSkeleton } from '../../components/ui/Skeleton'

const PatientDoctorsPage = () => {
    const navigate = useNavigate()
    const location = useLocation()
    const { user } = useAuthStore()

    // Get specialty from URL query param
    const queryParams = new URLSearchParams(location.search)
    const specialtyFromQuery = queryParams.get('specialty')

    const [doctors, setDoctors] = useState([])
    const [specializations, setSpecializations] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [selectedSpecialization, setSelectedSpecialization] = useState(specialtyFromQuery || '')
    const [showFilters, setShowFilters] = useState(false)

    // Update selected specialization when URL change
    useEffect(() => {
        setSelectedSpecialization(specialtyFromQuery || '')
    }, [specialtyFromQuery])

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true)
            try {
                const [doctorsData, specData] = await Promise.all([
                    getDoctors({ search, specialization: selectedSpecialization }),
                    getSpecializations()
                ])
                setDoctors(doctorsData || [])
                setSpecializations(specData || [])
            } catch (error) {
                console.error('Error fetching doctors:', error)
                toast.error('Failed to load doctors')
            } finally {
                setIsLoading(false)
            }
        }
        fetchData()
    }, [search, selectedSpecialization])

    const clearFilters = () => {
        setSelectedSpecialization('')
        setSearch('')
        navigate('/patient/doctors')
    }

    return (
        <DashboardLayout>
            <div className="mb-6">
                <motion.h1
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-2xl font-bold text-gray-800 mb-1"
                >
                    Find Doctors
                </motion.h1>
                <p className="text-gray-500 text-sm">Search and book appointments with verified doctors</p>
            </div>

            {/* Active Filter Header */}
            {selectedSpecialization && (
                <div className="flex items-center justify-between bg-blue-50 border border-blue-100 p-3 rounded-xl mb-6 shadow-sm">
                    <div className="flex items-center gap-2">
                        <Stethoscope className="w-5 h-5 text-blue-600" />
                        <p className="text-sm font-semibold text-blue-900">
                            Showing: <span className="text-blue-600">{selectedSpecialization} Doctors</span>
                        </p>
                    </div>
                    <button
                        onClick={clearFilters}
                        className="flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-white px-2 py-1 rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors uppercase tracking-wider"
                    >
                        <X className="w-3 h-3" />
                        Clear Filter
                    </button>
                </div>
            )}

            {/* Search and Filter */}
            <div className="flex gap-3 mb-6">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search doctor, hospital..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-white border border-gray-100 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:border-blue-500 shadow-sm transition-all"
                    />
                </div>
                <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`p-3 rounded-xl border transition-all shadow-sm ${showFilters ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-100 text-gray-600 hover:border-blue-200'}`}
                >
                    <Filter className="w-5 h-5" />
                </button>
            </div>

            {showFilters && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mb-8 overflow-hidden"
                >
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 px-1">Specializations</h3>
                    <div className="flex flex-wrap gap-2">
                        {['All', ...specializations].map((spec) => {
                            const isActive = spec === 'All' ? selectedSpecialization === '' : selectedSpecialization === spec
                            return (
                                <button
                                    key={spec}
                                    onClick={() => {
                                        const nextSpec = spec === 'All' ? '' : spec
                                        setSelectedSpecialization(nextSpec)
                                        if (nextSpec) {
                                            navigate(`/patient/doctors?specialty=${nextSpec}`)
                                        } else {
                                            navigate('/patient/doctors')
                                        }
                                    }}
                                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${isActive
                                            ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                                            : 'bg-white border-gray-100 text-gray-600 hover:border-blue-200'
                                        }`}
                                >
                                    {spec}
                                </button>
                            )
                        })}
                    </div>
                </motion.div>
            )}

            {/* Doctors List */}
            {isLoading ? (
                <div className="grid grid-cols-1 gap-4">
                    <CardSkeleton />
                    <CardSkeleton />
                    <CardSkeleton />
                </div>
            ) : doctors.length === 0 ? (
                <div className="bg-white p-12 text-center rounded-3xl border border-gray-100 shadow-sm">
                    <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-100">
                        <Stethoscope className="w-10 h-10 text-gray-300" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-800 mb-1">No doctors available {selectedSpecialization ? `in ${selectedSpecialization}` : ''}</h3>
                    <p className="text-gray-500 text-sm mb-6">Try adjusting your search or filters to find more results.</p>
                    <button
                        onClick={clearFilters}
                        className="text-blue-600 font-bold text-sm uppercase tracking-wider"
                    >
                        Clear all filters
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {doctors.map((doctor, index) => (
                        <motion.div
                            key={doctor.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 hover:border-blue-100 transition-all flex flex-col group"
                        >
                            <div className="flex items-start gap-4 mb-4">
                                <Avatar name={doctor.full_name} src={doctor.avatar_url} size="lg" className="rounded-2xl shadow-sm" />
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-gray-900 truncate tracking-tight">Dr. {doctor.full_name}</h3>
                                    <p className="text-xs font-bold text-blue-600 uppercase tracking-wide mb-1.5">{doctor.specialization}</p>
                                    <div className="flex items-center gap-1">
                                        <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                                        <span className="text-xs font-bold text-gray-700">
                                            {doctor.rating || '4.8'}
                                        </span>
                                        <span className="text-[10px] text-gray-400 font-medium">
                                            ({doctor.review_count || 12} reviews)
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-y-2 mb-4 bg-gray-50 p-3 rounded-2xl border border-gray-100/50">
                                <div className="flex items-center gap-2 text-[11px] text-gray-600 font-medium">
                                    <Building className="w-3.5 h-3.5 text-gray-400" />
                                    <span className="truncate">{doctor.hospital || 'Medicare Hospital'}</span>
                                </div>
                                <div className="flex items-center gap-2 text-[11px] text-gray-600 font-medium">
                                    <MapPin className="w-3.5 h-3.5 text-gray-400" />
                                    <span className="truncate">{doctor.location || 'New York, NY'}</span>
                                </div>
                                <div className="flex items-center gap-2 text-[11px] text-gray-600 font-medium">
                                    <Clock className="w-3.5 h-3.5 text-gray-400" />
                                    <span>{doctor.experience || 8}+ years exp</span>
                                </div>
                                <div className="flex items-center gap-2 text-[11px] text-gray-600 font-medium">
                                    <Star className="w-3.5 h-3.5 text-gray-400" />
                                    <span>Fee: ${doctor.fee || '50'}</span>
                                </div>
                            </div>

                            <Link to={`/patient/doctors/${doctor.id}`}>
                                <button className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-2xl shadow-lg shadow-blue-100 flex items-center justify-center gap-2 hover:bg-blue-700 active:scale-[0.98] transition-all text-sm uppercase tracking-widest">
                                    View Profile
                                    <ArrowRight className="w-4 h-4" />
                                </button>
                            </Link>
                        </motion.div>
                    ))}
                </div>
            )}
        </DashboardLayout>
    )
}

export default PatientDoctorsPage



