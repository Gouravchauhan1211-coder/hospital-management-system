const express = require('express');
const router = express.Router();
const { supabase } = require('../config/supabase');

// ============================================================
// MEDIATOR - DOCTOR VERIFICATION APIs
// ============================================================

/**
 * Get pending doctor verifications
 * GET /api/mediator/doctors/pending
 */
router.get('/doctors/pending', async (req, res) => {
    try {
        const { page = 1, limit = 10, status = 'pending' } = req.query;
        const offset = (page - 1) * limit;

        // Get doctors with pending verification
        const { data: doctors, error, count } = await supabase
            .from('doctors')
            .select(`
                id,
                full_name,
                email,
                phone,
                specialization,
                qualification,
                experience_years,
                registration_number,
                verified,
                status,
                created_at,
                profile_image,
                department:departments(
                    id,
                    name
                ),
                branch:branches(
                    id,
                    name,
                    city
                )
            `, { count: 'exact' })
            .eq('verified', false)
            .eq('status', status)
            .order('created_at', { ascending: false })
            .range(offset, offset + parseInt(limit) - 1);

        if (error) throw error;

        // Get counts by status
        const { data: statusCounts } = await supabase
            .from('doctors')
            .select('status');

        const statusSummary = {};
        statusCounts?.forEach(d => {
            statusSummary[d.status] = (statusSummary[d.status] || 0) + 1;
        });

        res.json({
            success: true,
            doctors,
            pagination: {
                total: count,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(count / parseInt(limit))
            },
            status_summary: statusSummary
        });

    } catch (error) {
        console.error('Error fetching pending doctors:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Get all doctors (for mediator management)
 * GET /api/mediator/doctors
 */
router.get('/doctors', async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            verified,
            status,
            department_id,
            branch_id,
            search
        } = req.query;
        const offset = (page - 1) * limit;

        let query = supabase
            .from('doctors')
            .select(`
                id,
                full_name,
                email,
                phone,
                specialization,
                qualification,
                experience_years,
                registration_number,
                verified,
                status,
                rating,
                review_count,
                created_at,
                profile_image,
                department:departments(
                    id,
                    name
                ),
                branch:branches(
                    id,
                    name,
                    city
                )
            `, { count: 'exact' });

        // Apply filters
        if (verified !== undefined) {
            query = query.eq('verified', verified === 'true');
        }
        if (status) {
            query = query.eq('status', status);
        }
        if (department_id) {
            query = query.eq('department_id', department_id);
        }
        if (branch_id) {
            query = query.eq('branch_id', branch_id);
        }
        if (search) {
            query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,specialization.ilike.%${search}%`);
        }

        const { data: doctors, error, count } = await query
            .order('created_at', { ascending: false })
            .range(offset, offset + parseInt(limit) - 1);

        if (error) throw error;

        res.json({
            success: true,
            doctors,
            pagination: {
                total: count,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(count / parseInt(limit))
            }
        });

    } catch (error) {
        console.error('Error fetching doctors:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Get single doctor details for verification
 * GET /api/mediator/doctors/:id
 */
router.get('/doctors/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const { data: doctor, error } = await supabase
            .from('doctors')
            .select(`
                *,
                department:departments(
                    id,
                    name,
                    code
                ),
                branch:branches(
                    id,
                    name,
                    city,
                    address
                )
            `)
            .eq('id', id)
            .single();

        if (error || !doctor) {
            return res.status(404).json({
                success: false,
                error: 'Doctor not found'
            });
        }

        // Get doctor's appointments count
        const { count: appointmentsCount } = await supabase
            .from('appointments')
            .select('*', { count: 'exact', head: true })
            .eq('doctor_id', id);

        // Get doctor's reviews
        const { data: reviews } = await supabase
            .from('reviews')
            .select('rating, comment, created_at, patient_name')
            .eq('doctor_id', id)
            .order('created_at', { ascending: false })
            .limit(5);

        res.json({
            success: true,
            doctor: {
                ...doctor,
                appointments_count: appointmentsCount || 0,
                recent_reviews: reviews || []
            }
        });

    } catch (error) {
        console.error('Error fetching doctor details:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Verify a doctor (approve/reject)
 * PUT /api/mediator/doctors/:id/verify
 */
router.put('/doctors/:id/verify', async (req, res) => {
    try {
        const { id } = req.params;
        const { verified, reason, mediator_id } = req.body;

        if (verified === undefined) {
            return res.status(400).json({
                success: false,
                error: 'verified field is required (true for approve, false for reject)'
            });
        }

        // Get doctor details
        const { data: doctor, error: fetchError } = await supabase
            .from('doctors')
            .select('id, full_name, email, status')
            .eq('id', id)
            .single();

        if (fetchError || !doctor) {
            return res.status(404).json({
                success: false,
                error: 'Doctor not found'
            });
        }

        // Update doctor verification status
        const newStatus = verified ? 'active' : 'rejected';
        const { data: updatedDoctor, error } = await supabase
            .from('doctors')
            .update({
                verified: verified,
                status: newStatus,
                verified_at: verified ? new Date().toISOString() : null,
                verified_by: verified ? mediator_id : null,
                rejection_reason: !verified ? reason : null,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        // Create notification for the doctor
        await supabase
            .from('notifications')
            .insert({
                user_id: id,
                user_type: 'doctor',
                title: verified ? 'Account Verified' : 'Verification Rejected',
                message: verified
                    ? 'Congratulations! Your account has been verified. You can now start accepting appointments.'
                    : `Your verification was rejected. Reason: ${reason || 'Not specified'}`,
                type: 'verification',
                data: {
                    verified,
                    reason
                }
            });

        res.json({
            success: true,
            doctor: updatedDoctor,
            message: verified
                ? 'Doctor verified successfully'
                : 'Doctor verification rejected'
        });

    } catch (error) {
        console.error('Error verifying doctor:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Update doctor status (activate/suspend/deactivate)
 * PUT /api/mediator/doctors/:id/status
 */
router.put('/doctors/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status, reason, mediator_id } = req.body;

        const validStatuses = ['active', 'inactive', 'suspended', 'pending'];
        if (!status || !validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
            });
        }

        // Get doctor details
        const { data: doctor, error: fetchError } = await supabase
            .from('doctors')
            .select('id, full_name, email, status')
            .eq('id', id)
            .single();

        if (fetchError || !doctor) {
            return res.status(404).json({
                success: false,
                error: 'Doctor not found'
            });
        }

        // Update doctor status
        const { data: updatedDoctor, error } = await supabase
            .from('doctors')
            .update({
                status: status,
                status_reason: reason,
                status_updated_by: mediator_id,
                status_updated_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        // Create notification for the doctor
        const statusMessages = {
            active: 'Your account has been activated. You can now accept appointments.',
            inactive: 'Your account has been deactivated.',
            suspended: `Your account has been suspended. Reason: ${reason || 'Not specified'}`,
            pending: 'Your account status has been set to pending verification.'
        };

        await supabase
            .from('notifications')
            .insert({
                user_id: id,
                user_type: 'doctor',
                title: 'Account Status Updated',
                message: statusMessages[status],
                type: 'status_update',
                data: {
                    status,
                    reason
                }
            });

        res.json({
            success: true,
            doctor: updatedDoctor,
            message: `Doctor status updated to ${status}`
        });

    } catch (error) {
        console.error('Error updating doctor status:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Get verification statistics
 * GET /api/mediator/verification-stats
 */
router.get('/verification-stats', async (req, res) => {
    try {
        // Get total doctors count
        const { count: totalDoctors } = await supabase
            .from('doctors')
            .select('*', { count: 'exact', head: true });

        // Get verified doctors count
        const { count: verifiedDoctors } = await supabase
            .from('doctors')
            .select('*', { count: 'exact', head: true })
            .eq('verified', true);

        // Get pending verifications
        const { count: pendingVerifications } = await supabase
            .from('doctors')
            .select('*', { count: 'exact', head: true })
            .eq('verified', false)
            .eq('status', 'pending');

        // Get suspended doctors
        const { count: suspendedDoctors } = await supabase
            .from('doctors')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'suspended');

        // Get recent verifications (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const { count: recentVerifications } = await supabase
            .from('doctors')
            .select('*', { count: 'exact', head: true })
            .eq('verified', true)
            .gte('verified_at', sevenDaysAgo.toISOString());

        res.json({
            success: true,
            stats: {
                total_doctors: totalDoctors || 0,
                verified_doctors: verifiedDoctors || 0,
                pending_verifications: pendingVerifications || 0,
                suspended_doctors: suspendedDoctors || 0,
                recent_verifications: recentVerifications || 0
            }
        });

    } catch (error) {
        console.error('Error fetching verification stats:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Bulk verify doctors
 * POST /api/mediator/doctors/bulk-verify
 */
router.post('/doctors/bulk-verify', async (req, res) => {
    try {
        const { doctor_ids, verified, reason, mediator_id } = req.body;

        if (!doctor_ids || !Array.isArray(doctor_ids) || doctor_ids.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'doctor_ids array is required'
            });
        }

        if (verified === undefined) {
            return res.status(400).json({
                success: false,
                error: 'verified field is required'
            });
        }

        const newStatus = verified ? 'active' : 'rejected';

        // Update all doctors
        const { data: updatedDoctors, error } = await supabase
            .from('doctors')
            .update({
                verified: verified,
                status: newStatus,
                verified_at: verified ? new Date().toISOString() : null,
                verified_by: verified ? mediator_id : null,
                rejection_reason: !verified ? reason : null,
                updated_at: new Date().toISOString()
            })
            .in('id', doctor_ids)
            .select('id, full_name');

        if (error) throw error;

        // Create notifications for each doctor
        const notifications = doctor_ids.map(doctorId => ({
            user_id: doctorId,
            user_type: 'doctor',
            title: verified ? 'Account Verified' : 'Verification Rejected',
            message: verified
                ? 'Congratulations! Your account has been verified.'
                : `Your verification was rejected. Reason: ${reason || 'Not specified'}`,
            type: 'verification',
            data: { verified, reason }
        }));

        await supabase
            .from('notifications')
            .insert(notifications);

        res.json({
            success: true,
            updated_count: updatedDoctors?.length || 0,
            doctors: updatedDoctors,
            message: `${updatedDoctors?.length || 0} doctors ${verified ? 'verified' : 'rejected'} successfully`
        });

    } catch (error) {
        console.error('Error bulk verifying doctors:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Get doctor's documents (for verification)
 * GET /api/mediator/doctors/:id/documents
 */
router.get('/doctors/:id/documents', async (req, res) => {
    try {
        const { id } = req.params;

        // Get doctor with document URLs
        const { data: doctor, error } = await supabase
            .from('doctors')
            .select(`
                id,
                full_name,
                registration_number,
                qualification,
                degree_certificate_url,
                registration_certificate_url,
                id_proof_url,
                other_documents
            `)
            .eq('id', id)
            .single();

        if (error || !doctor) {
            return res.status(404).json({
                success: false,
                error: 'Doctor not found'
            });
        }

        // Compile documents list
        const documents = [];

        if (doctor.degree_certificate_url) {
            documents.push({
                type: 'degree_certificate',
                name: 'Degree Certificate',
                url: doctor.degree_certificate_url
            });
        }
        if (doctor.registration_certificate_url) {
            documents.push({
                type: 'registration_certificate',
                name: 'Registration Certificate',
                url: doctor.registration_certificate_url
            });
        }
        if (doctor.id_proof_url) {
            documents.push({
                type: 'id_proof',
                name: 'ID Proof',
                url: doctor.id_proof_url
            });
        }
        if (doctor.other_documents && Array.isArray(doctor.other_documents)) {
            doctor.other_documents.forEach((doc, index) => {
                documents.push({
                    type: 'other',
                    name: doc.name || `Document ${index + 1}`,
                    url: doc.url
                });
            });
        }

        res.json({
            success: true,
            doctor: {
                id: doctor.id,
                full_name: doctor.full_name,
                registration_number: doctor.registration_number,
                qualification: doctor.qualification
            },
            documents
        });

    } catch (error) {
        console.error('Error fetching doctor documents:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;