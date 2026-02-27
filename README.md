# Hospital Management System - Complete Documentation

## Overview

This is a **full-stack Hospital Management System** built with modern web technologies. It allows patients to book appointments, doctors to manage their practice, and mediators (hospital staff/admins) to manage hospital operations including walk-in queues.

---

## System Architecture

### Technology Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18, Vite, React Router, Zustand (state), Tailwind CSS |
| **Backend** | Node.js, Express.js |
| **Database** | Supabase (PostgreSQL) |
| **Real-time** | Supabase Realtime |
| **Authentication** | Supabase Auth |

### Project Structure

```
hospital-management-system/
├── backend/                 # Node.js Express API server
│   ├── config/             # Database configuration
│   ├── controllers/        # Business logic (if used)
│   ├── database/          # SQL schema files
│   ├── routes/            # API route handlers
│   └── server.js          # Main server entry point
│
├── frontend/               # React frontend application
│   ├── public/            # Static assets
│   └── src/
│       ├── components/    # Reusable UI components
│       ├── hooks/         # Custom React hooks
│       ├── pages/         # Page components
│       ├── services/      # API services
│       ├── store/         # Zustand state management
│       ├── utils/         # Constants and utilities
│       ├── App.jsx        # Main app component
│       └── main.jsx       # Entry point
│
├── package.json            # Root scripts for running both servers
└── README.md               # This file
```

---

## User Roles

The system has **3 main user roles**:

### 1. Patient
- Find and book appointments with doctors
- View medical records and prescriptions
- Message doctors
- View appointment history and billing

### 2. Doctor
- Manage appointments and schedules
- View patient information
- Set availability (schedule)
- Write prescriptions and medical records
- View earnings dashboard

### 3. Mediator (Admin/Staff)
- Manage walk-in patient queues
- Verify doctor registrations
- Manage departments and branches
- View analytics and reports
- Coordinate appointments

---

## Database Schema

### Core Tables

The database consists of **12 main tables** (defined in `backend/database/00_RUN_FIRST_MASTER.sql`):

| Table | Purpose |
|-------|---------|
| `profiles` | Base user information (name, email, phone, role) |
| `doctors` | Doctor-specific data (specialization, qualifications, fees, rating) |
| `patients` | Patient-specific data (blood group, allergies, medical conditions) |
| `mediators` | Admin/staff data (department, position, permissions) |
| `appointments` | Booking records (patient ↔ doctor connections) |
| `notifications` | User notifications |
| `message_threads` | Chat conversation headers |
| `messages` | Individual chat messages |
| `medical_records` | Patient medical documents |
| `reviews` | Doctor reviews/ratings |
| `prescriptions` | Medication prescriptions |
| `walk_in_queue` | Walk-in patient queue tokens |

### Additional Queue System Tables (queue_system.sql)

| Table | Purpose |
|-------|---------|
| `departments` | Hospital departments (cardiology, neurology, etc.) |
| `branches` | Hospital branch locations |
| `doctor_departments` | Many-to-many: doctors ↔ departments |
| `branch_settings` | Per-branch configuration |
| `doctor_rooms` | Doctor room assignments per day |
| `queue_tokens` | Advanced queue token system |

### Table Relationships

```
auth.users (Supabase)
    │
    └── profiles (id = auth.users.id)
            │
            ├── doctors (id = profiles.id)
            │       │
            │       └── appointments (doctor_id)
            │               │
            │               ├── medical_records
            │               ├── prescriptions
            │               └── reviews
            │
            ├── patients (id = profiles.id)
            │       │
            │       └── appointments (patient_id)
            │               │
            │               ├── medical_records
            │               ├── prescriptions
            │               └── reviews
            │
            └── mediators (id = profiles.id)
```

---

## API Endpoints

### Backend Routes (Express.js)

All routes are defined in `backend/server.js` and implemented in `backend/routes/`:

| Route File | Base Path | Description |
|------------|-----------|-------------|
| `queue.js` | `/api/queue` | Walk-in queue management, token generation |
| `departments.js` | `/api/departments` | Department CRUD operations |
| `branches.js` | `/api/branches` | Branch/Location management |
| `mediator.js` | `/api/mediator` | Doctor verification, admin operations |
| `medicalRecords.js` | `/api/medical-records` | Medical record management |
| `prescriptions.js` | `/api/prescriptions` | Prescription CRUD |
| `reviews.js` | `/api/reviews` | Doctor reviews/ratings |
| `availability.js` | `/api/availability` | Doctor scheduling |
| `notifications.js` | `/api/notifications` | User notifications |

### Key API Operations

#### Queue System (`/api/queue`)
- `POST /tokens` - Generate new queue token
- `GET /tokens` - Get queue tokens for doctor/branch
- `PATCH /tokens/:id` - Update token status (waiting → in-progress → completed)
- `GET /display` - Queue display board data

#### Appointments
- `GET /appointments` - List appointments (filtered by user role)
- `POST /appointments` - Create new appointment
- `PATCH /appointments/:id` - Update appointment status

#### Doctors (`/api/mediator`)
- `GET /doctors/pending` - Get unverified doctors
- `POST /doctors/:id/verify` - Verify doctor registration
- `GET /doctors` - List all doctors with filters

---

## Frontend Architecture

### Entry Point Flow

```
main.jsx (line 1-49)
    │
    └── App.jsx (line 1-150+)
            │
            ├── Authentication Flow
            │   ├── OnboardingPage (welcome screen)
            │   ├── RoleSelectionPage (choose patient/doctor/mediator)
            │   ├── LoginPage (email + password)
            │   └── RegisterPage (sign up)
            │
            └── Protected Routes (based on role)
                ├── Patient Routes (/patient/*)
                ├── Doctor Routes (/doctor/*)
                ├── Mediator Routes (/mediator/*)
                └── Admin Routes (/admin/*)
```

### Frontend Pages

#### Auth Pages (`src/pages/auth/`)
| Page | Path | Description |
|------|------|-------------|
| `OnboardingPage.jsx` | `/onboarding` | Welcome/landing page |
| `RoleSelectionPage.jsx` | `/role-selection` | Choose user role |
| `LoginPage.jsx` | `/login` | User login |
| `RegisterPage.jsx` | `/register` | User registration |

#### Patient Pages (`src/pages/patient/`)
| Page | Path | Features |
|------|------|----------|
| `PatientDashboard.jsx` | `/patient/dashboard` | Overview, quick actions |
| `PatientDoctorsPage.jsx` | `/patient/doctors` | Search/browse doctors |
| `PatientDoctorProfilePage.jsx` | `/patient/doctors/:id` | Doctor details, book appointment |
| `PatientAppointmentsPage.jsx` | `/patient/appointments` | View/book appointments |
| `PatientMessagesPage.jsx` | `/patient/messages` | Chat with doctors |
| `PatientProfilePage.jsx` | `/patient/profile` | Edit profile |
| `PatientMedicalRecordsPage.jsx` | `/patient/records` | View medical records |
| `PatientPrescriptionsPage.jsx` | `/patient/prescriptions` | View prescriptions |
| `PatientLabResultsPage.jsx` | `/patient/lab-results` | View lab results |
| `PatientBillingPage.jsx` | `/patient/billing` | Payment history |
| `PatientHealthSummaryPage.jsx` | `/patient/health-summary` | Health overview |

#### Doctor Pages (`src/pages/doctor/`)
| Page | Path | Features |
|------|------|----------|
| `DoctorDashboard.jsx` | `/doctor/dashboard` | Overview, today's appointments |
| `DoctorAppointmentsPage.jsx` | `/doctor/appointments` | Manage appointments |
| `DoctorPatientsPage.jsx` | `/doctor/patients` | View patient list |
| `DoctorMessagesPage.jsx` | `/doctor/messages` | Chat with patients |
| `DoctorAvailabilityPage.jsx` | `/doctor/availability` | Set schedule |
| `DoctorProfilePage.jsx` | `/doctor/profile` | Edit profile |
| `DoctorEarningsPage.jsx` | `/doctor/earnings` | Earnings dashboard |
| `DoctorStatisticsPage.jsx` | `/doctor/statistics` | Analytics |

#### Mediator (Admin) Pages (`src/pages/mediator/`)
| Page | Path | Features |
|------|------|----------|
| `MediatorDashboard.jsx` | `/mediator/dashboard` | Overview, stats |
| `MediatorQueuePage.jsx` | `/mediator/queue` | Manage walk-in queue |
| `MediatorAppointmentsPage.jsx` | `/mediator/appointments` | View all appointments |
| `MediatorDoctorsPage.jsx` | `/mediator/doctors` | Manage doctors |
| `MediatorDoctorVerificationPage.jsx` | `/mediator/doctors/verify` | Verify new doctors |
| `MediatorPatientsPage.jsx` | `/mediator/patients` | View patients |
| `MediatorDepartmentsPage.jsx` | `/mediator/departments` | Manage departments |
| `MediatorBranchesPage.jsx` | `/mediator/branches` | Manage branches |
| `MediatorAnalyticsPage.jsx` | `/mediator/analytics` | Reports and analytics |

#### Shared Pages (`src/pages/shared/`)
| Page | Path | Features |
|------|------|----------|
| `QueueDisplayBoardPage.jsx` | `/queue-display` | Public queue display (no auth) |
| `CallPage.jsx` | `/call/:threadId` | Video/audio call interface |
| `SettingsPage.jsx` | `/*/settings` | User settings |

### Frontend Components

#### Layout Components (`src/components/layout/`)
- `DashboardLayout.jsx` - Main dashboard wrapper
- `Navbar.jsx` - Top navigation bar
- `Sidebar.jsx` - Side navigation (different per role)

#### UI Components (`src/components/ui/`)
- `Button.jsx` - Custom button component
- `Input.jsx` - Form input component
- `Select.jsx` - Dropdown select
- `Modal.jsx` - Modal dialog
- `Badge.jsx` - Status badges
- `Avatar.jsx` - User avatar
- `GlassCard.jsx` - Glassmorphism card
- `Skeleton.jsx` - Loading skeleton

#### Feature Components
- `availability/AvailabilityCalendar.jsx` - Doctor schedule calendar
- `medicalRecords/RecordList.jsx` - Medical records list
- `medicalRecords/RecordUpload.jsx` - Upload records
- `notifications/NotificationDropdown.jsx` - Notification panel
- `payment/PaymentModal.jsx` - Payment processing
- `prescriptions/PrescriptionForm.jsx` - Create prescription
- `prescriptions/PrescriptionList.jsx` - List prescriptions
- `queue/QueueDisplayBoard.jsx` - Queue display board
- `reviews/ReviewForm.jsx` - Submit review
- `reviews/ReviewList.jsx` - View reviews

### State Management

The app uses **Zustand** for state management:

#### Auth Store (`src/store/authStore.js`)
```javascript
// Manages:
// - user: current user object
// - role: current user role (patient/doctor/mediator)
// - isLoading: loading state
// - login(email, password)
// - signup(email, password, fullName, role)
// - logout()
// - initialize() - check session on app start
```

### API Services

#### Supabase Client (`src/services/supabase.js`)
- Creates Supabase client with credentials from environment variables
- Handles missing credentials gracefully with mock client
- Exports helper functions: `getSession()`, `getUser()`

#### API Layer (`src/services/api.js`)
Contains all database operations:
- Authentication: `signUp()`, `signIn()`, `signOut()`, `getCurrentUser()`
- Profiles: `createUserProfile()`, `updateUserProfile()`, `getUserProfile()`
- Patients: `getAllPatients()`, `getPatientById()`
- Doctors: `getAllDoctors()`, `getDoctorById()`, `updateDoctorProfile()`
- Appointments: `getAppointments()`, `createAppointment()`, `updateAppointment()`
- Medical Records: CRUD operations
- Prescriptions: CRUD operations
- Queue: `generateToken()`, `getQueueTokens()`, `updateTokenStatus()`

---

## Authentication Flow

### Registration
1. User visits `/register`
2. Selects role (patient/doctor/mediator)
3. Fills email, password, full name
4. System creates Supabase auth user
5. System creates profile in appropriate table (patients/doctors/mediators)

### Login
1. User visits `/login`
2. Enters email/password
3. System authenticates with Supabase
4. System checks which table contains user (patients/doctors/mediators)
5. Sets user role and redirects to appropriate dashboard

### Session Management
- Uses Supabase's built-in session management
- Stores user info in localStorage (`hospital_user`)
- On app start (`initialize()`), checks session and verifies user role

---

## Queue System

### Walk-in Queue Flow (for mediators)
1. Patient arrives at hospital
2. Mediator adds patient to queue (`/mediator/queue`)
3. System generates token (e.g., "OPD-GEN-001")
4. Token appears on display board (`/queue-display`)
5. Doctor calls next patient
6. Mediator updates token status

### Token Generation
- Format: `OPD-{DEPT_CODE}-{SEQUENCE}` (e.g., "OPD-CARD-001")
- Sequence resets daily per doctor
- Calculates estimated wait time based on average consultation time

---

## Configuration

### Environment Variables

#### Frontend (`frontend/.env`)
```env
VITE_API_URL=http://localhost:5000/api
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

#### Backend (`backend/.env`)
```env
PORT=5000
NODE_ENV=development
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
JWT_SECRET=your-jwt-secret
CORS_ORIGIN=http://localhost:3000,http://localhost:5173
```

---

## Running the Application

### Development Mode (both servers)
```bash
npm run dev
# Runs: frontend on :5173, backend on :5000
```

### Individual Servers
```bash
# Backend only
cd backend && npm run dev

# Frontend only
cd frontend && npm run dev
```

### Production Build
```bash
npm run build
# Builds frontend for production
```

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `backend/server.js` | Express server setup, route registration |
| `backend/config/supabase.js` | Supabase client configuration |
| `backend/database/00_RUN_FIRST_MASTER.sql` | Complete database schema |
| `backend/database/queue_system.sql` | Advanced queue tables |
| `frontend/src/App.jsx` | Main router setup, all routes |
| `frontend/src/store/authStore.js` | Authentication state |
| `frontend/src/services/api.js` | All API operations |
| `frontend/src/utils/constants.js` | App constants, roles, routes |

---

## Potential Unnecessary Files

When cleaning up the project, consider removing:

### Documentation Files (in root)
- `APP_DOCUMENTATION.md` - Detailed app docs
- `PROJECT_HISTORY.md` - Development history
- `plans/FEATURE_IMPLEMENTATION_PLAN.md` - Old feature plans
- `plans/FIX_PLAN.md` - Bug fix plans
- `plans/TESTING_PLAN.md` - Testing plans
- `plans/TEST_RESULTS.md` - Test results

### Database Files (in backend/database/)
- Individual SQL files (01-07) - Only needed if not using master file
- `EXISTING_SCHEMA.sql` - Old schema reference

### Unused Backend Routes
- Check if all routes in `backend/routes/` are actively used

---

## Summary

This is a comprehensive hospital management system with:

- **3 user roles** (Patient, Doctor, Mediator)
- **12+ database tables** for storing all data
- **9 API route modules** for backend operations
- **30+ frontend pages** for different user flows
- **Real-time updates** via Supabase
- **Modern UI** with glassmorphism design

The system handles appointment booking, walk-in queues, doctor verification, medical records, prescriptions, messaging, and more.
