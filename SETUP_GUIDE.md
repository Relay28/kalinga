# KalingaAI - Quick Setup Guide

## Prerequisites
- Node.js v16+ installed ([Download here](https://nodejs.org))
- Any modern web browser (Chrome, Firefox, Edge, Brave)

## Installation Steps

### 1. Open Terminal/Command Prompt
Navigate to the `kalinga` folder:
```bash
cd f:\Downloads\Kalinga\kalinga
```

### 2. Install All Dependencies
```bash
npm install
```

This will install dependencies for:
- Root workspace
- Client (React frontend)
- Server (Express backend)

### 3. Start the Application
```bash
npm run dev
```

Wait for both servers to start. You should see:
```
[KalingaAI Server] running on http://localhost:5000
VITE ready in XXX ms
Local: http://localhost:5173/
```

### 4. Open Your Browser
- **Midwife Dashboard**: http://localhost:5173
- **OB-GYN Portal**: http://localhost:5173/specialist

## First Time Usage

### Midwife Flow
1. Login with any username/password
2. Click "Register Patient"
3. Use "ID Scanner" button to auto-fill demo patient
4. Fill in vitals (BP: 155/95, Weight: 79.5, Height: 160)
5. Check risk factors: Hypertension, Family History
6. Click "Register"
7. Start ultrasound scan
8. Wait 10 seconds for scan to complete
9. Click "Save" then "Lock & Encrypt"
10. Scan is now saved locally!

### Specialist Flow
1. Navigate to http://localhost:5173/specialist
2. View dashboard statistics
3. Click on any pending case
4. Review patient details, vitals, and scan images
5. Add clinical recommendations
6. Click "Verify Normal", "Mark Warning", or "Urgent Referral"
7. Case is now verified!

## Features Overview

### Midwife Dashboard
✅ Patient registration
✅ Ultrasound scan simulation
✅ Offline mode support
✅ Auto-sync when online
✅ Risk assessment
✅ Encrypted local storage

### OB-GYN Specialist Portal
✅ Statistics dashboard (total scans, pending, high-risk, etc.)
✅ Search by patient name or ID
✅ Filter by risk level (high/moderate/low)
✅ Detailed patient history
✅ Ultrasound image viewer
✅ Clinical verification workflow
✅ Auto-refresh every 30 seconds
✅ Beautiful, responsive UI

## Data Storage

All data is stored **locally** in:
- `server/data/db.json` - Main database file
- Browser localStorage - Offline queue

**No external servers or cloud databases required!**

## Testing Offline Mode

1. Click the "Online Mode" badge in the top right
2. It will switch to "Offline Mode"
3. Submit a scan - it goes to the offline queue
4. Click back to "Online Mode"
5. Click "Sync Queue" to upload pending scans

## Default Seed Data

The app comes with 3 sample patients:
- **Maria Cruz** - High Risk (78%)
- **Anna Reyes** - Moderate Risk (35%)
- **Leah Dimaguiba** - Low Risk (20%)

## Troubleshooting

### Port Already in Use
If port 5000 or 5173 is already in use:
```bash
# Stop the server (Ctrl+C)
# Change ports in server/src/index.js or vite.config.js
```

### Database Not Updating
1. Stop the server (Ctrl+C)
2. Delete `server/data/db.json`
3. Restart: `npm run dev`
4. Database will be recreated with seed data

### Assets Not Loading
- Ensure backend is running on port 5000
- Check browser console for errors
- Verify `assets/` folder exists in root

### Clean Restart
```bash
# Stop all servers (Ctrl+C)
# Delete database
rm server/data/db.json

# Restart
npm run dev
```

## Development Commands

```bash
# Start both frontend and backend
npm run dev

# Start only frontend (client)
npm run dev:client

# Start only backend (server)
npm run dev:server

# Build frontend for production
cd client
npm run build
```

## Need Help?

1. Check the browser console (F12) for errors
2. Check the terminal for server logs
3. Verify all dependencies installed: `npm install`
4. Restart the application

## Success Indicators

✅ No errors in terminal
✅ Browser opens to login page
✅ Can navigate between pages
✅ Specialist portal shows statistics
✅ Can submit and verify scans

---

**You're all set! Enjoy using KalingaAI! 🎉**
