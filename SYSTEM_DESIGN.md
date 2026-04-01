# Hospital Appointment System - Complete System Design Document

## Executive Summary

The **Hospital Appointment System** is a mobile-first healthcare platform designed to minimize patient wait times through real-time queue tracking and seamless appointment booking. The system serves three distinct user roles—**Patients**, **Doctors**, and **Mediators (Hospital Staff)**—with a unified goal of optimizing the healthcare delivery experience.

---

## 1. System Architecture Overview

### 1.1 Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | React 18 + Vite + Tailwind CSS | Responsive mobile UI |
| **State Management** | Zustand | Client-side state management |
| **Backend** | Supabase (PostgreSQL + Realtime) | Database, Auth, Real-time subscriptions |
| **Real-time** | Supabase Realtime | Live queue updates, push notifications |
| **Routing** | React Router v6 | Client-side navigation |
| **UI Components** | Lucide React + Framer Motion | Icons and animations |
| **Notifications** | React Hot Toast | Toast notifications |
| **Date Handling** | date-fns | Date formatting and manipulation |

### 1.1.1 Key Dependencies

```json
{
  "dependencies": {
    "react": "^18.x",
    "react-router-dom": "^6.x",
    "@supabase/supabase-js": "^2.x",
    "zustand": "^4.x",
    "framer-motion": "^11.x",
    "lucide-react": "latest",
    "react-hot-toast": "latest",
    "date-fns": "^3.x"
  }
}
```

### 1.2 Database Schema Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   profiles     │     │    doctors      │     │    patients    │
│  (Base User)   │◄────│  (Specialized)   │     │  (Medical Info)│
└────────┬────────┘     └─────────────────┘     └────────┬────────┘
         │                                              │
         ▼                                              ▼
┌─────────────────┐                           ┌─────────────────┐
│  appointments  │◄───────────────────────────│ walk_in_queue   │
│ (Booked Appts) │                           │ (Live Queue)    │
└─────────────────┘                           └────────┬────────┘
         │                                              │
         ▼                                              ▼
┌─────────────────┐                           ┌─────────────────┐
│ notifications   │                           │  prescriptions  │
│ (Alerts System) │                           │(Medical Records)│
└─────────────────┘                           └─────────────────┘
```

---

## 2. User Roles & Permissions Matrix

| Feature | Patient | Doctor | Mediator |
|---------|---------|--------|----------|
| **Book Appointment** | ✅ | ❌ | ✅ (on behalf) |
| **View Live Queue** | ✅ (own position) | ✅ (own queue) | ✅ (all queues) |
| **Manage Appointments** | ✅ (own) | ✅ (own) | ✅ (all) |
| **Add Walk-in Patient** | ❌ | ❌ | ✅ |
| **Call Next Patient** | ❌ | ✅ | ✅ |
| **Complete Consultation** | ❌ | ✅ | ❌ |
| **View Analytics** | Limited | Limited | ✅ (Full) |
| **Manage Doctors** | ❌ | ❌ | ✅ |
| **Process Payments** | ✅ | ❌ | ✅ |
| **Verify Doctors** | ❌ | ❌ | ✅ |
| **Manage Departments** | ❌ | ❌ | ✅ |
| **Manage Branches** | ❌ | ❌ | ✅ |
| **View Earnings** | ❌ | ✅ | ❌ |
| **Send Messages** | ✅ | ✅ | ❌ |
| **Video Consultation** | ✅ (future) | ✅ (future) | ❌ |

### 2.1 Role Definitions

| Role | Description | Access Level |
|------|-------------|--------------|
| **Patient** | Healthcare service consumer | Own data only |
| **Doctor** | Medical professional | Own patients, appointments, queue |
| **Mediator** | Hospital staff/administrator | Full system access |

### 2.2 Authentication Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    AUTHENTICATION FLOW                           │
└─────────────────────────────────────────────────────────────────┘

User ──► Onboarding ──► Role Selection ──► Register ──► OTP Verify
                              │                                      │
                              ▼                                      ▼
                        ┌─────────┐                          ┌─────────────┐
                        │ Login   │◄─────────────────────────│  Dashboard  │
                        └─────────┘                          └─────────────┘
                                                             (by role)
```

| Auth Step | Description |
|-----------|-------------|
| Onboarding | Welcome screens with app introduction |
| Role Selection | Choose: Patient, Doctor, or Mediator |
| Register | Email, password, full name, phone, role-specific fields |
| OTP Verify | Phone number verification (future) |
| Login | Email/password authentication via Supabase Auth |
| Dashboard | Role-based redirect to appropriate dashboard |

---

## 3. Screen-by-Screen Flow

### 3.1 Authentication Flow (All Roles)

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│   Onboarding    │────►│ Role Selection   │────►│     Register     │
│    Page         │     │      Page         │     │      Page        │
└──────────────────┘     └──────────────────┘     └────────┬─────────┘
                                                          │
                                                          ▼
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  Dashboard       │◄────│     Login        │     │   OTP Verify     │
│   (by Role)      │     │     Page         │     │      Page        │
└──────────────────┘     └──────────────────┘     └──────────────────┘
```

---

### 3.2 Patient Screens

| Screen Name | Route | Description | Key UI Elements | Feature Gated |
|-------------|-------|-------------|-----------------|---------------|
| **Onboarding** | `/onboarding` | Welcome screens | Slides, Get Started button | No |
| **Role Selection** | `/role-selection` | Choose user role | Patient/Doctor/Mediator options | No |
| **Login** | `/login` | User authentication | Email, Password, Forgot password | No |
| **Register** | `/register` | Create new account | Form fields based on role | No |
| **Patient Dashboard** | `/patient/dashboard` | Home with quick actions | Stats cards, Quick actions, Queue position | No |
| **Doctors List** | `/patient/doctors` | Browse all doctors | Search bar, Filters, Doctor cards | No |
| **Doctor Profile** | `/patient/doctors/:doctorId` | Doctor details | Profile header, Stats, Reviews, Availability | No |
| **Book Appointment** | Modal (from doctor profile) | Schedule appointment | Date picker, Time slots, Mode selection, Payment | No |
| **My Appointments** | `/patient/appointments` | View appointments | Tab filters, Appointment cards | No |
| **Medical Records** | `/patient/records` | Health documents | Record categories, Upload, File list | ✅ (medicalRecords) |
| **Prescriptions** | `/patient/prescriptions` | Past prescriptions | Prescription cards, Download | ✅ (prescriptions) |
| **Lab Results** | `/patient/lab-results` | Test results | Result cards, View/Download | ✅ (labResults) |
| **Billing** | `/patient/billing` | Payment history | Invoice list, Payment status | ✅ (billing) |
| **Health Summary** | `/patient/health-summary` | Patient health overview | Health metrics, History | ✅ (healthSummary) |
| **Messages** | `/patient/messages` | Chat with doctors | Thread list, Chat window | ✅ (messages) |
| **Profile** | `/patient/profile` | User settings | Avatar, Personal info, Preferences | No |
| **Settings** | `/patient/settings` | App settings | Theme, Notifications, Logout | No |
| **Queue Display** | `/queue-display` | Public queue board | Doctor columns, Current patient, Wait count | No (public) |
| **My Appointments** | `/patient/appointments` | View all appointments | Tab filters (Upcoming/Past), Appointment cards |
| **Live Queue** | `/patient/queue` | Real-time queue position | Queue position card, Wait time estimate, Doctor info |
| **Medical Records** | `/patient/records` | Health documents | Record categories, Upload button, File list |
| **Prescriptions** | `/patient/prescriptions` | Past prescriptions | Prescription cards, Download option |
| **Billing** | `/patient/billing` | Payment history | Invoice list, Payment status, Total due |
| **Profile** | `/patient/profile` | User settings | Avatar, Personal info, Emergency contact, Preferences |
| **Messages** | `/patient/messages` | Communication with doctors | Thread list, Chat window |

---

### 3.3 Doctor Screens

| Screen Name | Route | Description | Key UI Elements | Feature Gated |
|-------------|-------|-------------|-----------------|---------------|
| **Doctor Dashboard** | `/doctor/dashboard` | Today's overview | Queue display, Stats, Quick actions, Current patient panel | No |
| **My Appointments** | `/doctor/appointments` | Scheduled appointments | Date filter, Appointment list, Status tabs | No |
| **My Patients** | `/doctor/patients` | Patient history | Patient list, Search, Medical records access | No |
| **Availability** | `/doctor/availability` | Set working hours | Weekly calendar, Time slots, Block dates | No |
| **Profile** | `/doctor/profile` | Professional info | Photo, Bio, Qualifications, Reviews | No |
| **Settings** | `/doctor/settings` | App settings | Theme, Notifications, Logout | No |
| **Earnings** | `/doctor/earnings` | Income summary | Earnings stats, Transaction history, Withdraw | ✅ (earnings) |
| **Statistics** | `/doctor/statistics` | Performance metrics | Charts, Reports, Patient count | ✅ (statistics) |
| **Messages** | `/doctor/messages` | Patient communication | Chat threads, Message window | ✅ (messages) |
| **Video Call** | `/call/:threadId` | Video consultation | Video/audio call interface | ✅ (videoCall) |

### 3.4 Mediator (Hospital Staff) Screens

| Screen Name | Route | Description | Key UI Elements | Feature Gated |
|-------------|-------|-------------|-----------------|---------------|
| **Mediator Dashboard** | `/mediator/dashboard` | Hospital overview | Stats cards, Queue overview, Quick actions | No |
| **Appointments** | `/mediator/appointments` | All appointments | Filters, Appointment cards, Status management | No |
| **Doctors** | `/mediator/doctors` | Doctor list | Doctor list, Verification status | No |
| **Patients** | `/mediator/patients` | Patient database | Search, Patient list, Medical records | No |
| **Walk-in Management** | `/admin/walk-in` | Live queue control | Queue board, Add patient, Priority management | No |
| **Departments** | `/mediator/departments` | Department setup | Department list, Add/Edit | ✅ (departments) |
| **Branches** | `/mediator/branches` | Branch management | Branch list, Staff assignment | ✅ (branches) |
| **Analytics** | `/mediator/analytics` | Hospital analytics | Charts, Reports, Export | ✅ (analytics) |
| **Doctor Verification** | `/mediator/doctor-verification` | Approve doctors | Pending applications, Approve/Reject | ✅ (doctorVerification) |
| **Settings** | `/mediator/settings` | App settings | Theme, Notifications, Logout | No |

### 3.5 Public Routes

| Screen Name | Route | Description | Access |
|-------------|-------|-------------|--------|
| **Queue Display Board** | `/queue-display` | Public queue display | Public (no auth) |
| **Queue Display by Branch** | `/queue-display/branch/:branchId` | Branch-specific queue | Public |
| **Queue Display by Doctor** | `/queue-display/doctor/:doctorId` | Doctor-specific queue | Public |

---

## 4. Feature Flags System

The system uses a feature flags mechanism to enable/disable features without removing routes. This allows for gradual rollout and A/B testing.

### 4.1 Feature Configuration

```javascript
// Location: frontend/src/config/features.js

export const FEATURES = {
  // Patient features
  medicalRecords: true,
  prescriptions: true,
  labResults: true,
  billing: true,
  healthSummary: true,
  messages: true,
  
  // Doctor features
  earnings: true,
  statistics: true,
  messages: true,
  
  // Mediator features
  analytics: true,
  departments: true,
  branches: true,
  doctorVerification: true,
  
  // Shared features
  videoCall: false,  // Coming soon
}
```

### 4.2 Feature Status

| Feature | Status | Description |
|---------|--------|-------------|
| **Medical Records** | ✅ Enabled | Upload, view, and manage health documents |
| **Prescriptions** | ✅ Enabled | View and download prescriptions |
| **Lab Results** | ✅ Enabled | View test results |
| **Billing** | ✅ Enabled | Payment history and invoices |
| **Health Summary** | ✅ Enabled | Patient health overview |
| **Messages** | ✅ Enabled | In-app messaging between patients and doctors |
| **Doctor Earnings** | ✅ Enabled | Doctor income tracking |
| **Doctor Statistics** | ✅ Enabled | Performance metrics and reports |
| **Mediator Analytics** | ✅ Enabled | Hospital analytics dashboard |
| **Departments** | ✅ Enabled | Department management |
| **Branches** | ✅ Enabled | Branch management |
| **Doctor Verification** | ✅ Enabled | Doctor credential verification |
| **Video Call** | ❌ Disabled | Video consultation (coming soon) |

### 4.3 Using Feature Flags in Routes

```jsx
// Example: Conditionally rendering routes
import { isFeatureEnabled } from './config/features'

<Route
  path="/patient/records"
  element={
    <ProtectedRoute allowedRoles={['patient']}>
      {isFeatureEnabled('medicalRecords') ? (
        <PatientMedicalRecordsPage />
      ) : (
        <ComingSoon featureName="Medical Records" />
      )}
    </ProtectedRoute>
  }
/>
```

---

## 5. Card-Level Component Explanations

### 5.1 Live Queue Card

```jsx
// Location: frontend/src/components/patient/LiveQueueCard.jsx
```

| Element | Data Shown | Interaction | Flow |
|---------|------------|-------------|------|
| **Position Badge** | Current queue number (e.g., "Queue #5") | Non-clickable | Static display |
| **Patient Name** | Patient's full name | Non-clickable | Static display |
| **Doctor Name** | Assigned doctor | Tap → Doctor profile | Navigate to `/patient/doctors/:id` |
| **Estimated Wait** | "Est. 25 mins" | Non-clickable | Calculated based on position |
| **Status Indicator** | Waiting/In Progress | Color-coded badge | Visual feedback |
| **Cancel Button** | "Leave Queue" | Tap → Confirmation modal | Removes from queue |

### 5.2 Appointment Card

```jsx
// Location: frontend/src/components/patient/UpcomingAppointmentCard.jsx
```

| Element | Data Shown | Interaction | Flow |
|---------|------------|-------------|------|
| **Doctor Avatar** | Profile image | Tap → Doctor profile | Navigate to profile |
| **Doctor Name** | Full name with specialization | Tap → Doctor profile | Navigate to profile |
| **Date/Time** | Formatted appointment slot | Non-clickable | Static display |
| **Mode Badge** | In-Person / Video / Audio | Color-coded | Visual indicator |
| **Status Badge** | Pending/Confirmed/Completed | Color-coded | Visual indicator |
| **Actions** | Reschedule / Cancel / Join Call | Context-dependent | Opens respective modal/action |

### 5.3 Queue Display Board

```jsx
// Location: frontend/src/components/queue/QueueDisplayBoard.jsx
```

| Element | Data Shown | Interaction | Flow |
|---------|------------|-------------|------|
| **Doctor Column** | Doctor name + specialization | Non-clickable | Static display |
| **Current Patient** | Currently serving token | Highlighted | Visual indicator |
| **Upcoming** | Next 3 patients | Non-clickable | Static display |
| **Wait Count** | Total waiting | Non-clickable | Static display |
| **Call Button** | "Call Next" | Tap → Calls next patient | Updates queue position |

---

## 6. Button-Level Functionality

### 5.1 Appointment Booking Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         BOOK APPOINTMENT FLOW                               │
└─────────────────────────────────────────────────────────────────────────────┘

1. Patient taps "Book Appointment" on Doctor Profile
       │
       ▼
2. Opens Calendar Modal → Selects Date
       │ [Fetches available slots for selected date]
       ▼
3. Displays Time Slots Grid (09:00, 09:30, 10:00...)
       │ [Gray = unavailable, Blue = available]
       ▼
4. Patient selects Time Slot
       │
       ▼
5. Consultation Mode Selection (In-Person / Video / Audio)
       │
       ▼
6. Payment Confirmation
       │ [Shows: Doctor fee, Platform fee, Total]
       │ [Payment gateway integration]
       ▼
7. Booking Confirmation
       │ [Creates appointment record]
       │ [Sends notification to patient]
       │ [Sends notification to doctor]
       ▼
8. Success Screen with Details
       │
       ▼
9. Redirect to My Appointments
```

### 5.2 Doctor Queue Management Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DOCTOR QUEUE FLOW                                   │
└─────────────────────────────────────────────────────────────────────────────┘

1. Doctor logs in → Dashboard shows today's queue
       │
       ▼
2. Doctor taps "Call Next Patient"
       │ [Validates: Is queue empty? Is doctor available?]
       ▼
3. System updates:
   - Current patient status → "In Progress"
   - Next patient becomes "Current"
   - Push notification to patient
   │
   ▼
4. Doctor reviews patient details
       │ [Medical history, previous appointments]
   ▼
5. Doctor completes consultation
       │ [Enters prescription, notes]
   ▼
6. Doctor taps "Complete Consultation"
       │ [Updates status: Completed]
       │ [Moves next patient to "Current"]
       │ [Patient receives notification]
   ▼
7. Queue auto-advances, cycle repeats
```

### 5.3 Mediator Walk-in Entry Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         MEDIATOR WALK-IN FLOW                               │
└─────────────────────────────────────────────────────────────────────────────┘

1. Mediator taps "Add Walk-in" on Walk-in Management page
       │
       ▼
2. Opens Add Patient Form
       │ Fields: Name, Phone, Symptoms, Priority (Normal/Emergency), Doctor
   ▼
3. Mediator enters patient details
       │
       ▼
4. Selects Doctor (optional - can be auto-assigned)
       │
       ▼
5. Selects Priority Level
       │ [Emergency: Goes to front of queue]
       │ [Normal: Added to end]
   ▼
6. Taps "Add to Queue"
       │ [Creates walk_in_queue record]
       │ [Assigns token number]
       │ [Sends SMS to patient]
   ▼
7. Patient appears on Queue Display Board
       │
       ▼
8. Mediator can:
   - Reorder queue (drag & drop)
   - Cancel/Remove patient
   - Change priority
   - Mark as "No-show"
```

---

## 7. Role-Based User Journeys

### 6.1 Patient Journey

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          PATIENT USER JOURNEY                              │
└─────────────────────────────────────────────────────────────────────────────┘

STEP 1: REGISTRATION & ONBOARDING
│
├─► Visit app → Onboarding slides → Role selection
├─► Register with: Email, Password, Full Name, Phone
├─► Verify phone (OTP)
└─► Complete profile: Gender, DOB, Blood Group, Allergies

STEP 2: FINDING A DOCTOR
│
├─► Go to "Doctors" tab → Browse by specialization
├─► Use search: "Cardiology near me"
├─► View doctor profile → Reviews, Rating, Availability
└─► Check consultation fee

STEP 3: BOOKING APPOINTMENT
│
├─► Tap "Book Appointment"
├─► Select date from calendar
├─► Choose available time slot
├─► Select consultation mode (In-Person/Video/Audio)
├─► Review and pay consultation fee
└─► Receive booking confirmation + notification

STEP 4: VISIT DAY - CHECK-IN
│
├─► Receive reminder notification (1 hour before)
├─► View live queue position on app
├─► Receive "Your turn" notification when called
├─► Check-in at reception (if required)
└─► Go to doctor's chamber

STEP 5: CONSULTATION
│
├─► Doctor reviews medical history
├─► Physical examination / Video consultation
├─► Doctor writes prescription
├─► Doctor adds medical notes
└─► Consultation ends → Payment (if pending)

STEP 6: POST-VISIT
│
├─► Receive prescription on app
├─► Download/Share prescription
├─► Rate the doctor experience
├─► Schedule follow-up (if recommended)
└─► View billing & receipts

STEP 7: FOLLOW-UP
│
├─► Receive follow-up reminder
├─► Book follow-up appointment
└─► Access medical records anytime
```

### 6.2 Doctor Journey

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          DOCTOR USER JOURNEY                               │
└─────────────────────────────────────────────────────────────────────────────┘

STEP 1: REGISTRATION & VERIFICATION
│
├─► Register with medical credentials
├─► Upload: ID proof, Medical license, Certificates
├─► Submit for verification
└─► Wait for mediator approval → "Verified" status

STEP 2: SETTING AVAILABILITY
│
├─► Go to "Availability" settings
├─► Set working days (Mon-Sat)
├─► Set working hours (9:00 AM - 5:00 PM)
├─► Set consultation duration (15/30 mins)
├─► Block specific dates (vacation, etc.)
├─► Set consultation fee
└─► Enable/Disable online booking

STEP 3: DAILY OPERATIONS
│
├─► Login → Dashboard shows today's schedule
├─► View appointments list
├─► View walk-in queue
├─► Start calling patients

STEP 4: CONSULTATION PROCESS
│
├─► Call next patient from queue
├─► View patient profile + medical history
├─► Conduct examination
├─► Write prescription (add medications, dosage)
├─► Add consultation notes
├─► Mark consultation as complete
└─► Patient moves to "completed" status

STEP 5: POST-CONSULTATION
│
├─► Patient receives prescription
├─► Review is submitted (optional)
├─► View earnings updated
└─► Schedule next appointment (if follow-up)

STEP 6: EARNINGS & REPORTS
│
├─► View earnings dashboard
├─► See consultation count
├─► View payment history
└─► Generate reports for tax/accounting
```

### 6.3 Mediator (Hospital Staff) Journey

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         MEDIATOR USER JOURNEY                              │
└─────────────────────────────────────────────────────────────────────────────┘

STEP 1: SETUP & CONFIGURATION
│
├─► Login with hospital admin account
├─► Configure departments (Cardiology, Ortho, etc.)
├─► Add hospital branches
├─► Set up doctor verification workflow
└─► Configure system settings

STEP 2: DOCTOR MANAGEMENT
│
├─► Review pending doctor applications
├─► Verify credentials
├─► Approve/Reject doctors
├─► Assign departments
└─► Manage availability overrides

STEP 3: DAILY QUEUE MANAGEMENT
│
├─► Monitor live queue across all doctors
├─► Add walk-in patients to queue
├─► Assign priority (Normal/Emergency)
├─► Reorder queue positions
├─► Handle patient complaints
└─► Manage no-shows

STEP 4: APPOINTMENT MANAGEMENT
│
├─► View all appointments
├─► Reschedule appointments
├─► Cancel appointments
├─► Process refunds
└─► Handle patient inquiries

STEP 5: ANALYTICS & REPORTING
│
├─► View daily/weekly/monthly stats
├─► Patient count, Appointments, Revenue
├─► Doctor performance metrics
├─► Queue wait time analysis
└─► Export reports

STEP 6: PATIENT MANAGEMENT
│
├─► Search patients
├─► View patient history
├─► Add/Edit patient records
└─► Handle emergency cases
```

---

## 8. Error & Edge Cases

### 7.1 Critical Error Scenarios

| Scenario | Trigger | System Response | User Experience |
|----------|---------|-----------------|-----------------|
| **Doctor Unavailable** | Doctor marks self unavailable after patient books | Show "Doctor unavailable" alert, offer reschedule | Notification + Reschedule modal |
| **Slot Already Booked** | Two patients book same slot simultaneously | First confirmed, second gets "Slot unavailable" | Error toast + Alternative slots shown |
| **Payment Failure** | Payment gateway timeout/decline | Show "Payment failed", retain booking draft | Retry payment or use different method |
| **Network Offline** | App loses internet connection | Show offline banner, queue actions locally | Warning toast + Limited functionality |
| **System Crash** | Server/database failure | Show "System error", log issue | Error page + Retry button |
| **Duplicate Booking** | Patient tries to book same doctor same day | Show "Already booked" + View existing | Navigate to existing booking |

### 7.2 Queue-Specific Edge Cases

| Scenario | Handling | Resolution |
|----------|----------|------------|
| **Patient Arrives Late** | Queue position held for 15 mins (grace period), then marked "Late" if 15-30 mins, marked "NO_SHOW" if 30+ mins | Move to end or remove from queue |
| **Emergency Patient Added** | Priority queue algorithm with +1000 score | Auto-insert after current patient |
| **Doctor Goes on Break** | Pause queue, freeze waiting time calculation | Show "Doctor on break" status |
| **Doctor Ends Early** | Complete remaining appointments, reschedule rest | Notification + Reschedule options |
| **Patient Doesn't Show** | Mark as "NO_SHOW" after response time (5 mins), retry 3 times | Auto-advance queue, charge optional no-show fee |
| **Queue Overflow** | Maximum queue limit (50 patients) per doctor | Show "Queue full" to new walk-ins |

### 7.3 Priority Queue Algorithm

The system uses a **multi-factor priority scoring** system instead of simple FIFO:

```
PRIORITY_SCORE = 
    (Emergency Weight) +          // +1000 for Emergency, +500 for Urgent
    (Waiting Time Weight) +        // +2 per minute waiting
    (Late Arrival Weight) +        // +3 per minute late (penalty)
    (Patient Status Weight) +      // +200 if checked in, -500 if not present
    (Special Rules Adjustment)     // +300 VIP, +100 Follow-up
```

### 7.4 Queue Files

| File | Description |
|------|-------------|
| [`queueEngine.js`](frontend/src/services/queueEngine.js) | Core priority queue algorithm, scoring, and state management |
| [`queueApi.js`](frontend/src/services/queueApi.js) | API operations for queue CRUD |
| [`usePriorityQueue.js`](frontend/src/hooks/usePriorityQueue.js) | React hook for priority queue state |
| [`useQueueSubscription.js`](frontend/src/hooks/useQueueSubscription.js) | Real-time subscription for live updates |
| [`PriorityQueueDisplay.jsx`](frontend/src/components/queue/PriorityQueueDisplay.jsx) | Queue visualization component |
| [`QueueMetricsPanel.jsx`](frontend/src/components/queue/QueueMetricsPanel.jsx) | Queue analytics and metrics display |

### 7.3 Data Sync Issues

| Scenario | Solution |
|----------|-----------|
| **Realtime Connection Lost** | Fall back to polling every 30 seconds |
| **Conflicting Updates** | Last-write-wins with conflict notification |
| **Session Expired** | Auto-redirect to login, preserve form data |
| **Database Migration** | Show "System updating" during maintenance |

---

## 9. Notifications & Alerts System

### 8.1 Notification Types Matrix

| Notification Type | Trigger Event | Recipient | Channel | Timing |
|-------------------|---------------|-----------|---------|--------|
| **Appointment Booked** | Patient completes booking | Patient, Doctor | Push + In-app | Immediate |
| **Appointment Confirmed** | Mediator/Doctor confirms | Patient | Push + SMS | Immediate |
| **Appointment Reminder** | 1 hour before slot | Patient | Push + SMS | T-1 hour |
| **Queue Position Update** | Patient moves in queue | Patient | In-app | Real-time |
| **Your Turn** | Doctor calls patient | Patient | Push + SMS + In-app | Immediate |
| **Consultation Complete** | Doctor marks complete | Patient | Push + In-app | Immediate |
| **Walk-in Added** | Mediator adds walk-in | Doctor | In-app | Immediate |
| **Payment Received** | Payment successful | Patient | In-app | Immediate |
| **Payment Failed** | Payment declined | Patient | Push + In-app | Immediate |
| **Doctor Unavailable** | Doctor updates availability | Booked patients | Push + SMS | Immediate |
| **Appointment Cancelled** | Patient/Mediator cancels | Patient, Doctor | Push + SMS | Immediate |
| **New Message** | Doctor/Patient sends chat | Recipient | Push + In-app | Immediate |
| **Review Received** | Patient submits review | Doctor | In-app | Immediate |

### 8.2 Notification Priority Levels

| Level | Types | Behavior |
|-------|-------|----------|
| **Critical** | Emergency, System failure | Always show, sound + vibration |
| **High** | Your turn, Payment success/fail | Show, sound |
| **Medium** | Appointment reminder, New message | Show, no sound |
| **Low** | Promotional, General updates | Silent, notification center only |

---

## 10. Backend Architecture

### 9.1 Database Tables (Simplified)

```sql
-- Core Tables

profiles (id, role, full_name, email, phone, avatar_url, created_at)
doctors (id, specialization, qualifications, experience_years, 
         consultation_fee, is_verified, is_available, rating, availability)
patients (id, blood_group, allergies, medical_conditions, emergency_contact)
mediators (id, department, position, branch_id)

appointments (id, patient_id, doctor_id, date, time, mode, status, 
              consultation_fee, payment_status, created_at)

walk_in_queue (id, patient_name, phone, symptoms, doctor_id, 
               token_number, status, priority, created_at)

prescriptions (id, appointment_id, patient_id, doctor_id, 
               medications, notes, created_at)

notifications (id, user_id, type, title, body, is_read, created_at)

messages (id, thread_id, sender_id, content, created_at)
```

### 9.2 Key API Endpoints

All API operations are performed through Supabase client. See [`frontend/src/services/api.js`](frontend/src/services/api.js) for implementation.

#### Authentication

| Function | Method | Purpose | Access |
|----------|--------|---------|--------|
| `signUp()` | POST | Register new user | Public |
| `signIn()` | POST | Authenticate user | Public |
| `signOut()` | POST | Log out user | Auth |
| `getCurrentUser()` | GET | Get current user | Auth |

#### User Profiles

| Function | Method | Purpose | Access |
|----------|--------|---------|--------|
| `createUserProfile()` | POST | Create patient/doctor/mediator profile | Auth |
| `updateUserProfile()` | PUT | Update user profile | Auth (own) |
| `getUserProfile()` | GET | Get user profile by ID | Auth |

#### Doctors

| Function | Method | Purpose | Access |
|----------|--------|---------|--------|
| `getDoctors()` | GET | List all doctors with filters | Public |
| `getDoctorById()` | GET | Get doctor details | Public |
| `getDoctorAvailability()` | GET | Get doctor availability slots | Public |
| `updateDoctorProfile()` | PUT | Update doctor profile | Doctor |

#### Appointments

| Function | Method | Purpose | Access |
|----------|--------|---------|--------|
| `getAppointments()` | GET | List appointments (by role) | Auth |
| `createAppointment()` | POST | Create new appointment | Patient/Mediator |
| `updateAppointment()` | PUT | Update appointment status | Doctor/Mediator |
| `cancelAppointment()` | PUT | Cancel appointment | Patient |

#### Queue Management

| Function | Method | Purpose | Access |
|----------|--------|---------|--------|
| `getWalkInQueue()` | GET | Get walk-in queue for doctor | Doctor/Mediator |
| `addWalkInPatient()` | POST | Add walk-in patient | Mediator |
| `updateQueueStatus()` | PUT | Update queue position status | Doctor/Mediator |
| `getAppointmentQueue()` | GET | Get appointment queue | Doctor |

#### Medical Records

| Function | Method | Purpose | Access |
|----------|--------|---------|--------|
| `getMedicalRecords()` | GET | List patient medical records | Patient/Doctor |
| `uploadMedicalRecord()` | POST | Upload new record | Patient |
| `deleteMedicalRecord()` | DELETE | Delete a record | Patient |

#### Prescriptions

| Function | Method | Purpose | Access |
|----------|--------|---------|--------|
| `getPrescriptions()` | GET | List prescriptions | Patient/Doctor |
| `createPrescription()` | POST | Create prescription | Doctor |

#### Messaging

| Function | Method | Purpose | Access |
|----------|--------|---------|--------|
| `getMessageThreads()` | GET | List message threads | Patient/Doctor |
| `getMessages()` | GET | Get messages in thread | Patient/Doctor |
| `sendMessage()` | POST | Send new message | Patient/Doctor |

#### Analytics & Earnings

| Function | Method | Purpose | Access |
|----------|--------|---------|--------|
| `getDoctorEarnings()` | GET | Get doctor earnings | Doctor |
| `getAnalytics()` | GET | Get hospital analytics | Mediator |

#### Admin Functions

| Function | Method | Purpose | Access |
|----------|--------|---------|--------|
| `getDepartments()` | GET | List departments | Public |
| `createDepartment()` | POST | Create department | Mediator |
| `getBranches()` | GET | List branches | Public |
| `createBranch()` | POST | Create branch | Mediator |
| `verifyDoctor()` | PUT | Verify doctor credentials | Mediator |

### 9.3 Real-time Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    REAL-TIME UPDATE FLOW                        │
└─────────────────────────────────────────────────────────────────┘

Client A (Patient)                  Server                       Client B (Doctor)
     │                                │                              │
     │──────── Subscribe ────────────►│                              │
     │   (channel: queue_updates)    │                              │
     │                                │                              │
     │                                │◄─────── Emit ──────────────│
     │                                │   (patient called)          │
     │                                │                              │
     │◄─────── Update ────────────────│                              │
     │   (Your turn!)                │                              │
     │                                │                              │
     │────────── Ack ────────────────►│                              │
```

**Technology**: Supabase Realtime channels

- **Channel**: `queue:{doctor_id}` for doctor-specific queue
- **Channel**: `queue:patient:{patient_id}` for patient queue position
- **Events**: `INSERT`, `UPDATE`, `DELETE` on walk_in_queue table

---

## 11. Monetization Strategy

### 10.1 Revenue Models

| Model | Description | Target | Pricing |
|-------|-------------|--------|---------|
| **Consultation Fee** | Per-visit charge | Patients | ₹200-₹1000 (doctor-defined) |
| **Platform Commission** | % of consultation fee | Hospital/Platform | 10-15% per transaction |
| **Subscription - Priority** | Skip queue, guaranteed slot | Patients | ₹99-₹299/month |
| **Subscription - Premium** | Video consultations included | Patients | ₹499-₹999/month |
| **Hospital Package** | Full queue management for hospital | Hospitals | ₹10,000-₹50,000/month |
| **No-show Fee** | Charge for missed appointments | Patients | ₹50-₹100 |
| **Cancellation Fee** | Charge for late cancellations | Patients | ₹25-₹50 |
| **Ad-hoc Services** | Reports, Analytics, SMS | Hospitals | Pay-per-use |

### 10.2 Commission Structure

```
┌─────────────────────────────────────────────────────────────────┐
│                    TRANSACTION FLOW                             │
└─────────────────────────────────────────────────────────────────┘

Patient pays: ₹500 (Consultation Fee)
     │
     ├── Doctor receives: ₹425 (85%)
     │
     ├── Platform/Hospital receives: ₹75 (15%)
     │
     └── Payment Gateway fees: ~2% (₹10)
         (Deducted from platform revenue)

Net Platform Revenue: ₹65 per consultation
```

### 10.3 Subscription Benefits

| Feature | Free | Priority | Premium |
|---------|------|----------|---------|
| **Book Appointments** | ✅ | ✅ | ✅ |
| **Live Queue View** | ✅ | ✅ | ✅ |
| **Skip Queue** | ❌ | ✅ (1/day) | ✅ (Unlimited) |
| **Video Consultations** | ❌ | ❌ | ✅ |
| **Priority Support** | ❌ | ❌ | ✅ |
| **Unlimited Reschedule** | ❌ | ✅ | ✅ |
| **No Cancellation Fee** | ❌ | ✅ | ✅ |

---

## 12. Summary

This system design document provides a comprehensive blueprint for the Hospital Appointment System. The architecture leverages modern real-time technologies (Supabase) to deliver a seamless experience for all three user roles.

### Key Success Metrics:
- **Reduce wait times** by 40% through live queue visibility
- **Increase appointment completion rate** with automated reminders
- **Improve patient satisfaction** with transparent queue tracking
- **Streamline hospital operations** with centralized queue management

### Next Steps:
1. Implement the database schema in Supabase
2. Build authentication flow with role-based routing
3. Develop real-time queue management
4. Integrate payment gateway
5. Deploy mobile app with push notifications

---

*Document Version: 1.0*
*Last Updated: 2026-03-24*
*Author: Senior Product Team*