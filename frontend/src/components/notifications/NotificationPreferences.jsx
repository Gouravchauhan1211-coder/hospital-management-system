import { useState, useEffect } from 'react'

const NotificationPreferences = ({ userId }) => {
  const [preferences, setPreferences] = useState({
    email_enabled: true,
    sms_enabled: false,
    push_enabled: true,
    appointment_reminders: true,
    queue_updates: true,
    review_notifications: true,
    message_notifications: true,
    marketing_emails: false
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchPreferences()
  }, [userId])

  const fetchPreferences = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/notifications/preferences/${userId}`
      )
      const data = await response.json()
      if (data.success) {
        setPreferences(data.data)
      }
    } catch (error) {
      console.error('Error fetching preferences:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleToggle = (key) => {
    setPreferences(prev => ({
      ...prev,
      [key]: !prev[key]
    }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/notifications/preferences/${userId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(preferences)
        }
      )
      const data = await response.json()
      if (data.success) {
        alert('Preferences saved successfully!')
      }
    } catch (error) {
      console.error('Error saving preferences:', error)
      alert('Failed to save preferences')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="animate-pulse">Loading preferences...</div>
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Notification Preferences</h3>
      
      {/* Delivery Methods */}
      <div className="mb-8">
        <h4 className="text-sm font-medium text-gray-700 mb-4">Delivery Methods</h4>
        <div className="space-y-4">
          <ToggleSwitch
            label="Email Notifications"
            description="Receive notifications via email"
            checked={preferences.email_enabled}
            onChange={() => handleToggle('email_enabled')}
          />
          <ToggleSwitch
            label="SMS Notifications"
            description="Receive notifications via text message"
            checked={preferences.sms_enabled}
            onChange={() => handleToggle('sms_enabled')}
          />
          <ToggleSwitch
            label="Push Notifications"
            description="Receive in-app notifications"
            checked={preferences.push_enabled}
            onChange={() => handleToggle('push_enabled')}
          />
        </div>
      </div>

      {/* Notification Types */}
      <div className="mb-8">
        <h4 className="text-sm font-medium text-gray-700 mb-4">Notification Types</h4>
        <div className="space-y-4">
          <ToggleSwitch
            label="Appointment Reminders"
            description="Get reminded about upcoming appointments"
            checked={preferences.appointment_reminders}
            onChange={() => handleToggle('appointment_reminders')}
          />
          <ToggleSwitch
            label="Queue Updates"
            description="Get notified when your turn is approaching"
            checked={preferences.queue_updates}
            onChange={() => handleToggle('queue_updates')}
          />
          <ToggleSwitch
            label="Review Notifications"
            description="Get notified when patients leave reviews"
            checked={preferences.review_notifications}
            onChange={() => handleToggle('review_notifications')}
          />
          <ToggleSwitch
            label="Message Notifications"
            description="Get notified when you receive new messages"
            checked={preferences.message_notifications}
            onChange={() => handleToggle('message_notifications')}
          />
          <ToggleSwitch
            label="Marketing Emails"
            description="Receive promotional offers and updates"
            checked={preferences.marketing_emails}
            onChange={() => handleToggle('marketing_emails')}
          />
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Preferences'}
        </button>
      </div>
    </div>
  )
}

const ToggleSwitch = ({ label, description, checked, onChange }) => (
  <div className="flex items-center justify-between">
    <div>
      <div className="font-medium text-gray-900">{label}</div>
      <div className="text-sm text-gray-500">{description}</div>
    </div>
    <button
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        checked ? 'bg-blue-600' : 'bg-gray-200'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  </div>
)

export default NotificationPreferences

