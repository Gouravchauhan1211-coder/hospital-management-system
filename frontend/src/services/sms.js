const SMS_API_URL = import.meta.env.VITE_SMS_API_URL || ''
const SMS_API_KEY = import.meta.env.VITE_SMS_API_KEY || ''

export const sendSMS = async (phone, message) => {
  if (!phone || !message) {
    console.warn('SMS: Missing phone or message')
    return { success: false, error: 'Missing phone or message' }
  }

  // Clean phone number - remove non-digits
  const cleanPhone = phone.replace(/\D/g, '')
  
  // Add country code if not present (assuming India +91)
  const formattedPhone = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`

  try {
    // Try Fast2SMS API (free tier available)
    if (SMS_API_URL && SMS_API_KEY) {
      const response = await fetch(SMS_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': SMS_API_KEY
        },
        body: JSON.stringify({
          message: message,
          language: 'english',
          route: 'v3',
          numbers: formattedPhone
        })
      })

      const data = await response.json()
      
      if (data.return === true) {
        console.log('SMS sent successfully')
        return { success: true }
      } else {
        console.error('SMS API error:', data)
        return { success: false, error: data.message }
      }
    } else {
      // No SMS API configured - log message for demo purposes
      console.log(`[DEMO SMS] To: ${formattedPhone}, Message: ${message}`)
      return { success: true, demo: true }
    }
  } catch (error) {
    console.error('SMS sending error:', error)
    return { success: false, error: error.message }
  }
}

export const sendAppointmentConfirmation = async (phone, patientName, token, doctorName, department) => {
  const message = `Hi ${patientName}, your token number is ${token}. Doctor: ${doctorName}, Department: ${department}. Please wait for your turn. - Hospital Management System`
  return sendSMS(phone, message)
}

export const sendTokenReminder = async (phone, patientName, token, doctorName) => {
  const message = `Hi ${patientName}, your token ${token} is being called. Please proceed to consult with Dr. ${doctorName}. - Hospital Management System`
  return sendSMS(phone, message)
}
