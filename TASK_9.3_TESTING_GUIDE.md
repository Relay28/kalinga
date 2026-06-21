# Task 9.3: Risk Score Recalculation - Testing Guide

## Implementation Summary

Task 9.3 has been successfully implemented with the following features:

### 1. **Edit Patient Data**
- Added "Edit Patient Data" button on Patient Details page
- Editable fields: Weight, Height, Blood Pressure, Risk Factors
- BMI auto-recalculates when weight or height changes

### 2. **Automatic Risk Score Recalculation**
- Risk score recalculates automatically when any of these change:
  - Blood pressure
  - Weight/Height (via BMI)
  - Any risk factor checkboxes

### 3. **Risk Score Updated Notification**
- Displays toast notification showing:
  - Whether score increased, decreased, or stayed the same
  - Amount of change
  - New risk score percentage

### 4. **Recalculation History**
- Stores all recalculations in localStorage
- Shows last 3 recalculations on Patient Details page
- Displays:
  - Timestamp
  - Old vs New risk score
  - Direction indicator (↑ increased / ↓ decreased)
  - List of changed fields

## Manual Testing Steps

### Test 1: Edit Blood Pressure
1. Navigate to http://localhost:5173
2. Log in (if required)
3. Click on a patient (e.g., Maria Santos Cruz)
4. Click "Edit Patient Data" button
5. Change BP from "155/95" to "120/80"
6. Click "Save & Recalculate"
7. **Expected:** 
   - Toast notification: "Risk score updated: decreased by X% (now Y%)"
   - Risk speedometer updates to new score
   - Recalculation history shows new entry

### Test 2: Edit Weight (BMI Auto-update)
1. On Patient Details page, click "Edit Patient Data"
2. Change Weight from current value to different value (e.g., 70 → 85)
3. **Expected (immediate):** BMI field updates automatically
4. Click "Save & Recalculate"
5. **Expected:**
   - Risk score increases (due to higher BMI)
   - Toast shows updated risk score
   - History shows both Weight and BMI changes

### Test 3: Edit Risk Factors
1. Click "Edit Patient Data"
2. Check/uncheck risk factor checkboxes (e.g., add "Diabetes")
3. Click "Save & Recalculate"
4. **Expected:**
   - Risk score changes based on factor (+10 for diabetes)
   - Toast notification appears
   - History shows which risk factor changed

### Test 4: Multiple Simultaneous Changes
1. Click "Edit Patient Data"
2. Make multiple changes:
   - BP: 120/80 → 160/100
   - Weight: 70 → 85
   - Check "Chronic Hypertension"
3. Click "Save & Recalculate"
4. **Expected:**
   - Significant risk score increase
   - Toast shows total change
   - History shows all changed fields

### Test 5: Verify History Persistence
1. Make several edits (3-4 recalculations)
2. Navigate away from patient details
3. Return to the same patient
4. **Expected:** 
   - All recalculation history is still visible
   - History persists across page reloads

### Test 6: Cancel Edit
1. Click "Edit Patient Data"
2. Make some changes
3. Click "Cancel" button
4. **Expected:**
   - All changes are discarded
   - Patient data returns to original state
   - No recalculation occurs

## Automated Tests

Run unit tests:
```bash
cd client
npm test -- riskScoreRecalculation.test.js --run
```

**Expected:** All 12 tests pass ✓

### Test Coverage
- ✓ BP changes trigger recalculation
- ✓ BMI changes trigger recalculation
- ✓ Risk factor changes trigger recalculation
- ✓ BMI auto-updates with weight changes
- ✓ BMI auto-updates with height changes
- ✓ Multiple simultaneous changes handled correctly
- ✓ Risk scores clamped to [5, 95] range
- ✓ History tracks old/new scores
- ✓ History tracks changed fields
- ✓ Change detection (increase/decrease/no change)

## API Endpoints

### PATCH /api/patients/:id
**Purpose:** Update patient data and persist to database

**Request Body:**
```json
{
  "bp": "140/90",
  "weight": 75,
  "height": 160,
  "bmi": "29.3",
  "riskScore": 65,
  "riskFactors": {
    "hypertension": true,
    "family": false,
    ...
  },
  "lastUpdated": "2025-05-29T21:40:00Z"
}
```

**Response:**
```json
{
  "id": "7102-4481-9352",
  "firstName": "Maria",
  "lastName": "Cruz",
  ...updated fields,
  "lastUpdated": "2025-05-29T21:40:00Z"
}
```

## Files Modified

### Frontend
1. **client/src/pages/PatientDetails.jsx**
   - Added edit mode state
   - Added edit UI controls (buttons, inputs)
   - Added recalculation logic
   - Added history display

2. **client/src/services/api.js**
   - Added `updatePatient(id, patient)` method

3. **client/src/services/aiService.js**
   - Exported `calculateRiskLocally` for use in PatientDetails

### Backend
4. **server/src/routes/patients.js**
   - Added `PATCH /api/patients/:id` endpoint

## Data Storage

### localStorage Keys
- `kalinga_patients` - Array of patient records
- `kalinga_recalc_history_<patientId>` - Recalculation history for each patient

### Recalculation History Format
```javascript
{
  timestamp: "2025-05-29T21:40:00Z",
  oldRiskScore: 45,
  newRiskScore: 68,
  changedFields: [
    "BP: 120/80 → 140/90",
    "Weight: 70 → 75",
    "hypertension: false → true"
  ],
  reason: "Manual data update"
}
```

## Requirements Satisfied

**Requirement 7.1:** Preliminary Risk Detection
- ✓ Risk score recalculates when patient data changes
- ✓ Uses rules-based algorithm with all risk factors
- ✓ Updates immediately upon saving edits

**Task 9.3 Acceptance Criteria:**
- ✓ Allow editing patient data after initial registration
- ✓ Automatically recalculate risk score when factors change
- ✓ Display "Risk score updated" notification
- ✓ Store recalculation history for audit trail

## Known Limitations

1. **Online Sync:** Changes are saved locally immediately. If online, they're synced to the server. If offline, changes persist locally but won't sync until connection is restored.

2. **History Limit:** UI shows last 3 recalculations (all stored, but only recent ones displayed for space)

3. **Concurrent Edits:** No conflict resolution if patient is edited on multiple devices simultaneously

## Future Enhancements (Phase 2)

- Real-time sync across devices
- Conflict resolution for concurrent edits
- More detailed audit trail with user information
- Rollback capability to previous values
- Notification to specialists when high-risk patient data changes
