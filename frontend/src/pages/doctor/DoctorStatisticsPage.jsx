import { useState, useEffect } from 'react'
import { supabase } from '../../services/supabase'

const DoctorStatisticsPage = ({ doctorId }) => {
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('week') // week, month, year
  const [stats, setStats] = useState({
    totalPatients: 0,
    totalAppointments: 0,
    completedAppointments: 0,
    cancelledAppointments: 0,
    averageRating: 0,
    totalReviews: 0,
    totalEarnings: 0,
    thisWeekPatients: 0,
    thisMonthPatients: 0
  })
  const [chartData, setChartData] = useState({
    appointmentsByDay: [],
    appointmentsByMonth: [],
    earningsByMonth: [],
    ratingTrend: []
  })
  const [popularSlots, setPopularSlots] = useState([])

  useEffect(() => {
    if (doctorId) {
      fetchStatistics()
    }
  }, [doctorId, timeRange])

  const fetchStatistics = async () => {
    setLoading(true)
    try {
      const now = new Date()
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)

      // Get date range based on selection
      let startDate
      switch (timeRange) {
        case 'week':
          startDate = weekAgo
          break
        case 'month':
          startDate = monthAgo
          break
        case 'year':
          startDate = yearAgo
          break
        default:
          startDate = weekAgo
      }

      // Fetch appointments
      const { data: appointments, error: appointmentsError } = await supabase
        .from('appointments')
        .select('*')
        .eq('doctor_id', doctorId)
        .gte('appointment_date', startDate.toISOString().split('T')[0])

      if (appointmentsError) throw appointmentsError

      // Fetch reviews
      const { data: reviews, error: reviewsError } = await supabase
        .from('reviews')
        .select('*')
        .eq('doctor_id', doctorId)

      if (reviewsError) throw reviewsError

      // Fetch doctor data
      const { data: doctor, error: doctorError } = await supabase
        .from('doctors')
        .select('rating, review_count, consultation_fee')
        .eq('id', doctorId)
        .single()

      if (doctorError) throw doctorError

      // Calculate statistics
      const completedAppts = appointments?.filter(a => a.status === 'completed') || []
      const cancelledAppts = appointments?.filter(a => a.status === 'cancelled') || []
      const uniquePatients = [...new Set(appointments?.map(a => a.patient_id) || [])]

      // Calculate earnings
      const totalEarnings = completedAppts.reduce((sum, a) => {
        return sum + (a.consultation_fee || doctor?.consultation_fee || 0)
      }, 0)

      // Appointments by day (for chart)
      const appointmentsByDay = []
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
        const dateStr = date.toISOString().split('T')[0]
        const count = appointments?.filter(a => 
          a.appointment_date === dateStr || 
          a.appointment_date?.startsWith(dateStr)
        ).length || 0
        appointmentsByDay.push({
          date: date.toLocaleDateString('en-US', { weekday: 'short' }),
          count
        })
      }

      // Popular time slots
      const slotCounts = {}
      appointments?.forEach(a => {
        if (a.appointment_time) {
          slotCounts[a.appointment_time] = (slotCounts[a.appointment_time] || 0) + 1
        }
      })
      const sortedSlots = Object.entries(slotCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([slot, count]) => ({ slot, count }))

      // Rating trend (last 6 months)
      const ratingTrend = []
      for (let i = 5; i >= 0; i--) {
        const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)
        const monthReviews = reviews?.filter(r => {
          const reviewDate = new Date(r.created_at)
          return reviewDate >= monthStart && reviewDate <= monthEnd
        }) || []
        const avgRating = monthReviews.length > 0
          ? monthReviews.reduce((sum, r) => sum + r.rating, 0) / monthReviews.length
          : 0
        ratingTrend.push({
          month: monthStart.toLocaleDateString('en-US', { month: 'short' }),
          rating: avgRating.toFixed(1),
          count: monthReviews.length
        })
      }

      setStats({
        totalPatients: uniquePatients.length,
        totalAppointments: appointments?.length || 0,
        completedAppointments: completedAppts.length,
        cancelledAppointments: cancelledAppts.length,
        averageRating: doctor?.rating || 0,
        totalReviews: doctor?.review_count || reviews?.length || 0,
        totalEarnings,
        cancellationRate: appointments?.length > 0 
          ? ((cancelledAppts.length / appointments.length) * 100).toFixed(1)
          : 0
      })

      setChartData({
        appointmentsByDay,
        ratingTrend
      })

      setPopularSlots(sortedSlots)

    } catch (error) {
      console.error('Error fetching statistics:', error)
    } finally {
      setLoading(false)
    }
  }

  const StatCard = ({ title, value, subtitle, icon, color = 'blue' }) => (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-200 p-6`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className={`text-3xl font-bold mt-1 text-${color}-600`}>{value}</p>
          {subtitle && <p className="text-sm text-gray-400 mt-1">{subtitle}</p>}
        </div>
        <div className={`p-3 bg-${color}-100 rounded-lg`}>
          {icon}
        </div>
      </div>
    </div>
  )

  const SimpleBarChart = ({ data, dataKey, xKey, height = 200 }) => {
    const maxValue = Math.max(...data.map(d => d[dataKey])) || 1
    
    return (
      <div className="flex items-end justify-between gap-2" style={{ height }}>
        {data.map((item, index) => (
          <div key={index} className="flex-1 flex flex-col items-center">
            <div 
              className="w-full bg-blue-500 rounded-t transition-all duration-300"
              style={{ 
                height: `${(item[dataKey] / maxValue) * (height - 30)}px`,
                minHeight: item[dataKey] > 0 ? '4px' : '0'
              }}
            />
            <span className="text-xs text-gray-500 mt-2">{item[xKey]}</span>
          </div>
        ))}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-gray-200 rounded w-1/4"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-32 bg-gray-200 rounded-xl"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Statistics Dashboard</h1>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="week">Last 7 Days</option>
          <option value="month">Last 30 Days</option>
          <option value="year">Last Year</option>
        </select>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Patients"
          value={stats.totalPatients}
          subtitle="Unique patients"
          icon={
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          }
          color="blue"
        />
        <StatCard
          title="Appointments"
          value={stats.totalAppointments}
          subtitle={`${stats.completedAppointments} completed`}
          icon={
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          }
          color="green"
        />
        <StatCard
          title="Average Rating"
          value={stats.averageRating ? stats.averageRating.toFixed(1) : 'N/A'}
          subtitle={`${stats.totalReviews} reviews`}
          icon={
            <svg className="w-6 h-6 text-yellow-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          }
          color="yellow"
        />
        <StatCard
          title="Total Earnings"
          value={`₹${stats.totalEarnings.toLocaleString()}`}
          subtitle="From completed appointments"
          icon={
            <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          color="purple"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Appointments by Day */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Appointments This Week</h3>
          <SimpleBarChart
            data={chartData.appointmentsByDay}
            dataKey="count"
            xKey="date"
          />
        </div>

        {/* Rating Trend */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Rating Trend (Last 6 Months)</h3>
          <div className="space-y-3">
            {chartData.ratingTrend?.map((item, index) => (
              <div key={index} className="flex items-center gap-4">
                <span className="w-12 text-sm text-gray-500">{item.month}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                  <div 
                    className="h-full bg-yellow-400 rounded-full transition-all duration-300"
                    style={{ width: `${(item.rating / 5) * 100}%` }}
                  />
                </div>
                <span className="w-12 text-sm font-medium text-gray-700">{item.rating}</span>
                <span className="text-xs text-gray-400">({item.count} reviews)</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Popular Time Slots & Cancellation Rate */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Popular Time Slots */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Popular Time Slots</h3>
          {popularSlots.length > 0 ? (
            <div className="space-y-3">
              {popularSlots.map((item, index) => (
                <div key={index} className="flex items-center gap-4">
                  <span className="w-8 text-sm font-medium text-gray-500">#{index + 1}</span>
                  <span className="w-24 text-sm font-medium text-gray-900">{item.slot}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 rounded-full"
                      style={{ width: `${(item.count / popularSlots[0].count) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm text-gray-500">{item.count} bookings</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No booking data available</p>
          )}
        </div>

        {/* Quick Stats */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Metrics</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
              <span className="text-gray-600">Completion Rate</span>
              <span className="font-semibold text-green-600">
                {stats.totalAppointments > 0 
                  ? ((stats.completedAppointments / stats.totalAppointments) * 100).toFixed(1)
                  : 0}%
              </span>
            </div>
            <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
              <span className="text-gray-600">Cancellation Rate</span>
              <span className={`font-semibold ${stats.cancellationRate > 20 ? 'text-red-600' : 'text-gray-900'}`}>
                {stats.cancellationRate}%
              </span>
            </div>
            <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
              <span className="text-gray-600">Avg. Daily Patients</span>
              <span className="font-semibold text-gray-900">
                {(stats.totalAppointments / 7).toFixed(1)}
              </span>
            </div>
            <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
              <span className="text-gray-600">Avg. Earnings/Day</span>
              <span className="font-semibold text-gray-900">
                ₹{(stats.totalEarnings / 7).toFixed(0)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DoctorStatisticsPage