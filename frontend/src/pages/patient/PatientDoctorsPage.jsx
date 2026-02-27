import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { 
  Search, 
  MapPin, 
  Star, 
  Calendar,
  ArrowRight,
  Filter,
  Stethoscope,
  Clock,
  Video,
  Building
} from 'lucide-react'
import toast from 'react-hot-toast'
import useAuthStore from '../../store/authStore'
import { getDoctors, getSpecializations, createAppointment } from '../../services/api'
import { DashboardLayout } from '../../components/layout'
import { GlassCard, Badge, Avatar, Button, Input } from '../../components/ui'
import { CardSkeleton } from '../../components/ui/Skeleton'

const PatientDoctorsPage = () => {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [doctors, setDoctors] = useState([])
  const [specializations, setSpecializations] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedSpecialization, setSelectedSpecialization] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [doctorsData, specData] = await Promise.all([
          getDoctors({ search, specialization: selectedSpecialization }),
          getSpecializations()
        ])
        setDoctors(doctorsData || [])
        setSpecializations(specData || [])
      } catch (error) {
        console.error('Error fetching doctors:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [search, selectedSpecialization])

  return (
    <DashboardLayout>
      <div className="mb-8">
        <motion.h1 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-bold text-white mb-2"
        >
          Find Doctors
        </motion.h1>
        <p className="text-white/60">Search and book appointments with verified doctors</p>
      </div>

      {/* Search and Filter */}
      <GlassCard className="p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
              <input
                type="text"
                placeholder="Search by name or specialization..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-primary-500"
              />
            </div>
          </div>
          <Button 
            variant="secondary" 
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2"
          >
            <Filter className="w-4 h-4" />
            Filters
          </Button>
        </div>

        {showFilters && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-4 pt-4 border-t border-white/10"
          >
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedSpecialization('')}
                className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                  selectedSpecialization === '' 
                    ? 'bg-primary-500 text-white' 
                    : 'bg-white/10 text-white/70 hover:bg-white/20'
                }`}
              >
                All
              </button>
              {specializations.map((spec) => (
                <button
                  key={spec}
                  onClick={() => setSelectedSpecialization(spec)}
                  className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                    selectedSpecialization === spec 
                      ? 'bg-primary-500 text-white' 
                      : 'bg-white/10 text-white/70 hover:bg-white/20'
                  }`}
                >
                  {spec}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </GlassCard>

      {/* Doctors List */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : doctors.length === 0 ? (
        <GlassCard className="p-12 text-center">
          <Stethoscope className="w-16 h-16 text-white/30 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No doctors found</h3>
          <p className="text-white/60">Try adjusting your search or filters</p>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {doctors.map((doctor, index) => (
            <motion.div
              key={doctor.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <GlassCard className="p-6 h-full flex flex-col">
                <div className="flex items-start gap-4 mb-4">
                  <Avatar name={doctor.full_name} src={doctor.avatar_url} size="lg" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white truncate">Dr. {doctor.full_name}</h3>
                    <p className="text-sm text-primary-400">{doctor.specialization}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                      <span className="text-sm text-white/70">
                        {doctor.rating || '0.0'} ({doctor.review_count || 0} reviews)
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 mb-4 flex-1">
                  <div className="flex items-center gap-2 text-sm text-white/60">
                    <Building className="w-4 h-4" />
                    <span className="truncate">{doctor.hospital || 'Hospital'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-white/60">
                    <MapPin className="w-4 h-4" />
                    <span className="truncate">{doctor.location || 'Location'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-white/60">
                    <Clock className="w-4 h-4" />
                    <span>{doctor.experience || 0} years experience</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-white/10">
                  <div>
                    <span className="text-lg font-bold text-white">${doctor.fee || 0}</span>
                    <span className="text-sm text-white/60">/consultation</span>
                  </div>
                  <Link to={`/patient/doctors/${doctor.id}`}>
                    <Button variant="primary" size="sm">
                      View Profile
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  </Link>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      )}
    </DashboardLayout>
  )
}

export default PatientDoctorsPage
