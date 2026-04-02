import { useState, useEffect, useMemo } from 'react'
import toast from 'react-hot-toast'
import useAuthStore from '../../store/authStore'
import { getUserProfile, updateUserProfile } from '../../services/api'
import { supabase } from '../../services/supabase'
import { DashboardLayout } from '../../components/layout'

const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const fullDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const DoctorAvailabilityPage = () => {
  const { user } = useAuthStore()

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const [weeklySchedule, setWeeklySchedule] = useState({
    Monday: { enabled: true, startTime: '09:00 AM', endTime: '05:00 PM' },
    Tuesday: { enabled: true, startTime: '09:00 AM', endTime: '05:00 PM' },
    Wednesday: { enabled: true, startTime: '08:00 AM', endTime: '02:00 PM' },
    Thursday: { enabled: true, startTime: '09:00 AM', endTime: '05:00 PM' },
    Friday: { enabled: true, startTime: '09:00 AM', endTime: '05:00 PM' },
    Saturday: { enabled: false, startTime: '09:00 AM', endTime: '02:00 PM' },
    Sunday: { enabled: false, startTime: '09:00 AM', endTime: '02:00 PM' },
  })

  const [unavailableDates, setUnavailableDates] = useState([])
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [showTimeEditModal, setShowTimeEditModal] = useState(false)
  const [showTimeOffModal, setShowTimeOffModal] = useState(false)
  const [editingDay, setEditingDay] = useState(null)
  const [editTimeForm, setEditTimeForm] = useState({ startTime: '', endTime: '' })
  const [timeOffForm, setTimeOffForm] = useState({ startDate: '', endDate: '', reason: '' })

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.id) return
      try {
        const profile = await getUserProfile('doctors', user.id)
        console.log('Loaded profile availability:', profile?.availability)
        
        if (profile?.availability) {
          const parsed = typeof profile.availability === 'string' 
            ? JSON.parse(profile.availability) 
            : profile.availability
          console.log('Parsed availability:', parsed)
          
          if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
            // Merge with default to ensure all days have at least some data
            const merged = { ...weeklySchedule, ...parsed }
            console.log('Merged schedule:', merged)
            setWeeklySchedule(merged)
          }
        }
      } catch (error) {
        console.error('Error fetching profile:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchProfile()
  }, [user?.id])

  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startDay = firstDay.getDay()
    
    const days = []
    for (let i = 0; i < startDay; i++) {
      days.push(null)
    }
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i))
    }
    return days
  }, [currentMonth])

  const convertTo24Hour = (time12h) => {
    if (!time12h) return ''
    const [time, modifier] = time12h.split(' ')
    let [hours, minutes] = time.split(':')
    if (hours === '12') hours = '00'
    if (modifier === 'PM') hours = parseInt(hours, 10) + 12
    return `${hours}:${minutes}`
  }

  const toggleDayEnabled = (day) => {
    setWeeklySchedule(prev => ({
      ...prev,
      [day]: { 
        ...prev[day], 
        enabled: !prev[day].enabled,
        startTime: !prev[day].enabled && !prev[day].startTime ? '09:00 AM' : prev[day].startTime,
        endTime: !prev[day].enabled && !prev[day].endTime ? '02:00 PM' : prev[day].endTime
      }
    }))
  }

  const addTimeOff = () => {
    if (!timeOffForm.startDate || !timeOffForm.reason) {
      toast.error('Please fill required fields')
      return
    }
    setUnavailableDates(prev => [...prev, {
      date: timeOffForm.startDate,
      endDate: timeOffForm.endDate,
      reason: timeOffForm.reason,
    }])
    setShowTimeOffModal(false)
    setTimeOffForm({ startDate: '', endDate: '', reason: '' })
    toast.success('Time off added')
  }

  const removeTimeOff = (index) => {
    setUnavailableDates(prev => prev.filter((_, i) => i !== index))
    toast.success('Time off removed')
  }

  const getAvailabilityStatus = (day) => {
    if (!day) return null
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const dayName = dayNames[day.getDay()]
    const schedule = weeklySchedule[dayName]
    
    console.log(`Checking ${dayName} (index ${day.getDay()}): enabled = ${schedule?.enabled}, slots = ${schedule?.slots?.length}`)
    
    // Check enabled property explicitly
    if (schedule && schedule.enabled === false) return 'off'
    if (!schedule) return 'off'
    // If schedule has empty slots array, treat as off
    if (Array.isArray(schedule?.slots) && schedule.slots.length === 0) return 'off'
    return 'full'
  }

  const calculateMonthlyAvailability = () => {
    const monthDays = calendarDays.filter(d => d !== null)
    const availableDays = monthDays.filter(d => getAvailabilityStatus(d) === 'full').length
    return Math.round((availableDays / monthDays.length) * 100) || 85
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      console.log('Saving availability:', JSON.stringify(weeklySchedule))
      
      const { data, error } = await supabase
        .from('doctors')
        .update({
          availability: JSON.stringify(weeklySchedule),
        })
        .eq('id', user.id)
        .select()
        .single()

      if (error) {
        console.error('Supabase error:', error)
        throw error
      }
      
      toast.success('Availability saved successfully')
    } catch (error) {
      console.error('Error saving availability:', error)
      toast.error('Failed to save availability')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="bg-white min-h-screen">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => window.history.back()}
              className="p-2 hover:bg-gray-100 rounded-xl transition-all duration-200"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-lg font-semibold text-gray-900">Availability</h1>
          </div>
          <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center">
            <span className="text-blue-600 font-medium text-sm">{user?.fullName?.charAt(0) || 'D'}</span>
          </div>
        </div>

        <div className="px-6 pb-12">
          {/* Hero Section */}
          <div className="mb-8 mt-4">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">My Availability</h2>
            <p className="text-gray-500 text-lg">Set your working hours and manage time off.</p>
          </div>

          {/* Main Content */}
          <div className="space-y-8">
            {/* Calendar Card */}
            <div className="bg-gray-50 rounded-2xl p-6">
                {/* Calendar Header */}
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">
                      {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </h3>
                    <p className="text-sm font-medium text-gray-500">{calculateMonthlyAvailability()}% Availability this month</p>
                  </div>
                  <div className="flex gap-1">
                    <button 
                      onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
                      className="p-2 rounded-xl hover:bg-gray-200 transition-colors"
                    >
                      <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <button 
                      onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
                      className="p-2 rounded-xl hover:bg-gray-200 transition-colors"
                    >
                      <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 text-center mb-2">
                  {daysOfWeek.map(day => (
                    <div key={day} className="text-sm font-semibold text-gray-500 py-2">{day}</div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1">
                  {calendarDays.map((day, index) => {
                    if (!day) return <div key={index} className="h-14" />
                    
                    const status = getAvailabilityStatus(day)
                    const isToday = day.toDateString() === new Date().toDateString()
                    
                    return (
                      <div 
                        key={index}
                        className={`flex flex-col items-center justify-center h-14 rounded-xl cursor-pointer transition-colors ${
                          isToday ? 'bg-blue-100' : 'hover:bg-gray-200'
                        }`}
                      >
                        <span className={`text-base font-medium ${isToday ? 'text-blue-700' : 'text-gray-700'}`}>
                          {day.getDate()}
                        </span>
                        {/* Always show dot for now - debug */}
                        {status === 'full' && (
                          <div className="w-1.5 h-1.5 rounded-full mt-1 bg-green-600" />
                        )}
                        {status === 'off' && (
                          <div className="w-1.5 h-1.5 rounded-full mt-1 bg-red-500" />
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Legend */}
                <div className="mt-6 pt-4 border-t border-gray-200 flex flex-wrap gap-4 text-sm font-medium text-gray-500">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-green-600"></span> Full Availability
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span> Time Off
                  </div>
                </div>
              </div>
            </div>

            {/* Schedule & Time Off */}
            <div className="space-y-6">
              {/* Weekly Schedule Card */}
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-gray-900">Weekly Schedule</h3>
                  <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>

                <div className="space-y-1">
                  {/* Monday to Friday */}
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                    <div 
                      key={day} 
                      className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <p className="font-semibold text-gray-900 w-20">{day}</p>
                        {weeklySchedule[day].enabled ? (
                          <button
                            onClick={() => {
                              setEditingDay(day)
                              setEditTimeForm({ 
                                startTime: weeklySchedule[day].startTime, 
                                endTime: weeklySchedule[day].endTime 
                              })
                              setShowTimeEditModal(true)
                            }}
                            className="text-gray-600 hover:text-blue-600 font-medium flex items-center gap-1"
                          >
                            {weeklySchedule[day].startTime} - {weeklySchedule[day].endTime}
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                        ) : (
                          <p className="text-gray-400">Unavailable</p>
                        )}
                      </div>
                      <button
                        onClick={() => toggleDayEnabled(day)}
                        className={`w-12 h-6 rounded-full relative flex items-center px-1 transition-colors ${
                          weeklySchedule[day].enabled ? 'bg-blue-600' : 'bg-gray-300'
                        }`}
                      >
                        <div className={`w-4 h-4 bg-white rounded-full shadow transform transition-transform ${
                          weeklySchedule[day].enabled ? 'translate-x-6' : 'translate-x-0.5'
                        }`} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Time Off Card */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border-2 border-dashed border-gray-200">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-gray-900">Time Off</h3>
                  <button 
                    onClick={() => setShowTimeOffModal(true)}
                    className="text-blue-600 font-semibold text-sm flex items-center gap-1 hover:underline"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Time Off
                  </button>
                </div>

                <div className="space-y-3">
                  {unavailableDates.length > 0 ? (
                    unavailableDates.map((item, index) => (
                      <div key={index} className="bg-gray-50 rounded-xl p-4 flex items-center gap-4 hover:bg-gray-100 transition-colors">
                        <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                          <svg className="w-5 h-5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-gray-900">{item.reason}</p>
                          <p className="text-sm text-gray-500">
                            {new Date(item.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} - 
                            {item.endDate ? new Date(item.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'Single day'}
                          </p>
                        </div>
                        <button 
                          onClick={() => removeTimeOff(index)}
                          className="text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <svg className="w-10 h-10 mx-auto mb-2 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <p className="text-gray-400">No time off scheduled</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
        </div>
      </div>

              <button 
                onClick={handleSave}
                disabled={isSaving}
                className="mt-8 mx-auto block bg-blue-600 text-white px-6 py-3 rounded-full shadow-md flex items-center gap-2 font-semibold hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:shadow-sm transition-all duration-200 disabled:opacity-50 w-fit"
              >
                {isSaving ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                )}
                Save Changes
              </button>

      {/* Time Off Modal */}
      {showTimeOffModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Add Time Off</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">Start Date *</label>
                <input
                  type="date"
                  value={timeOffForm.startDate}
                  onChange={(e) => setTimeOffForm(prev => ({ ...prev, startDate: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border-0 text-gray-900 focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">End Date (Optional)</label>
                <input
                  type="date"
                  value={timeOffForm.endDate}
                  onChange={(e) => setTimeOffForm(prev => ({ ...prev, endDate: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border-0 text-gray-900 focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">Reason *</label>
                <select
                  value={timeOffForm.reason}
                  onChange={(e) => setTimeOffForm(prev => ({ ...prev, reason: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border-0 text-gray-900 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select reason</option>
                  <option value="Annual Leave">Annual Leave</option>
                  <option value="Sick Leave">Sick Leave</option>
                  <option value="Medical Conference">Medical Conference</option>
                  <option value="Personal">Personal</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowTimeOffModal(false)}
                className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={addTimeOff}
                className="flex-1 px-4 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Time Edit Modal */}
      {showTimeEditModal && editingDay && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Edit {editingDay} Schedule</h3>
            <p className="text-sm text-gray-500 mb-6">Set your working hours for {editingDay}</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">Start Time</label>
                <input
                  type="time"
                  value={editTimeForm.startTime ? convertTo24Hour(editTimeForm.startTime) : ''}
                  onChange={(e) => setEditTimeForm(prev => ({ ...prev, startTime: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border-0 text-gray-900 focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">End Time</label>
                <input
                  type="time"
                  value={editTimeForm.endTime ? convertTo24Hour(editTimeForm.endTime) : ''}
                  onChange={(e) => setEditTimeForm(prev => ({ ...prev, endTime: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border-0 text-gray-900 focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowTimeEditModal(false)
                  setEditingDay(null)
                }}
                className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (editTimeForm.startTime && editTimeForm.endTime) {
                    const start = new Date(`2000-01-01T${convertTo24Hour(editTimeForm.startTime)}`)
                    const end = new Date(`2000-01-01T${convertTo24Hour(editTimeForm.endTime)}`)
                    if (end <= start) {
                      toast.error('End time must be after start time')
                      return
                    }
                    setWeeklySchedule(prev => ({
                      ...prev,
                      [editingDay]: { ...prev[editingDay], startTime: editTimeForm.startTime, endTime: editTimeForm.endTime }
                    }))
                    setShowTimeEditModal(false)
                    setEditingDay(null)
                    toast.success(`${editingDay} schedule updated`)
                  }
                }}
                className="flex-1 px-4 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}

export default DoctorAvailabilityPage