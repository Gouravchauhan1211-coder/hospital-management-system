const express = require('express');
const router = express.Router();
const { supabase } = require('../config/supabase');

// ============================================================
// MEDICAL RECORDS APIs
// ============================================================

/**
 * Upload a medical record
 * POST /api/medical-records
 */
router.post('/', async (req, res) => {
    try {
        const {
            patient_id,
            doctor_id,
            doctor_name,
            title,
            type = 'consultation',
            description,
            file_url,
            date
        } = req.body;

        // Validate required fields
        if (!patient_id || !title) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: patient_id, title'
            });
        }

        // Validate record type
        const validTypes = ['consultation', 'lab_result', 'prescription', 'imaging', 'report', 'other'];
        if (!validTypes.includes(type)) {
            return res.status(400).json({
                success: false,
                error: `Invalid record type. Must be one of: ${validTypes.join(', ')}`
            });
        }

        // Verify patient exists
        const { data: patient, error: patientError } = await supabase
            .from('patients')
            .select('id, full_name')
            .eq('id', patient_id)
            .single();

        if (patientError || !patient) {
            return res.status(404).json({
                success: false,
                error: 'Patient not found'
            });
        }

        // If doctor_id provided, get doctor name
        let doctorName = doctor_name;
        if (doctor_id && !doctor_name) {
            const { data: doctor } = await supabase
                .from('doctors')
                .select('full_name')
                .eq('id', doctor_id)
                .single();
            doctorName = doctor?.full_name;
        }

        // Create the medical record
        const { data: record, error } = await supabase
            .from('medical_records')
            .insert({
                patient_id,
                doctor_id,
                doctor_name: doctorName,
                title,
                type,
                description,
                file_url,
                date: date || new Date().toISOString().split('T')[0]
            })
            .select()
            .single();

        if (error) throw error;

        res.status(201).json({
            success: true,
            record
        });

    } catch (error) {
        console.error('Error creating medical record:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Get medical records for a patient
 * GET /api/medical-records/patient/:patientId
 */
router.get('/patient/:patientId', async (req, res) => {
    try {
        const { patientId } = req.params;
        const { type, from_date, to_date, page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;

        let query = supabase
            .from('medical_records')
            .select('*', { count: 'exact' })
            .eq('patient_id', patientId);

        // Filter by type
        if (type) {
            query = query.eq('type', type);
        }

        // Filter by date range
        if (from_date) {
            query = query.gte('date', from_date);
        }
        if (to_date) {
            query = query.lte('date', to_date);
        }

        // Execute query with pagination
        const { data: records, error, count } = await query
            .order('date', { ascending: false })
            .order('created_at', { ascending: false })
            .range(offset, offset + parseInt(limit) - 1);

        if (error) throw error;

        // Group records by type for summary
        const { data: allRecords } = await supabase
            .from('medical_records')
            .select('type')
            .eq('patient_id', patientId);

        const typeSummary = {};
        allRecords?.forEach(r => {
            typeSummary[r.type] = (typeSummary[r.type] || 0) + 1;
        });

        res.json({
            success: true,
            records,
            pagination: {
                total: count,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(count / parseInt(limit))
            },
            summary: {
                total_records: allRecords?.length || 0,
                by_type: typeSummary
            }
        });

    } catch (error) {
        console.error('Error fetching medical records:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Get a single medical record
 * GET /api/medical-records/:id
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const { data: record, error } = await supabase
            .from('medical_records')
            .select(`
                *,
                patient:patients(
                    id,
                    full_name,
                    phone,
                    email
                ),
                doctor:doctors(
                    id,
                    full_name,
                    specialization
                )
            `)
            .eq('id', id)
            .single();

        if (error || !record) {
            return res.status(404).json({
                success: false,
                error: 'Medical record not found'
            });
        }

        res.json({
            success: true,
            record
        });

    } catch (error) {
        console.error('Error fetching medical record:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Update a medical record
 * PUT /api/medical-records/:id
 */
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const {
            title,
            type,
            description,
            file_url,
            date
        } = req.body;

        // Get existing record
        const { data: existingRecord, error: fetchError } = await supabase
            .from('medical_records')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError || !existingRecord) {
            return res.status(404).json({
                success: false,
                error: 'Medical record not found'
            });
        }

        // Validate record type if provided
        if (type) {
            const validTypes = ['consultation', 'lab_result', 'prescription', 'imaging', 'report', 'other'];
            if (!validTypes.includes(type)) {
                return res.status(400).json({
                    success: false,
                    error: `Invalid record type. Must be one of: ${validTypes.join(', ')}`
                });
            }
        }

        // Update the record
        const { data: record, error } = await supabase
            .from('medical_records')
            .update({
                title: title || existingRecord.title,
                type: type || existingRecord.type,
                description: description !== undefined ? description : existingRecord.description,
                file_url: file_url !== undefined ? file_url : existingRecord.file_url,
                date: date || existingRecord.date,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        res.json({
            success: true,
            record
        });

    } catch (error) {
        console.error('Error updating medical record:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Delete a medical record
 * DELETE /api/medical-records/:id
 */
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Get existing record to check file_url
        const { data: existingRecord, error: fetchError } = await supabase
            .from('medical_records')
            .select('file_url')
            .eq('id', id)
            .single();

        if (fetchError || !existingRecord) {
            return res.status(404).json({
                success: false,
                error: 'Medical record not found'
            });
        }

        // Delete the record
        const { error } = await supabase
            .from('medical_records')
            .delete()
            .eq('id', id);

        if (error) throw error;

        // Optionally delete file from storage
        if (existingRecord.file_url) {
            try {
                // Extract file path from URL
                const urlParts = existingRecord.file_url.split('/');
                const bucketIndex = urlParts.findIndex(part => part === 'medical-records');
                if (bucketIndex !== -1) {
                    const filePath = urlParts.slice(bucketIndex + 1).join('/');
                    await supabase.storage
                        .from('medical-records')
                        .remove([filePath]);
                }
            } catch (storageError) {
                console.warn('Could not delete file from storage:', storageError);
                // Don't fail the request if file deletion fails
            }
        }

        res.json({
            success: true,
            message: 'Medical record deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting medical record:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Upload file to storage
 * POST /api/medical-records/upload
 */
router.post('/upload', async (req, res) => {
    try {
        const { patient_id, file_name, file_type, file_data } = req.body;

        if (!patient_id || !file_name || !file_data) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: patient_id, file_name, file_data'
            });
        }

        // Generate unique file path
        const timestamp = Date.now();
        const sanitizedFileName = file_name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const filePath = `${patient_id}/${timestamp}-${sanitizedFileName}`;

        // Decode base64 file data
        const buffer = Buffer.from(file_data, 'base64');

        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('medical-records')
            .upload(filePath, buffer, {
                contentType: file_type || 'application/octet-stream',
                upsert: false
            });

        if (uploadError) {
            console.error('Upload error:', uploadError);
            return res.status(500).json({
                success: false,
                error: 'Failed to upload file: ' + uploadError.message
            });
        }

        // Get public URL
        const { data: urlData } = supabase.storage
            .from('medical-records')
            .getPublicUrl(filePath);

        res.json({
            success: true,
            file_url: urlData.publicUrl,
            file_path: filePath
        });

    } catch (error) {
        console.error('Error uploading file:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Get download URL for a file
 * GET /api/medical-records/:id/download
 */
router.get('/:id/download', async (req, res) => {
    try {
        const { id } = req.params;

        const { data: record, error } = await supabase
            .from('medical_records')
            .select('file_url, title')
            .eq('id', id)
            .single();

        if (error || !record) {
            return res.status(404).json({
                success: false,
                error: 'Medical record not found'
            });
        }

        if (!record.file_url) {
            return res.status(404).json({
                success: false,
                error: 'No file attached to this record'
            });
        }

        // Generate signed URL for secure download (expires in 1 hour)
        const urlParts = record.file_url.split('/');
        const bucketIndex = urlParts.findIndex(part => part === 'medical-records');
        const filePath = urlParts.slice(bucketIndex + 1).join('/');

        const { data: signedUrlData, error: signedUrlError } = await supabase.storage
            .from('medical-records')
            .createSignedUrl(filePath, 3600);

        if (signedUrlError) {
            // If signed URL fails, return the public URL
            res.json({
                success: true,
                download_url: record.file_url,
                title: record.title
            });
        } else {
            res.json({
                success: true,
                download_url: signedUrlData.signedUrl,
                title: record.title
            });
        }

    } catch (error) {
        console.error('Error getting download URL:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Share medical record with a doctor
 * POST /api/medical-records/:id/share
 */
router.post('/:id/share', async (req, res) => {
    try {
        const { id } = req.params;
        const { doctor_id, patient_id } = req.body;

        if (!doctor_id || !patient_id) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: doctor_id, patient_id'
            });
        }

        // Verify record exists and belongs to patient
        const { data: record, error: fetchError } = await supabase
            .from('medical_records')
            .select('*')
            .eq('id', id)
            .eq('patient_id', patient_id)
            .single();

        if (fetchError || !record) {
            return res.status(404).json({
                success: false,
                error: 'Medical record not found or access denied'
            });
        }

        // Create a notification for the doctor
        const { data: doctor } = await supabase
            .from('doctors')
            .select('id')
            .eq('id', doctor_id)
            .single();

        if (!doctor) {
            return res.status(404).json({
                success: false,
                error: 'Doctor not found'
            });
        }

        // Create notification
        await supabase
            .from('notifications')
            .insert({
                user_id: doctor_id,
                user_type: 'doctor',
                title: 'Medical Record Shared',
                message: `A patient has shared a medical record "${record.title}" with you.`,
                type: 'medical_record',
                data: {
                    record_id: id,
                    patient_id,
                    record_type: record.type
                }
            });

        res.json({
            success: true,
            message: 'Medical record shared successfully'
        });

    } catch (error) {
        console.error('Error sharing medical record:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Get recent records for a patient (dashboard widget)
 * GET /api/medical-records/patient/:patientId/recent
 */
router.get('/patient/:patientId/recent', async (req, res) => {
    try {
        const { patientId } = req.params;
        const { limit = 5 } = req.query;

        const { data: records, error } = await supabase
            .from('medical_records')
            .select(`
                id,
                title,
                type,
                date,
                doctor_name
            `)
            .eq('patient_id', patientId)
            .order('date', { ascending: false })
            .limit(parseInt(limit));

        if (error) throw error;

        res.json({
            success: true,
            records
        });

    } catch (error) {
        console.error('Error fetching recent records:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
