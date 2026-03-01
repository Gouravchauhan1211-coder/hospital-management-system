# Medicare - Modern Hospital Management System

## Overview

**Medicare** is a **full-stack Serverless Hospital Management System** built with modern web technologies. It provides a premium, mobile-first experience for patients to book appointments, while offering robust tools for doctors and hospital staff to manage healthcare operations.

---

## System Architecture

The application uses a **Serverless / Backend-as-a-Service (BaaS)** architecture. All authentication, database reads/writes, and real-time features go directly from the React frontend to Supabase via the Supabase Javascript Client without an intermediary custom backend server.

### Technology Stack

| Layer | Technology |
|-------|------------|
| **Frontend UI** | React 18, Vite, React Router, Tailwind CSS (Glassmorphism design) |
| **State Management**| Zustand |
| **Backend & Auth** | Supabase (PostgreSQL, Supabase Auth) |
| **Real-time & DB** | Supabase JS Client (`@supabase/supabase-js`) |

### Project Structure

```
hospital-management-system/
├── frontend/               # React frontend application
│   ├── public/             # Static assets
│   ├── src/
│   │   ├── components/     # Reusable UI components (Modals, Badges, etc.)
│   │   ├── hooks/          # Custom React hooks
│   │   ├── pages/          # Auth, Patient, Doctor, Mediator pages
│   │   ├── services/       # API layer (Supabase operations)
│   │   │   ├── api.js      # core CRUD operations using Supabase Client
│   │   │   └── supabase.js # Supabase client initialization
│   │   ├── store/          # Zustand global state (AuthStore)
│   │   ├── utils/          # Constants and utilities
│   │   ├── App.jsx         # Main router setup
│   │   └── main.jsx        # Entry point
│   ├── package.json        # Frontend React dependencies
│   ├── index.css           # Global Tailwind styling
│   └── vite.config.js      # Vite build bundler configuration
│
├── SUPABASE_SCHEMA.sql     # Database setup file directly for the Supabase SQL editor
└── README.md               # This file
```

---

## User Roles

The system has **3 main user roles**:

### 1. Patient
- **Modern Mobile Dashboard**: Premium redesign with a focus on ease of use.
- **Specialty Filtering**: Quickly find doctors by category (Cardiology, Dental, etc.) with real-time filtering.
- **Top Doctors**: Quick access to the highest-rated specialists.
- **Upcoming Visits**: Live queue status and token management at a glance.
- **Find & Book**: Seamless appointment booking flow.
- **Medical Records**: Access prescriptions and records securely.
- **Messaging**: Direct communication with healthcare providers.

### 2. Doctor
- Manage appointments and schedules
- View patient information
- Set availability (schedule rules)
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

The entire database is hosted on **Supabase (PostgreSQL)**. 

### Core Tables

The database consists of main tables (defined in `SUPABASE_SCHEMA.sql`):

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

### Table Relationships Overview

```
auth.users (Supabase Auth)
    │
    └── profiles (id = auth.users.id)
            │
            ├── doctors (id = profiles.id)
            │       │
            │       └── appointments (doctor_id)
            │
            ├── patients (id = profiles.id)
            │       │
            │       └── appointments (patient_id)
            │
            └── mediators (id = profiles.id)
                    │
                    └── walk_in_queue (management)
```

---

## API Layer (`frontend/src/services/api.js`)

Instead of standard HTTP REST calls to a custom backend, the React `.jsx` pages directly import JavaScript functions exported from `api.js`. These functions handle the asynchronous `supabase.from()` calls natively.

### Key API Service Operations

#### Queue System
- `getNextToken()` - Auto-generate next string sequences (A001, A002)
- `addToWalkInQueue()` - Adds a new patient straight into `walk_in_queue` table
- `updateWalkInQueue()` - Patches waiting -> in-progress -> completed statuses

#### Appointments 
- `getAppointments()` - Gets rows based on patientId or doctorId filters
- `checkSlotAvailability()` - Determines if time conflicts exist for a specific doctor
- `createAppointment()` - Runs the SQL insertion for bookings

#### Authentication & Profiles
- `signUp()` & `signIn()` - Wraps `supabase.auth` APIs. Signup creates a matching row based on the user's role (patient, doctor, mediator)
- `getAllDoctors()` and `getAllPatients()` - Filter and fetch queries for list matching.

#### Communication
- `createMessageThread()` - Instantiates threads between `patient_id` and `doctor_id`.
- `sendMessage()` - Appends to the `messages` DB and triggers Real-time hooks if utilized.

---

## Frontend Architecture

### Entry Point Flow

```
main.jsx 
    │
    └── App.jsx 
            │
            ├── Authentication Routing
            │   ├── OnboardingPage (welcome screen)
            │   ├── RoleSelectionPage (choose patient/doctor/mediator)
            │   └── LoginPage / RegisterPage
            │
            └── Protected Routes (Role-based)
                ├── Patient Routes (/patient/*)
                ├── Doctor Routes (/doctor/*)
                ├── Mediator Routes (/mediator/*)
                └── Public Displays (/queue-display)
```

### State Management (Zustand)

The app utilizes lightweight store hooks.
`src/store/authStore.js` manages session states (`user`, `role`, `isLoading`) mapped closely to the result of `supabase.auth.getUser()`.

---

## Authentication Flow

1. User visits `/register` and selects their Role (Patient, Doctor, Mediator).
2. The form sends data to `signUp()` located inside `api.js`.
3. Supabase registers an Identity inside the underlying PostgreSQL `auth.users` schema.
4. Immediately following completion, custom logic in `api.js` copies their ID into either `patients`, `doctors`, or `mediators` table.
5. `authStore` catches the session update via LocalStorage `hospital_user` hooks and automatically routes to the respective Dashboard layout.

---

## Configuration

The project simply requires pointing the Vite JS Frontend to a running Supabase project instance.

### Step 1: Frontend `.env` setup
Copy `frontend/.env.example` into `frontend/.env` and update values.
```env
VITE_SUPABASE_URL=https://<YOUR_PROJECT_ID>.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1Ni...
```

### Step 2: Database Initialization 
Execute the SQL dump found in `SUPABASE_SCHEMA.sql` within your Supabase project's SQL Editor to stand up the complete architecture of tables, columns, RLS security policies, and initial roles.

---

## Running the Application

Because this uses a serverless BaaS architecture, you only need to run the React frontend.

```bash
# Move to the frontend folder
cd frontend

# Install Dependencies
npm install

# Start Local Development Server
npm run dev
```
The website will load normally on `http://localhost:5173`.

### Production Build
```bash
npm run build
```

---

---

## Performance & UX

- **Parallel Data Fetching**: Utilizes `Promise.all` for lightning-fast dashboard loading.
- **Skeleton Screens**: Professional loading states for a smooth perceived experience.
- **Mobile-First Design**: Optimized for modern mobile devices with a sleek, interactive UI.
- **Real-time Updates**: Powered by Supabase real-time subscriptions for live queue tracking.

---

## Summary

This comprehensive serverless system delivers:
- **Medicare Rebranding**: A modern, premium healthcare identity.
- **3 user roles** interacting over **12+ database tables**.
- **Modern Patient Dashboard**: Redesigned for visual excellence and performance.
- **30+ frontend pages** for sophisticated flows (dashboards, availability scheduling).
- **Zero custom backend maintenance** - all data security is driven by Supabase.
- **Modern UI components** utilizing Vite, React Router, and Tailwind CSS.
