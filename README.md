# KalingaAI - Full-Stack Offline-First Maternal Triage MVP

KalingaAI is an **offline-first AI-assisted maternal triage system** that empowers rural midwives to capture specialist-grade diagnostics on government ultrasound equipment, flagging high-risk cases (preeclampsia/fetal distress) and forwarding reports to remote OB-Gyns for human-in-the-loop verification.

This repository implements the functional MVP, featuring a React frontend (styled as a premium mobile app frame for the midwife and a desktop portal for the specialist) and a Node.js/Express backend server with **local file-based persistence** - **no external servers or databases required**.

---

## ✨ Key Features

### Midwife Dashboard (Mobile Interface)
- Patient registration with PhilHealth ID
- Ultrasound scan simulation with AI guidance
- Offline-first data storage with automatic sync
- Real-time preeclampsia risk assessment
- Encrypted local data storage

### OB-GYN Specialist Portal (Desktop Interface)
- **📊 Statistics Dashboard** - Total scans, pending reviews, high-risk cases, average risk scores
- **🔍 Search & Filter** - Find patients by name or ID, filter by risk level (high/moderate/low)
- **📋 Detailed Patient View** - Complete patient history, vitals, scan images, and risk factors
- **✅ Clinical Verification** - Approve as normal, flag warnings, or mark urgent referrals
- **🔄 Auto-Refresh** - Dashboard updates every 30 seconds with new submissions
- **🎨 Beautiful UI** - Modern, responsive design with color-coded risk indicators

---

## 🏗️ Technical Stack & Architecture

- **Frontend**: Vite + React 18, React Router v6, Lucide React (Icons)
- **Backend**: Node.js + Express, dotenv, cors
- **Database**: **Local JSON file storage** (`server/data/db.json`) - No MongoDB, PostgreSQL, or cloud databases
- **Offline Storage**: Browser `localStorage` + offline queue system
- **Mock vs. Real Systems**:
  - **Real**: Client-server API, offline queue, risk scoring, sync validation, specialist verification
  - **Mock**: Camera/video frames, AI model predictions, ID OCR scanning

---

## 🚀 Quick Start

Ensure you have [Node.js](https://nodejs.org) (v16+) installed.

### 1. Install Dependencies

From the root `kalinga` directory:

```bash
npm install
```

This installs dependencies for the root, client, and server.

### 2. Start Development Server

```bash
npm run dev
```

This starts:
- **Backend API**: `http://localhost:5000`
- **Frontend Client**: `http://localhost:5173`

### 3. Access the Application

- **Midwife App**: `http://localhost:5173`
- **OB-GYN Portal**: `http://localhost:5173/specialist` (or click "Specialist Portal" from dashboard)

---

## 📁 Project Structure

```
kalinga/
├── client/                    # React frontend (Vite)
│   ├── src/
│   │   ├── pages/            # Main application pages
│   │   │   ├── Login.jsx
│   │   │   ├── MidwifeDashboard.jsx
│   │   │   ├── PatientRegistration.jsx
│   │   │   ├── ScanSimulator.jsx
│   │   │   ├── ScanConfirmation.jsx
│   │   │   └── SpecialistDashboard.jsx  # ⭐ Enhanced OB-GYN Portal
│   │   ├── services/         # API and storage services
│   │   │   ├── api.js        # Backend API client
│   │   │   ├── storage.js    # LocalStorage wrapper
│   │   │   └── offlineQueue.js
│   │   └── styles/           # CSS styles
│   └── package.json
│
├── server/                    # Express.js backend
│   ├── src/
│   │   ├── routes/           # API endpoints
│   │   ├── data/             # Seed data
│   │   │   └── seed.js
│   │   ├── db.js             # Local JSON database manager
│   │   └── index.js          # Server entry point
│   ├── data/
│   │   └── db.json           # 📦 Local data storage (auto-created)
│   └── package.json
│
├── assets/                    # Static assets (ultrasound images)
├── Screens/                   # UI mockup images
└── package.json              # Root package with workspace scripts
```

---

## 🎯 Golden Path Demo Workflow

### Complete End-to-End Flow

1. **Login**: Open `http://localhost:5173` → Click **Login** (any credentials work)

2. **Toggle Offline Mode**: Click **Online Mode** badge (turns to **Offline Mode**)

3. **Register Patient**: 
   - Click **Register Patient**
   - Click **ID Scanner** to auto-fill: **Maria Santos Cruz** (DOB: 1998-05-12)
   - Enter vitals: BP **155/95**, Weight **79.5**, Height **160** (BMI auto-calculates to 31.2)
   - Check: **Chronic Hypertension** ✓ and **Family History** ✓
   - Click **Register**

4. **Ultrasound Scan**:
   - App transitions to scanning interface
   - Click **Tap to Start Sweep**
   - Wait 10 seconds for AI-guided sweep to complete
   - Click **Save**

5. **Review & Encrypt**: 
   - Confirmation screen shows **HIGH RISK (78%)** flag
   - Click **Lock & Encrypt**
   - Scan saved to local offline queue

6. **Go Online & Sync**:
   - Toggle back to **Online Mode**
   - Note **Pending Uploads (1)**
   - Click **Sync Queue** button
   - Scan uploads to local server database

7. **Specialist Review**:
   - Navigate to `http://localhost:5173/specialist`
   - View statistics dashboard showing new submission
   - Select **Maria Santos Cruz** from pending cases
   - Review ultrasound images, vitals, risk factors, and AI assessment
   - Add clinical recommendation notes
   - Click **Urgent Referral** to verify

8. **Notification Backchannel**:
   - Return to midwife dashboard
   - Bell icon shows notification badge
   - Click to view specialist verdict from Dr. Duque
   - Complete workflow loop ✅

---

## 🎨 OB-GYN Portal Enhancements

The Specialist Dashboard now includes:

### Statistics Cards
- Total scans processed
- Pending reviews count
- Reviewed cases count
- High-risk cases flagged
- Average risk score across all patients

### Search & Filter
- Search by patient name, ID, or scan ID
- Filter by risk level: All / High (≥70%) / Moderate (40-69%) / Low (<40%)
- Real-time filtering as you type

### Patient Details
- Large ultrasound scan viewer with thumbnail gallery
- Complete maternal vitals with color-coded indicators
- Fetal vitals and gestational age
- Clinical history and risk factors display
- Blood pressure danger matrix visualization
- AI risk speedometer gauge

### Workflow Features
- Auto-select next pending case after verification
- Visual status indicators (Submitted/Reviewed)
- Color-coded risk badges (Red/Orange/Green)
- Timestamp tracking for all submissions
- Auto-refresh every 30 seconds

---

## 💾 Data Storage

**Everything runs locally:**

- **Server Database**: `server/data/db.json` (auto-created on first run)
- **Browser Storage**: `localStorage` for offline queue
- **No External Services**: No MongoDB, no cloud databases, no external APIs

### Seed Data

Application includes 3 sample patients:
- **Maria Cruz** - High Risk (78%)
- **Anna Reyes** - Moderate Risk (35%)
- **Leah Dimaguiba** - Low Risk (20%)

---

## 🛠️ Development Scripts

```bash
# Start both client and server
npm run dev

# Start only client (Vite dev server)
npm run dev:client

# Start only server (Express API)
npm run dev:server

# Build client for production
cd client && npm run build
```

---

## 🔧 Configuration

### Environment Variables (Optional)

Create `.env` in the root directory:

```env
PORT=5000
CLIENT_URL=http://localhost:5173
```

Defaults work out of the box - no configuration required!

---

## 📊 API Endpoints

All data flows through the local Express server:

- `GET /api/health` - Health check
- `GET /api/patients` - Get all patients
- `POST /api/patients` - Register new patient
- `GET /api/scans` - Get all scans
- `POST /api/scans` - Submit new scan
- `GET /api/scans/pending` - Get pending scans (status: 'Submitted')
- `PATCH /api/scans/:id/verify` - Specialist verification
- `GET /api/notifications` - Get notifications

---

## 🌐 Offline-First Architecture

1. **Offline Mode**: Scans saved to browser `localStorage` queue
2. **Online Mode**: Direct submission to local server
3. **Auto-Sync**: Pending queue syncs when connection restored
4. **Data Persistence**: All data stored in `db.json` (survives restarts)

---

## 🎓 Technologies Used

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | React 18 | UI framework |
| Routing | React Router v6 | Page navigation |
| Build Tool | Vite | Fast dev server & bundling |
| Backend | Express.js | REST API server |
| Database | JSON File | Local data persistence |
| Icons | Lucide React | Beautiful icon library |
| Styling | CSS Variables | Consistent theming |

---

## 🐛 Troubleshooting

**Port already in use?**
```bash
# Change port in server/src/index.js or .env file
PORT=3000 npm run dev:server
```

**Database not updating?**
- Check `server/data/db.json` exists
- Restart server: `Ctrl+C` then `npm run dev`

**Assets not loading?**
- Ensure server is running on port 5000
- Check console for CORS errors

---

## 📝 License

MIT License - Free to use for educational and humanitarian purposes.

---

## 🤝 Contributing

This is a prototype/MVP. For production deployment:
- Replace JSON file storage with PostgreSQL/MongoDB
- Add real authentication and authorization
- Implement actual ML model integration
- Add comprehensive error handling
- Enable HTTPS and security headers

---

**Built with ❤️ for improving maternal healthcare in low-connectivity environments**
