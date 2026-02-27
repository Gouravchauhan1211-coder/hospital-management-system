const express = require('express');
const router = express.Router();
const { supabase } = require('../config/supabase');

// ============================================================
// PRESCRIPTIONS APIs
// ============================================================

/**
 * Create a new prescription
 * POST /api/prescriptions
 */
router.post('/', async (req, res) => {
    try {
        const {
            patient_id,
            doctor_id,
            appointment_id,
            medications,
            notes,
            follow_up_date
        } = req.body;

        // Validate required fields
        if (!patient_id || !doctor_id || !medications || !Array.isArray(medications) || medications.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: patient_id, doctor_id, medications (array)'
            });
        }

        // Validate medications structure
        for (const med of medications) {
            if (!med.name) {
                return res.status(400).json({
                    success: false,
                    error: 'Each medication must have a name'
                });
            }
        }

        // Get patient and doctor details
        const { data: patient } = await supabase
            .from('patients')
            .select('id, full_name')
            .eq('id', patient_id)
            .single();

        const { data: doctor } = await supabase
            .from('doctors')
            .select('id, full_name, specialization')
            .eq('id', doctor_id)
            .single();

        if (!patient || !doctor) {
            return res.status(404).json({
                success: false,
                error: 'Patient or doctor not found'
            });
        }

        // Create prescription
        const { data: prescription, error } = await supabase
            .from('prescriptions')
            .insert({
                patient_id,
                doctor_id,
                doctor_name: doctor.full_name,
                appointment_id,
                medications,
                notes,
                follow_up_date,
                prescribed_date: new Date().toISOString().split('T')[0],
                status: 'active'
            })
            .select()
            .single();

        if (error) throw error;

        // Create notification for patient
        await supabase
            .from('notifications')
            .insert({
                user_id: patient_id,
                user_type: 'patient',
                title: 'New Prescription',
                message: `Dr. ${doctor.full_name} has prescribed ${medications.length} medication(s) for you.`,
                type: 'prescription',
                data: {
                    prescription_id: prescription.id,
                    doctor_id
                }
            });

        // Update appointment if provided
        if (appointment_id) {
            await supabase
                .from('appointments')
                .update({
                    prescription: { prescription_id: prescription.id, medications }
                })
                .eq('id', appointment_id);
        }

        res.status(201).json({
            success: true,
            prescription
        });

    } catch (error) {
        console.error('Error creating prescription:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Get prescriptions for a patient
 * GET /api/prescriptions/patient/:patientId
 */
router.get('/patient/:patientId', async (req, res) => {
    try {
        const { patientId } = req.params;
        const { status, page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;

        let query = supabase
            .from('prescriptions')
            .select('*', { count: 'exact' })
            .eq('patient_id', patientId);

        if (status) {
            query = query.eq('status', status);
        }

        const { data: prescriptions, error, count } = await query
            .order('prescribed_date', { ascending: false })
            .range(offset, offset + parseInt(limit) - 1);

        if (error) throw error;

        // Get active medications count
        const { data: activeMeds } = await supabase
            .from('prescriptions')
            .select('medications')
            .eq('patient_id', patientId)
            .eq('status', 'active');

        let totalActiveMedications = 0;
        activeMeds?.forEach(p => {
            totalActiveMedications += p.medications?.length || 0;
        });

        res.json({
            success: true,
            prescriptions,
            pagination: {
                total: count,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(count / parseInt(limit))
            },
            summary: {
                total_prescriptions: count || 0,
                active_prescriptions: activeMeds?.length || 0,
                total_active_medications: totalActiveMedications
            }
        });

    } catch (error) {
        console.error('Error fetching patient prescriptions:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Get prescriptions by doctor
 * GET /api/prescriptions/doctor/:doctorId
 */
router.get('/doctor/:doctorId', async (req, res) => {
    try {
        const { doctorId } = req.params;
        const { page = 1, limit = 20, from_date, to_date } = req.query;
        const offset = (page - 1) * limit;

        let query = supabase
            .from('prescriptions')
            .select(`
                *,
                patient:patients(
                    id,
                    full_name,
                    phone
                )
            `, { count: 'exact' })
            .eq('doctor_id', doctorId);

        if (from_date) {
            query = query.gte('prescribed_date', from_date);
        }
        if (to_date) {
            query = query.lte('prescribed_date', to_date);
        }

        const { data: prescriptions, error, count } = await query
            .order('prescribed_date', { ascending: false })
            .range(offset, offset + parseInt(limit) - 1);

        if (error) throw error;

        res.json({
            success: true,
            prescriptions,
            pagination: {
                total: count,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(count / parseInt(limit))
            }
        });

    } catch (error) {
        console.error('Error fetching doctor prescriptions:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Get a single prescription
 * GET /api/prescriptions/:id
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const { data: prescription, error } = await supabase
            .from('prescriptions')
            .select(`
                *,
                patient:patients(
                    id,
                    full_name,
                    phone,
                    email,
                    date_of_birth,
                    blood_group
                ),
                doctor:doctors(
                    id,
                    full_name,
                    specialization,
                    qualification,
                    phone,
                    email
                )
            `)
            .eq('id', id)
            .single();

        if (error || !prescription) {
            return res.status(404).json({
                success: false,
                error: 'Prescription not found'
            });
        }

        res.json({
            success: true,
            prescription
        });

    } catch (error) {
        console.error('Error fetching prescription:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Update a prescription
 * PUT /api/prescriptions/:id
 */
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { medications, notes, status, follow_up_date } = req.body;

        // Get existing prescription
        const { data: existingPrescription, error: fetchError } = await supabase
            .from('prescriptions')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError || !existingPrescription) {
            return res.status(404).json({
                success: false,
                error: 'Prescription not found'
            });
        }

        // Validate status if provided
        if (status) {
            const validStatuses = ['active', 'completed', 'cancelled'];
            if (!validStatuses.includes(status)) {
                return res.status(400).json({
                    success: false,
                    error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
                });
            }
        }

        // Update prescription
        const { data: prescription, error } = await supabase
            .from('prescriptions')
            .update({
                medications: medications || existingPrescription.medications,
                notes: notes !== undefined ? notes : existingPrescription.notes,
                status: status || existingPrescription.status,
                follow_up_date: follow_up_date !== undefined ? follow_up_date : existingPrescription.follow_up_date,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        res.json({
            success: true,
            prescription
        });

    } catch (error) {
        console.error('Error updating prescription:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Delete a prescription
 * DELETE /api/prescriptions/:id
 */
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const { error } = await supabase
            .from('prescriptions')
            .delete()
            .eq('id', id);

        if (error) throw error;

        res.json({
            success: true,
            message: 'Prescription deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting prescription:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Mark prescription as completed
 * POST /api/prescriptions/:id/complete
 */
router.post('/:id/complete', async (req, res) => {
    try {
        const { id } = req.params;

        const { data: prescription, error } = await supabase
            .from('prescriptions')
            .update({
                status: 'completed',
                completed_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        res.json({
            success: true,
            prescription,
            message: 'Prescription marked as completed'
        });

    } catch (error) {
        console.error('Error completing prescription:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Get prescription for printing
 * GET /api/prescriptions/:id/print
 */
router.get('/:id/print', async (req, res) => {
    try {
        const { id } = req.params;

        const { data: prescription, error } = await supabase
            .from('prescriptions')
            .select(`
                *,
                patient:patients(
                    id,
                    full_name,
                    phone,
                    email,
                    date_of_birth,
                    blood_group,
                    address
                ),
                doctor:doctors(
                    id,
                    full_name,
                    specialization,
                    qualification,
                    phone,
                    email,
                    registration_number
                )
            `)
            .eq('id', id)
            .single();

        if (error || !prescription) {
            return res.status(404).json({
                success: false,
                error: 'Prescription not found'
            });
        }

        // Format for printing
        const printData = {
            prescription_id: prescription.id,
            date: prescription.prescribed_date,
            patient: {
                name: prescription.patient?.full_name,
                age: prescription.patient?.date_of_birth 
                    ? Math.floor((new Date() - new Date(prescription.patient.date_of_birth)) / (365.25 * 24 * 60 * 60 * 1000))
                    : null,
                gender: prescription.patient?.gender,
                phone: prescription.patient?.phone
            },
            doctor: {
                name: `Dr. ${prescription.doctor?.full_name}`,
                qualification: prescription.doctor?.qualification,
                specialization: prescription.doctor?.specialization,
                registration_number: prescription.doctor?.registration_number,
                phone: prescription.doctor?.phone
            },
            medications: prescription.medications,
            notes: prescription.notes,
            follow_up_date: prescription.follow_up_date
        };

        res.json({
            success: true,
            print_data: printData
        });

    } catch (error) {
        console.error('Error fetching prescription for print:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Get active medications for a patient (for dashboard)
 * GET /api/prescriptions/patient/:patientId/active-medications
 */
router.get('/patient/:patientId/active-medications', async (req, res) => {
    try {
        const { patientId } = req.params;

        const { data: prescriptions, error } = await supabase
            .from('prescriptions')
            .select(`
                id,
                prescribed_date,
                medications,
                doctor_name,
                notes
            `)
            .eq('patient_id', patientId)
            .eq('status', 'active')
            .order('prescribed_date', { ascending: false });

        if (error) throw error;

        // Flatten medications with prescription info
        const activeMedications = [];
        prescriptions?.forEach(p => {
            p.medications?.forEach(med => {
                activeMedications.push({
                    ...med,
                    prescription_id: p.id,
                    prescribed_date: p.prescribed_date,
                    doctor_name: p.doctor_name
                });
            });
        });

        res.json({
            success: true,
            active_medications: activeMedications,
            total_count: activeMedications.length
        });

    } catch (error) {
        console.error('Error fetching active medications:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Get prescription statistics for doctor
 * GET /api/prescriptions/doctor/:doctorId/stats
 */
router.get('/doctor/:doctorId/stats', async (req, res) => {
    try {
        const { doctorId } = req.params;
        const { from_date, to_date } = req.query;

        let query = supabase
            .from('prescriptions')
            .select('id, status, prescribed_date')
            .eq('doctor_id', doctorId);

        if (from_date) {
            query = query.gte('prescribed_date', from_date);
        }
        if (to_date) {
            query = query.lte('prescribed_date', to_date);
        }

        const { data: prescriptions, error } = await query;

        if (error) throw error;

        const stats = {
            total: prescriptions?.length || 0,
            active: prescriptions?.filter(p => p.status === 'active').length || 0,
            completed: prescriptions?.filter(p => p.status === 'completed').length || 0,
            cancelled: prescriptions?.filter(p => p.status === 'cancelled').length || 0
        };

        res.json({
            success: true,
            stats
        });

    } catch (error) {
        console.error('Error fetching prescription stats:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;