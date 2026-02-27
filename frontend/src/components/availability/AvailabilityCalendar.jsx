import { useState, useEffect } from 'react'
import { updateDoctorAvailabilityRest, getAvailableSlots, blockDoctorTime, getBlockedTimes, setBreakTime } from '../../services/api'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const TIME_SLOTS = [
  '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
  '12:00 PM', '12:30 PM', '01:00 PM', '01:30 PM', '02:00 PM', '02:30 PM',
  '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM', '05:00 PM', '05:30 PM',
  '06:00 PM'
]

const AvailabilityCalendar = ({ doctorId, initialAvailability = {} }) => {
  const [availability, setAvailability] = useState(() => {
    const initial = {}
    DAYS.forEach(day => {
      initial[day] = initialAvailability[day] || []
    })
    return initial
  })
  const [selectedDay, setSelectedDay] = useState('Monday')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [blockedDates, setBlockedDates] = useState([])
  const [showBlockModal, setShowBlockModal] = useState(false)
  const [showBreakModal, setShowBreakModal] = useState(false)
  const [blockForm, setBlockForm] = useState({
    date: '',
    startTime: '09:00',
    endTime: '17:00',
    reason: ''
  })
  const [breakForm, setBreakForm] = useState({
    day: 'Monday',
    startTime: '01:00 PM',
    endTime: '02:00 PM'
  })
  const [breaks, setBreaks] = useState({})

  useEffect(() => {
    if (doctorId) {
      loadBlockedDates()
    }
  }, [doctorId])

  const loadBlockedDates = async () => {
    try {
      const response = await getBlockedTimes(doctorId)
      if (response.success) {
        setBlockedDates(response.data || [])
      }
    } catch (error) {
      console.error('Error loading blocked dates:', error)
    }
  }

  const toggleSlot = (slot) => {
    setAvailability(prev => {
      const daySlots = [...(prev[selectedDay] || [])]
      const slotIndex = daySlots.indexOf(slot)
      
      if (slotIndex > -1) {
        daySlots.splice(slotIndex, 1)
      } else {
        daySlots.push(slot)
        daySlots.sort((a, b) => TIME_SLOTS.indexOf(a) - TIME_SLOTS.indexOf(b))
      }
      
      return {
        ...prev,
        [selectedDay]: daySlots
      }
    })
  }

  const selectAllSlots = () => {
    setAvailability(prev => ({
      ...prev,
      [selectedDay]: [...TIME_SLOTS]
    }))
  }

  const clearAllSlots = () => {
    setAvailability(prev => ({
      ...prev,
      [selectedDay]: []
    }))
  }

  const copyToAllDays = () => {
    const slots = availability[selectedDay]
    const newAvailability = {}
    DAYS.forEach(day => {
      newAvailability[day] = [...slots]
    })
    setAvailability(newAvailability)
  }

  const saveAvailability = async () => {
    setSaving(true)
    try {
      const response = await updateDoctorAvailabilityRest(doctorId, availability)
      if (response.success) {
        alert('Availability saved successfully!')
      } else {
        throw new Error(response.error)
      }
    } catch (error) {
      console.error('Error saving availability:', error)
      alert('Failed to save availability')
    } finally {
      setSaving(false)
    }
  }

  const handleBlockDate = async (e) => {
    e.preventDefault()
    try {
      const response = await blockDoctorTime(doctorId, {
        date: blockForm.date,
        startTime: blockForm.startTime,
        endTime: blockForm.endTime,
        reason: blockForm.reason
      })
      if (response.success) {
        setBlockedDates(prev => [...prev, response.data])
        setShowBlockModal(false)
        setBlockForm({ date: '', startTime: '09:00', endTime: '17:00', reason: '' })
      }
    } catch (error) {
      console.error('Error blocking date:', error)
      alert('Failed to block date')
    }
  }

  const handleSetBreak = async (e) => {
    e.preventDefault()
    try {
      const response = await setBreakTime(doctorId, breakForm.day, breakForm.startTime, breakForm.endTime)
      if (response.success) {
        setBreaks(prev => ({
          ...prev,
          [breakForm.day]: { start: breakForm.startTime, end: breakForm.endTime }
        }))
        setShowBreakModal(false)
      }
    } catch (error) {
      console.error('Error setting break:', error)
      alert('Failed to set break time')
    }
  }

  const removeBlockedDate = async (blockId) => {
    try {
      // Would need a delete endpoint
      setBlockedDates(prev => prev.filter(b => b.id !== blockId))
    } catch (error) {
      console.error('Error removing blocked date:', error)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Manage Availability</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowBlockModal(true)}
            className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
          >
            Block Date
          </button>
          <button
            onClick={() => setShowBreakModal(true)}
            className="px-4 py-2 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 transition-colors"
          >
            Set Break Time
          </button>
          <button
            onClick={saveAvailability}
            disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Schedule'}
          </button>
        </div>
      </div>

      {/* Day Selector */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {DAYS.map(day => (
          <button
            key={day}
            onClick={() => setSelectedDay(day)}
            className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
              selectedDay === day
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {day.slice(0, 3)}
            {availability[day]?.length > 0 && (
              <span className="ml-1 text-xs">
                ({availability[day].length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="flex gap-2">
        <button
          onClick={selectAllSlots}
          className="text-sm text-blue-600 hover:text-blue-700"
        >
          Select All
        </button>
        <span className="text-gray-300">|</span>
        <button
          onClick={clearAllSlots}
          className="text-sm text-red-600 hover:text-red-700"
        >
          Clear All
        </button>
        <span className="text-gray-300">|</span>
        <button
          onClick={copyToAllDays}
          className="text-sm text-green-600 hover:text-green-700"
        >
          Copy to All Days
        </button>
      </div>

      {/* Time Slots Grid */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {selectedDay} - Available Slots
        </h3>
        <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
          {TIME_SLOTS.map(slot => {
            const isSelected = availability[selectedDay]?.includes(slot)
            const isBreak = breaks[selectedDay]?.start === slot
            
            return (
              <button
                key={slot}
                onClick={() => toggleSlot(slot)}
                className={`p-3 rounded-lg text-sm font-medium transition-all ${
                  isBreak
                    ? 'bg-yellow-100 text-yellow-700 border-2 border-yellow-400'
                    : isSelected
                    ? 'bg-green-100 text-green-700 border-2 border-green-400'
                    : 'bg-gray-50 text-gray-500 border-2 border-gray-200 hover:border-gray-300'
                }`}
              >
                {slot}
              </button>
            )
          })}
        </div>
      </div>

      {/* Blocked Dates */}
      {blockedDates.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Blocked Dates</h3>
          <div className="space-y-2">
            {blockedDates.map(block => (
              <div
                key={block.id}
                className="flex items-center justify-between p-3 bg-red-50 rounded-lg"
              >
                <div>
                  <span className="font-medium text-red-700">
                    {new Date(block.date).toLocaleDateString()}
                  </span>
                  <span className="text-red-600 ml-2">
                    {block.start_time} - {block.end_time}
                  </span>
                  {block.reason && (
                    <span className="text-red-500 ml-2 text-sm">
                      ({block.reason})
                    </span>
                  )}
                </div>
                <button
                  onClick={() => removeBlockedDate(block.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Block Date Modal */}
      {showBlockModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Block Date</h3>
            <form onSubmit={handleBlockDate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={blockForm.date}
                  onChange={(e) => setBlockForm(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                  <input
                    type="time"
                    value={blockForm.startTime}
                    onChange={(e) => setBlockForm(prev => ({ ...prev, startTime: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                  <input
                    type="time"
                    value={blockForm.endTime}
                    onChange={(e) => setBlockForm(prev => ({ ...prev, endTime: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason (Optional)</label>
                <input
                  type="text"
                  value={blockForm.reason}
                  onChange={(e) => setBlockForm(prev => ({ ...prev, reason: e.target.value }))}
                  placeholder="e.g., Conference, Personal"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowBlockModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Block Date
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Break Time Modal */}
      {showBreakModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Set Break Time</h3>
            <form onSubmit={handleSetBreak} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Day</label>
                <select
                  value={breakForm.day}
                  onChange={(e) => setBreakForm(prev => ({ ...prev, day: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {DAYS.map(day => (
                    <option key={day} value={day}>{day}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Break Start</label>
                  <select
                    value={breakForm.startTime}
                    onChange={(e) => setBreakForm(prev => ({ ...prev, startTime: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {TIME_SLOTS.map(slot => (
                      <option key={slot} value={slot}>{slot}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Break End</label>
                  <select
                    value={breakForm.endTime}
                    onChange={(e) => setBreakForm(prev => ({ ...prev, endTime: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {TIME_SLOTS.map(slot => (
                      <option key={slot} value={slot}>{slot}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowBreakModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
                >
                  Set Break
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default AvailabilityCalendar