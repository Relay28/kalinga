# KalingaAI - Full-Stack Offline-First Maternal Triage MVP

KalingaAI is an offline-first AI-assisted maternal triage system that empowers rural midwives to capture specialist-grade diagnostics on government ultrasound equipment, flagging high-risk cases (preeclampsia/fetal distress) and forwarding reports to remote OB-Gyns for human-in-the-loop verification.

This repository implements the functional MVP, featuring a React frontend (styled as a premium mobile app frame for the midwife and a desktop portal for the specialist) and a Node.js/Express backend server with local file-based persistence.

---

## Technical Stack & Architecture

- **Frontend**: Vite + React, React Router, CSS Modules / Stylesheets, Lucide React (Icons).
- **Backend**: Node.js + Express, dotenv, cors.
- **Database**: Custom JSON file-based database (`db.js`) in `server/data/db.json` for zero-compile compatibility on all systems.
- **Offline Storage**: Midwife App Local Queue using browser `localStorage` + synchronous transaction locks.
- **Mock vs. Real Systems**:
  - **Real**: Client-server API communication, offline queue storage, preeclampsia risk scoring logic, sync validation, and specialist verification flow.
  - **Mock**: Camera/Video sweep frames collection, FetalCLIP model classification predictions, ID OCR Scanning.

---

## Installation & Setup

Ensure you have [Node.js](https://nodejs.org) (v16+) installed.

1. **Install all dependencies** (root, client, and server folders):
   ```bash
   npm run install:all
   ```

2. **Run the Development Server**:
   ```bash
   npm run dev
   ```
   This command starts the backend Express API (`http://localhost:5000`) and the Vite React frontend (`http://localhost:5173`) concurrently.

---

## Golden Path Demo Workflow

To demonstrate the full triage system:

1. **Login**: Open `http://localhost:5173` in your browser (Brave is recommended). Click **Login**.
2. **Go Offline**: Click the green **Online Mode** badge in the upper right. It will turn orange (**Offline Mode**).
3. **Register Patient**: Click **Register Patient**.
   - Click **Id Scanner** to fill demographic fields for **Maria Santos Cruz** (DOB: 1998-05-12, Age 27).
   - Enter **155/95** for BP, **79.5** for weight, **160** for height (BMI computes to 31.2).
   - Check **Chronic Hypertension?** and **Family History**.
   - Click **Register**.
4. **Ultrasound Scan**:
   - The app transitions to connection searching, then to the Scanning Simulator.
   - Click **Tap to Start Sweep**. Wait 10 seconds for the AI sweep guidance loop to complete.
   - Click **Save**.
5. **Lock & Encrypt**: On the Confirmation screen, verify that the rules-based preeclampsia engine flags the case as **HIGH RISK (78%)**. Click **Lock & Encrypt**. The scan is securely written to the midwife's offline queue.
6. **Go Online**: Note that **Pending Uploads (1)** is shown. Toggle the status badge back to **Online Mode** (green).
7. **Sync Queue**: Click the **Pending Uploads** button to sync. The scan will be uploaded to the server.
8. **Specialist Review**: Navigate to `http://localhost:5173/specialist` (or click the specialist link).
   - Maria Santos Cruz's case appears under **Pending Review**.
   - Select her case, read the maternal vitals/AI scores, add a recommendation, and click **Urgent Referral**.
9. **Verdict Backchannel**: Return to the midwife app at `http://localhost:5173`.
   - The notification bell displays a badge. Click it to find the specialist verdict.
   - Click **Read** to load the patient record, displaying the verified diagnosis by Dr. Duque.
