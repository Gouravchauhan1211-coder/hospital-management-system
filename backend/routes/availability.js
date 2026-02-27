const express = require('express');
const router = express.Router();
const { supabase } = require('../config/supabase');

// ============================================================
// DOCTOR AVAILABILITY APIs
// ============================================================

/**
 * Get doctor's availability schedule
 * GET /api/availability/doctor/:doctorId
 */
router.get('/doctor/:doctorId', async (req, res) => {
    try {
        const { doctorId } = req.params;

        const { data: doctor, error } = await supabase
            .from('doctors')
            .select('id, full_name, availability, avg_consultation_minutes')
            .eq('id', doctorId)
            .single();

        if (error || !doctor) {
            return res.status(404).json({
                success: false,
                error: 'Doctor not found'
            });
        }

        res.json({
            success: true,
            availability: doctor.availability || {},
            avg_consultation_minutes: doctor.avg_consultation_minutes || 15
        });

    } catch (error) {
        console.error('Error fetching availability:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Update doctor's availability schedule
 * PUT /api/availability/doctor/:doctorId
 */
router.put('/doctor/:doctorId', async (req, res) => {
    try {
        const { doctorId } = req.params;
        const { availability, avg_consultation_minutes } = req.body;

        // Validate availability structure
        const validDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        
        if (availability) {
            for (const day of Object.keys(availability)) {
                if (!validDays.includes(day)) {
                    return res.status(400).json({
                        success: false,
                        error: `Invalid day: ${day}. Must be one of: ${validDays.join(', ')}`
                    });
                }
                
                if (!Array.isArray(availability[day])) {
                    return res.status(400).json({
                        success: false,
                        error: `Availability for ${day} must be an array of time slots`
                    });
                }
            }
        }

        // Update doctor
        const updateData = { updated_at: new Date().toISOString() };
        if (availability) updateData.availability = availability;
        if (avg_consultation_minutes) updateData.avg_consultation_minutes = avg_consultation_minutes;

        const { data: doctor, error } = await supabase
            .from('doctors')
            .update(updateData)
            .eq('id', doctorId)
            .select('id, full_name, availability, avg_consultation_minutes')
            .single();

        if (error) throw error;

        res.json({
            success: true,
            availability: doctor.availability,
            message: 'Availability updated successfully'
        });

    } catch (error) {
        console.error('Error updating availability:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Get available time slots for a specific date
 * GET /api/availability/doctor/:doctorId/slots/:date
 */
router.get('/doctor/:doctorId/slots/:date', async (req, res) => {
    try {
        const { doctorId, date } = req.params;
        const { duration = 15 } = req.query;

        // Get doctor's availability
        const { data: doctor, error: doctorError } = await supabase
            .from('doctors')
            .select('availability, avg_consultation_minutes')
            .eq('id', doctorId)
            .single();

        if (doctorError || !doctor) {
            return res.status(404).json({
                success: false,
                error: 'Doctor not found'
            });
        }

        // Get day of week from date
        const dayOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dateObj = new Date(date + 'T00:00:00');
        const dayName = dayOfWeek[dateObj.getDay()];

        // Get available slots for this day
        const daySlots = doctor.availability?.[dayName] || [];

        if (daySlots.length === 0) {
            return res.json({
                success: true,
                available_slots: [],
                message: 'Doctor is not available on this day'
            });
        }

        // Get booked appointments for this date
        const { data: appointments } = await supabase
            .from('appointments')
            .select('time, duration_minutes')
            .eq('doctor_id', doctorId)
            .eq('date', date)
            .in('status', ['scheduled', 'confirmed']);

        // Get blocked times
        const { data: blockedTimes } = await supabase
            .from('doctor_unavailable')
            .select('*')
            .eq('doctor_id', doctorId)
            .eq('date', date);

        // Calculate available slots
        const slotDuration = parseInt(duration) || doctor.avg_consultation_minutes || 15;
        const bookedSlots = new Set();
        
        // Mark booked slots
        appointments?.forEach(apt => {
            const aptDuration = apt.duration_minutes || slotDuration;
            const startTime = parseTime(apt.time);
            for (let i = 0; i < aptDuration; i += slotDuration) {
                const slotTime = formatTime(startTime.hours, startTime.minutes + i);
                bookedSlots.add(slotTime);
            }
        });

        // Mark blocked slots
        blockedTimes?.forEach(block => {
            if (block.all_day) {
                // Entire day is blocked
                return res.json({
                    success: true,
                    available_slots: [],
                    message: block.reason || 'Doctor is unavailable this day'
                });
            }
            // Block specific time range
            const start = parseTime(block.start_time);
            const end = parseTime(block.end_time);
            daySlots.forEach(slot => {
                const slotTime = parseTime(slot);
                if (slotTime.hours > start.hours || 
                    (slotTime.hours === start.hours && slotTime.minutes >= start.minutes)) {
                    if (slotTime.hours < end.hours || 
                        (slotTime.hours === end.hours && slotTime.minutes < end.minutes)) {
                        bookedSlots.add(slot);
                    }
                }
            });
        });

        // Filter available slots
        const availableSlots = daySlots.filter(slot => !bookedSlots.has(slot));

        res.json({
            success: true,
            date,
            day: dayName,
            available_slots: availableSlots,
            total_slots: daySlots.length,
            booked_slots: daySlots.length - availableSlots.length
        });

    } catch (error) {
        console.error('Error fetching available slots:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Block a specific date/time
 * POST /api/availability/doctor/:doctorId/block
 */
router.post('/doctor/:doctorId/block', async (req, res) => {
    try {
        const { doctorId } = req.params;
        const { date, start_time, end_time, all_day, reason } = req.body;

        if (!date) {
            return res.status(400).json({
                success: false,
                error: 'Date is required'
            });
        }

        // Create blocked time entry
        const { data: blocked, error } = await supabase
            .from('doctor_unavailable')
            .insert({
                doctor_id: doctorId,
                date,
                start_time: all_day ? null : start_time,
                end_time: all_day ? null : end_time,
                all_day: all_day || false,
                reason
            })
            .select()
            .single();

        if (error) {
            // If table doesn't exist, create it or handle gracefully
            if (error.code === '42P01') {
                // Table doesn't exist - create it via a simple approach
                // For now, return a message
                return res.status(500).json({
                    success: false,
                    error: 'Availability blocking feature requires database table setup. Please run the database migrations.'
                });
            }
            throw error;
        }

        // Cancel or reschedule affected appointments
        if (all_day || (start_time && end_time)) {
            let query = supabase
                .from('appointments')
                .select('id, patient_id, time')
                .eq('doctor_id', doctorId)
                .eq('date', date)
                .in('status', ['scheduled', 'confirmed']);

            if (!all_day && start_time && end_time) {
                query = query.gte('time', start_time).lte('time', end_time);
            }

            const { data: affectedAppointments } = await query;

            // Notify affected patients
            if (affectedAppointments && affectedAppointments.length > 0) {
                const notifications = affectedAppointments.map(apt => ({
                    user_id: apt.patient_id,
                    user_type: 'patient',
                    title: 'Appointment Reschedule Required',
                    message: `Your appointment on ${date} ${apt.time ? `at ${apt.time}` : ''} needs to be rescheduled. Reason: ${reason || 'Doctor unavailable'}`,
                    type: 'appointment',
                    data: {
                        appointment_id: apt.id,
                        reason
                    }
                }));

                await supabase.from('notifications').insert(notifications);
            }
        }

        res.status(201).json({
            success: true,
            blocked,
            message: 'Time blocked successfully'
        });

    } catch (error) {
        console.error('Error blocking time:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Remove blocked time
 * DELETE /api/availability/doctor/:doctorId/block/:blockId
 */
router.delete('/doctor/:doctorId/block/:blockId', async (req, res) => {
    try {
        const { doctorId, blockId } = req.params;

        const { error } = await supabase
            .from('doctor_unavailable')
            .delete()
            .eq('id', blockId)
            .eq('doctor_id', doctorId);

        if (error) throw error;

        res.json({
            success: true,
            message: 'Block removed successfully'
        });

    } catch (error) {
        console.error('Error removing block:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Get blocked times for a date range
 * GET /api/availability/doctor/:doctorId/blocked
 */
router.get('/doctor/:doctorId/blocked', async (req, res) => {
    try {
        const { doctorId } = req.params;
        const { from_date, to_date } = req.query;

        if (!from_date || !to_date) {
            return res.status(400).json({
                success: false,
                error: 'from_date and to_date are required'
            });
        }

        const { data: blockedTimes, error } = await supabase
            .from('doctor_unavailable')
            .select('*')
            .eq('doctor_id', doctorId)
            .gte('date', from_date)
            .lte('date', to_date)
            .order('date', { ascending: true });

        if (error) {
            if (error.code === '42P01') {
                return res.json({
                    success: true,
                    blocked_times: []
                });
            }
            throw error;
        }

        res.json({
            success: true,
            blocked_times: blockedTimes || []
        });

    } catch (error) {
        console.error('Error fetching blocked times:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Copy availability from one week to another
 * POST /api/availability/doctor/:doctorId/copy
 */
router.post('/doctor/:doctorId/copy', async (req, res) => {
    try {
        const { doctorId } = req.params;
        const { source_week_start, target_week_start } = req.body;

        if (!source_week_start || !target_week_start) {
            return res.status(400).json({
                success: false,
                error: 'source_week_start and target_week_start are required'
            });
        }

        // Get current availability
        const { data: doctor } = await supabase
            .from('doctors')
            .select('availability')
            .eq('id', doctorId)
            .single();

        // Availability is day-based, so no need to copy by date
        // This endpoint is for future expansion if needed

        res.json({
            success: true,
            message: 'Availability schedule is day-based and applies to all weeks automatically'
        });

    } catch (error) {
        console.error('Error copying availability:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Get doctor's working days
 * GET /api/availability/doctor/:doctorId/working-days
 */
router.get('/doctor/:doctorId/working-days', async (req, res) => {
    try {
        const { doctorId } = req.params;

        const { data: doctor } = await supabase
            .from('doctors')
            .select('availability')
            .eq('id', doctorId)
            .single();

        if (!doctor) {
            return res.status(404).json({
                success: false,
                error: 'Doctor not found'
            });
        }

        const workingDays = Object.keys(doctor.availability || {})
            .filter(day => doctor.availability[day] && doctor.availability[day].length > 0);

        res.json({
            success: true,
            working_days: workingDays
        });

    } catch (error) {
        console.error('Error fetching working days:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Set break times for a day
 * POST /api/availability/doctor/:doctorId/break
 */
router.post('/doctor/:doctorId/break', async (req, res) => {
    try {
        const { doctorId } = req.params;
        const { day, start_time, end_time } = req.body;

        if (!day || !start_time || !end_time) {
            return res.status(400).json({
                success: false,
                error: 'day, start_time, and end_time are required'
            });
        }

        // Get current availability
        const { data: doctor } = await supabase
            .from('doctors')
            .select('availability')
            .eq('id', doctorId)
            .single();

        if (!doctor) {
            return res.status(404).json({
                success: false,
                error: 'Doctor not found'
            });
        }

        const availability = doctor.availability || {};
        const daySlots = availability[day] || [];

        // Remove slots that fall within break time
        const breakStart = parseTime(start_time);
        const breakEnd = parseTime(end_time);

        const filteredSlots = daySlots.filter(slot => {
            const slotTime = parseTime(slot);
            // Keep slot if it's before break start or after break end
            return slotTime.hours < breakStart.hours || 
                   (slotTime.hours === breakStart.hours && slotTime.minutes < breakStart.minutes) ||
                   slotTime.hours >= breakEnd.hours;
        });

        // Update availability
        availability[day] = filteredSlots;

        await supabase
            .from('doctors')
            .update({ availability, updated_at: new Date().toISOString() })
            .eq('id', doctorId);

        res.json({
            success: true,
            message: 'Break time set successfully',
            removed_slots: daySlots.length - filteredSlots.length
        });

    } catch (error) {
        console.error('Error setting break time:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function parseTime(timeStr) {
    if (!timeStr) return { hours: 0, minutes: 0 };
    
    // Handle both "HH:MM" and "HH:MM AM/PM" formats
    const isPM = timeStr.toUpperCase().includes('PM');
    const isAM = timeStr.toUpperCase().includes('AM');
    
    const cleanTime = timeStr.replace(/[^0-9:]/g, '');
    const [hours, minutes] = cleanTime.split(':').map(Number);
    
    let adjustedHours = hours;
    if (isPM && hours !== 12) adjustedHours = hours + 12;
    if (isAM && hours === 12) adjustedHours = 0;
    
    return { hours: adjustedHours, minutes: minutes || 0 };
}

function formatTime(hours, minutes) {
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours > 12 ? hours - 12 : (hours === 0 ? 12 : hours);
    const displayMinutes = String(minutes % 60).padStart(2, '0');
    return `${String(displayHours).padStart(2, '0')}:${displayMinutes} ${period}`;
}

module.exports = router;