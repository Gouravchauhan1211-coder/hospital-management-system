-- ============================================================
-- MASTER SQL SCRIPT - RUN THIS FIRST
-- ============================================================
-- This script creates ALL required tables in the correct order
-- Run this in Supabase SQL Editor
-- ============================================================

-- ============================================================
-- STEP 1: PROFILES TABLE (Base user information)
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

CREATE POLICY "Public profiles are viewable by everyone"
    ON profiles FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile"
    ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
    ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE INDEX IF NOT EXISTS profiles_role_idx ON profiles(role);

-- ============================================================
-- STEP 2: DOCTORS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS doctors (
    id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    specialization VARCHAR(100),
    qualifications TEXT[],
    experience_years INTEGER DEFAULT 0,
    consultation_fee DECIMAL(10,2) DEFAULT 0,
    languages TEXT[] DEFAULT ARRAY['English'],
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

CREATE POLICY "Doctors are viewable by everyone"
    ON doctors FOR SELECT USING (true);

CREATE POLICY "Doctors can insert their own profile"
    ON doctors FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Doctors can update their own profile"
    ON doctors FOR UPDATE USING (auth.uid() = id);

-- ============================================================
-- STEP 3: PATIENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS patients (
    id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    blood_group VARCHAR(5),
    allergies TEXT[] DEFAULT ARRAY[]::TEXT[],
    medical_conditions TEXT[] DEFAULT ARRAY[]::TEXT[],
    current_medications TEXT[] DEFAULT ARRAY[]::TEXT[],
    emergency_contact JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE patients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patients can view own data"
    ON patients FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Patients can insert their own profile"
    ON patients FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Patients can update their own profile"
    ON patients FOR UPDATE USING (auth.uid() = id);

-- ============================================================
-- STEP 4: MEDIATORS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS mediators (
    id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    department VARCHAR(100),
    position VARCHAR(100),
    permissions JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE mediators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Mediators can view own data"
    ON mediators FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Mediators can insert their own profile"
    ON mediators FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Mediators can update their own profile"
    ON mediators FOR UPDATE USING (auth.uid() = id);

-- ============================================================
-- STEP 5: APPOINTMENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    patient_name VARCHAR(255),
    doctor_id UUID REFERENCES doctors(id) ON DELETE CASCADE,
    doctor_name VARCHAR(255),
    specialization VARCHAR(100),
    date DATE NOT NULL,
    time VARCHAR(20) NOT NULL,
    mode VARCHAR(20) DEFAULT 'offline' CHECK (mode IN ('offline', 'video', 'voice')),
    symptoms TEXT,
    notes TEXT,
    status VARCHAR(20) DEFAULT 'pending' 
        CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled', 'rescheduled', 'no_show')),
    payment_status VARCHAR(20) DEFAULT 'pending' 
        CHECK (payment_status IN ('pending', 'paid', 'refunded', 'failed')),
    payment_id VARCHAR(255),
    amount DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patients can view their own appointments"
    ON appointments FOR SELECT USING (auth.uid() = patient_id);

CREATE POLICY "Doctors can view their appointments"
    ON appointments FOR SELECT USING (auth.uid() = doctor_id);

CREATE POLICY "Patients can create appointments"
    ON appointments FOR INSERT WITH CHECK (auth.uid() = patient_id);

CREATE POLICY "Patients can update their appointments"
    ON appointments FOR UPDATE USING (auth.uid() = patient_id);

CREATE POLICY "Doctors can update their appointments"
    ON appointments FOR UPDATE USING (auth.uid() = doctor_id);

CREATE INDEX IF NOT EXISTS appointments_patient_idx ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS appointments_doctor_idx ON appointments(doctor_id);
CREATE INDEX IF NOT EXISTS appointments_date_idx ON appointments(date);

-- ============================================================
-- STEP 6: NOTIFICATIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    data JSONB DEFAULT '{}',
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
    ON notifications FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
    ON notifications FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications"
    ON notifications FOR INSERT WITH CHECK (true);

-- ============================================================
-- STEP 7: MESSAGE THREADS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS message_threads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id UUID REFERENCES doctors(id) ON DELETE CASCADE,
    doctor_name VARCHAR(255),
    doctor_avatar TEXT,
    last_message TEXT,
    last_message_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE message_threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patients can view their threads"
    ON message_threads FOR SELECT USING (auth.uid() = patient_id);

CREATE POLICY "Doctors can view their threads"
    ON message_threads FOR SELECT USING (auth.uid() = doctor_id);

CREATE POLICY "Patients can create threads"
    ON message_threads FOR INSERT WITH CHECK (auth.uid() = patient_id);

CREATE POLICY "Can update threads"
    ON message_threads FOR UPDATE 
    USING (auth.uid() = patient_id OR auth.uid() = doctor_id);

-- ============================================================
-- STEP 8: MESSAGES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id UUID REFERENCES message_threads(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    sender_type VARCHAR(20) NOT NULL CHECK (sender_type IN ('patient', 'doctor')),
    text TEXT NOT NULL,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Can view messages in your threads"
    ON messages FOR SELECT
    USING (thread_id IN (
        SELECT id FROM message_threads 
        WHERE patient_id = auth.uid() OR doctor_id = auth.uid()
    ));

CREATE POLICY "Can insert messages in your threads"
    ON messages FOR INSERT
    WITH CHECK (thread_id IN (
        SELECT id FROM message_threads 
        WHERE patient_id = auth.uid() OR doctor_id = auth.uid()
    ));

-- ============================================================
-- STEP 9: MEDICAL RECORDS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS medical_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id UUID REFERENCES doctors(id) ON DELETE SET NULL,
    doctor_name VARCHAR(255),
    title VARCHAR(255) NOT NULL,
    type VARCHAR(50) DEFAULT 'consultation'
        CHECK (type IN ('consultation', 'lab_result', 'prescription', 'imaging', 'report', 'other')),
    description TEXT,
    file_url TEXT,
    date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE medical_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patients can view their own records"
    ON medical_records FOR SELECT USING (auth.uid() = patient_id);

CREATE POLICY "Doctors can view records they created"
    ON medical_records FOR SELECT USING (auth.uid() = doctor_id);

CREATE POLICY "Patients can insert their own records"
    ON medical_records FOR INSERT WITH CHECK (auth.uid() = patient_id);

CREATE POLICY "Doctors can insert records"
    ON medical_records FOR INSERT WITH CHECK (auth.uid() = doctor_id);

-- ============================================================
-- STEP 10: REVIEWS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    patient_name VARCHAR(255),
    doctor_id UUID REFERENCES doctors(id) ON DELETE CASCADE,
    appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reviews are viewable by everyone"
    ON reviews FOR SELECT USING (true);

CREATE POLICY "Patients can create reviews"
    ON reviews FOR INSERT WITH CHECK (auth.uid() = patient_id);

-- ============================================================
-- STEP 11: PRESCRIPTIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS prescriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id UUID REFERENCES doctors(id) ON DELETE SET NULL,
    doctor_name VARCHAR(255),
    medication_name VARCHAR(255) NOT NULL,
    dosage VARCHAR(100),
    frequency VARCHAR(100),
    duration VARCHAR(100),
    notes TEXT,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    prescribed_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patients can view their prescriptions"
    ON prescriptions FOR SELECT USING (auth.uid() = patient_id);

CREATE POLICY "Doctors can view prescriptions they wrote"
    ON prescriptions FOR SELECT USING (auth.uid() = doctor_id);

CREATE POLICY "Doctors can create prescriptions"
    ON prescriptions FOR INSERT WITH CHECK (auth.uid() = doctor_id);

-- ============================================================
-- STEP 12: WALK-IN QUEUE TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS walk_in_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    age INTEGER,
    reason TEXT,
    doctor_id UUID REFERENCES doctors(id) ON DELETE SET NULL,
    doctor_name VARCHAR(255),
    token VARCHAR(20),
    status VARCHAR(20) DEFAULT 'waiting',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE walk_in_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Walk-in queue is viewable by authenticated users"
    ON walk_in_queue FOR SELECT USING (auth.role() = 'authenticated');

-- ============================================================
-- STEP 13: UPDATE TRIGGERS
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_doctors_updated_at BEFORE UPDATE ON doctors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_patients_updated_at BEFORE UPDATE ON patients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- DONE! All tables created successfully.
-- ============================================================
