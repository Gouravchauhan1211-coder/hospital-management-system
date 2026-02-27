const express = require('express')
const router = express.Router()
const supabase = require('../config/supabase')

// Get user notifications with pagination
router.get('/', async (req, res) => {
  try {
    const { user_id, page = 1, limit = 20, unread_only = false } = req.query
    const offset = (page - 1) * limit

    if (!user_id) {
      return res.status(400).json({ success: false, error: 'User ID is required' })
    }

    let query = supabase
      .from('notifications')
      .select('*', { count: 'exact' })
      .eq('user_id', user_id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (unread_only === 'true') {
      query = query.eq('is_read', false)
    }

    const { data, error, count } = await query

    if (error) throw error

    res.json({
      success: true,
      data,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        totalPages: Math.ceil(count / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching notifications:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Get unread count
router.get('/unread-count', async (req, res) => {
  try {
    const { user_id } = req.query

    if (!user_id) {
      return res.status(400).json({ success: false, error: 'User ID is required' })
    }

    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user_id)
      .eq('is_read', false)

    if (error) throw error

    res.json({ success: true, count })
  } catch (error) {
    console.error('Error fetching unread count:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Mark notification as read
router.put('/:id/read', async (req, res) => {
  try {
    const { id } = req.params

    const { data, error } = await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    res.json({ success: true, data })
  } catch (error) {
    console.error('Error marking notification as read:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Mark all notifications as read
router.put('/mark-all-read', async (req, res) => {
  try {
    const { user_id } = req.body

    if (!user_id) {
      return res.status(400).json({ success: false, error: 'User ID is required' })
    }

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('user_id', user_id)
      .eq('is_read', false)

    if (error) throw error

    res.json({ success: true, message: 'All notifications marked as read' })
  } catch (error) {
    console.error('Error marking all notifications as read:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Create notification (internal use)
router.post('/', async (req, res) => {
  try {
    const { user_id, title, message, type, reference_id, reference_type } = req.body

    if (!user_id || !title || !message) {
      return res.status(400).json({
        success: false,
        error: 'User ID, title, and message are required'
      })
    }

    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id,
        title,
        message,
        type: type || 'general',
        reference_id,
        reference_type,
        is_read: false
      })
      .select()
      .single()

    if (error) throw error

    res.json({ success: true, data })
  } catch (error) {
    console.error('Error creating notification:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Delete notification
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params

    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id)

    if (error) throw error

    res.json({ success: true, message: 'Notification deleted' })
  } catch (error) {
    console.error('Error deleting notification:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Clear all notifications for a user
router.delete('/clear-all/:user_id', async (req, res) => {
  try {
    const { user_id } = req.params

    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', user_id)

    if (error) throw error

    res.json({ success: true, message: 'All notifications cleared' })
  } catch (error) {
    console.error('Error clearing notifications:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Get notification preferences
router.get('/preferences/:user_id', async (req, res) => {
  try {
    const { user_id } = req.params

    // Check if notification_preferences table exists
    const { data, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', user_id)
      .single()

    if (error && error.code !== 'PGRST116') {
      throw error
    }

    // Return default preferences if none exist
    const preferences = data || {
      email_enabled: true,
      sms_enabled: false,
      push_enabled: true,
      appointment_reminders: true,
      queue_updates: true,
      review_notifications: true,
      message_notifications: true,
      marketing_emails: false
    }

    res.json({ success: true, data: preferences })
  } catch (error) {
    console.error('Error fetching notification preferences:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Update notification preferences
router.put('/preferences/:user_id', async (req, res) => {
  try {
    const { user_id } = req.params
    const preferences = req.body

    const { data, error } = await supabase
      .from('notification_preferences')
      .upsert({
        user_id,
        ...preferences,
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw error

    res.json({ success: true, data })
  } catch (error) {
    console.error('Error updating notification preferences:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Send appointment reminder (for cron jobs)
router.post('/send-reminder', async (req, res) => {
  try {
    const { appointment_id, type } = req.body

    // Get appointment details
    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .select(`
        *,
        patient:patients(user_id, full_name, phone),
        doctor:doctors(full_name),
        branch:branches(name)
      `)
      .eq('id', appointment_id)
      .single()

    if (appointmentError) throw appointmentError
    if (!appointment) {
      return res.status(404).json({ success: false, error: 'Appointment not found' })
    }

    // Create notification
    const { data: notification, error: notificationError } = await supabase
      .from('notifications')
      .insert({
        user_id: appointment.patient.user_id,
        title: 'Appointment Reminder',
        message: `Your appointment with Dr. ${appointment.doctor.full_name} is scheduled for ${new Date(appointment.appointment_date).toLocaleDateString()} at ${appointment.appointment_time}`,
        type: 'appointment_reminder',
        reference_id: appointment_id,
        reference_type: 'appointment'
      })
      .select()
      .single()

    if (notificationError) throw notificationError

    // TODO: Send email via Supabase Edge Function
    // TODO: Send SMS if enabled

    res.json({
      success: true,
      data: notification,
      message: 'Reminder sent successfully'
    })
  } catch (error) {
    console.error('Error sending reminder:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Bulk create notifications (for announcements)
router.post('/bulk', async (req, res) => {
  try {
    const { user_ids, title, message, type = 'announcement' } = req.body

    if (!user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
      return res.status(400).json({ success: false, error: 'User IDs array is required' })
    }

    if (!title || !message) {
      return res.status(400).json({ success: false, error: 'Title and message are required' })
    }

    const notifications = user_ids.map(user_id => ({
      user_id,
      title,
      message,
      type,
      is_read: false
    }))

    const { data, error } = await supabase
      .from('notifications')
      .insert(notifications)
      .select()

    if (error) throw error

    res.json({
      success: true,
      data,
      message: `Sent ${data.length} notifications`
    })
  } catch (error) {
    console.error('Error creating bulk notifications:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

module.exports = router