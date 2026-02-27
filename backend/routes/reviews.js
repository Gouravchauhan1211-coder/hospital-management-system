const express = require('express');
const router = express.Router();
const { supabase } = require('../config/supabase');

// ============================================================
// REVIEWS APIs
// ============================================================

/**
 * Create a new review
 * POST /api/reviews
 */
router.post('/', async (req, res) => {
    try {
        const {
            patient_id,
            doctor_id,
            appointment_id,
            rating,
            comment
        } = req.body;

        // Validate required fields
        if (!patient_id || !doctor_id || !rating) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: patient_id, doctor_id, rating'
            });
        }

        // Validate rating range
        if (rating < 1 || rating > 5) {
            return res.status(400).json({
                success: false,
                error: 'Rating must be between 1 and 5'
            });
        }

        // Get patient name for denormalization
        const { data: patient, error: patientError } = await supabase
            .from('patients')
            .select('full_name')
            .eq('id', patient_id)
            .single();

        if (patientError || !patient) {
            return res.status(404).json({
                success: false,
                error: 'Patient not found'
            });
        }

        // Check if doctor exists
        const { data: doctor, error: doctorError } = await supabase
            .from('doctors')
            .select('id, rating, review_count')
            .eq('id', doctor_id)
            .single();

        if (doctorError || !doctor) {
            return res.status(404).json({
                success: false,
                error: 'Doctor not found'
            });
        }

        // Check if appointment exists and belongs to patient and doctor (if provided)
        if (appointment_id) {
            const { data: appointment, error: appointmentError } = await supabase
                .from('appointments')
                .select('id, status')
                .eq('id', appointment_id)
                .eq('patient_id', patient_id)
                .eq('doctor_id', doctor_id)
                .single();

            if (appointmentError || !appointment) {
                return res.status(404).json({
                    success: false,
                    error: 'Appointment not found or does not belong to this patient/doctor'
                });
            }

            // Check if appointment is completed
            if (appointment.status !== 'completed') {
                return res.status(400).json({
                    success: false,
                    error: 'Can only review completed appointments'
                });
            }

            // Check if review already exists for this appointment
            const { data: existingReview } = await supabase
                .from('reviews')
                .select('id')
                .eq('appointment_id', appointment_id)
                .single();

            if (existingReview) {
                return res.status(400).json({
                    success: false,
                    error: 'Review already exists for this appointment'
                });
            }
        }

        // Create the review
        const { data: review, error } = await supabase
            .from('reviews')
            .insert({
                patient_id,
                doctor_id,
                appointment_id,
                rating,
                comment,
                patient_name: patient.full_name
            })
            .select()
            .single();

        if (error) throw error;

        // Update doctor's average rating and review count
        await updateDoctorRating(doctor_id);

        res.status(201).json({
            success: true,
            review
        });

    } catch (error) {
        console.error('Error creating review:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Get reviews for a doctor
 * GET /api/reviews/doctor/:doctorId
 */
router.get('/doctor/:doctorId', async (req, res) => {
    try {
        const { doctorId } = req.params;
        const { page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;

        // Get reviews with pagination
        const { data: reviews, error, count } = await supabase
            .from('reviews')
            .select('*', { count: 'exact' })
            .eq('doctor_id', doctorId)
            .order('created_at', { ascending: false })
            .range(offset, offset + parseInt(limit) - 1);

        if (error) throw error;

        // Calculate rating distribution
        const { data: allReviews } = await supabase
            .from('reviews')
            .select('rating')
            .eq('doctor_id', doctorId);

        const ratingDistribution = {
            5: 0, 4: 0, 3: 0, 2: 0, 1: 0
        };
        let totalRating = 0;

        allReviews?.forEach(r => {
            ratingDistribution[r.rating]++;
            totalRating += r.rating;
        });

        const averageRating = allReviews?.length > 0 
            ? (totalRating / allReviews.length).toFixed(1) 
            : 0;

        res.json({
            success: true,
            reviews,
            pagination: {
                total: count,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(count / parseInt(limit))
            },
            stats: {
                average_rating: parseFloat(averageRating),
                total_reviews: allReviews?.length || 0,
                rating_distribution: ratingDistribution
            }
        });

    } catch (error) {
        console.error('Error fetching doctor reviews:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Get reviews by patient
 * GET /api/reviews/patient/:patientId
 */
router.get('/patient/:patientId', async (req, res) => {
    try {
        const { patientId } = req.params;

        const { data: reviews, error } = await supabase
            .from('reviews')
            .select(`
                *,
                doctor:doctors(
                    id,
                    full_name,
                    specialization,
                    profile_image
                )
            `)
            .eq('patient_id', patientId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        res.json({
            success: true,
            reviews
        });

    } catch (error) {
        console.error('Error fetching patient reviews:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Get a single review
 * GET /api/reviews/:id
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const { data: review, error } = await supabase
            .from('reviews')
            .select(`
                *,
                doctor:doctors(
                    id,
                    full_name,
                    specialization,
                    profile_image
                ),
                patient:patients(
                    id,
                    full_name,
                    profile_image
                )
            `)
            .eq('id', id)
            .single();

        if (error || !review) {
            return res.status(404).json({
                success: false,
                error: 'Review not found'
            });
        }

        res.json({
            success: true,
            review
        });

    } catch (error) {
        console.error('Error fetching review:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Update a review
 * PUT /api/reviews/:id
 */
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { rating, comment, patient_id } = req.body;

        // Get existing review
        const { data: existingReview, error: fetchError } = await supabase
            .from('reviews')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError || !existingReview) {
            return res.status(404).json({
                success: false,
                error: 'Review not found'
            });
        }

        // Validate patient ownership
        if (patient_id && patient_id !== existingReview.patient_id) {
            return res.status(403).json({
                success: false,
                error: 'You can only update your own reviews'
            });
        }

        // Validate rating range if provided
        if (rating && (rating < 1 || rating > 5)) {
            return res.status(400).json({
                success: false,
                error: 'Rating must be between 1 and 5'
            });
        }

        // Update the review
        const { data: review, error } = await supabase
            .from('reviews')
            .update({
                rating: rating || existingReview.rating,
                comment: comment !== undefined ? comment : existingReview.comment,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        // Update doctor's average rating
        await updateDoctorRating(existingReview.doctor_id);

        res.json({
            success: true,
            review
        });

    } catch (error) {
        console.error('Error updating review:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Delete a review
 * DELETE /api/reviews/:id
 */
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { patient_id } = req.query;

        // Get existing review
        const { data: existingReview, error: fetchError } = await supabase
            .from('reviews')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError || !existingReview) {
            return res.status(404).json({
                success: false,
                error: 'Review not found'
            });
        }

        // Validate patient ownership
        if (patient_id && patient_id !== existingReview.patient_id) {
            return res.status(403).json({
                success: false,
                error: 'You can only delete your own reviews'
            });
        }

        const doctorId = existingReview.doctor_id;

        // Delete the review
        const { error } = await supabase
            .from('reviews')
            .delete()
            .eq('id', id);

        if (error) throw error;

        // Update doctor's average rating
        await updateDoctorRating(doctorId);

        res.json({
            success: true,
            message: 'Review deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting review:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Check if patient can review an appointment
 * GET /api/reviews/can-review/:appointmentId
 */
router.get('/can-review/:appointmentId', async (req, res) => {
    try {
        const { appointmentId } = req.params;
        const { patient_id } = req.query;

        if (!patient_id) {
            return res.status(400).json({
                success: false,
                error: 'patient_id is required'
            });
        }

        // Get appointment
        const { data: appointment, error: appointmentError } = await supabase
            .from('appointments')
            .select('*')
            .eq('id', appointmentId)
            .eq('patient_id', patient_id)
            .single();

        if (appointmentError || !appointment) {
            return res.json({
                success: true,
                can_review: false,
                reason: 'Appointment not found'
            });
        }

        // Check if appointment is completed
        if (appointment.status !== 'completed') {
            return res.json({
                success: true,
                can_review: false,
                reason: 'Can only review completed appointments'
            });
        }

        // Check if review already exists
        const { data: existingReview } = await supabase
            .from('reviews')
            .select('id')
            .eq('appointment_id', appointmentId)
            .single();

        if (existingReview) {
            return res.json({
                success: true,
                can_review: false,
                reason: 'Review already exists for this appointment',
                existing_review_id: existingReview.id
            });
        }

        res.json({
            success: true,
            can_review: true,
            appointment: {
                id: appointment.id,
                doctor_id: appointment.doctor_id,
                date: appointment.date
            }
        });

    } catch (error) {
        console.error('Error checking review eligibility:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Update doctor's average rating and review count
 */
async function updateDoctorRating(doctorId) {
    try {
        // Get all reviews for this doctor
        const { data: reviews, error } = await supabase
            .from('reviews')
            .select('rating')
            .eq('doctor_id', doctorId);

        if (error) throw error;

        if (!reviews || reviews.length === 0) {
            // No reviews, set to 0
            await supabase
                .from('doctors')
                .update({
                    rating: 0,
                    review_count: 0
                })
                .eq('id', doctorId);
            return;
        }

        // Calculate average
        const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
        const averageRating = totalRating / reviews.length;

        // Update doctor
        await supabase
            .from('doctors')
            .update({
                rating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
                review_count: reviews.length
            })
            .eq('id', doctorId);

    } catch (error) {
        console.error('Error updating doctor rating:', error);
    }
}

module.exports = router;
