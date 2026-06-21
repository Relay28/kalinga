# Triage Package Submission Fix

## Problem
When clicking "Submit Triage Package", you were getting an error: **"Error submitting triage package"**

## Root Cause
The issue was caused by a missing API method. The `TriageSummary.jsx` component was calling `api.submitScan()`, but this method didn't exist in the `api.js` service file.

## What Was Fixed

### 1. Added Missing API Method
**File:** `client/src/services/api.js`

Added the `submitScan()` method:
```javascript
async submitScan(scan) {
  // Alias for saveScan - same functionality
  return request('/scans', {
    method: 'POST',
    body: scan
  });
}
```

### 2. Improved Error Handling
**File:** `client/src/services/api.js`

Enhanced the `request()` function to catch network errors and provide better error messages:
```javascript
try {
  const response = await fetch(url, config);
  // ... handle response
} catch (error) {
  // Check if it's a network error (server not running)
  if (error.message === 'Failed to fetch' || error.name === 'TypeError') {
    throw new Error('Server not reachable. Please ensure the backend is running on port 5000.');
  }
  throw error;
}
```

### 3. Enhanced Submission Logic
**File:** `client/src/pages/TriageSummary.jsx`

Improved the `handleSubmitTriagePackage()` function:

**Before:**
- Would fail silently with generic error
- No patient registration check
- Poor error messages
- Always navigated away immediately

**After:**
- Checks if patient exists on server first
- Registers patient if not found
- Better error messages with details
- Automatic fallback to offline queue if submission fails
- Delays navigation until after showing toast
- Clears localStorage after successful submission
- Comprehensive logging for debugging

### 4. Added Required Fields
The scan submission now includes all required fields:
- `suggestedFlag` - Computed from risk level (Urgent Referral/Warning/Normal)
- `status` - Either 'Submitted' (online) or 'Ready for Submission' (offline)
- All vitals and patient information

## How It Works Now

### Online Mode (Recommended)
1. User completes scan
2. Clicks "Submit Triage Package"
3. System checks if patient exists on server
4. If not, registers patient first
5. Submits scan to backend database
6. Shows success toast
7. Clears temporary storage
8. Navigates to dashboard
9. Scan immediately appears in OB-GYN portal

### Offline Mode (Fallback)
1. User completes scan
2. Clicks "Submit Triage Package"
3. Saves scan to offline queue in localStorage
4. Shows "Saved offline" toast
5. Navigates to dashboard
6. When back online, user clicks "Pending Uploads" to sync

### Automatic Fallback
If submission fails while online (server down, network error):
- Automatically saves to offline queue
- Shows warning toast
- Scan will sync later when server is available

## Testing the Fix

### Test 1: Normal Submission (Online Mode)
1. Start both servers: `npm run dev`
2. Verify backend running at http://localhost:5000/api/health
3. Complete a scan in the app
4. Click "Submit Triage Package"
5. Should see: "Triage package submitted successfully!" (green toast)
6. Navigate to http://localhost:5173/specialist
7. Your scan should appear in the pending list

### Test 2: Offline Mode
1. Start app
2. Click "Online Mode" to switch to "Offline Mode"
3. Complete a scan
4. Click "Submit Triage Package"
5. Should see: "Saved offline. Will sync when online."
6. Check "Pending Uploads (1)" button on dashboard
7. Switch back to "Online Mode"
8. Click "Pending Uploads" to sync

### Test 3: Server Down Fallback
1. Complete a scan
2. Stop backend server (Ctrl+C in server terminal)
3. Click "Submit Triage Package"
4. Should see error, then fallback message
5. Scan saved to offline queue
6. Restart backend
7. Click "Pending Uploads" to sync

## Verifying the Fix Works

### Check 1: Console Logs
Open browser console (F12) and look for:
```
Submitting scan: {id: "scan-...", patientId: "...", ...}
Stored scan data: {...}
```

### Check 2: Backend Logs
In your terminal where the server is running, look for:
```
POST /api/patients 201
POST /api/scans 201
```

### Check 3: Database File
Open `server/data/db.json` and verify:
- Your patient is in the `patients` array
- Your scan is in the `scans` array
- Scan status is "Submitted"

### Check 4: OB-GYN Portal
1. Go to http://localhost:5173/specialist
2. Your submitted scan should appear in:
   - "Pending Reviews" tab
   - Statistics counter
   - Case list on the left

## Common Issues & Solutions

### Issue: "Server not reachable"
**Cause:** Backend server not running
**Solution:** Run `npm run dev` from the root folder

### Issue: Scan submits but doesn't appear in OB-GYN portal
**Cause:** Auto-refresh hasn't triggered yet
**Solution:** 
- Wait 30 seconds for auto-refresh
- Or manually refresh the page (F5)
- Or check the "All Cases" tab

### Issue: Patient not found error
**Cause:** Patient wasn't registered on server
**Solution:** Now handled automatically - patient is registered before scan submission

### Issue: Submission works but takes user back immediately
**Cause:** Old code navigated instantly
**Solution:** Fixed - now waits 1 second to show toast message

## Technical Details

### Data Flow

#### Online Submission
```
User clicks Submit
    ↓
Check patient exists on server
    ↓ (if not found)
Register patient via POST /api/patients
    ↓
Submit scan via POST /api/scans
    ↓
Show success toast
    ↓
Clear localStorage
    ↓
Navigate to dashboard
```

#### Offline Submission
```
User clicks Submit
    ↓
Save to localStorage offline queue
    ↓
Update sync counter
    ↓
Show offline toast
    ↓
Navigate to dashboard
```

### Error Handling Chain

```
try {
  if (online) {
    try {
      // Ensure patient registered
      // Submit scan
      // Success!
    } catch (submitErr) {
      // Server error - fallback to offline
      offlineQueue.enqueue(scan)
    }
  } else {
    // Offline mode
    offlineQueue.enqueue(scan)
  }
} catch (err) {
  // Unexpected error
  showToast('An unexpected error occurred')
} finally {
  // Always stop loading state
  setSubmitting(false)
}
```

## Files Modified

1. ✅ `client/src/services/api.js`
   - Added `submitScan()` method
   - Enhanced error handling
   - Better network error detection

2. ✅ `client/src/pages/TriageSummary.jsx`
   - Improved submission logic
   - Added patient registration check
   - Better error messages
   - Automatic fallback to offline
   - Proper timing and navigation

3. ✅ Created `TROUBLESHOOTING.md`
   - Comprehensive troubleshooting guide
   - Common errors and solutions
   - Step-by-step debugging

## Before & After

### Before
❌ Generic error: "Error submitting triage package"  
❌ No indication of what went wrong  
❌ User confused about next steps  
❌ Patient might not be registered  
❌ No automatic fallback  

### After
✅ Specific error messages  
✅ Automatic patient registration  
✅ Automatic fallback to offline mode  
✅ Success confirmation  
✅ Proper error logging  
✅ Better user experience  

## Next Steps

1. **Start the application:**
   ```bash
   cd f:\Downloads\Kalinga\kalinga
   npm run dev
   ```

2. **Verify both servers running:**
   - Backend: http://localhost:5000/api/health
   - Frontend: http://localhost:5173

3. **Test the workflow:**
   - Register a patient
   - Complete a scan
   - Submit the triage package
   - Check OB-GYN portal

4. **If you encounter issues:**
   - See TROUBLESHOOTING.md
   - Check browser console (F12)
   - Check terminal logs
   - Verify backend is running

---

**The submission error has been fixed! Your scans should now submit successfully.** ✅
