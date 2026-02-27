const express = require('express');
const router = express.Router();
const { supabase } = require('../config/supabase');

// ============================================================
// DEPARTMENT APIs
// ============================================================

/**
 * Get all departments
 * GET /api/departments
 */
router.get('/', async (req, res) => {
    try {
        const { include_inactive } = req.query;

        let query = supabase
            .from('departments')
            .select('*')
            .order('display_order', { ascending: true });

        if (!include_inactive) {
            query = query.eq('is_active', true);
        }

        const { data: departments, error } = await query;

        if (error) throw error;

        res.json({
            success: true,
            departments
        });

    } catch (error) {
        console.error('Error fetching departments:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Get single department
 * GET /api/departments/:id
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const { data: department, error } = await supabase
            .from('departments')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;

        if (!department) {
            return res.status(404).json({
                success: false,
                error: 'Department not found'
            });
        }

        // Get doctors in this department
        const { data: doctors } = await supabase
            .from('doctor_departments')
            .select(`
                doctor:doctors(
                    id,
                    full_name,
                    specialization,
                    consultation_fee,
                    is_verified
                )
            `)
            .eq('department_id', id);

        res.json({
            success: true,
            department,
            doctors: doctors?.map(d => d.doctor).filter(Boolean) || []
        });

    } catch (error) {
        console.error('Error fetching department:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Create department
 * POST /api/departments
 */
router.post('/', async (req, res) => {
    try {
        const {
            name,
            code,
            description,
            icon,
            color,
            parent_department_id,
            default_consultation_minutes = 15,
            allow_online_booking = true,
            is_emergency = false,
            display_order = 0
        } = req.body;

        if (!name || !code) {
            return res.status(400).json({
                success: false,
                error: 'Name and code are required'
            });
        }

        const { data: department, error } = await supabase
            .from('departments')
            .insert({
                name,
                code: code.toUpperCase(),
                description,
                icon,
                color,
                parent_department_id,
                default_consultation_minutes,
                allow_online_booking,
                is_emergency,
                display_order
            })
            .select()
            .single();

        if (error) {
            if (error.code === '23505') {  // Unique violation
                return res.status(400).json({
                    success: false,
                    error: 'Department code already exists'
                });
            }
            throw error;
        }

        res.status(201).json({
            success: true,
            department
        });

    } catch (error) {
        console.error('Error creating department:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Update department
 * PUT /api/departments/:id
 */
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        // Remove id from updates
        delete updates.id;

        const { data: department, error } = await supabase
            .from('departments')
            .update({
                ...updates,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        res.json({
            success: true,
            department
        });

    } catch (error) {
        console.error('Error updating department:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Delete department
 * DELETE /api/departments/:id
 */
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Check if department has doctors
        const { count } = await supabase
            .from('doctor_departments')
            .select('*', { count: 'exact', head: true })
            .eq('department_id', id);

        if (count > 0) {
            // Soft delete instead
            const { error } = await supabase
                .from('departments')
                .update({
                    is_active: false,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id);

            if (error) throw error;

            return res.json({
                success: true,
                message: 'Department deactivated (has associated doctors)'
            });
        }

        const { error } = await supabase
            .from('departments')
            .delete()
            .eq('id', id);

        if (error) throw error;

        res.json({
            success: true,
            message: 'Department deleted'
        });

    } catch (error) {
        console.error('Error deleting department:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Add doctor to department
 * POST /api/departments/:id/doctors
 */
router.post('/:id/doctors', async (req, res) => {
    try {
        const { id } = req.params;
        const { doctor_id, is_primary = false } = req.body;

        if (!doctor_id) {
            return res.status(400).json({
                success: false,
                error: 'doctor_id is required'
            });
        }

        const { data: relation, error } = await supabase
            .from('doctor_departments')
            .insert({
                doctor_id,
                department_id: id,
                is_primary
            })
            .select()
            .single();

        if (error) {
            if (error.code === '23505') {
                return res.status(400).json({
                    success: false,
                    error: 'Doctor already in this department'
                });
            }
            throw error;
        }

        res.status(201).json({
            success: true,
            relation
        });

    } catch (error) {
        console.error('Error adding doctor to department:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Remove doctor from department
 * DELETE /api/departments/:id/doctors/:doctorId
 */
router.delete('/:id/doctors/:doctorId', async (req, res) => {
    try {
        const { id, doctorId } = req.params;

        const { error } = await supabase
            .from('doctor_departments')
            .delete()
            .eq('department_id', id)
            .eq('doctor_id', doctorId);

        if (error) throw error;

        res.json({
            success: true,
            message: 'Doctor removed from department'
        });

    } catch (error) {
        console.error('Error removing doctor from department:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Get doctors by department
 * GET /api/departments/:id/doctors
 */
router.get('/:id/doctors', async (req, res) => {
    try {
        const { id } = req.params;

        const { data: doctorRelations, error } = await supabase
            .from('doctor_departments')
            .select(`
                is_primary,
                doctor:doctors(
                    id,
                    full_name,
                    specialization,
                    consultation_fee,
                    is_verified,
                    is_available,
                    avg_consultation_minutes
                )
            `)
            .eq('department_id', id);

        if (error) throw error;

        const doctors = doctorRelations?.map(d => ({
            ...d.doctor,
            is_primary: d.is_primary
        })) || [];

        res.json({
            success: true,
            doctors
        });

    } catch (error) {
        console.error('Error fetching department doctors:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
