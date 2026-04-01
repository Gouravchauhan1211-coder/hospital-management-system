# Hospital Queue Management System - Advanced Features

## Overview

This document explains the advanced queue management system implemented in our hospital management application. The system handles complex real-world scenarios that hospitals face daily.

---

## Table of Contents

1. [Smart Queue System](#smart-queue-system)
2. [Doctor Capacity Monitoring](#doctor-capacity-monitoring)
3. [Priority Queue Algorithm](#priority-queue-algorithm)
4. [Real-World Rules Implemented](#real-world-rules-implemented)
5. [Queue Command Center](#queue-command-center)
6. [Integration Guide](#integration-guide)

---

## Smart Queue System

### Core Features Implemented

1. **Patient Registration Kiosk** (`frontend/src/components/mediator/PatientCheckIn.jsx`)
   - Live doctor availability display
   - Capacity status for each doctor (e.g., 15/60)
   - Color-coded status: Green (Available), Orange (High), Red (Full)
   - Recommended doctor with shortest wait time

2. **Doctor Capacity Monitoring** (`frontend/src/components/queue/QueueMetricsPanel.jsx`)
   - Maximum 60 patients per doctor per day
   - Real-time patient count tracking
   - Visual progress bars
   - Status indicators

3. **Token Generation**
   - Auto-incremented token numbers
   - Department-based prefixes
   - Estimated consultation time

4. **Full Capacity Handling**
   - Modal when doctor reaches max capacity
   - Three alternatives:
     - Choose another doctor
     - Schedule for next day
     - Join standby queue

---

## Doctor Capacity Monitoring

### Default Configuration

```javascript
const MAX_CAPACITY = 60  // Maximum patients per doctor per day
const AVG_CONSULTATION_TIME = 15  // Minutes
const GRACE_PERIOD = 15  // Minutes for late arrivals
```

### Status Levels

| Patients | Status | Color |
|----------|--------|-------|
| 0-44 | Available | Green |
| 45-59 | Almost Full | Orange |
| 60+ | Full | Red |

### Real-Time Tracking

The system tracks:
- `waiting` - Patients in queue waiting
- `inProgress` - Currently being consulted
- `completed` - Today's completed consultations
- `remaining` - Slots available today

---

## Priority Queue Algorithm

### Core Formula

```
PRIORITY_SCORE = 
    (Emergency Weight) +
    (Waiting Time Weight) +
    (Appointment Time Weight) +
    (Patient Status Weight) +
    (Special Rules Adjustment)
```

### Priority Factors

| Factor | Weight | Description |
|--------|--------|-------------|
| Emergency | +1000 | Critical patients go first |
| VIP | +300 | Special patients |
| Waiting Time | +2/min | Longer wait = higher priority |
| Late Arrival | +3/min | Penalize late patients |
| Checked In | +200 | Bonus for being present |
| Not Present | -500 | Penalty for no-show |

### Example Priority Calculation

```
Patient A: Emergency=0, Wait=20min, Late=15min, Present=200 → Score: 235
Patient B: Emergency=1000, Wait=5min, Late=0, Present=200 → Score: 1205 ✅ (First)
Patient C: Emergency=0, Wait=40min, Late=0, Present=200 → Score: 280

Final Order: B → C → A
```

---

## Real-World Rules Implemented

### 1. Late Patient Handling

```
IF patient arrives within grace period (15 min):
    ✅ Keep original queue position
ELSE IF delay > grace period (15-30 min):
    ⚠️ Mark as LATE, move after waiting patients
ELSE IF delay > max threshold (30+ min):
    ❌ Mark as NO_SHOW, remove from queue
```

### 2. No-Show Auto Handling

```
IF patient is called AND does not respond within X minutes:
    - Mark as NO_SHOW
    - Auto-advance queue
    - Apply optional penalty fee
```

### 3. Emergency Override Rule

```
IF patient priority == EMERGENCY:
    ✅ Insert at position 1 (after current patient)
    ✅ Notify all waiting patients of delay
```

### 4. Doctor Break / Pause Rule

```
IF doctor status == BREAK:
    ⏸️ Pause queue progression
    ⏸️ Freeze waiting time calculation
    🔔 Notify patients: "Doctor on break"
```

### 5. Queue Capacity Limit

```
IF queue length > MAX_LIMIT (60):
    🚫 Stop new bookings
    📺 Show "Queue Full"
    Provide alternatives
```

### 6. Multi-Source Queue Merge

Combines **appointments** and **walk-ins** into one queue:

```
Final Queue = Merge(appointments, walk-ins)
Based on:
    - Time slot
    - Priority
    - Arrival time
```

### 7. Fairness Rule

```
✅ Ensure no patient is skipped more than N times (3)
```

### 8. Double Booking Protection

```
IF patient already in queue OR has active appointment:
    🚫 Block duplicate entry
```

---

## Queue Command Center

### Mediator Dashboard Features

The Queue Command Center (`frontend/src/pages/mediator/MediatorDashboard.jsx`) provides:

1. **Public Display Preview**
   - Now serving token
   - Next patient token
   - Live status indicator

2. **Real-Time Stats**
   - Total patients today
   - Waiting count
   - In-progress count
   - Completed count

3. **Doctor Workload Distribution**
   - Visual progress bars for each doctor
   - Capacity percentage
   - Color-coded status

4. **Patient Management**
   - Add new walk-in patients
   - Call next patient
   - Start consultation
   - Complete consultation
   - Cancel/no-show handling

5. **Session Controls**
   - Start session
   - Pause session
   - End session
   - Session duration timer

---

## Integration Guide

### Import the Queue Engine

```javascript
import {
  QUEUE_CONFIG,
  QUEUE_STATUS,
  DOCTOR_STATUS,
  calculatePriorityScore,
  mergeQueues,
  recalculateQueueState,
  handleLatePatient,
  checkNoShow,
  getCurrentIST,
  isWithinWorkingHours,
  formatMinutes,
} from './services/queueEngine'
```

### Basic Queue Operations

```javascript
// Get patient position in queue
const position = getPatientPosition(patientId, queue)

// Calculate estimated wait time
const waitTime = getEstimatedWaitTime(patientId, avgConsultTime)

// Real-time subscription
const channel = subscribeToDoctorQueue(doctorId, callback)
```

### Check Queue Availability

```javascript
// Check if doctor can accept new patients
const canAccept = doctorStats.total < MAX_CAPACITY

// Get recommended doctor (shortest wait)
const recommended = getRecommendedDoctor(doctors, stats)
```

---

## Configuration

Edit configuration in respective files:

```javascript
// frontend/src/components/mediator/PatientCheckIn.jsx
const MAX_CAPACITY = 60

// frontend/src/services/queueEngine.js
export const QUEUE_CONFIG = {
  GRACE_PERIOD: 15,
  MAX_LATE_THRESHOLD: 30,
  NO_SHOW_RESPONSE_TIME: 5,
  MAX_QUEUE_CAPACITY: 60,
  DOCTOR_START_TIME: '09:00',
  DOCTOR_END_TIME: '18:00',
  MAX_SKIP_COUNT: 3,
}
```

---

## Key Benefits

✅ **Real hospital-like behavior** - Handles chaos gracefully  
✅ **Doctor capacity tracking** - 60 patients/day max per doctor  
✅ **Live availability display** - Real-time capacity status  
✅ **Queue command center** - Centralized admin dashboard  
✅ **Full capacity handling** - Alternatives when doctor full  
✅ **Fairness** - No patient starved of attention  
✅ **Scalable** - Works with 100s of patients  
✅ **Real-time updates** - Powered by Supabase subscriptions  

---

## Files

| File | Description |
|------|-------------|
| [`queueEngine.js`](frontend/src/services/queueEngine.js) | Core queue algorithm with priority scoring |
| [`queueApi.js`](frontend/src/services/queueApi.js) | API for queue CRUD operations |
| [`PatientCheckIn.jsx`](frontend/src/components/mediator/PatientCheckIn.jsx) | Patient registration with live availability |
| [`QueueMetricsPanel.jsx`](frontend/src/components/queue/QueueMetricsPanel.jsx) | Queue analytics dashboard |
| [`MediatorDashboard.jsx`](frontend/src/pages/mediator/MediatorDashboard.jsx) | Queue command center |
| [`PatientDashboard.jsx`](frontend/src/pages/patient/PatientDashboard.jsx) | Patient queue tracking |
| [`queueStore.jsx`](frontend/src/store/queueStore.jsx) | Queue state management |

---

*Built with real-world hospital requirements in mind.*
*Last Updated: 2026-04-01*