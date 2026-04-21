# Smart Medicine Reminder and Automatic Tablet Dispensing System

Production-ready full-stack web platform for medicine scheduling, dispenser monitoring, inventory tracking, and caretaker oversight.

## Tech Stack

- Frontend: React + Vite + Tailwind CSS + Firebase Web SDK
- Backend: Node.js + Express + Firebase Admin SDK + Firestore
- Auth: Firebase Authentication (email/password), protected API using Firebase ID token
- Realtime: Firestore listeners for live logs and notifications
- Notification-ready: Firebase Cloud Messaging service worker scaffold

## Project Structure

```text
medicine management system/
  backend/
    src/
      config/firebaseAdmin.js
      middleware/auth.js
      routes/
        authRoutes.js
        dashboardRoutes.js
        deviceRoutes.js
        logRoutes.js
        medicineRoutes.js
        notificationRoutes.js
        scheduleRoutes.js
      services/
        accessControl.js
        notificationService.js
      server.js
    .env.example
    package.json
  frontend/
    public/
      firebase-messaging-sw.js
    src/
      components/
        LogsTable.jsx
        MedicineForm.jsx
        MedicineTable.jsx
        NotificationPanel.jsx
        ScheduleForm.jsx
        Sidebar.jsx
        SlotStatusGrid.jsx
        SummaryCards.jsx
      context/AuthContext.jsx
      hooks/useRealtimeCollection.js
      pages/
        DashboardPage.jsx
        LoginPage.jsx
      services/
        api.js
        firebase.js
      App.jsx
      index.css
      main.jsx
    .env.example
    index.html
    package.json
    postcss.config.js
    tailwind.config.js
    vite.config.js
  config/
    firebase/
      firestore.indexes.json
      firestore.rules
      realtime-db.rules.json
  sample-data/
    sample-data.json
  README.md
```

## Core Features Implemented

1. Authentication System
- Signup/login using Firebase Authentication
- Roles: caretaker and elderly
- Protected backend APIs via Firebase ID token middleware

2. Dashboard UI
- Responsive medical UI (desktop/mobile)
- Shows next medicine time, medicine counts, missed doses, unread alerts
- Slot status for 4 slots with low/empty indicators

3. Medicine Management
- Add medicine
- Delete medicine
- Dispense action updates inventory and logs
- Fields supported: name, slot number, quantity, low threshold, dosage timing

4. Scheduling System
- Multiple times per day per medicine
- Daily and alternate-day frequency support
- APIs for create/get/update/delete schedule

5. IoT Integration Layer (Firebase)
- Collections aligned to project requirement:
  users, devices, medicines, schedules, logs, notifications
- Device sync API updates status and last sync
- Realtime listeners for logs/notifications in frontend

6. Logs and History
- Records scheduled time, actual time, status (taken/missed)
- Displayed in dashboard history table

7. Notification System
- Missed dose and low stock notifications persisted in Firestore
- Notification panel with mark-as-read action
- Service worker scaffold for Web Push/FCM

8. Inventory Management
- Remaining tablets auto-decrement on dispensing
- Low stock and empty stock alerts

9. Caretaker Monitoring
- Caretaker can link and monitor multiple elderly users
- Optional target user mode in dashboard

## Database Schema (Firestore)

- users: userId, name, email, role, linkedDeviceId, linkedUsers
- devices: deviceId, userId, status, lastSync
- medicines: medicineId, userId, name, slotNumber, totalQuantity, remainingQuantity, lowThreshold, dosageTiming
- schedules: scheduleId, userId, medicineId, times[], frequency, enabled
- logs: logId, userId, medicineId, medicineName, scheduledTime, actualTime, status
- notifications: notificationId, userId, type, message, status, createdAt

## REST API Summary

Base URL: http://localhost:5000/api

- POST /auth/signup
- POST /auth/login
- POST /auth/link-user
- GET /auth/me

- POST /medicines/add-medicine
- GET /medicines
- PUT /medicines/:medicineId
- DELETE /medicines/:medicineId
- POST /medicines/:medicineId/dispense

- POST /schedules
- GET /schedules/get-schedule
- GET /schedules/next
- PUT /schedules/:scheduleId
- DELETE /schedules/:scheduleId

- POST /logs/update-status
- GET /logs/logs

- POST /notifications
- GET /notifications
- PATCH /notifications/:notificationId/read

- POST /devices/sync
- GET /devices/:deviceId

- GET /dashboard/summary

## Step-by-Step Setup

1. Create Firebase project
- Enable Authentication > Email/Password
- Enable Firestore (production mode recommended with rules)
- Optional: enable Realtime DB and Cloud Messaging

2. Create service account
- Firebase Console > Project Settings > Service Accounts > Generate key
- Set values in backend/.env from service account fields

3. Configure backend
- Copy backend/.env.example to backend/.env and fill values
- Install and run:

```bash
cd backend
npm install
npm run dev
```

4. Configure frontend
- Copy frontend/.env.example to frontend/.env and fill values
- Install and run:

```bash
cd frontend
npm install
npm run dev
```

5. Deploy Firebase rules/indexes
- Install Firebase CLI
- In project root, initialize firebase if needed
- Deploy artifacts from config/firebase

```bash
firebase deploy --only firestore:rules --project <your-project-id>
firebase deploy --only firestore:indexes --project <your-project-id>
```

## Real-time Sync Flow

- Web writes schedules/medicines to Firestore
- ESP32 reads schedules and slot states from Firestore
- ESP32 writes dispense logs and status updates
- Dashboard listens in real time to logs and notifications

## Offline Sync Strategy (Device-side Design)

- Device stores unsent logs in local queue (NVS/flash)
- On reconnect, device flushes queue to Firestore logs collection
- Each log should include unique event ID to avoid duplicate inserts

## Sample Data

Use sample-data/sample-data.json for development seeding and UI testing.

## Production Notes

- Add rate limiting and request validation middleware (Joi/Zod)
- Move secrets to secure vault (GCP Secret Manager)
- Add CI/CD pipeline and environment-specific config
- Add audit logs and backup/retention policies
- Add unit/integration tests before release

## Deploy (Vercel + Render)

Recommended deployment split for this project:
- Frontend (React/Vite): Vercel
- Backend (Express API): Render Web Service

### 1) Deploy Backend on Render

This repo includes `render.yaml` for quick setup.

1. Push the repository to GitHub.
2. In Render, create a new Blueprint service from the repository.
3. Render will detect `render.yaml` and create the web service from `backend/`.
4. In Render service environment variables, set:

- `FIREBASE_WEB_API_KEY`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
- `FRONTEND_URLS`

Use `FRONTEND_URLS` as comma-separated URLs for CORS, for example:

```text
https://your-app.vercel.app,https://your-preview.vercel.app
```

After deploy, verify:

```text
https://<your-render-service>.onrender.com/health
```

### 2) Deploy Frontend on Vercel

This repo includes `frontend/vercel.json` with SPA rewrites.

1. In Vercel, import the GitHub repository.
2. Set Root Directory to `frontend`.
3. Build settings:
  - Install Command: `npm ci`
  - Build Command: `npm run build`
  - Output Directory: `dist`
4. Add environment variables in Vercel project settings:

- `VITE_API_BASE_URL=https://<your-render-service>.onrender.com/api`
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

5. Redeploy frontend after saving env variables.

### 3) Final Wiring Checklist

1. Add your final Vercel domain(s) to backend `FRONTEND_URLS` on Render.
2. Confirm frontend calls the Render API URL from `VITE_API_BASE_URL`.
3. Test login, dashboard load, medicine CRUD, and schedule endpoints.
