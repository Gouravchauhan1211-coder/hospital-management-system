const express = require('express');
const router = express.Router();
const { supabase } = require('../config/supabase');

// ============================================================
// QUEUE TOKEN APIs
// ============================================================

/**
 * Generate a new queue token
 * POST /api/queue/tokens
 */
router.post('/tokens', async (req, res) => {
    try {
        const {
            patient_id,
            doctor_id,
            branch_id,
            department_id,
            appointment_id = null,
            queue_type = 'walk_in',
            priority = 'normal'
        } = req.body;

        // Validate required fields
        if (!patient_id || !doctor_id || !branch_id || !department_id) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: patient_id, doctor_id, branch_id, department_id'
            });
        }

        // Get department code
        const { data: department } = await supabase
            .from('departments')
            .select('code, name')
            .eq('id', department_id)
            .single();

        if (!department) {
            return res.status(404).json({
                success: false,
                error: 'Department not found'
            });
        }

        // Get today's date string
        const today = new Date().toISOString().split('T')[0];

        // Get current count for this doctor today
        const { count } = await supabase
            .from('queue_tokens')
            .select('*', { count: 'exact', head: true })
            .eq('doctor_id', doctor_id)
            .gte('token_generated_at', today)
            .lt('token_generated_at', today + 'T23:59:59');

        // Generate token number
        const sequence = (count || 0) + 1;
        const token_number = `OPD-${department.code}-${String(sequence).padStart(3, '0')}`;

        // Get current queue position
        const { count: position } = await supabase
            .from('queue_tokens')
            .select('*', { count: 'exact', head: true })
            .eq('doctor_id', doctor_id)
            .eq('status', 'waiting')
            .gte('token_generated_at', today);

        // Get doctor average consultation time
        const { data: doctor } = await supabase
            .from('doctors')
            .select('avg_consultation_minutes')
            .eq('id', doctor_id)
            .single();

        const avgTime = doctor?.avg_consultation_minutes || 15;
        const estimatedWait = position * avgTime;

        // Get room assignment
        const dayOfWeek = new Date().getDay();
        const { data: roomAssignment } = await supabase
            .from('doctor_rooms')
            .select('room_number, opd_number')
            .eq('doctor_id', doctor_id)
            .eq('day_of_week', dayOfWeek)
            .eq('is_active', true)
            .single();

        // Create token
        const { data: token, error } = await supabase
            .from('queue_tokens')
            .insert({
                token_number,
                token_prefix: 'OPD',
                patient_id,
                doctor_id,
                branch_id,
                department_id,
                appointment_id,
                queue_type,
                priority,
                status: 'waiting',
                estimated_wait_minutes: estimatedWait,
                room_number: roomAssignment?.room_number,
                opd_number: roomAssignment?.opd_number
            })
            .select()
            .single();

        if (error) throw error;

        // Log event
        await supabase.from('queue_events').insert({
            token_id: token.id,
            event_type: 'token_generated',
            new_status: 'waiting',
            reason: `Token generated for ${department.name}`
        });

        res.status(201).json({
            success: true,
            token: {
                ...token,
                queue_position: position + 1,
                department_name: department.name
            }
        });

    } catch (error) {
        console.error('Error generating token:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Get queue tokens for a doctor
 * GET /api/queue/doctor/:doctorId
 */
router.get('/doctor/:doctorId', async (req, res) => {
    try {
        const { doctorId } = req.params;
        const { date, status } = req.query;

        let query = supabase
            .from('queue_tokens')
            .select(`
                *,
                patient:patients!queue_tokens_patient_id_fkey(
                    id,
                    full_name,
                    phone
                ),
                department:departments(
                    id,
                    name,
                    code
                )
            `)
            .eq('doctor_id', doctorId);

        // Filter by date
        if (date) {
            query = query.gte('token_generated_at', date)
                .lt('token_generated_at', date + 'T23:59:59');
        }

        // Filter by status
        if (status) {
            query = query.eq('status', status);
        }

        const { data: tokens, error } = await query
            .order('priority', { ascending: true })
            .order('token_number', { ascending: true });

        if (error) throw error;

        // Calculate stats
        const stats = {
            waiting: tokens?.filter(t => t.status === 'waiting').length || 0,
            called: tokens?.filter(t => t.status === 'called').length || 0,
            in_consultation: tokens?.filter(t => t.status === 'in_consultation').length || 0,
            completed: tokens?.filter(t => t.status === 'completed').length || 0
        };

        // Add positions
        const queue = tokens?.map((token, index) => ({
            ...token,
            position: index + 1
        })) || [];

        res.json({
            success: true,
            queue,
            stats
        });

    } catch (error) {
        console.error('Error fetching doctor queue:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Get patient's queue tokens
 * GET /api/queue/patient/:patientId
 */
router.get('/patient/:patientId', async (req, res) => {
    try {
        const { patientId } = req.params;

        const { data: tokens, error } = await supabase
            .from('queue_tokens')
            .select(`
                *,
                doctor:doctors(
                    id,
                    full_name,
                    specialization
                ),
                department:departments(
                    id,
                    name
                )
            `)
            .eq('patient_id', patientId)
            .in('status', ['waiting', 'called', 'in_consultation'])
            .order('created_at', { ascending: false });

        if (error) throw error;

        res.json({
            success: true,
            tokens
        });

    } catch (error) {
        console.error('Error fetching patient queue:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Call a patient (update status to called)
 * POST /api/queue/tokens/:tokenId/call
 */
router.post('/tokens/:tokenId/call', async (req, res) => {
    try {
        const { tokenId } = req.params;
        const { room_number } = req.body;

        // Get current token
        const { data: token, error: fetchError } = await supabase
            .from('queue_tokens')
            .select('*')
            .eq('id', tokenId)
            .single();

        if (fetchError || !token) {
            return res.status(404).json({
                success: false,
                error: 'Token not found'
            });
        }

        if (token.status !== 'waiting') {
            return res.status(400).json({
                success: false,
                error: `Token is not in waiting status (current: ${token.status})`
            });
        }

        // Update status
        const { data: updatedToken, error } = await supabase
            .from('queue_tokens')
            .update({
                status: 'called',
                called_at: new Date().toISOString(),
                room_number: room_number || token.room_number,
                updated_at: new Date().toISOString()
            })
            .eq('id', tokenId)
            .select()
            .single();

        if (error) throw error;

        // Log event
        await supabase.from('queue_events').insert({
            token_id: tokenId,
            event_type: 'called',
            old_status: 'waiting',
            new_status: 'called',
            reason: `Called to room ${room_number || token.room_number}`
        });

        // Recalculate wait times
        await recalculateWaitTimes(token.doctor_id);

        res.json({
            success: true,
            token: updatedToken
        });

    } catch (error) {
        console.error('Error calling patient:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Start consultation (update status to in_consultation)
 * POST /api/queue/tokens/:tokenId/start
 */
router.post('/tokens/:tokenId/start', async (req, res) => {
    try {
        const { tokenId } = req.params;

        const { data: token, error: fetchError } = await supabase
            .from('queue_tokens')
            .select('*')
            .eq('id', tokenId)
            .single();

        if (fetchError || !token) {
            return res.status(404).json({
                success: false,
                error: 'Token not found'
            });
        }

        const { data: updatedToken, error } = await supabase
            .from('queue_tokens')
            .update({
                status: 'in_consultation',
                consultation_started_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('id', tokenId)
            .select()
            .single();

        if (error) throw error;

        // Log event
        await supabase.from('queue_events').insert({
            token_id: tokenId,
            event_type: 'started',
            old_status: token.status,
            new_status: 'in_consultation',
            reason: 'Consultation started'
        });

        res.json({
            success: true,
            token: updatedToken
        });

    } catch (error) {
        console.error('Error starting consultation:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Complete consultation
 * POST /api/queue/tokens/:tokenId/complete
 */
router.post('/tokens/:tokenId/complete', async (req, res) => {
    try {
        const { tokenId } = req.body;
        const { notes, follow_up_required, next_appointment } = req.body;

        const { data: token, error: fetchError } = await supabase
            .from('queue_tokens')
            .select('*')
            .eq('id', tokenId)
            .single();

        if (fetchError || !token) {
            return res.status(404).json({
                success: false,
                error: 'Token not found'
            });
        }

        const { data: updatedToken, error } = await supabase
            .from('queue_tokens')
            .update({
                status: 'completed',
                consultation_completed_at: new Date().toISOString(),
                notes,
                updated_at: new Date().toISOString()
            })
            .eq('id', tokenId)
            .select()
            .single();

        if (error) throw error;

        // Update doctor statistics
        await updateDoctorStats(token.doctor_id, token.branch_id, 'completed');

        // Log event
        await supabase.from('queue_events').insert({
            token_id: tokenId,
            event_type: 'completed',
            old_status: token.status,
            new_status: 'completed',
            reason: notes || 'Consultation completed'
        });

        // Get next patient
        const { data: nextPatient } = await supabase
            .from('queue_tokens')
            .select('*')
            .eq('doctor_id', token.doctor_id)
            .eq('status', 'waiting')
            .order('priority', { ascending: true })
            .order('token_number', { ascending: true })
            .limit(1)
            .single();

        res.json({
            success: true,
            token: updatedToken,
            next_patient: nextPatient
        });

    } catch (error) {
        console.error('Error completing consultation:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Cancel token
 * POST /api/queue/tokens/:tokenId/cancel
 */
router.post('/tokens/:tokenId/cancel', async (req, res) => {
    try {
        const { tokenId } = req.params;
        const { reason } = req.body;

        const { data: token, error: fetchError } = await supabase
            .from('queue_tokens')
            .select('*')
            .eq('id', tokenId)
            .single();

        if (fetchError || !token) {
            return res.status(404).json({
                success: false,
                error: 'Token not found'
            });
        }

        const { data: updatedToken, error } = await supabase
            .from('queue_tokens')
            .update({
                status: 'cancelled',
                cancel_reason: reason,
                updated_at: new Date().toISOString()
            })
            .eq('id', tokenId)
            .select()
            .single();

        if (error) throw error;

        // Recalculate wait times
        await recalculateWaitTimes(token.doctor_id);

        res.json({
            success: true,
            token: updatedToken
        });

    } catch (error) {
        console.error('Error cancelling token:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Mark as no-show
 * POST /api/queue/tokens/:tokenId/no-show
 */
router.post('/tokens/:tokenId/no-show', async (req, res) => {
    try {
        const { tokenId } = req.params;

        const { data: token, error: fetchError } = await supabase
            .from('queue_tokens')
            .select('*')
            .eq('id', tokenId)
            .single();

        if (fetchError || !token) {
            return res.status(404).json({
                success: false,
                error: 'Token not found'
            });
        }

        const { data: updatedToken, error } = await supabase
            .from('queue_tokens')
            .update({
                status: 'no_show',
                updated_at: new Date().toISOString()
            })
            .eq('id', tokenId)
            .select()
            .single();

        if (error) throw error;

        // Update doctor stats
        await updateDoctorStats(token.doctor_id, token.branch_id, 'no_show');

        // Update patient no-show count
        await updatePatientNoShowCount(token.patient_id);

        res.json({
            success: true,
            token: updatedToken
        });

    } catch (error) {
        console.error('Error marking no-show:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================================
// DISPLAY BOARD APIs
// ============================================================

/**
 * Get display board data for branch
 * GET /api/queue/display/branch/:branchId
 */
router.get('/display/branch/:branchId', async (req, res) => {
    try {
        const { branchId } = req.params;
        const { department_id } = req.query;

        // Get current in-consultation token
        let currentQuery = supabase
            .from('queue_tokens')
            .select(`
                *,
                patient:patients!queue_tokens_patient_id_fkey(
                    full_name,
                    phone
                ),
                doctor:doctors(
                    full_name,
                    specialization
                )
            `)
            .eq('branch_id', branchId)
            .eq('status', 'in_consultation');

        if (department_id) {
            currentQuery = currentQuery.eq('department_id', department_id);
        }

        const { data: currentToken } = await currentQuery.order('consultation_started_at', { ascending: false }).limit(1).single();

        // Get upcoming tokens (waiting)
        let upcomingQuery = supabase
            .from('queue_tokens')
            .select(`
                *,
                patient:patients!queue_tokens_patient_id_fkey(
                    full_name
                )
            `)
            .eq('branch_id', branchId)
            .eq('status', 'waiting');

        if (department_id) {
            upcomingQuery = upcomingQuery.eq('department_id', department_id);
        }

        const { data: upcomingTokens } = await upcomingQuery
            .order('priority', { ascending: true })
            .order('token_number', { ascending: true })
            .limit(5);

        // Get stats
        const { count: waiting } = await supabase
            .from('queue_tokens')
            .select('*', { count: 'exact', head: true })
            .eq('branch_id', branchId)
            .eq('status', 'waiting');

        const { count: inConsultation } = await supabase
            .from('queue_tokens')
            .select('*', { count: 'exact', head: true })
            .eq('branch_id', branchId)
            .eq('status', 'in_consultation');

        const { count: called } = await supabase
            .from('queue_tokens')
            .select('*', { count: 'exact', head: true })
            .eq('branch_id', branchId)
            .eq('status', 'called');

        res.json({
            success: true,
            current_token: currentToken ? {
                token_number: currentToken.token_number,
                patient_name: currentToken.patient?.full_name,
                doctor_name: currentToken.doctor?.full_name,
                room_number: currentToken.room_number,
                started_at: currentToken.consultation_started_at,
                elapsed_minutes: Math.floor((Date.now() - new Date(currentToken.consultation_started_at)) / 60000)
            } : null,
            upcoming_tokens: upcomingTokens?.map(t => ({
                token_number: t.token_number,
                patient_name: t.patient?.full_name,
                priority: t.priority,
                wait_minutes: t.estimated_wait_minutes
            })) || [],
            queue_summary: {
                waiting: waiting || 0,
                called: called || 0,
                in_consultation: inConsultation || 0,
                avg_wait_minutes: upcomingTokens?.[0]?.estimated_wait_minutes || 0
            },
            last_updated: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error fetching display board:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Get display board for doctor
 * GET /api/queue/display/doctor/:doctorId
 */
router.get('/display/doctor/:doctorId', async (req, res) => {
    try {
        const { doctorId } = req.params;

        // Get current in-consultation
        const { data: currentToken } = await supabase
            .from('queue_tokens')
            .select(`
                *,
                patient:patients!queue_tokens_patient_id_fkey(
                    full_name
                )
            `)
            .eq('doctor_id', doctorId)
            .eq('status', 'in_consultation')
            .order('consultation_started_at', { ascending: false })
            .limit(1)
            .single();

        // Get waiting
        const { data: waitingTokens } = await supabase
            .from('queue_tokens')
            .select(`
                *,
                patient:patients!queue_tokens_patient_id_fkey(
                    full_name
                )
            `)
            .eq('doctor_id', doctorId)
            .eq('status', 'waiting')
            .order('priority', { ascending: true })
            .order('token_number', { ascending: true })
            .limit(5);

        res.json({
            success: true,
            current_token: currentToken ? {
                token_number: currentToken.token_number,
                patient_name: currentToken.patient?.full_name,
                room_number: currentToken.room_number,
                started_at: currentToken.consultation_started_at
            } : null,
            upcoming_tokens: waitingTokens?.map(t => ({
                token_number: t.token_number,
                patient_name: t.patient?.full_name,
                priority: t.priority,
                wait_minutes: t.estimated_wait_minutes
            })) || [],
            last_updated: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error fetching doctor display:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================================
// WAIT TIME APIs
// ============================================================

/**
 * Get estimated wait time
 * GET /api/queue/wait-time
 */
router.get('/wait-time', async (req, res) => {
    try {
        const { doctor_id, patient_id } = req.query;

        if (!doctor_id) {
            return res.status(400).json({
                success: false,
                error: 'doctor_id is required'
            });
        }

        // Get position
        let position = 0;
        if (patient_id) {
            const { data: patientToken } = await supabase
                .from('queue_tokens')
                .select('id')
                .eq('doctor_id', doctor_id)
                .eq('patient_id', patient_id)
                .eq('status', 'waiting')
                .order('created_at', { ascending: true })
                .limit(1)
                .single();

            if (patientToken) {
                const { count } = await supabase
                    .from('queue_tokens')
                    .select('*', { count: 'exact', head: true })
                    .eq('doctor_id', doctor_id)
                    .eq('status', 'waiting')
                    .lt('created_at', new Date().toISOString());

                position = count || 0;
            }
        } else {
            const { count } = await supabase
                .from('queue_tokens')
                .select('*', { count: 'exact', head: true })
                .eq('doctor_id', doctor_id)
                .eq('status', 'waiting');

            position = count || 0;
        }

        // Get doctor avg time
        const { data: doctor } = await supabase
            .from('doctors')
            .select('avg_consultation_minutes')
            .eq('id', doctor_id)
            .single();

        const avgTime = doctor?.avg_consultation_minutes || 15;
        const estimatedWait = position * avgTime;

        res.json({
            success: true,
            estimated_wait_minutes: estimatedWait,
            queue_position: position,
            patients_ahead: position,
            last_updated: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error calculating wait time:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================================
// HELPER FUNCTIONS
// ============================================================

async function recalculateWaitTimes(doctorId) {
    try {
        const { data: waitingTokens } = await supabase
            .from('queue_tokens')
            .select('id, estimated_wait_minutes')
            .eq('doctor_id', doctorId)
            .eq('status', 'waiting')
            .order('priority', { ascending: true })
            .order('token_number', { ascending: true });

        const { data: doctor } = await supabase
            .from('doctors')
            .select('avg_consultation_minutes')
            .eq('id', doctorId)
            .single();

        const avgTime = doctor?.avg_consultation_minutes || 15;
        let cumulativeWait = 0;

        for (const token of waitingTokens) {
            await supabase
                .from('queue_tokens')
                .update({ estimated_wait_minutes: cumulativeWait })
                .eq('id', token.id);

            cumulativeWait += avgTime;
        }
    } catch (error) {
        console.error('Error recalculating wait times:', error);
    }
}

async function updateDoctorStats(doctorId, branchId, type) {
    try {
        const today = new Date().toISOString().split('T')[0];

        const updateData = {};
        if (type === 'completed') {
            updateData.completed_consultations = 1;
        } else if (type === 'no_show') {
            updateData.no_shows = 1;
        }

        await supabase
            .from('doctor_statistics')
            .upsert({
                doctor_id: doctorId,
                branch_id: branchId,
                date: today,
                ...updateData
            }, {
                onConflict: 'doctor_id,branch_id,date'
            });
    } catch (error) {
        console.error('Error updating doctor stats:', error);
    }
}

async function updatePatientNoShowCount(patientId) {
    try {
        const today = new Date().toISOString().split('T')[0];
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        // Get existing flags
        const { data: existing } = await supabase
            .from('patient_flags')
            .select('*')
            .eq('patient_id', patientId)
            .single();

        const newNoShowCount = (existing?.no_show_count || 0) + 1;
        const newLast30Days = (existing?.no_show_last_30_days || 0) + 1;

        // Determine warning level
        let warningLevel = 'none';
        let requiresPrepayment = false;
        let limitedBooking = false;
        let maxFutureAppointments = 3;

        if (newLast30Days >= 3) {
            warningLevel = 'high';
            requiresPrepayment = true;
        } else if (newLast30Days >= 2) {
            warningLevel = 'medium';
            limitedBooking = true;
            maxFutureAppointments = 2;
        }

        await supabase
            .from('patient_flags')
            .upsert({
                patient_id: patientId,
                no_show_count: newNoShowCount,
                no_show_last_30_days: newLast30Days,
                warning_level: warningLevel,
                requires_prepayment: requiresPrepayment,
                limited_booking: limitedBooking,
                max_future_appointments: maxFutureAppointments,
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'patient_id'
            });
    } catch (error) {
        console.error('Error updating patient no-show count:', error);
    }
}

module.exports = router;
