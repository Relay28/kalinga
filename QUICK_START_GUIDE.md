# Quick Start Guide: OB-GYN Sync Features

## 🚀 What's New?

### For Midwives:
- ✨ Triage scans now automatically sent to OB-GYN specialists
- 📊 See how many scans are under specialist review
- 🔄 Improved offline sync with better routing

### For OB-GYN Specialists:
- 📈 Real-time dashboard with key statistics
- 🔄 Auto-refresh every 30 seconds (or manual sync)
- 🟢 Online/Offline status indicator
- ⏱️ Last sync timestamp display

## 🎯 Quick Testing Steps

### Test the Complete Workflow (5 minutes)

#### Step 1: Submit a Triage Scan (Midwife)
```
1. Open browser → http://localhost:5173/dashboard
2. Click "New Triage Scan"
3. Select or register a patient
4. Complete the ultrasound scan
5. Review summary → Click "Submit Triage Package"
6. ✅ Look for toast: "✅ Triage scan sent to OB-GYN review queue"
```

#### Step 2: View in OB-GYN Panel (Specialist)
```
1. Open new tab → http://localhost:5173/specialist
2. ✅ Check stats dashboard at top (should show 1 pending)
3. ✅ Verify scan appears in left panel queue
4. Click on the scan to view details
5. ✅ Review patient data, risk score, and AI analysis
```

#### Step 3: Test Auto-Sync (Specialist)
```
1. In OB-GYN panel, look at header
2. ✅ Verify "Auto-refresh (30s)" checkbox is checked
3. ✅ See "Last synced: [time]" in header
4. Wait 30 seconds
5. ✅ Timestamp should update automatically
```

#### Step 4: Submit a Verdict (Specialist)
```
1. With a case selected, scroll to bottom
2. Write a recommendation in the text box
3. Click "Confirmed" (or "Escalated"/"Overridden")
4. ✅ Confirmation dialog appears
5. Click "Yes, Submit Verdict"
6. ✅ Success toast appears
7. ✅ Case automatically moves to "Reviewed" tab
```

#### Step 5: Test Offline Mode
```
1. Disconnect internet (turn off WiFi/ethernet)
2. Go back to Midwife Dashboard
3. Submit another triage scan
4. ✅ Toast: "📦 Saved offline. Will sync to OB-GYN when online"
5. Reconnect internet
6. Click "Sync Queue" button
7. ✅ Scan syncs and appears in OB-GYN panel
```

## 🎨 Visual Features to Notice

### Midwife Dashboard
- **Toast Messages**: Green success, yellow warning, red error
- **Sync Queue Badge**: Shows count of pending uploads
- **Network Status**: Online/Offline indicator in header

### OB-GYN Dashboard
**Header:**
- 🟢 Online status badge (or 🟡 Offline)
- 🔄 "Sync Now" button with spinning icon
- ☑️ "Auto-refresh (30s)" toggle checkbox
- ⏰ "Last synced: [time]" timestamp

**Stats Dashboard (4 cards):**
```
┌─────────────────┬─────────────────┬─────────────────┬─────────────────┐
│ ⏰ Pending      │ ⚠️ High Risk    │ ✅ Reviewed     │ 📈 Avg Response │
│ Review: 3       │ Cases: 1        │ Today: 5        │ Time: 15 min    │
└─────────────────┴─────────────────┴─────────────────┴─────────────────┘
```

**Queue Panel:**
- **Pending Review Tab**: Cases waiting for verdict
- **Reviewed Tab**: Completed cases
- **Search Bar**: Filter by name or PhilHealth ID
- **Sort Dropdown**: By date, risk level, or name

## 🔧 Common Issues & Solutions

### Issue: "Triage scan not appearing in OB-GYN panel"
**Solution:**
1. Check network connection (must be online)
2. Click "Sync Now" button in OB-GYN panel
3. Verify backend server is running (port 5000)
4. Check browser console for errors

### Issue: "Auto-refresh not working"
**Solution:**
1. Verify checkbox is checked ☑️
2. Must be online (🟢 status)
3. Wait full 30 seconds
4. Check console for errors

### Issue: "Offline sync not routing to OB-GYN"
**Solution:**
1. Verify scan was created with triage packet data
2. Check offline queue has `triagePacket` field
3. When syncing, check network tab for POST to `/api/triage`

### Issue: "Stats not updating"
**Solution:**
1. Click "Sync Now" to refresh manually
2. Verify backend connection
3. Check browser console for API errors

## 📱 Browser Compatibility

**Tested on:**
- ✅ Chrome/Edge (Recommended)
- ✅ Firefox
- ⚠️ Safari (may need adjustments)

**Requirements:**
- JavaScript enabled
- LocalStorage enabled
- Network access to backend (port 5000)

## 🔗 Important URLs

| Page | URL | Purpose |
|------|-----|---------|
| Splash | http://localhost:5173/ | Entry point |
| Login | http://localhost:5173/login | Authentication |
| Midwife Dashboard | http://localhost:5173/dashboard | Midwife portal |
| OB-GYN Dashboard | http://localhost:5173/specialist | Specialist portal |
| Triage Summary | http://localhost:5173/triage-summary | Scan submission |

## 🐛 Debug Checklist

If something isn't working:

**Frontend (Client):**
```bash
cd client
npm run dev
# Should start on port 5173
```

**Backend (Server):**
```bash
cd kalinga-backend
npm run dev
# Should start on port 5000
```

**Check Console Logs:**
1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for errors in red
4. Check Network tab for failed requests

**Check Backend Logs:**
1. Look at terminal running backend
2. Check for database connection errors
3. Verify triage endpoints are registered

## 📊 Data Verification

**Check if triage packet was created:**
```javascript
// In browser console on Triage Summary page
localStorage.getItem('kalinga_offline_queue')
// Should show array with triagePacket field
```

**Check sync queue:**
```javascript
// In browser console on Midwife Dashboard
JSON.parse(localStorage.getItem('kalinga_offline_queue'))
// Should show pending scans
```

**Check OB-GYN queue:**
```javascript
// In browser console, run:
fetch('http://localhost:5000/api/triage/queue?status=all', {
  headers: { 'Authorization': 'Bearer mock-jwt-token' }
})
.then(r => r.json())
.then(data => console.log(data))
```

## ✅ Success Indicators

You know everything is working when:

✅ **Midwife Side:**
- Submit triage → See success toast
- Console shows: "📋 X scans in OB-GYN review queue"
- Sync queue count increases (if offline)

✅ **OB-GYN Side:**
- Stats dashboard shows correct counts
- Pending tab has new scans
- Auto-refresh updates timestamp every 30s
- Clicking case shows full details
- Submitting verdict shows success and refreshes

✅ **Offline → Online:**
- Offline submission shows 📦 icon
- Reconnecting triggers sync
- Scans appear in OB-GYN after sync

## 🎓 Advanced Features

### Manual Testing with API
```bash
# Submit a test triage packet
curl -X POST http://localhost:5000/api/triage \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer mock-jwt-token" \
  -d '{
    "id": "test-123",
    "patientId": "patient-456",
    "systolicBP": 155,
    "diastolicBP": 95,
    "gestationalAgeWeeks": 24,
    "proteinUrine": "negative",
    "symptoms": ["headache"],
    "riskScore": 75,
    "triageLevel": "HIGH",
    "clientCapturedAt": "2024-01-15T10:30:00Z"
  }'
```

### Force Sync from Console
```javascript
// On Midwife Dashboard
window.dispatchEvent(new Event('online'))
// Triggers sync mechanism
```

## 📞 Need Help?

Check the detailed documentation:
- **Technical Details**: `OBGYN_SYNC_IMPLEMENTATION.md`
- **Overview**: `IMPLEMENTATION_SUMMARY.md`
- **This Guide**: `QUICK_START_GUIDE.md`

Happy testing! 🎉
