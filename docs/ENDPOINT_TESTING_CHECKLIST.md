# API Endpoint Testing Checklist

This checklist helps verify that all REST API endpoints are functioning correctly. Use this for manual testing, QA validation, or integration testing.

## Testing Environment

- **Server URL**: `http://localhost:5000`
- **API Base Path**: `/api`
- **Test Date**: _____________
- **Tester**: _____________
- **Phase**: Phase 1 (MVP)

---

## 1. Health Check Endpoint

### ✅ GET /api/health

**Purpose**: Verify server is running and healthy

**Test Steps**:
1. [ ] Send GET request to `/api/health`
2. [ ] Verify response status: 200 OK
3. [ ] Verify response contains `status: "healthy"`
4. [ ] Verify response contains `timestamp` field

**Expected Response**:
```json
{
  "status": "healthy",
  "timestamp": "2025-03-22T14:30:00.000Z"
}
```

**Test Result**: ⬜ Pass ⬜ Fail  
**Notes**: ___________________________________

---

## 2. Patient Endpoints

### ✅ GET /api/patients

**Purpose**: List all registered patients

**Test Steps**:
1. [ ] Send GET request to `/api/patients`
2. [ ] Verify response status: 200 OK
3. [ ] Verify response is an array
4. [ ] Verify seed patients are present (Maria Santos Cruz, etc.)
5. [ ] Verify each patient has required fields: `id`, `firstName`, `lastName`, `bloodPressure`, `riskScore`

**Expected Response**: Array of patient objects

**Test Result**: ⬜ Pass ⬜ Fail  
**Notes**: ___________________________________

---

### ✅ POST /api/patients (Valid Request)

**Purpose**: Create new patient record

**Test Steps**:
1. [ ] Generate unique PhilHealth ID
2. [ ] Send POST request with valid patient data
3. [ ] Verify response status: 201 Created
4. [ ] Verify response contains created patient with all fields
5. [ ] Verify patient appears in GET `/api/patients` list

**Test Payload**:
```json
{
  "id": "9999-8888-7777",
  "philhealthId": "9999-8888-7777",
  "firstName": "Test",
  "lastName": "Patient",
  "dateOfBirth": "1995-01-01",
  "age": 30,
  "mobile": "09123456789",
  "bloodPressure": "120/80",
  "bloodPressureSystolic": 120,
  "bloodPressureDiastolic": 80,
  "weight": 60,
  "height": 160,
  "bmi": 23.4,
  "location": "Test Location",
  "midwifeId": "MW-TEST-01",
  "riskFactors": {
    "chronicHypertension": false,
    "familyHistory": false,
    "isFirstPregnancy": false,
    "isMultiplePregnancy": false,
    "hasDiabetes": false,
    "hasPreviousCSection": false,
    "hasAbdominalPain": false
  },
  "status": "Ready to Scan",
  "riskScore": 15,
  "createdAt": "2025-03-22T15:00:00.000Z"
}
```

**Test Result**: ⬜ Pass ⬜ Fail  
**Created Patient ID**: ___________________________________  
**Notes**: ___________________________________

---

### ✅ POST /api/patients (Duplicate PhilHealth ID)

**Purpose**: Verify duplicate detection

**Test Steps**:
1. [ ] Send POST request with existing PhilHealth ID (e.g., "7102-4481-9352")
2. [ ] Verify response status: 409 Conflict
3. [ ] Verify error message indicates duplicate PhilHealth ID

**Expected Response**:
```json
{
  "error": "Patient with this PhilHealth ID already exists",
  "statusCode": 409,
  "timestamp": "..."
}
```

**Test Result**: ⬜ Pass ⬜ Fail  
**Notes**: ___________________________________

---

### ✅ POST /api/patients (Missing Required Fields)

**Purpose**: Verify validation

**Test Steps**:
1. [ ] Send POST request with missing `firstName`
2. [ ] Verify response status: 400 Bad Request
3. [ ] Verify error message indicates validation failure

**Test Result**: ⬜ Pass ⬜ Fail  
**Notes**: ___________________________________

---

## 3. Scan Endpoints

### ✅ GET /api/scans

**Purpose**: List all scan records

**Test Steps**:
1. [ ] Send GET request to `/api/scans`
2. [ ] Verify response status: 200 OK
3. [ ] Verify response is an array
4. [ ] Verify each scan has required fields: `id`, `patientId`, `status`, `riskScore`

**Test Result**: ⬜ Pass ⬜ Fail  
**Notes**: ___________________________________

---

### ✅ GET /api/scans/pending

**Purpose**: Get scans awaiting specialist review

**Test Steps**:
1. [ ] Send GET request to `/api/scans/pending`
2. [ ] Verify response status: 200 OK
3. [ ] Verify response is an array
4. [ ] Verify all returned scans have `status: "Submitted"`
5. [ ] Verify no scans with `status: "Reviewed"` are returned

**Test Result**: ⬜ Pass ⬜ Fail  
**Notes**: ___________________________________

---

### ✅ GET /api/scans/:id (Valid ID)

**Purpose**: Retrieve specific scan

**Test Steps**:
1. [ ] Get a valid scan ID from GET `/api/scans`
2. [ ] Send GET request to `/api/scans/{scanId}`
3. [ ] Verify response status: 200 OK
4. [ ] Verify response contains complete scan details

**Scan ID Used**: ___________________________________  
**Test Result**: ⬜ Pass ⬜ Fail  
**Notes**: ___________________________________

---

### ✅ GET /api/scans/:id (Invalid ID)

**Purpose**: Verify 404 handling

**Test Steps**:
1. [ ] Send GET request to `/api/scans/invalid-scan-id`
2. [ ] Verify response status: 404 Not Found
3. [ ] Verify error message indicates scan not found

**Expected Response**:
```json
{
  "error": "Scan record not found",
  "statusCode": 404,
  "timestamp": "..."
}
```

**Test Result**: ⬜ Pass ⬜ Fail  
**Notes**: ___________________________________

---

### ✅ POST /api/scans (Valid Request)

**Purpose**: Upload triage package

**Prerequisites**: Create a test patient first (or use existing patient ID)

**Test Steps**:
1. [ ] Use valid patient ID from previous test
2. [ ] Send POST request with complete scan data
3. [ ] Verify response status: 201 Created
4. [ ] Verify response contains created scan
5. [ ] Verify scan appears in GET `/api/scans` list

**Test Payload**:
```json
{
  "id": "scan-test-001",
  "patientId": "9999-8888-7777",
  "frames": [
    {
      "id": "frame-1",
      "sequenceNumber": 1,
      "imageData": "assets/ultrasound_sweep.png",
      "timestamp": 1600,
      "fetalClipClassification": {
        "plane": "fetal_head",
        "confidence": 92
      }
    }
  ],
  "riskScore": 25,
  "riskLevel": "LOW RISK",
  "status": "Submitted",
  "fetalHeartRate": 140,
  "gestationalAgeEstimate": "Est: 20w 1d",
  "createdAt": "2025-03-22T15:00:00.000Z",
  "submittedAt": "2025-03-22T15:05:00.000Z"
}
```

**Test Result**: ⬜ Pass ⬜ Fail  
**Created Scan ID**: ___________________________________  
**Notes**: ___________________________________

---

### ✅ POST /api/scans (Invalid Patient ID)

**Purpose**: Verify foreign key validation

**Test Steps**:
1. [ ] Send POST request with non-existent `patientId`
2. [ ] Verify response status: 404 Not Found
3. [ ] Verify error message indicates patient not found

**Expected Response**:
```json
{
  "error": "Patient not found",
  "statusCode": 404,
  "details": {
    "field": "patientId",
    "message": "No patient found with ID: ..."
  },
  "timestamp": "..."
}
```

**Test Result**: ⬜ Pass ⬜ Fail  
**Notes**: ___________________________________

---

## 4. Specialist Verification

### ✅ PATCH /api/scans/:id/verify (Valid Request)

**Purpose**: Submit specialist verdict

**Prerequisites**: Create a scan with status "Submitted"

**Test Steps**:
1. [ ] Use valid scan ID from previous test
2. [ ] Send PATCH request with verdict data
3. [ ] Verify response status: 200 OK
4. [ ] Verify scan status changed to "Reviewed"
5. [ ] Verify verdict and notes are saved
6. [ ] Verify notification was created (check GET `/api/notifications`)

**Test Payload**:
```json
{
  "verdict": "Normal",
  "notes": "Scan quality good. No signs of complications. Continue routine prenatal care.",
  "specialistName": "Dr. Test Specialist"
}
```

**Scan ID Used**: ___________________________________  
**Test Result**: ⬜ Pass ⬜ Fail  
**Notes**: ___________________________________

---

### ✅ PATCH /api/scans/:id/verify (Invalid Scan ID)

**Purpose**: Verify 404 handling

**Test Steps**:
1. [ ] Send PATCH request to `/api/scans/invalid-id/verify`
2. [ ] Verify response status: 404 Not Found
3. [ ] Verify error message indicates scan not found

**Test Result**: ⬜ Pass ⬜ Fail  
**Notes**: ___________________________________

---

## 5. Notification Endpoints

### ✅ GET /api/notifications

**Purpose**: Get all notifications

**Prerequisites**: At least one specialist verdict submitted

**Test Steps**:
1. [ ] Send GET request to `/api/notifications`
2. [ ] Verify response status: 200 OK
3. [ ] Verify response is an array
4. [ ] Verify notifications contain: `id`, `patientId`, `patientName`, `verdict`, `status`
5. [ ] Verify notification exists for previously verified scan

**Test Result**: ⬜ Pass ⬜ Fail  
**Notes**: ___________________________________

---

### ✅ PATCH /api/notifications/:id/read (Valid Request)

**Purpose**: Mark notification as read

**Test Steps**:
1. [ ] Get a notification ID with `status: "unread"`
2. [ ] Send PATCH request to `/api/notifications/{notificationId}/read`
3. [ ] Verify response status: 200 OK
4. [ ] Verify notification status changed to "read"
5. [ ] Verify GET `/api/notifications` shows updated status

**Notification ID Used**: ___________________________________  
**Test Result**: ⬜ Pass ⬜ Fail  
**Notes**: ___________________________________

---

### ✅ PATCH /api/notifications/:id/read (Invalid ID)

**Purpose**: Verify 404 handling

**Test Steps**:
1. [ ] Send PATCH request to `/api/notifications/invalid-id/read`
2. [ ] Verify response status: 404 Not Found
3. [ ] Verify error message indicates notification not found

**Test Result**: ⬜ Pass ⬜ Fail  
**Notes**: ___________________________________

---

## 6. AI Simulation Endpoint (Phase 1)

### ✅ POST /api/ai/classify (High Risk Case)

**Purpose**: Simulate high risk classification

**Test Steps**:
1. [ ] Send POST request with high BP values
2. [ ] Verify response status: 200 OK
3. [ ] Verify `preliminaryRiskLabel: "HIGH"`
4. [ ] Verify `suggestedFlag: "Urgent Referral"`
5. [ ] Verify `riskScore` is high (e.g., 78)

**Test Payload**:
```json
{
  "firstName": "Maria",
  "lastName": "Test",
  "bp": "160/100",
  "bmi": 32
}
```

**Test Result**: ⬜ Pass ⬜ Fail  
**Risk Score Returned**: ___________________________________  
**Notes**: ___________________________________

---

### ✅ POST /api/ai/classify (Low Risk Case)

**Purpose**: Simulate low risk classification

**Test Steps**:
1. [ ] Send POST request with normal values
2. [ ] Verify response status: 200 OK
3. [ ] Verify `preliminaryRiskLabel: "LOW"`
4. [ ] Verify `suggestedFlag: "Normal"`
5. [ ] Verify `riskScore` is low (e.g., 20)

**Test Payload**:
```json
{
  "firstName": "Anna",
  "lastName": "Test",
  "bp": "115/75",
  "bmi": 22
}
```

**Test Result**: ⬜ Pass ⬜ Fail  
**Risk Score Returned**: ___________________________________  
**Notes**: ___________________________________

---

## 7. Complete Workflow Test

### ✅ End-to-End Triage Workflow

**Purpose**: Verify complete system workflow

**Test Steps**:

1. [ ] **Create Patient**: POST `/api/patients`
   - Patient ID: ___________________________________

2. [ ] **Upload Scan**: POST `/api/scans`
   - Scan ID: ___________________________________
   - Verify status: "Submitted"

3. [ ] **Specialist Reviews**: GET `/api/scans/pending`
   - Verify scan appears in pending list

4. [ ] **Submit Verdict**: PATCH `/api/scans/{scanId}/verify`
   - Verify status changed to "Reviewed"

5. [ ] **Check Notification**: GET `/api/notifications`
   - Verify notification created with correct verdict

6. [ ] **Mark as Read**: PATCH `/api/notifications/{notificationId}/read`
   - Verify status changed to "read"

7. [ ] **Verify Patient Update**: GET `/api/patients`
   - Verify patient status changed to "Reviewed"

**Overall Workflow Test Result**: ⬜ Pass ⬜ Fail  
**Notes**: ___________________________________

---

## 8. Error Handling Tests

### ✅ Malformed JSON

**Test Steps**:
1. [ ] Send POST request with invalid JSON
2. [ ] Verify response status: 400 Bad Request

**Test Result**: ⬜ Pass ⬜ Fail

---

### ✅ Missing Content-Type Header

**Test Steps**:
1. [ ] Send POST request without `Content-Type: application/json`
2. [ ] Verify appropriate error handling

**Test Result**: ⬜ Pass ⬜ Fail

---

### ✅ Undefined Route

**Test Steps**:
1. [ ] Send GET request to `/api/undefined-route`
2. [ ] Verify response status: 404 Not Found

**Test Result**: ⬜ Pass ⬜ Fail

---

## 9. Performance Tests

### ✅ Response Time

**Test Steps**:
1. [ ] Measure response time for GET `/api/patients`
2. [ ] Verify response time < 500ms

**Response Time**: ___________ ms  
**Test Result**: ⬜ Pass ⬜ Fail

---

### ✅ Large Payload

**Test Steps**:
1. [ ] Upload scan with 10 frames
2. [ ] Verify successful processing
3. [ ] Measure response time

**Response Time**: ___________ ms  
**Test Result**: ⬜ Pass ⬜ Fail

---

## 10. Data Validation Tests

### ✅ PhilHealth ID Format

**Test Steps**:
1. [ ] Test various PhilHealth ID formats
2. [ ] Verify proper validation (should be XX-XXXXXXXXX-X format)

**Test Result**: ⬜ Pass ⬜ Fail

---

### ✅ Risk Score Range

**Test Steps**:
1. [ ] Verify risk scores are clamped between 5-95
2. [ ] Test edge cases

**Test Result**: ⬜ Pass ⬜ Fail

---

## Test Summary

**Total Tests**: 30  
**Tests Passed**: _____  
**Tests Failed**: _____  
**Tests Skipped**: _____  

**Overall Result**: ⬜ Pass ⬜ Fail

---

## Issues Found

| # | Endpoint | Issue Description | Severity | Status |
|---|----------|-------------------|----------|--------|
| 1 |          |                   |          |        |
| 2 |          |                   |          |        |
| 3 |          |                   |          |        |

---

## Recommendations

1. ___________________________________
2. ___________________________________
3. ___________________________________

---

## Sign-Off

**Tester Name**: _____________________  
**Date**: _____________________  
**Signature**: _____________________

**Approved By**: _____________________  
**Date**: _____________________  

---

**Document Version**: 1.0.0  
**Last Updated**: March 22, 2025  
**Phase**: Phase 1 (MVP)
