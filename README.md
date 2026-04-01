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
│   │   │   ├── mediator/    # Mediator-specific components (PatientCheckIn)
│   │   │   ├── patient/    # Patient-specific components
│   │   │   ├── queue/       # Queue components (QueueMetricsPanel, etc.)
│   │   │   └── ui/         # Shared UI components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── pages/          # Auth, Patient, Doctor, Mediator pages
│   │   ├── services/       # API layer (Supabase operations)
│   │   │   ├── api.js      # Core CRUD operations using Supabase Client
│   │   │   ├── queueApi.js # Queue API operations
│   │   │   ├── queueEngine.js # Priority queue algorithm
│   │   │   └── supabase.js # Supabase client initialization
│   │   ├── store/          # Zustand global state (AuthStore)
│   │   ├── config/         # Feature flags configuration
│   │   ├── utils/          # Constants and utilities
│   │   ├── App.jsx         # Main router setup
│   │   └── main.jsx        # Entry point
│   ├── .env                # Environment variables (create from template)
│   ├── package.json        # Frontend React dependencies
│   ├── index.css           # Global Tailwind styling
│   └── vite.config.js      # Vite build bundler configuration
│
├── SUPABASE_SCHEMA.sql     # Database setup file directly for the Supabase SQL editor
├── QUEUE_SYSTEM_README.md # Queue system documentation
├── SYSTEM_DESIGN.md       # Complete system design document
└── README.md               # This file
```

---

## User Roles

The system has **3 main user roles** with explicit role selection during registration and login:

### 1. Patient
- **Modern Mobile Dashboard**: Premium redesign with a focus on ease of use.
- **Specialty Filtering**: Quickly find doctors by category (Cardiology, Dental, etc.) with real-time filtering.
- **Top Doctors**: Quick access to the highest-rated specialists.
- **Upcoming Visits**: Live queue status and token management at a glance.
- **Find & Book**: Seamless appointment booking flow.
- **Medical Records**: Access prescriptions and records securely.
- **Messaging**: Direct communication with healthcare providers.
- **Live Queue Tracking**: Real-time position updates, estimated wait times.

### 2. Doctor
- Manage appointments and schedules
- View patient information
- Set availability (schedule rules)
- Write prescriptions and medical records
- View earnings dashboard
- **Patient Queue Management**: Call next patient, track in-progress, mark complete
- **Capacity Monitoring**: Track daily patient count vs max capacity

### 3. Mediator (Admin/Staff)
- **Queue Command Center**: Real-time overview of all doctor queues and workload
- **Patient Check-in Kiosk**: Register patients with live doctor availability display
- Handle walk-in patient queues with priority levels (Normal, VIP, Emergency)
- Verify doctor registrations
- Manage departments and branches
- View analytics and reports
- Coordinate appointments

---

## Authentication

### Role Selection
Users explicitly select their role during registration and login:
- **Patient** - Healthcare service consumer
- **Doctor** - Medical professional  
- **Mediator** - Hospital staff/administrator

### Login Flow
1. User visits `/login`
2. Enters email and password
3. Selects role (Patient/Doctor/Mediator)
4. System routes to appropriate dashboard based on role

---

## Queue Management System

The system features an **advanced smart queue management** system that handles complex real-world hospital scenarios.

### Key Features

- **Priority Queue Algorithm**: Multi-factor scoring system (Emergency, Waiting Time, Late Arrival, Checked In status)
- **Real-World Rules**: 20+ rules including Late Patient Handling, No-Show Auto Handling, Emergency Override, Doctor Break Management
- **Multi-Source Merge**: Combines appointments and walk-ins into unified queues
- **Smart Buffer Adjustment**: Dynamic consultation time based on doctor performance
- **Doctor Capacity Monitoring**: Each doctor has max 60 patients/day
- **Live Doctor Availability**: Real-time display of patients per doctor with color-coded status
- **Queue Command Center**: Admin dashboard showing all doctor workloads
- **Full Capacity Handling**: Modal with alternatives when doctor reaches capacity
- **Token Generation**: Automatic token numbers with department prefixes

### Queue Files

| File | Description |
|------|-------------|
| [`queueEngine.js`](frontend/src/services/queueEngine.js) | Core priority queue algorithm and scoring |
| [`queueApi.js`](frontend/src/services/queueApi.js) | API operations for queue management |
| [`usePriorityQueue.js`](frontend/src/hooks/usePriorityQueue.js) | React hook for queue state management |
| [`useQueueSubscription.js`](frontend/src/hooks/useQueueSubscription.js) | Real-time subscription for live updates |
| [`QueueMetricsPanel.jsx`](frontend/src/components/queue/QueueMetricsPanel.jsx) | Queue analytics and metrics display |

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
| `appointment_queue` | Active queue tokens for appointments |
| `walk_in_queue` | Walk-in patient queue tokens |
| `notifications` | User notifications |
| `message_threads` | Chat conversation headers |
| `messages` | Individual chat messages |
| `medical_records` | Patient medical documents |
| `reviews` | Doctor reviews/ratings |
| `prescriptions` | Medication prescriptions |
| `departments` | Hospital departments |

### Table Relationships Overview

```
auth.users (Supabase Auth)
    │
    └── profiles (id = auth.users.id)
            │
            ├── doctors (id = profiles.id)
            │       │
            │       └── appointments (doctor_id)
            │       │
            │       └── appointment_queue (doctor_id)
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

## Smart Queue Features

### 1. Patient Registration Kiosk
When patients arrive at the hospital, they register at the mediator desk. The system shows:
- Patient name, phone, department selection
- Visit type (emergency, follow-up, walk-in, appointment)
- **Live doctor availability** with capacity status
- **Recommended doctor** with shortest wait time

### 2. Doctor Capacity Monitoring
Each doctor has predefined consultation capacity:
- Maximum: 60 patients per day
- Average consultation time: 8-10 minutes
- Real-time tracking of patients consulted

Dashboard shows:
| Doctor | Patients | Status |
|-------|----------|---------|
| Dr. Patel | 15/60 | Low traffic |
| Dr. Mehta | 30/60 | Available |
| Dr. Sharma | 45/60 | Almost full |
| Dr. Rao | 55/60 | High traffic |
| Dr. Singh | 60/60 | Full |

### 3. Token Generation
After registration, patients receive a digital token:
- Token number (auto-incremented)
- Assigned doctor
- Estimated consultation time
- Current token being served

### 4. Full Capacity Handling
If all doctors reach maximum capacity, the system provides alternatives:
- Schedule for next available day
- Join standby queue
- Choose another available doctor

---

## Feature Flags

The system uses feature flags to enable/disable features:

```javascript
// frontend/src/config/features.js
export const FEATURES = {
  // Patient features
  medicalRecords: true,
  prescriptions: true,
  labResults: true,
  billing: true,
  healthSummary: true,
  patientMessages: true,
  messages: true,
  
  // Doctor features
  earnings: true,
  statistics: true,
  doctorMessages: true,
  
  // Mediator features
  analytics: true,
  departments: true,
  branches: true,
  doctorVerification: true,
  
  // Shared features
  videoCall: false,
}
```

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

## Performance & UX

- **Parallel Data Fetching**: Utilizes `Promise.all` for lightning-fast dashboard loading.
- **Skeleton Screens**: Professional loading states for a smooth perceived experience.
- **Mobile-First Design**: Optimized for modern mobile devices with a sleek, interactive UI.
- **Real-time Updates**: Powered by Supabase real-time subscriptions for live queue tracking.
- **Role-Based Dashboards**: Different UI flows for Patient, Doctor, and Mediator roles.

---

## Summary

This comprehensive serverless system delivers:
- **Medicare Rebranding**: A modern, premium healthcare identity.
- **3 user roles** with explicit role selection interacting over **12+ database tables**.
- **Smart Queue Management**: Real-time tracking, capacity monitoring, and full workload distribution.
- **Doctor Capacity System**: 60 patients/day max with live availability display.
- **Queue Command Center**: Centralized admin dashboard for hospital operations.
- **Modern Patient Dashboard**: Redesigned for visual excellence and performance.
- **30+ frontend pages** for sophisticated flows (dashboards, availability scheduling).
- **Zero custom backend maintenance** - all data security is driven by Supabase.
- **Modern UI components** utilizing Vite, React Router, and Tailwind CSS.

---

## Documentation Files

| File | Description |
|------|-------------|
| `README.md` | This file - Main overview |
| `QUEUE_SYSTEM_README.md` | Detailed queue algorithm and rules |
| `SYSTEM_DESIGN.md` | Complete system design with user journeys |
| `SUPABASE_SCHEMA.sql` | Database schema SQL |