# MediFlow AI - Clinic Management System with AI Health Assistant

> A complete, production-grade 3-tier Healthcare Management System with automated appointment conflict detection, role-based access control (RBAC), clinical record keeping, and an offline-capable AI Health Assistant.

---

## 1. Project Structure

The project is strictly separated into three independent layers: **Frontend**, **Backend**, and **Database**.

```text
C:\Users\ADARSH\Desktop\clinic management system ai
│
├── frontend/                       # User Interface (HTML5, Vanilla CSS, Modern JS)
│   ├── index.html                  # Main SPA container & component shells
│   ├── style.css                   # Custom Medical Design System (Teal/Slate/Glassmorphic)
│   ├── script.js                   # Client REST API connector (fetch) & event handlers
│   ├── assets/
│   │   ├── images/                 # Clinic logo & branding assets
│   │   └── icons/                  # Specialized medical vector icons
│   └── pages/                      # Modular view templates & documentation
│
├── backend/                        # Node.js + Express.js REST API Server
│   ├── server.js                   # Express application entrypoint
│   ├── package.json                # Project manifest and scripts
│   ├── .env                        # Environment variables (PORT, MONGO_URI, JWT)
│   ├── routes/
│   │   ├── authRoutes.js           # /api/auth (login, logout, register, me)
│   │   ├── patientRoutes.js        # /api/patients (CRUD)
│   │   ├── doctorRoutes.js         # /api/doctors (CRUD & directory)
│   │   ├── appointmentRoutes.js    # /api/appointments (scheduling & conflict checks)
│   │   ├── medicalRecordRoutes.js  # /api/medical-records (clinical notes & Rx)
│   │   └── aiRoutes.js             # /api/ai/ask (medical triage engine)
│   ├── controllers/
│   │   ├── authController.js       # JWT generation & authentication
│   │   ├── patientController.js    # Patient registry logic
│   │   ├── doctorController.js     # Doctor roster management
│   │   ├── appointmentController.js# Preemptive conflict detection & booking
│   │   ├── medicalRecordController.js # Diagnoses, prescriptions & vitals
│   │   └── aiController.js         # Rule-based triage & emergency alert engine
│   ├── models/
│   │   ├── User.js                 # User credentials, bcrypt & role
│   │   ├── Patient.js              # Demographics, allergies, blood group
│   │   ├── Doctor.js               # Department, room, schedule, fees
│   │   ├── Appointment.js          # Slot tracking with compound unique index
│   │   └── MedicalRecord.js        # Clinical records, lab tests, prescriptions
│   ├── middleware/
│   │   ├── authMiddleware.js       # Bearer token verification & RBAC authorization
│   │   └── errorMiddleware.js      # Centralized error handler & conflict formatter
│   └── config/
│       └── database.js             # Mongoose connection & reconnection handler
│
├── database/                       # Database Architecture & Seeder
│   ├── schema/
│   │   ├── users/userSchema.json
│   │   ├── patients/patientSchema.json
│   │   ├── doctors/doctorSchema.json
│   │   ├── appointments/appointmentSchema.json
│   │   └── medical_records/medicalRecordSchema.json
│   ├── seed/
│   │   ├── demo-data/seedData.json # Comprehensive clinical sample dataset
│   │   └── seeder.js               # Standalone database reset and seed utility
│   ├── data/
│   │   └── latest_seed_backup.json # Automated data snapshot backup
│   └── README.md                   # ER Diagrams and database architecture guide
│
└── README.md                       # Master Documentation
```

---

## 2. Requirements

- **Operating System:** Windows 10/11, macOS, or Linux
- **Node.js:** v18.0.0 or higher (Installed: Node v24.x)
- **Package Manager:** npm v9.0.0 or higher
- **Database:** MongoDB Community Server (v6.x or v7.x) running locally on port `27017` (or MongoDB Atlas URI)
- **Web Browser:** Any modern web browser (Google Chrome, Microsoft Edge, Firefox)

---

## 3. Backend Installation

Navigate to the `backend` folder and install dependencies:

```powershell
cd "C:\Users\ADARSH\Desktop\clinic management system  ai\backend"
npm install
```

The installed dependencies include:
- `express` (v4.19+): Fast, unopinionated REST API framework
- `mongoose` (v8.4+): MongoDB Object Document Mapper
- `jsonwebtoken` (v9.0+): Secure JWT authentication tokens
- `bcryptjs` (v2.4+): Salted password hashing
- `cors` (v2.8+): Cross-Origin Resource Sharing
- `dotenv` (v16.4+): Environment variable management

---

## 4. Database Setup & Seeding

1. Ensure the local MongoDB service is running:
   ```powershell
   Get-Service *mongo*
   ```
   *(If stopped, start it via `Start-Service MongoDB` or Services manager).*

2. Populate the database with initial demo data (Doctors, Patients, Appointments, Clinical Records, and Hashed User Accounts):
   ```powershell
   cd "C:\Users\ADARSH\Desktop\clinic management system  ai\backend"
   npm run seed
   ```

   *Alternatively, run directly with Node:*
   ```powershell
   node ..\database\seed\seeder.js
   ```

---

## 5. How to Start Backend Server

To launch the Express REST API server:

```powershell
cd "C:\Users\ADARSH\Desktop\clinic management system  ai\backend"
node server.js
```

Or using npm:
```powershell
npm start
```

The server will display:
```text
==============================================
🏥 Clinic Management System AI Backend Server
📡 Listening on http://localhost:5000
🩺 Healthcheck: http://localhost:5000/api/health
==============================================
```

Verify backend health in your browser or PowerShell:
```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/health"
```

---

## 6. How to Open Frontend

The frontend is a pure client-side application located in `frontend/`.

You can open it in multiple ways:

### Option A: Double click `frontend/index.html`
Navigate to `C:\Users\ADARSH\Desktop\clinic management system  ai\frontend` and double-click `index.html` to open it in Chrome or Edge.

### Option B: Open via PowerShell
```powershell
Start-Process "C:\Users\ADARSH\Desktop\clinic management system  ai\frontend\index.html"
```

### Option C: Serve via Backend Static Path
With the backend server running, open:
[http://localhost:5000/static/index.html](http://localhost:5000/static/index.html)

---

## 7. Demo Login Accounts

The system comes pre-seeded with accounts for all three primary roles. In the UI login modal, you can click the **One-Click Demo Buttons** (`👑 Admin`, `🩺 Doctor`, `👤 Patient`) for immediate sign-in:

| Role | Email | Password | Assigned Profile | Key Permissions |
|---|---|---|---|---|
| **Admin** | `admin@smartclinic.com` | `admin123` | Master Clinic Admin | Full access to manage all doctors, patients, appointments, and records. |
| **Doctor** | `doctor@smartclinic.com` | `doctor123` | Dr. Sarah Jenkins (Cardiologist) | View assigned appointments & patients, create & edit clinical records, update consultation status. |
| **Patient** | `patient@smartclinic.com` | `patient123` | John Doe (35yo, O+) | View personal medical history & records, book conflict-free appointments, chat with AI. |

*Additional legacy accounts also available: `admin@clinic.com` (admin123), `dr.sarah@clinic.com` (doctor123), `john.doe@patient.com` (patient123).*

---

## 8. API Endpoints

### Authentication (`/api/auth`)
- `POST /api/auth/login`: Authenticate with email & password, returns JWT token.
- `POST /api/auth/register`: Self-registration for new patients.
- `POST /api/auth/logout`: Invalidate session.
- `GET /api/auth/me`: Fetch currently logged-in user profile.

### Patients (`/api/patients`)
- `GET /api/patients`: Get patients (role-scoped: Patients only see themselves; Admins see all).
- `GET /api/patients/:id`: Get detailed patient record.
- `POST /api/patients`: Register new patient (Admin & Doctor).
- `PUT /api/patients/:id`: Update patient details.
- `DELETE /api/patients/:id`: Remove patient and cascade appointments (Admin only).

### Doctors (`/api/doctors`)
- `GET /api/doctors`: List all doctors with filtering by specialization or search.
- `GET /api/doctors/:id`: Retrieve doctor profile and consultation schedule.
- `POST /api/doctors`: Add new doctor (Admin only).
- `PUT /api/doctors/:id`: Update doctor details (Admin or Doctor self-update).
- `DELETE /api/doctors/:id`: Delete doctor (Admin only).

### Appointments (`/api/appointments`)
- `GET /api/appointments`: List appointments (role-scoped).
- `GET /api/appointments/:id`: Get appointment details.
- `POST /api/appointments`: Book new appointment. **Enforces conflict check.**
- `PUT /api/appointments/:id`: Update appointment status or reschedule.
- `DELETE /api/appointments/:id`: Remove appointment.

### Medical Records (`/api/medical-records`)
- `GET /api/medical-records`: List clinical records (Patients see their own only).
- `GET /api/medical-records/:id`: Get complete case sheet (vitals, diagnosis, medications).
- `POST /api/medical-records`: Author a new clinical record (Doctor & Admin).
- `PUT /api/medical-records/:id`: Update clinical record.
- `DELETE /api/medical-records/:id`: Delete clinical record (Admin only).

### AI Health Assistant (`/api/ai`)
- `POST /api/ai/ask`: Health query endpoint with emergency triage, medical disclaimer, and clinical guidance.

---

## 9. Key Features & Business Rules

### 1. Preemptive Appointment Availability Conflict Check
Before creating any appointment:
1. The backend verifies `doctor`, `appointmentDate`, and `appointmentTime`.
2. If another active appointment exists for that doctor at that exact time slot:
   - Returns HTTP `409 Conflict` with:
     ```json
     { "success": false, "message": "Doctor is not available at this time." }
     ```
   - The frontend highlights the conflict alert and displays: `"Doctor is not available at this time."`
3. A compound unique index `{ doctor: 1, appointmentDate: 1, appointmentTime: 1 }` at the database level guarantees zero race-condition duplicates.

### 2. Strict Role-Based Access Control (RBAC)
Permissions are enforced at the API controller and middleware level:
- **Admin:** Full CRUD privileges on all collections.
- **Doctor:** Access to their assigned appointments, consultation records, and authorized patient sheets.
- **Patient:** Strictly restricted to their own appointments and clinical records; cannot modify clinic configuration or view other patients.

### 3. AI Health Assistant with Safety Guardrails
- **Offline & Zero-Cost:** Requires no external paid API key; powered by a clinical knowledge base and triage engine.
- **Mandatory Disclaimer:** Displays `"AI Health Assistant provides general health information and does not replace a qualified medical professional."` on every consultation.
- **Emergency Detection:** Automatically detects critical symptoms (crushing chest pain, stroke signs/FAST, respiratory distress, severe bleeding) and displays red emergency alert banners directing to immediate emergency services.

---

## 10. Troubleshooting

| Issue | Cause | Solution |
|---|---|---|
| `MongoServerSelectionError: connect ECONNREFUSED 127.0.0.1:27017` | MongoDB service is not running | Start the MongoDB Windows service: `Start-Service MongoDB` in PowerShell as administrator. |
| `Doctor is not available at this time.` | Selected doctor already has a booking for the chosen date & time | Choose another time slot (e.g. 10:30 AM or 02:00 PM) or select a different date/doctor. |
| `Not authorized to access this route` | Token is expired or missing | Click the user avatar in the top right, and click any of the **Quick Demo Sign-In** buttons (`Admin`, `Doctor`, or `Patient`). |
| Port 5000 in use | Another application is using port 5000 | Modify `PORT=5001` in `backend/.env`, restart server, and update `API_BASE` in `frontend/script.js`. |
