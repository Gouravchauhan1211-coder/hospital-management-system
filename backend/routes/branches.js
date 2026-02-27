const express = require('express');
const router = express.Router();
const { supabase } = require('../config/supabase');

// ============================================================
// BRANCH APIs
// ============================================================

/**
 * Get all branches
 * GET /api/branches
 */
router.get('/', async (req, res) => {
    try {
        const { include_inactive } = req.query;

        let query = supabase
            .from('branches')
            .select('*')
            .order('is_headquarters', { ascending: false })
            .order('name', { ascending: true });

        if (!include_inactive) {
            query = query.eq('is_active', true);
        }

        const { data: branches, error } = await query;

        if (error) throw error;

        res.json({
            success: true,
            branches
        });

    } catch (error) {
        console.error('Error fetching branches:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Get single branch
 * GET /api/branches/:id
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const { data: branch, error } = await supabase
            .from('branches')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;

        if (!branch) {
            return res.status(404).json({
                success: false,
                error: 'Branch not found'
            });
        }

        // Get settings
        const { data: settings } = await supabase
            .from('branch_settings')
            .select('*')
            .eq('branch_id', id)
            .single();

        // Get departments at this branch
        const { data: departmentRelations } = await supabase
            .from('doctor_departments')
            .select(`
                department:departments(
                    id,
                    name,
                    code,
                    icon,
                    color
                )
            `);

        // Get unique departments
        const departments = [...new Map(departmentRelations?.map(r => [r.department.id, r.department])).values()];

        res.json({
            success: true,
            branch,
            settings,
            departments: departments.filter(Boolean)
        });

    } catch (error) {
        console.error('Error fetching branch:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Create branch
 * POST /api/branches
 */
router.post('/', async (req, res) => {
    try {
        const {
            name,
            code,
            address,
            city,
            state,
            pincode,
            latitude,
            longitude,
            phone,
            email,
            whatsapp,
            opening_time = '09:00:00',
            closing_time = '18:00:00',
            working_days = [1, 2, 3, 4, 5],
            is_headquarters = false
        } = req.body;

        if (!name || !code || !address || !city || !state || !pincode) {
            return res.status(400).json({
                success: false,
                error: 'Name, code, address, city, state, and pincode are required'
            });
        }

        const { data: branch, error } = await supabase
            .from('branches')
            .insert({
                name,
                code: code.toUpperCase(),
                address,
                city,
                state,
                pincode,
                latitude,
                longitude,
                phone,
                email,
                whatsapp,
                opening_time,
                closing_time,
                working_days,
                is_headquarters
            })
            .select()
            .single();

        if (error) {
            if (error.code === '23505') {
                return res.status(400).json({
                    success: false,
                    error: 'Branch code already exists'
                });
            }
            throw error;
        }

        // Create default settings
        await supabase
            .from('branch_settings')
            .insert({
                branch_id: branch.id,
                token_prefix: 'OPD',
                max_queue_per_doctor: 50,
                display_refresh_seconds: 5,
                show_wait_time: true
            });

        res.status(201).json({
            success: true,
            branch
        });

    } catch (error) {
        console.error('Error creating branch:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Update branch
 * PUT /api/branches/:id
 */
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        delete updates.id;

        const { data: branch, error } = await supabase
            .from('branches')
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
            branch
        });

    } catch (error) {
        console.error('Error updating branch:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Delete branch
 * DELETE /api/branches/:id
 */
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Check if it's the headquarters
        const { data: branch } = await supabase
            .from('branches')
            .select('is_headquarters')
            .eq('id', id)
            .single();

        if (branch?.is_headquarters) {
            return res.status(400).json({
                success: false,
                error: 'Cannot delete headquarters branch'
            });
        }

        // Check if branch has active queues
        const { count } = await supabase
            .from('queue_tokens')
            .select('*', { count: 'exact', head: true })
            .eq('branch_id', id)
            .in('status', ['waiting', 'called', 'in_consultation']);

        if (count > 0) {
            // Soft delete
            const { error } = await supabase
                .from('branches')
                .update({
                    is_active: false,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id);

            if (error) throw error;

            return res.json({
                success: true,
                message: 'Branch deactivated (has active queues)'
            });
        }

        const { error } = await supabase
            .from('branches')
            .delete()
            .eq('id', id);

        if (error) throw error;

        res.json({
            success: true,
            message: 'Branch deleted'
        });

    } catch (error) {
        console.error('Error deleting branch:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Get branch settings
 * GET /api/branches/:id/settings
 */
router.get('/:id/settings', async (req, res) => {
    try {
        const { id } = req.params;

        const { data: settings, error } = await supabase
            .from('branch_settings')
            .select('*')
            .eq('branch_id', id)
            .single();

        if (error && error.code !== 'PGRST116') throw error;

        res.json({
            success: true,
            settings
        });

    } catch (error) {
        console.error('Error fetching branch settings:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Update branch settings
 * PUT /api/branches/:id/settings
 */
router.put('/:id/settings', async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const { data: settings, error } = await supabase
            .from('branch_settings')
            .update({
                ...updates,
                updated_at: new Date().toISOString()
            })
            .eq('branch_id', id)
            .select()
            .single();

        if (error) {
            // If settings don't exist, create them
            if (error.code === 'PGRST116') {
                const { data: newSettings, insertError } = await supabase
                    .from('branch_settings')
                    .insert({
                        branch_id: id,
                        ...updates
                    })
                    .select()
                    .single();

                if (insertError) throw insertError;

                return res.json({
                    success: true,
                    settings: newSettings
                });
            }
            throw error;
        }

        res.json({
            success: true,
            settings
        });

    } catch (error) {
        console.error('Error updating branch settings:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Get doctors at branch
 * GET /api/branches/:id/doctors
 */
router.get('/:id/doctors', async (req, res) => {
    try {
        const { id } = req.params;

        const { data: roomAssignments, error } = await supabase
            .from('doctor_rooms')
            .select(`
                doctor:doctors(
                    id,
                    full_name,
                    specialization,
                    consultation_fee,
                    is_verified,
                    is_available
                ),
                room_number,
                opd_number,
                day_of_week
            `)
            .eq('branch_id', id)
            .eq('is_active', true);

        if (error) throw error;

        // Group by doctor
        const doctorsMap = new Map();
        for (const assignment of roomAssignments || []) {
            if (!assignment.doctor) continue;
            
            const doctorId = assignment.doctor.id;
            if (!doctorsMap.has(doctorId)) {
                doctorsMap.set(doctorId, {
                    ...assignment.doctor,
                    rooms: []
                });
            }
            doctorsMap.get(doctorId).rooms.push({
                room_number: assignment.room_number,
                opd_number: assignment.opd_number,
                day_of_week: assignment.day_of_week
            });
        }

        res.json({
            success: true,
            doctors: Array.from(doctorsMap.values())
        });

    } catch (error) {
        console.error('Error fetching branch doctors:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Assign doctor to branch/room
 * POST /api/branches/:id/doctors
 */
router.post('/:id/doctors', async (req, res) => {
    try {
        const { id } = req.params;
        const {
            doctor_id,
            room_number,
            opd_number,
            floor,
            building,
            day_of_week,
            start_time,
            end_time
        } = req.body;

        if (!doctor_id || !room_number) {
            return res.status(400).json({
                success: false,
                error: 'doctor_id and room_number are required'
            });
        }

        // If day_of_week provided, create for specific day
        // Otherwise create for all days
        const days = day_of_week !== undefined ? [day_of_week] : [0, 1, 2, 3, 4, 5, 6];

        const assignments = [];
        for (const day of days) {
            const { data: assignment, error } = await supabase
                .from('doctor_rooms')
                .upsert({
                    doctor_id,
                    branch_id: id,
                    room_number,
                    opd_number,
                    floor,
                    building,
                    day_of_week: day,
                    start_time,
                    end_time,
                    is_active: true
                }, {
                    onConflict: 'doctor_id,branch_id,day_of_week'
                })
                .select()
                .single();

            if (error) throw error;
            assignments.push(assignment);
        }

        res.status(201).json({
            success: true,
            assignments
        });

    } catch (error) {
        console.error('Error assigning doctor to branch:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Remove doctor from branch
 * DELETE /api/branches/:id/doctors/:doctorId
 */
router.delete('/:id/doctors/:doctorId', async (req, res) => {
    try {
        const { id, doctorId } = req.params;

        const { error } = await supabase
            .from('doctor_rooms')
            .delete()
            .eq('branch_id', id)
            .eq('doctor_id', doctorId);

        if (error) throw error;

        res.json({
            success: true,
            message: 'Doctor removed from branch'
        });

    } catch (error) {
        console.error('Error removing doctor from branch:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
