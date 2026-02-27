-- ============================================================
-- HOSPITAL MANAGEMENT SYSTEM - ADVANCED QUEUE SYSTEM
-- PostgreSQL Schema
-- ============================================================

-- 1. DEPARTMENTS
CREATE TABLE IF NOT EXISTS departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20) UNIQUE NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    color VARCHAR(7),
    
    parent_department_id UUID REFERENCES departments(id),
    head_doctor_id UUID REFERENCES doctors(id),
    
    default_consultation_minutes INTEGER DEFAULT 15,
    allow_online_booking BOOLEAN DEFAULT TRUE,
    is_emergency BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. BRANCHES
CREATE TABLE IF NOT EXISTS branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20) UNIQUE NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(50) NOT NULL,
    state VARCHAR(50) NOT NULL,
    pincode VARCHAR(10) NOT NULL,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    
    phone VARCHAR(20),
    email VARCHAR(100),
    whatsapp VARCHAR(20),
    
    opening_time TIME DEFAULT '09:00:00',
    closing_time TIME DEFAULT '18:00:00',
    working_days JSONB DEFAULT '[1,2,3,4,5]',
    
    is_headquarters BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. DOCTOR-DEPARTMENT (Many-to-Many)
CREATE TABLE IF NOT EXISTS doctor_departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id UUID REFERENCES doctors(id) ON DELETE CASCADE,
    department_id UUID REFERENCES departments(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(doctor_id, department_id)
);

-- 4. BRANCH SETTINGS
CREATE TABLE IF NOT EXISTS branch_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
    
    token_prefix VARCHAR(10) DEFAULT 'OPD',
    reset_token_daily BOOLEAN DEFAULT TRUE,
    max_queue_per_doctor INTEGER DEFAULT 50,
    
    display_refresh_seconds INTEGER DEFAULT 5,
    show_wait_time BOOLEAN DEFAULT TRUE,
    
    enable_sms BOOLEAN DEFAULT TRUE,
    enable_whatsapp BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(branch_id)
);

-- 5. DOCTOR ROOMS
CREATE TABLE IF NOT EXISTS doctor_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id UUID REFERENCES doctors(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
    
    room_number VARCHAR(20) NOT NULL,
    opd_number VARCHAR(20),
    floor VARCHAR(20),
    building VARCHAR(50),
    
    day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6),
    start_time TIME,
    end_time TIME,
    
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(doctor_id, branch_id, day_of_week)
);

-- 6. QUEUE TOKENS (Main Queue Table)
CREATE TABLE IF NOT EXISTS queue_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Token identification
    token_number VARCHAR(20) NOT NULL,
    token_prefix VARCHAR(10),
    
    -- Relationships
    branch_id UUID REFERENCES branches(id),
    department_id UUID REFERENCES departments(id),
    doctor_id UUID REFERENCES doctors(id),
    patient_id UUID REFERENCES patients(id),
    appointment_id UUID REFERENCES appointments(id),
    
    -- Queue details
    queue_type VARCHAR(20) DEFAULT 'walk_in',
    priority VARCHAR(20) DEFAULT 'normal',
    
    -- Status
    status VARCHAR(30) DEFAULT 'waiting',
    
    -- Timing
    token_generated_at TIMESTAMP DEFAULT NOW(),
    called_at TIMESTAMP,
    consultation_started_at TIMESTAMP,
    consultation_completed_at TIMESTAMP,
    
    -- Wait time
    estimated_wait_minutes INTEGER,
    actual_wait_minutes INTEGER,
    
    -- Room assignment
    room_number VARCHAR(20),
    opd_number VARCHAR(20),
    
    -- Notes
    notes TEXT,
    cancel_reason TEXT,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 7. QUEUE EVENTS (Audit Log)
CREATE TABLE IF NOT EXISTS queue_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token_id UUID REFERENCES queue_tokens(id),
    
    event_type VARCHAR(30) NOT NULL,
    old_status VARCHAR(30),
    new_status VARCHAR(30),
    
    triggered_by UUID,
    reason TEXT,
    
    metadata JSONB,
    
    created_at TIMESTAMP DEFAULT NOW()
);

-- 8. DOCTOR STATISTICS
CREATE TABLE IF NOT EXISTS doctor_statistics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id UUID REFERENCES doctors(id) ON DELETE CASCADE,
    branch_id UUID,
    
    date DATE NOT NULL,
    
    -- Counts
    total_patients INTEGER DEFAULT 0,
    completed_consultations INTEGER DEFAULT 0,
    cancelled_appointments INTEGER DEFAULT 0,
    no_shows INTEGER DEFAULT 0,
    
    -- Times
    avg_wait_time_minutes DECIMAL(10,2),
    avg_consultation_time_minutes DECIMAL(10,2),
    total_consultation_minutes INTEGER DEFAULT 0,
    
    -- Revenue
    total_earnings DECIMAL(10,2) DEFAULT 0,
    consultation_fees_collected DECIMAL(10,2) DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(doctor_id, branch_id, date)
);

-- 9. PATIENT PRIORITIES
CREATE TYPE priority_level AS ENUM ('emergency', 'high', 'normal', 'follow-up');

CREATE TABLE IF NOT EXISTS patient_priorities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES patients(id),
    
    priority priority_level DEFAULT 'normal',
    priority_reason TEXT,
    
    valid_from DATE DEFAULT CURRENT_DATE,
    valid_until DATE,
    
    assigned_by UUID,
    created_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(patient_id, valid_from)
);

-- 10. PATIENT FLAGS
CREATE TABLE IF NOT EXISTS patient_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES patients(id) UNIQUE,
    
    no_show_count INTEGER DEFAULT 0,
    no_show_last_30_days INTEGER DEFAULT 0,
    no_show_last_90_days INTEGER DEFAULT 0,
    
    requires_prepayment BOOLEAN DEFAULT FALSE,
    limited_booking BOOLEAN DEFAULT FALSE,
    max_future_appointments INTEGER DEFAULT 3,
    
    warning_level VARCHAR(20) DEFAULT 'none',
    warning_message TEXT,
    
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 11. OVERBOOKING RULES
CREATE TABLE IF NOT EXISTS overbooking_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID REFERENCES branches(id),
    doctor_id UUID REFERENCES doctors(id),
    
    max_overbook_per_hour INTEGER DEFAULT 2,
    max_overbook_per_day INTEGER DEFAULT 10,
    allow_emergency_overbook BOOLEAN DEFAULT TRUE,
    buffer_minutes INTEGER DEFAULT 5,
    
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 12. NOTIFICATION QUEUE
CREATE TABLE IF NOT EXISTS notification_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    channels JSONB DEFAULT '["in_app"]',
    status VARCHAR(20) DEFAULT 'pending',
    
    sent_at TIMESTAMP,
    delivered_at TIMESTAMP,
    read_at TIMESTAMP,
    failure_reason TEXT,
    
    data JSONB,
    priority INTEGER DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT NOW(),
    scheduled_for TIMESTAMP,
    expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '24 hours')
);

-- 13. CURRENT ROOM ASSIGNMENTS
CREATE TABLE IF NOT EXISTS current_room_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID REFERENCES branches(id),
    department_id UUID REFERENCES departments(id),
    doctor_id UUID REFERENCES doctors(id),
    
    room_number VARCHAR(20),
    opd_number VARCHAR(20),
    display_on_board BOOLEAN DEFAULT TRUE,
    assigned_date DATE DEFAULT CURRENT_DATE,
    assigned_at TIMESTAMP DEFAULT NOW(),
    valid_until TIMESTAMP,
    
    UNIQUE(branch_id, doctor_id, assigned_date)
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_queue_tokens_doctor_status 
    ON queue_tokens(doctor_id, status) 
    WHERE status IN ('waiting', 'called', 'in_consultation');

CREATE INDEX IF NOT EXISTS idx_queue_tokens_branch_date 
    ON queue_tokens(branch_id, DATE(token_generated_at));

CREATE INDEX IF NOT EXISTS idx_queue_tokens_patient 
    ON queue_tokens(patient_id);

CREATE INDEX IF NOT EXISTS idx_doctor_statistics_date 
    ON doctor_statistics(date);

CREATE INDEX IF NOT EXISTS idx_notification_queue_status 
    ON notification_queue(status) 
    WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_queue_events_token 
    ON queue_events(token_id);

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Function to generate token number
CREATE OR REPLACE FUNCTION generate_token_number(
    p_branch_id UUID,
    p_department_id UUID,
    p_doctor_id UUID,
    p_date DATE
) RETURNS VARCHAR AS $$
DECLARE
    v_prefix VARCHAR(10);
    v_dept_code VARCHAR(10);
    v_sequence INTEGER;
    v_token_number VARCHAR(20);
BEGIN
    -- Get department code
    SELECT code INTO v_dept_code 
    FROM departments 
    WHERE id = p_department_id;
    
    -- Get token prefix from branch settings
    SELECT COALESCE(token_prefix, 'OPD') INTO v_prefix
    FROM branch_settings
    WHERE branch_id = p_branch_id;
    
    -- Get next sequence for this doctor/date
    SELECT COALESCE(MAX(
        CAST(SUBSTRING(token_number FROM '[0-9]+$') AS INTEGER)
    ), 0) + 1 INTO v_sequence
    FROM queue_tokens
    WHERE doctor_id = p_doctor_id
        AND DATE(token_generated_at) = p_date;
    
    -- Generate token number
    v_token_number := v_prefix || '-' || v_dept_code || '-' 
                   || LPAD(v_sequence::TEXT, 3, '0');
    
    RETURN v_token_number;
END;
$$ LANGUAGE plpgsql;

-- Function to update queue token status
CREATE OR REPLACE FUNCTION update_queue_status(
    p_token_id UUID,
    p_new_status VARCHAR(30),
    p_triggered_by UUID DEFAULT NULL,
    p_reason TEXT DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
    v_old_status VARCHAR(30);
    v_token RECORD;
BEGIN
    -- Get current token
    SELECT * INTO v_token FROM queue_tokens WHERE id = p_token_id;
    v_old_status := v_token.status;
    
    -- Update token status
    UPDATE queue_tokens SET
        status = p_new_status,
        called_at = CASE WHEN p_new_status = 'called' THEN NOW() ELSE called_at END,
        consultation_started_at = CASE WHEN p_new_status = 'in_consultation' THEN NOW() ELSE consultation_started_at END,
        consultation_completed_at = CASE WHEN p_new_status = 'completed' THEN NOW() ELSE consultation_completed_at END,
        updated_at = NOW()
    WHERE id = p_token_id;
    
    -- Calculate actual wait time
    IF p_new_status = 'in_consultation' AND v_token.called_at IS NOT NULL THEN
        UPDATE queue_tokens SET
            actual_wait_minutes = EXTRACT(EPOCH FROM (NOW() - v_token.called_at))/60
        WHERE id = p_token_id;
    END IF;
    
    -- Insert event
    INSERT INTO queue_events (
        token_id, event_type, old_status, new_status, 
        triggered_by, reason
    ) VALUES (
        p_token_id, 
        CASE 
            WHEN p_new_status = 'waiting' THEN 'token_generated'
            WHEN p_new_status = 'called' THEN 'called'
            WHEN p_new_status = 'in_consultation' THEN 'started'
            WHEN p_new_status = 'completed' THEN 'completed'
            WHEN p_new_status = 'cancelled' THEN 'cancelled'
            WHEN p_new_status = 'no_show' THEN 'no_show'
        END,
        v_old_status, p_new_status, p_triggered_by, p_reason
    );
    
    -- Update doctor statistics
    IF p_new_status = 'completed' THEN
        INSERT INTO doctor_statistics (
            doctor_id, branch_id, date, completed_consultations
        ) VALUES (
            v_token.doctor_id, v_token.branch_id, CURRENT_DATE, 1
        ) ON CONFLICT (doctor_id, branch_id, date) 
        DO UPDATE SET 
            completed_consultations = doctor_statistics.completed_consultations + 1;
    END IF;
    
    IF p_new_status = 'no_show' THEN
        INSERT INTO doctor_statistics (
            doctor_id, branch_id, date, no_shows
        ) VALUES (
            v_token.doctor_id, v_token.branch_id, CURRENT_DATE, 1
        ) ON CONFLICT (doctor_id, branch_id, date) 
        DO UPDATE SET 
            no_shows = doctor_statistics.no_shows + 1;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Trigger for automatic no-show detection
CREATE OR REPLACE FUNCTION check_no_show()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'called' AND OLD.status = 'called' THEN
        IF NEW.called_at < NOW() - INTERVAL '15 minutes' THEN
            PERFORM update_queue_status(NEW.id, 'no_show', NULL, 'Patient did not arrive after being called');
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_no_show
    AFTER UPDATE ON queue_tokens
    FOR EACH ROW
    EXECUTE FUNCTION check_no_show();

-- ============================================================
-- SEED DATA
-- ============================================================

-- Insert default departments
INSERT INTO departments (name, code, description, icon, color, display_order) VALUES
('Emergency', 'EMER', 'Emergency and Trauma Care', 'AlertTriangle', '#EF4444', 1),
('Cardiology', 'CARD', 'Heart and Cardiovascular', 'Heart', '#EF4444', 2),
('Orthopedics', 'ORTHO', 'Bone and Joint Care', 'Activity', '#F59E0B', 3),
('Dermatology', 'DERM', 'Skin and Hair Care', 'Sparkles', '#8B5CF6', 4),
('Neurology', 'NEURO', 'Brain and Nervous System', 'Brain', '#3B82F6', 5),
('Pediatrics', 'PEDIA', 'Child Healthcare', 'Baby', '#10B981', 6),
('General Medicine', 'GEN', 'General Health Issues', 'Stethoscope', '#0EA5E9', 7),
('Dental', 'DENT', 'Dental Care', 'Smile', '#EC4899', 8),
('Ophthalmology', 'OPHTH', 'Eye Care', 'Eye', '#06B6D4', 9),
('ENT', 'ENT', 'Ear, Nose and Throat', 'Ear', '#14B8A6', 10)
ON CONFLICT (code) DO NOTHING;

-- Insert default branch (headquarters)
INSERT INTO branches (name, code, address, city, state, pincode, phone, email, is_headquarters) VALUES
('Main Hospital', 'HQ', '123 Medical Center Road', 'New Delhi', 'Delhi', '110001', '+91-11-45678900', 'info@hospital.com', true)
ON CONFLICT (code) DO NOTHING;

-- Insert branch settings for HQ
INSERT INTO branch_settings (branch_id, token_prefix, max_queue_per_doctor, display_refresh_seconds)
SELECT id, 'OPD', 50, 5 FROM branches WHERE code = 'HQ'
ON CONFLICT (branch_id) DO NOTHING;
