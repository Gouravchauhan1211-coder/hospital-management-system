import { useState, useEffect } from 'react'
import { Activity, Zap, AlertCircle } from 'lucide-react'
import supabase from '../../services/supabase'

const MAX_CAPACITY = 60

const DoctorAvailabilityCard = ({ doctors = [] }) => {
  const [doctorStats, setDoctorStats] = useState({})
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchDoctorStats = async () => {
      if (doctors.length === 0) return
      
      const stats = {}
      const today = new Date()
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)
      
      for (const doctor of doctors) {
        try {
          const { data: queueData } = await supabase
            .from('appointment_queue')
            .select('status')
            .eq('doctor_id', doctor.id)
            .gte('created_at', startOfDay.toISOString())
            .lt('created_at', endOfDay.toISOString())
            .in('status', ['waiting', 'in-progress'])
          
          const waiting = queueData?.filter(q => q.status === 'waiting').length || 0
          const inProgress = queueData?.filter(q => q.status === 'in-progress').length || 0
          const total = waiting + inProgress
          
          stats[doctor.id] = {
            waiting,
            inProgress,
            total,
            remaining: Math.max(0, MAX_CAPACITY - total),
            isFull: total >= MAX_CAPACITY,
            isAlmostFull: total >= MAX_CAPACITY * 0.75
          }
        } catch (e) {
          stats[doctor.id] = { waiting: 0, inProgress: 0, total: 0, remaining: MAX_CAPACITY, isFull: false, isAlmostFull: false }
        }
      }
      setDoctorStats(stats)
      setIsLoading(false)
    }
    
    fetchDoctorStats()
    const interval = setInterval(fetchDoctorStats, 15000)
    return () => clearInterval(interval)
  }, [doctors])

  const getCapacityStatus = (stats) => {
    if (!stats || stats.total === 0) return { label: 'Available', color: 'bg-green-500', text: 'text-green-600', bg: 'bg-green-50' }
    if (stats.isFull) return { label: 'Full', color: 'bg-red-500', text: 'text-red-600', bg: 'bg-red-50' }
    if (stats.isAlmostFull) return { label: 'High traffic', color: 'bg-orange-500', text: 'text-orange-600', bg: 'bg-orange-50' }
    return { label: 'Available', color: 'bg-green-500', text: 'text-green-600', bg: 'bg-green-50' }
  }

  const getRecommendedDoctor = () => {
    let minWait = Infinity
    let recommended = null
    
    for (const doctor of doctors) {
      const stats = doctorStats[doctor.id]
      if (stats && !stats.isFull && stats.total < minWait) {
        minWait = stats.total
        recommended = doctor
      }
    }
    
    return recommended
  }

  const recommendedDoctor = getRecommendedDoctor()

  if (isLoading) {
    return (
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-[2rem] p-5 text-white shadow-lg">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-5 h-5" />
          <h2 className="font-bold text-lg">Live Doctor Availability</h2>
        </div>
        <div className="animate-pulse space-y-2">
          {[1,2,3,4].map(i => (
            <div key={i} className="h-12 bg-white/10 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-[2rem] p-5 text-white shadow-lg">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="w-5 h-5 text-teal-400" />
        <h2 className="font-bold text-lg">Live Doctor Availability</h2>
        <div className="ml-auto w-2 h-2 bg-teal-400 rounded-full animate-pulse"></div>
      </div>
      
      <div className="space-y-2 max-h-80 overflow-y-auto">
        {doctors.map(doctor => {
          const stats = doctorStats[doctor.id] || { waiting: 0, inProgress: 0, total: 0, remaining: MAX_CAPACITY, isFull: false }
          const status = getCapacityStatus(stats)
          const isRecommended = recommendedDoctor?.id === doctor.id
          
          return (
            <div 
              key={doctor.id} 
              className={`flex items-center justify-between p-3 rounded-xl transition-all ${
                isRecommended ? 'bg-teal-500/20 ring-1 ring-teal-400' : 'bg-white/5'
              }`}
            >
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${status.color}`} />
                <div>
                  <p className="text-sm font-medium text-white">{doctor.full_name}</p>
                  {isRecommended && (
                    <p className="text-[10px] text-teal-400 flex items-center gap-1">
                      <Zap className="w-3 h-3" /> Recommended (shortest wait)
                    </p>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className={`text-sm font-bold ${status.text.replace('text-', 'text-').replace('600', '400')}`}>
                  {stats.total}/{MAX_CAPACITY}
                </p>
                <p className="text-[10px] text-white/60">
                  {stats.remaining > 0 ? `${stats.remaining} slots left` : status.label}
                </p>
              </div>
            </div>
          )
        })}
      </div>
      
      {doctors.length === 0 && (
        <div className="text-center py-4 text-white/60">
          <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No doctors available</p>
        </div>
      )}
    </div>
  )
}

export default DoctorAvailabilityCard