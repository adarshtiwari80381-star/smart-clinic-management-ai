# Clinic Management System AI - Database Architecture

This directory houses the database schema definitions, data models, seeding mechanisms, and data backup snapshots for the Clinic Management System AI application.

## 1. Directory Structure

```text
database/
├── schema/
│   ├── users/
│   │   └── userSchema.json         # JSON Schema for User authentication & roles
│   ├── patients/
│   │   └── patientSchema.json      # JSON Schema for Patient clinical records
│   ├── doctors/
│   │   └── doctorSchema.json       # JSON Schema for Doctor profiles & availability
│   ├── appointments/
│   │   └── appointmentSchema.json  # JSON Schema with conflict index specifications
│   └── medical_records/
│       └── medicalRecordSchema.json# JSON Schema for Diagnoses, Prescriptions & Vitals
│
├── seed/
│   ├── demo-data/
│   │   └── seedData.json           # Comprehensive demo datasets with realistic medical cases
│   └── seeder.js                   # Node.js script to reset & seed MongoDB
│
├── data/
│   ├── latest_seed_backup.json     # Generated snapshot of seeded data
│   └── README.md                   # Data backup guide
│
└── README.md                       # This document
```

---

## 2. Entity-Relationship Model

The database relies on MongoDB collections interconnected via ObjectId references:

```
+----------------+          1 : 1          +-------------------+
|      User      | <---------------------> | Patient or Doctor |
| (Auth & Roles) |                         | (Profile Entity)  |
+----------------+                         +-------------------+
       |                                             |
       |                                             |
       v                                             v
+----------------+      1 : N              +-------------------+
|  Appointment   | ----------------------> |   MedicalRecord   |
| (Slot Booking) |                         |  (Clinical Notes) |
+----------------+                         +-------------------+
       ^                                             ^
       |                                             |
       +---------------------------------------------+
```

### Relationship Details:
1. **Patient -> Appointment**: One patient can have multiple appointments over time (`patient: { type: ObjectId, ref: 'Patient' }`).
2. **Doctor -> Appointment**: One doctor can handle appointments across different dates and non-overlapping time slots (`doctor: { type: ObjectId, ref: 'Doctor' }`).
3. **Patient -> MedicalRecord**: Full historical medical timeline for every patient (`patient: { type: ObjectId, ref: 'Patient' }`).
4. **Doctor -> MedicalRecord**: Tracks the attending physician who issued the diagnosis and prescription (`doctor: { type: ObjectId, ref: 'Doctor' }`).

---

## 3. Availability Conflict Prevention (Database Layer)

To strictly enforce appointment availability at the database level, the `Appointment` collection maintains a **compound unique index**:

```javascript
appointmentSchema.index(
  { doctor: 1, appointmentDate: 1, appointmentTime: 1 },
  { unique: true }
);
```

If any request tries to book the same doctor at the same date and time slot:
- The controller will preemptively detect the conflict and return HTTP `409 Conflict` with the exact message: `"Doctor is not available at this time."`.
- If a race condition occurs, MongoDB's unique index triggers an `E11000 duplicate key error` which is caught and gracefully translated to the same error response.

---

## 4. How to Seed the Database

Ensure your local MongoDB service is running on `127.0.0.1:27017` (or provide `MONGO_URI` in `.env`).

From the backend directory:
```bash
cd backend
npm run seed
```

Or run directly with Node:
```bash
node database/seed/seeder.js
```

### Seeded Demo Accounts:
| Role | Email | Password | Linked Profile |
|---|---|---|---|
| **Admin** | `admin@clinic.com` | `admin123` | Master System Administrator |
| **Doctor** | `dr.sarah@clinic.com` | `doctor123` | Dr. Sarah Jenkins (Cardiologist) |
| **Doctor** | `dr.robert@clinic.com` | `doctor123` | Dr. Robert Chen (Pediatrician) |
| **Doctor** | `dr.priya@clinic.com` | `doctor123` | Dr. Priya Sharma (Dermatologist) |
| **Patient** | `john.doe@patient.com` | `patient123` | John Doe (35yo, O+) |
| **Patient** | `emily.watson@patient.com` | `patient123` | Emily Watson (28yo, A+) |
