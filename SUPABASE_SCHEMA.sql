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

DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
CREATE POLICY "Public profiles are viewable by everyone"
    ON profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
CREATE POLICY "Users can insert their own profile"
    ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update their own profile"
    ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE INDEX IF NOT EXISTS profiles_role_idx ON profiles(role);

-- ============================================================
-- 2. DOCTORS TABLE
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

ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Doctors are viewable by everyone" ON doctors;
CREATE POLICY "Doctors are viewable by everyone"
    ON doctors FOR SELECT USING (true);

DROP POLICY IF EXISTS "Doctors can insert their own profile" ON doctors;
CREATE POLICY "Doctors can insert their own profile"
    ON doctors FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Doctors can update their own profile" ON doctors;
CREATE POLICY "Doctors can update their own profile"
    ON doctors FOR UPDATE USING (auth.uid() = id);

-- ============================================================
-- 3. PATIENTS TABLE
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
        CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled', 'rescheduled', 'no-show')),
    payment_status VARCHAR(20) DEFAULT 'pending'
        CHECK (payment_status IN ('pending', 'paid', 'refunded')),
    notes TEXT,
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
-- 8. WALK-IN QUEUE TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS walk_in_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_name VARCHAR(255) NOT NULL,
    age INTEGER,
    reason TEXT,
    doctor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    doctor_name VARCHAR(255),
    token VARCHAR(20) NOT NULL,
    status VARCHAR(20) DEFAULT 'waiting'
        CHECK (status IN ('waiting', 'in-progress', 'completed', 'cancelled')),
    priority INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE walk_in_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Queue is viewable by everyone" ON walk_in_queue;
CREATE POLICY "Queue is viewable by everyone"
    ON walk_in_queue FOR SELECT USING (true);

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

DROP POLICY IF EXISTS "Anyone can view hospital files" ON storage.objects;
CREATE POLICY "Anyone can view hospital files"
    ON storage.objects FOR SELECT USING (bucket_id = 'hospital-files');

DROP POLICY IF EXISTS "Authenticated users can upload hospital files" ON storage.objects;
CREATE POLICY "Authenticated users can upload hospital files"
    ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'hospital-files' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can delete their own files" ON storage.objects;
CREATE POLICY "Users can delete their own files"
    ON storage.objects FOR DELETE USING (bucket_id = 'hospital-files');

-- ============================================================
-- COMPLETE!
-- ============================================================
