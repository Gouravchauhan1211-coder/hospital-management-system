-- ============================================================
-- HOSPITAL MANAGEMENT SYSTEM - SUPABASE DATABASE SCHEMA
-- Run this in your Supabase SQL Editor
-- ============================================================

-- ============================================================
-- 1. PROFILES TABLE (Base user information)
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL DEFAULT 'patient' 
        CHECK (role IN ('patient', 'doctor', 'mediator')),
    full_name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(20),
    avatar_url TEXT,
    date_of_birth DATE,
    gender VARCHAR(20),
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile"
    ON profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Doctors can view other doctor profiles" ON profiles;
CREATE POLICY "Doctors can view other doctor profiles"
    ON profiles FOR SELECT USING (
        EXISTS (SELECT 1 FROM doctors WHERE id = auth.uid()) 
        OR auth.uid() = id
    );

DROP POLICY IF EXISTS "Mediators can view all profiles" ON profiles;
CREATE POLICY "Mediators can view all profiles"
    ON profiles FOR SELECT USING (
        EXISTS (SELECT 1 FROM mediators WHERE id = auth.uid())
    );

DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
CREATE POLICY "Users can insert their own profile"
    ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update their own profile"
    ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE INDEX IF NOT EXISTS profiles_role_idx ON profiles(role);

-- ============================================================
-- 2. DOCTORS TABLE
-- NOTE: Basic info (full_name, phone, address, date_of_birth, gender, avatar_url) 
-- is stored in the profiles table. Only doctor-specific fields are here.
-- ============================================================
CREATE TABLE IF NOT EXISTS doctors (
    id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    specialization VARCHAR(100),
    qualifications TEXT,
    experience_years INTEGER DEFAULT 0,
    consultation_fee DECIMAL(10,2) DEFAULT 0,
    languages TEXT,
    location VARCHAR(255),
    bio TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    is_available BOOLEAN DEFAULT TRUE,
    rating DECIMAL(3,2) DEFAULT 0,
    total_reviews INTEGER DEFAULT 0,
    avg_consultation_minutes INTEGER DEFAULT 15,
    availability JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for doctors by specialization and availability for faster queries
CREATE INDEX IF NOT EXISTS doctors_specialization_idx ON doctors(specialization);
CREATE INDEX IF NOT EXISTS doctors_available_idx ON doctors(is_available) WHERE is_available = true;

ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Doctors are viewable by everyone" ON doctors;
CREATE POLICY "Public can view verified doctors"
    ON doctors FOR SELECT USING (is_verified = true);

DROP POLICY IF EXISTS "Doctors can insert their own profile" ON doctors;
CREATE POLICY "Doctors can insert their own profile"
    ON doctors FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Doctors can update their own profile" ON doctors;
CREATE POLICY "Doctors can update their own profile"
    ON doctors FOR UPDATE USING (auth.uid() = id);

-- ============================================================
-- 3. PATIENTS TABLE
-- NOTE: Basic info (full_name, phone, address, date_of_birth, gender, avatar_url) 
-- is stored in the profiles table. Only patient-specific medical fields are here.
-- ============================================================
CREATE TABLE IF NOT EXISTS patients (
    id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    blood_group VARCHAR(5),
    allergies TEXT,
    medical_conditions TEXT,
    current_medications TEXT,
    emergency_contact JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE patients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Patients can view own data" ON patients;
CREATE POLICY "Patients can view own data"
    ON patients FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Patients can insert their own profile" ON patients;
CREATE POLICY "Patients can insert their own profile"
    ON patients FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Patients can update their own profile" ON patients;
CREATE POLICY "Patients can update their own profile"
    ON patients FOR UPDATE USING (auth.uid() = id);

-- ============================================================
-- 4. MEDIATORS TABLE (Admin/Staff)
-- ============================================================
CREATE TABLE IF NOT EXISTS mediators (
    id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    department VARCHAR(100),
    position VARCHAR(100),
    branch_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE mediators ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Mediators can view own data" ON mediators;
CREATE POLICY "Mediators can view own data"
    ON mediators FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Mediators can insert their own profile" ON mediators;
CREATE POLICY "Mediators can insert their own profile"
    ON mediators FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Mediators can update their own profile" ON mediators;
CREATE POLICY "Mediators can update their own profile"
    ON mediators FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Mediators can delete their own profile" ON mediators;
CREATE POLICY "Mediators can delete their own profile"
    ON mediators FOR DELETE USING (auth.uid() = id);

-- ============================================================
-- 5. APPOINTMENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    patient_name VARCHAR(255),
    doctor_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    doctor_name VARCHAR(255),
    specialization VARCHAR(100),
    date DATE NOT NULL,
    time VARCHAR(20) NOT NULL,
    mode VARCHAR(20) DEFAULT 'offline',
    symptoms TEXT,
    amount DECIMAL(10,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pending' 
        CHECK (status IN ('pending', 'accepted', 'rejected', 'completed', 'cancelled', 'rescheduled', 'no-show', 'confirmed')),
    payment_status VARCHAR(20) DEFAULT 'pending'
        CHECK (payment_status IN ('pending', 'paid', 'refunded')),
    notes TEXT,
    idempotency_key VARCHAR(100) UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Patients can view their own appointments
DROP POLICY IF EXISTS "Patients can view own appointments" ON appointments;
CREATE POLICY "Patients can view own appointments"
    ON appointments FOR SELECT USING (auth.uid() = patient_id);

-- Doctors can view their appointments
DROP POLICY IF EXISTS "Doctors can view own appointments" ON appointments;
CREATE POLICY "Doctors can view own appointments"
    ON appointments FOR SELECT USING (auth.uid() = doctor_id);

-- Mediators can view all appointments
DROP POLICY IF EXISTS "Mediators can view all appointments" ON appointments;
CREATE POLICY "Mediators can view all appointments"
    ON appointments FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'mediator')
    );

-- Patients can insert appointments
DROP POLICY IF EXISTS "Patients can create appointments" ON appointments;
CREATE POLICY "Patients can create appointments"
    ON appointments FOR INSERT WITH CHECK (auth.uid() = patient_id);

-- Doctors and mediators can update appointments
DROP POLICY IF EXISTS "Doctors can update own appointments" ON appointments;
CREATE POLICY "Doctors can update own appointments"
    ON appointments FOR UPDATE USING (auth.uid() = doctor_id);

DROP POLICY IF EXISTS "Mediators can update appointments" ON appointments;
CREATE POLICY "Mediators can update appointments"
    ON appointments FOR UPDATE USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'mediator')
    );

CREATE INDEX IF NOT EXISTS appointments_patient_idx ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS appointments_doctor_idx ON appointments(doctor_id);
CREATE INDEX IF NOT EXISTS appointments_date_idx ON appointments(date);

-- Additional indexes for better query performance and time complexity optimization
CREATE INDEX IF NOT EXISTS appointments_status_idx ON appointments(status);
CREATE INDEX IF NOT EXISTS appointments_patient_date_idx ON appointments(patient_id, date);
CREATE INDEX IF NOT EXISTS appointments_doctor_date_idx ON appointments(doctor_id, date);
CREATE INDEX IF NOT EXISTS appointments_created_idx ON appointments(created_at DESC);

-- ============================================================
-- 6. MEDICAL RECORDS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS medical_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    doctor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    record_type VARCHAR(50),
    title VARCHAR(255),
    description TEXT,
    file_url TEXT,
    record_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE medical_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Patients can view own records" ON medical_records;
CREATE POLICY "Patients can view own records"
    ON medical_records FOR SELECT USING (auth.uid() = patient_id);

DROP POLICY IF EXISTS "Doctors can view patient records" ON medical_records;
CREATE POLICY "Doctors can view patient records"
    ON medical_records FOR SELECT USING (auth.uid() = doctor_id);

DROP POLICY IF EXISTS "Patients can insert own records" ON medical_records;
CREATE POLICY "Patients can insert own records"
    ON medical_records FOR INSERT WITH CHECK (auth.uid() = patient_id);

CREATE INDEX IF NOT EXISTS medical_records_patient_idx ON medical_records(patient_id);

-- ============================================================
-- 7. PRESCRIPTIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS prescriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    doctor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
    medications JSONB DEFAULT '[]',
    notes TEXT,
    valid_until DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Patients can view own prescriptions" ON prescriptions;
CREATE POLICY "Patients can view own prescriptions"
    ON prescriptions FOR SELECT USING (auth.uid() = patient_id);

DROP POLICY IF EXISTS "Doctors can view own prescriptions" ON prescriptions;
CREATE POLICY "Doctors can view own prescriptions"
    ON prescriptions FOR SELECT USING (auth.uid() = doctor_id);

DROP POLICY IF EXISTS "Doctors can create prescriptions" ON prescriptions;
CREATE POLICY "Doctors can create prescriptions"
    ON prescriptions FOR INSERT WITH CHECK (auth.uid() = doctor_id);

CREATE INDEX IF NOT EXISTS prescriptions_patient_idx ON prescriptions(patient_id);
CREATE INDEX IF NOT EXISTS prescriptions_doctor_idx ON prescriptions(doctor_id);

-- ============================================================
-- 8. APPOINTMENT QUEUE TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS appointment_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE UNIQUE,  -- Added UNIQUE to prevent duplicates
    doctor_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    token_number VARCHAR(20) NOT NULL,
    status VARCHAR(20) DEFAULT 'waiting'
        CHECK (status IN ('waiting', 'in-progress', 'completed')),
    consultation_started_at TIMESTAMP WITH TIME ZONE,
    consultation_completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (appointment_id)  -- Ensure each appointment has only one queue entry
);

ALTER TABLE appointment_queue ENABLE ROW LEVEL SECURITY;

-- Patients can view their own queue entries
DROP POLICY IF EXISTS "Patients can view own queue" ON appointment_queue;
CREATE POLICY "Patients can view own queue"
    ON appointment_queue FOR SELECT USING (auth.uid() = patient_id);

-- Doctors can view their queue
DROP POLICY IF EXISTS "Doctors can view their queue" ON appointment_queue;
CREATE POLICY "Doctors can view their queue"
    ON appointment_queue FOR SELECT USING (auth.uid() = doctor_id);

-- Mediators can view all queue entries
DROP POLICY IF EXISTS "Mediators can view all queue" ON appointment_queue;
CREATE POLICY "Mediators can view all queue"
    ON appointment_queue FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'mediator')
    );

-- Patients can insert queue entries
DROP POLICY IF EXISTS "Patients can insert queue entry" ON appointment_queue;
CREATE POLICY "Patients can insert queue entry"
    ON appointment_queue FOR INSERT WITH CHECK (auth.uid() = patient_id);

-- Doctors and mediators can update queue
DROP POLICY IF EXISTS "Doctors can update their queue" ON appointment_queue;
CREATE POLICY "Doctors can update their queue"
    ON appointment_queue FOR UPDATE USING (auth.uid() = doctor_id);

DROP POLICY IF EXISTS "Mediators can update queue" ON appointment_queue;
CREATE POLICY "Mediators can update queue"
    ON appointment_queue FOR UPDATE USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'mediator')
    );

CREATE INDEX IF NOT EXISTS appointment_queue_appointment_idx ON appointment_queue(appointment_id);
CREATE INDEX IF NOT EXISTS appointment_queue_doctor_idx ON appointment_queue(doctor_id);
CREATE INDEX IF NOT EXISTS appointment_queue_patient_idx ON appointment_queue(patient_id);
CREATE INDEX IF NOT EXISTS appointment_queue_status_idx ON appointment_queue(status);

-- ============================================================
-- 9. WALK-IN QUEUE TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS walk_in_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    patient_name VARCHAR(255) NOT NULL,
    age INTEGER,
    reason TEXT,
    doctor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    doctor_name VARCHAR(255),
    token VARCHAR(20) NOT NULL,
    priority INTEGER DEFAULT 0 CHECK (priority >= 0 AND priority <= 10),
    status VARCHAR(20) DEFAULT 'waiting'
        CHECK (status IN ('waiting', 'in-progress', 'completed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE walk_in_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Queue is viewable by everyone" ON walk_in_queue;
DROP POLICY IF EXISTS "Patients can view own walk-in queue" ON walk_in_queue;
CREATE POLICY "Patients can view own walk-in queue"
    ON walk_in_queue FOR SELECT USING (
        patient_id = auth.uid() 
        OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'mediator')
        OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'doctor')
    );

DROP POLICY IF EXISTS "Mediators can insert queue entries" ON walk_in_queue;
CREATE POLICY "Mediators can insert queue entries"
    ON walk_in_queue FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'mediator')
    );

DROP POLICY IF EXISTS "Mediators can update queue" ON walk_in_queue;
CREATE POLICY "Mediators can update queue"
    ON walk_in_queue FOR UPDATE USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'mediator')
    );

CREATE INDEX IF NOT EXISTS walk_in_queue_status_idx ON walk_in_queue(status);
CREATE INDEX IF NOT EXISTS walk_in_queue_doctor_idx ON walk_in_queue(doctor_id);

-- ============================================================
-- 9. DEPARTMENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE departments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Departments are viewable by everyone" ON departments;
CREATE POLICY "Departments are viewable by everyone"
    ON departments FOR SELECT USING (true);

DROP POLICY IF EXISTS "Mediators can manage departments" ON departments;
CREATE POLICY "Mediators can manage departments"
    ON departments FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'mediator')
    );

-- Index for faster department lookups
CREATE INDEX IF NOT EXISTS departments_name_idx ON departments(name);
CREATE INDEX IF NOT EXISTS departments_active_idx ON departments(is_active) WHERE is_active = true;

-- ============================================================
-- 10. REVIEWS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    patient_name VARCHAR(255),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Reviews are viewable by everyone" ON reviews;
CREATE POLICY "Reviews are viewable by everyone"
    ON reviews FOR SELECT USING (true);

DROP POLICY IF EXISTS "Patients can create reviews" ON reviews;
CREATE POLICY "Patients can create reviews"
    ON reviews FOR INSERT WITH CHECK (auth.uid() = patient_id);

CREATE INDEX IF NOT EXISTS reviews_doctor_idx ON reviews(doctor_id);

-- ============================================================
-- 11. NOTIFICATIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    type VARCHAR(50),
    title VARCHAR(255),
    message TEXT,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
CREATE POLICY "Users can view own notifications"
    ON notifications FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
CREATE POLICY "Users can update own notifications"
    ON notifications FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert notifications" ON notifications;
CREATE POLICY "Users can insert notifications"
    ON notifications FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS notifications_user_idx ON notifications(user_id);
CREATE INDEX IF NOT EXISTS notifications_read_idx ON notifications(read);

-- ============================================================
-- INSERT SAMPLE DEPARTMENTS
-- ============================================================
INSERT INTO departments (name, description) VALUES
    ('Cardiology', 'Heart and cardiovascular system'),
    ('Dermatology', 'Skin, hair, and nails'),
    ('Neurology', 'Brain and nervous system'),
    ('Orthopedics', 'Bones, joints, and muscles'),
    ('Pediatrics', 'Children healthcare'),
    ('General Medicine', 'General health issues'),
    ('Ophthalmology', 'Eye care'),
    ('ENT', 'Ear, nose, and throat');

-- ============================================================
-- FUNCTION TO AUTO-CREATE PROFILE ON SIGNUP
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert into profiles
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'role', 'patient')
    );
    
    -- Insert into role-specific table
    IF COALESCE(NEW.raw_user_meta_data->>'role', 'patient') = 'patient' THEN
        INSERT INTO public.patients (id) VALUES (NEW.id);
    ELSIF COALESCE(NEW.raw_user_meta_data->>'role', 'patient') = 'doctor' THEN
        INSERT INTO public.doctors (id) VALUES (NEW.id);
    ELSIF COALESCE(NEW.raw_user_meta_data->>'role', 'patient') = 'mediator' THEN
        INSERT INTO public.mediators (id) VALUES (NEW.id);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================-- UNIQUE CONSTRAINTS TO PREVENT DOUBLE BOOKING-- ============================================================

DO $
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'unique_doctor_slot'
    ) THEN
        ALTER TABLE appointments 
        ADD CONSTRAINT unique_doctor_slot UNIQUE (doctor_id, date, time);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'unique_patient_slot'
    ) THEN
        ALTER TABLE appointments 
        ADD CONSTRAINT unique_patient_slot UNIQUE (patient_id, date, time);
    END IF;
END$;

-- ============================================================
-- PERFORMANCE INDEXES
-- ============================================================

-- Additional indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_date_time_status
ON appointments(doctor_id, date, time, status);

CREATE INDEX IF NOT EXISTS idx_appointments_patient_date_status
ON appointments(patient_id, date, status);

CREATE INDEX IF NOT EXISTS idx_walkin_queue_doctor_date
ON walk_in_queue(doctor_id, created_at);

CREATE INDEX IF NOT EXISTS walk_in_queue_doctor_status_idx ON walk_in_queue(doctor_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS appointment_queue_consultation_started_idx 
ON appointment_queue(consultation_started_at);

CREATE INDEX IF NOT EXISTS appointment_queue_consultation_completed_idx 
ON appointment_queue(consultation_completed_at);

CREATE INDEX IF NOT EXISTS appointment_queue_doctor_status_idx ON appointment_queue(doctor_id, status, created_at);

CREATE INDEX IF NOT EXISTS appointment_queue_patient_status_idx ON appointment_queue(patient_id, status);

-- ============================================================
-- TOKEN GENERATION FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION generate_appointment_token(
    p_doctor_id UUID,
    p_patient_id UUID,
    p_appointment_id UUID
)
RETURNS TABLE(token_number INTEGER, queue_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
AS $
DECLARE
    v_token INTEGER;
    v_queue_id UUID;
    v_date DATE := CURRENT_DATE;
BEGIN
    LOCK TABLE appointment_queue IN EXCLUSIVE MODE;
    
    SELECT COALESCE(MAX(token_number), 0) + 1 INTO v_token
    FROM appointment_queue 
    WHERE doctor_id = p_doctor_id 
      AND DATE(created_at) = v_date;
    
    INSERT INTO appointment_queue (
        appointment_id, doctor_id, patient_id, token_number, status, created_at
    ) VALUES (
        p_appointment_id, p_doctor_id, p_patient_id, v_token, 'waiting', NOW()
    )
    RETURNING id INTO v_queue_id;
    
    RETURN QUERY SELECT v_token, v_queue_id;
END;
$;

-- ============================================================
-- ATOMIC APPOINTMENT BOOKING FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION book_appointment_atomic(
    p_patient_id UUID, p_doctor_id UUID, p_date DATE, p_time VARCHAR(20),
    p_amount DECIMAL(10,2), p_symptoms TEXT, p_mode VARCHAR(20) DEFAULT 'offline',
    p_payment_id VARCHAR(100) DEFAULT NULL
)
RETURNS TABLE(appointment_id UUID, success BOOLEAN, error_message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $
DECLARE
    v_appointment_id UUID;
    v_slot_available BOOLEAN;
BEGIN
    SELECT COUNT(*) = 0 INTO v_slot_available
    FROM appointments
    WHERE doctor_id = p_doctor_id AND date = p_date AND time = p_time
    AND status IN ('pending', 'confirmed', 'accepted');
    
    IF NOT v_slot_available THEN
        RETURN QUERY SELECT NULL, FALSE, 'Time slot is no longer available';
        RETURN;
    END IF;
    
    BEGIN
        INSERT INTO appointments (patient_id, doctor_id, date, time, amount, symptoms, mode, status, payment_status, notes)
        VALUES (p_patient_id, p_doctor_id, p_date, p_time, p_amount, p_symptoms, p_mode, 'confirmed',
                CASE WHEN p_payment_id IS NOT NULL THEN 'paid' ELSE 'pending' END, p_payment_id)
        RETURNING id INTO v_appointment_id;
        RETURN QUERY SELECT v_appointment_id, TRUE, NULL;
    EXCEPTION WHEN unique_violation THEN
        RETURN QUERY SELECT NULL, FALSE, 'Time slot was just booked by another patient';
    END;
END;
$;

-- ============================================================
-- IDEMPOTENT APPOINTMENT CREATION FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION create_appointment_idempotent(
    p_idempotency_key VARCHAR(100), p_patient_id UUID, p_doctor_id UUID,
    p_date DATE, p_time VARCHAR(20), p_amount DECIMAL(10,2), p_symptoms TEXT,
    p_mode VARCHAR(20) DEFAULT 'offline'
)
RETURNS TABLE(appointment_id UUID, success BOOLEAN, error_message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $
DECLARE
    v_appointment_id UUID;
BEGIN
    SELECT id INTO v_appointment_id FROM appointments WHERE idempotency_key = p_idempotency_key;
    IF FOUND THEN
        RETURN QUERY SELECT v_appointment_id, TRUE, NULL;
        RETURN;
    END IF;
    RETURN QUERY SELECT * FROM book_appointment_atomic(p_patient_id, p_doctor_id, p_date, p_time, p_amount, p_symptoms, p_mode, p_idempotency_key);
END;
$;

-- ============================================================
-- SHARED RECORDS TABLE (For sharing records between patients and doctors)
-- ============================================================
CREATE TABLE IF NOT EXISTS shared_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    record_id UUID NOT NULL,
    record_type VARCHAR(50) NOT NULL,
    patient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    recipient_type VARCHAR(20) NOT NULL,
    recipient_name VARCHAR(255),
    share_note TEXT,
    access_token VARCHAR(255),
    expires_at TIMESTAMP WITH TIME ZONE,
    revoked BOOLEAN DEFAULT FALSE,
    revoked_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE shared_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Patients can view their shared records" ON shared_records;
CREATE POLICY "Patients can view their shared records"
    ON shared_records FOR SELECT USING (auth.uid() = patient_id);

DROP POLICY IF EXISTS "Recipients can view shared records" ON shared_records;
CREATE POLICY "Recipients can view shared records"
    ON shared_records FOR SELECT USING (auth.uid() = recipient_id);

DROP POLICY IF EXISTS "Patients can insert shared records" ON shared_records;
CREATE POLICY "Patients can insert shared records"
    ON shared_records FOR INSERT WITH CHECK (auth.uid() = patient_id);

-- ============================================================
-- STORAGE BUCKET FOR FILES
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('hospital-files', 'hospital-files', true)
ON CONFLICT (id) DO NOTHING;

-- View: Anyone can view public files
DROP POLICY IF EXISTS "Anyone can view hospital files" ON storage.objects;
CREATE POLICY "Anyone can view hospital files"
    ON storage.objects FOR SELECT USING (bucket_id = 'hospital-files');

-- Upload: Only authenticated users, files go to user-specific folder
DROP POLICY IF EXISTS "Authenticated users can upload hospital files" ON storage.objects;
CREATE POLICY "Authenticated users can upload hospital files"
    ON storage.objects FOR INSERT WITH CHECK (
        bucket_id = 'hospital-files' 
        AND auth.role() = 'authenticated'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- Delete: Only owner can delete their files
DROP POLICY IF EXISTS "Users can delete their own files" ON storage.objects;
CREATE POLICY "Users can delete their own files"
    ON storage.objects FOR DELETE USING (
        bucket_id = 'hospital-files'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- ============================================================
-- COMPLETE!
-- ============================================================
