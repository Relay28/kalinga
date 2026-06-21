# Kalinga AI REST API Documentation

## Overview

The Kalinga AI REST API provides endpoints for managing patient records, ultrasound scan triage packages, specialist verification workflows, and notifications for the maternal health diagnostic system.

**Base URL**: `http://localhost:5000/api`

**Version**: Phase 1 (MVP)

**Architecture Pattern**: Store-and-Forward Telemedicine with Offline-First Design

**Authentication**: Phase 1 - No authentication required; Phase 2 - JWT-based authentication (planned)

## Table of Contents

- [Quick Start](#quick-start)
- [API Endpoints](#api-endpoints)
  - [Health Check](#health-check)
  - [Patient Endpoints](#patient-endpoints)
  - [Scan Endpoints](#scan-endpoints)
  - [Specialist Verification](#specialist-verification)
  - [Notification Endpoints](#notification-endpoints)
  - [AI Simulation Endpoints](#ai-simulation-endpoints)
- [Data Models](#data-models)
- [Error Handling](#error-handling)
- [Status Codes](#status-codes)
- [Postman Collection](#postman-collection)

---

## Quick Start

### Prerequisites

- Node.js 14+ installed
- Server running on port 5000 (default)

### Starting the Server

```bash
cd server
npm install
npm start
```

The server will initialize the JSON database and seed demo data automatically.

### Testing the API

```bash
# Health check
curl http://localhost:5000/api/health

# Get all patients
curl http://localhost:5000/api/patients
```

---

## API Endpoints

### Health Check

#### GET /api/health

Check server health status.

**Authentication**: None required

**Request**:
```http
GET /api/health
```

**Response** (200 OK):
```json
{
  "status": "healthy",
  "timestamp": "2025-03-22T14:30:00.000Z"
}
```

---

## Patient Endpoints

### List All Patients

#### GET /api/patients

Retrieve all patient records from the database.

**Authentication**: None required (Phase 1)

**Request**:
```http
GET /api/patients
Accept: application/json
```

**Response** (200 OK):
```json
[
  {
    "id": "7102-4481-9352",
    "philhealthId": "7102-4481-9352",
    "firstName": "Maria",
    "middleName": "Santos",
    "lastName": "Cruz",
    "dateOfBirth": "1998-05-12",
    "age": 27,
    "mobile": "09174829382",
    "bloodPressure": "155/95",
    "bloodPressureSystolic": 155,
    "bloodPressureDiastolic": 95,
    "weight": 79.5,
    "height": 160,
    "bmi": 31.2,
    "lastMenstrualPeriod": "2025-12-30",
    "obstetricalHistory": "G2 P1",
    "location": "Langkas, Dalaguete, Cebu",
    "midwifeId": "MW-7729-01",
    "riskFactors": {
      "chronicHypertension": true,
      "familyHistory": true,
      "isFirstPregnancy": false,
      "isMultiplePregnancy": false,
      "hasDiabetes": false,
      "hasPreviousCSection": false,
      "hasAbdominalPain": false
    },
    "status": "Reviewed",
    "riskScore": 78,
    "heartRate": 140,
    "fetalAge": "Est: 24w 3d",
    "createdAt": "2025-03-22T14:34:00.000Z",
    "updatedAt": "2025-03-22T16:00:00.000Z"
  }
]
```

**Response Fields**:

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique patient identifier (PhilHealth ID format: XX-XXXXXXXXX-X) |
| `philhealthId` | string | Philippine national health insurance ID |
| `firstName` | string | Patient's first name |
| `middleName` | string | Patient's middle name (optional) |
| `lastName` | string | Patient's last name |
| `dateOfBirth` | string | ISO 8601 date format (YYYY-MM-DD) |
| `age` | number | Computed age in years |
| `mobile` | string | Mobile phone number |
| `bloodPressure` | string | BP reading in format "systolic/diastolic" |
| `bloodPressureSystolic` | number | Systolic BP in mmHg |
| `bloodPressureDiastolic` | number | Diastolic BP in mmHg |
| `weight` | number | Weight in kilograms |
| `height` | number | Height in centimeters |
| `bmi` | number | Body Mass Index (computed: weight / (height/100)²) |
| `lastMenstrualPeriod` | string | LMP date (ISO 8601) |
| `obstetricalHistory` | string | Gravida/Para notation (e.g., "G2 P1") |
| `location` | string | Patient's geographic location |
| `midwifeId` | string | ID of the attending midwife |
| `riskFactors` | object | Clinical risk factors for preeclampsia |
| `status` | string | Current workflow status: "Ready to Scan", "Submitted", "Reviewed" |
| `riskScore` | number | Preeclampsia risk score (5-95%) |
| `heartRate` | number | Fetal heart rate in BPM (null until scan complete) |
| `fetalAge` | string | Gestational age estimate (null until scan complete) |
| `createdAt` | string | ISO 8601 timestamp of record creation |
| `updatedAt` | string | ISO 8601 timestamp of last update |

---

### Create New Patient

#### POST /api/patients

Register a new patient record.

**Authentication**: None required (Phase 1)

**Request**:
```http
POST /api/patients
Content-Type: application/json
```

**Request Body**:
```json
{
  "id": "1234-5678-9101",
  "philhealthId": "1234-5678-9101",
  "firstName": "Anna",
  "middleName": "",
  "lastName": "Reyes",
  "dateOfBirth": "1995-08-20",
  "age": 30,
  "mobile": "09182736452",
  "bloodPressure": "135/85",
  "bloodPressureSystolic": 135,
  "bloodPressureDiastolic": 85,
  "weight": 62.0,
  "height": 158,
  "bmi": 24.8,
  "lastMenstrualPeriod": "2026-01-15",
  "obstetricalHistory": "G1 P0",
  "location": "Langkas, Dalaguete, Cebu",
  "midwifeId": "MW-7729-01",
  "riskFactors": {
    "chronicHypertension": false,
    "familyHistory": false,
    "isFirstPregnancy": true,
    "isMultiplePregnancy": false,
    "hasDiabetes": false,
    "hasPreviousCSection": false,
    "hasAbdominalPain": false
  },
  "status": "Ready to Scan",
  "riskScore": 35,
  "createdAt": "2025-03-22T15:12:00.000Z"
}
```

**Required Fields**:
- `id` - Unique PhilHealth ID
- `firstName` - Patient's first name
- `lastName` - Patient's last name
- `bloodPressure` - BP reading

**Response** (201 Created):
```json
{
  "id": "1234-5678-9101",
  "philhealthId": "1234-5678-9101",
  "firstName": "Anna",
  "lastName": "Reyes",
  "status": "Ready to Scan",
  "createdAt": "2025-03-22T15:12:00.000Z",
  ...
}
```

**Error Response** (409 Conflict):
```json
{
  "error": "Patient with this PhilHealth ID already exists",
  "statusCode": 409,
  "timestamp": "2025-03-22T15:12:00.000Z"
}
```

---

## Scan Endpoints

### List All Scans

#### GET /api/scans

Retrieve all scan records (triage packages).

**Authentication**: None required (Phase 1)

**Request**:
```http
GET /api/scans
Accept: application/json
```

**Response** (200 OK):
```json
[
  {
    "id": "scan-7102-20250322",
    "patientId": "7102-4481-9352",
    "frames": [
      {
        "id": "frame-1",
        "sequenceNumber": 1,
        "imageData": "assets/ultrasound_sweep.png",
        "timestamp": 1600,
        "fetalClipClassification": {
          "plane": "fetal_head",
          "confidence": 94
        }
      },
      {
        "id": "frame-2",
        "sequenceNumber": 2,
        "imageData": "assets/ultrasound_sweep.png",
        "timestamp": 3200,
        "fetalClipClassification": {
          "plane": "cardiac_4chamber",
          "confidence": 89
        }
      }
    ],
    "riskScore": 78,
    "riskLevel": "HIGH RISK",
    "status": "Reviewed",
    "fetalHeartRate": 140,
    "gestationalAgeEstimate": "Est: 24w 3d",
    "suggestedFlag": "Urgent Referral",
    "specialistName": "Dr. Duque",
    "recommendation": "Immediate referral to tertiary care facility. Monitor BP closely.",
    "verifiedTime": "March 22, 2026 4:00 pm",
    "createdAt": "2025-03-22T14:34:00.000Z",
    "submittedAt": "2025-03-22T14:40:00.000Z",
    "reviewedAt": "2025-03-22T16:00:00.000Z"
  }
]
```

**Response Fields**:

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique scan identifier |
| `patientId` | string | Foreign key to patient record |
| `frames` | array | Array of diagnostic ultrasound frames |
| `riskScore` | number | Preeclampsia risk percentage (5-95) |
| `riskLevel` | string | Risk classification: "LOW RISK", "MODERATE RISK", "HIGH RISK" |
| `status` | string | Workflow status: "Submitted", "Reviewed", "Failed" |
| `fetalHeartRate` | number | Fetal heart rate in BPM |
| `gestationalAgeEstimate` | string | AI-estimated gestational age |
| `suggestedFlag` | string | Specialist verdict: "Normal", "Warning", "Urgent Referral" |
| `specialistName` | string | Name of reviewing specialist |
| `recommendation` | string | Specialist's clinical notes |
| `verifiedTime` | string | Human-readable timestamp of specialist review |
| `createdAt` | string | ISO 8601 timestamp of scan capture |
| `submittedAt` | string | ISO 8601 timestamp of cloud upload |
| `reviewedAt` | string | ISO 8601 timestamp of specialist completion |

---

### Get Pending Scans

#### GET /api/scans/pending

Retrieve scans awaiting specialist review (status = "Submitted").

**Authentication**: None required (Phase 1)

**Request**:
```http
GET /api/scans/pending
Accept: application/json
```

**Response** (200 OK):
```json
[
  {
    "id": "scan-1234-20250322",
    "patientId": "1234-5678-9101",
    "status": "Submitted",
    "riskScore": 35,
    "riskLevel": "MODERATE RISK",
    ...
  }
]
```

---

### Get Scan by ID

#### GET /api/scans/:id

Retrieve a specific scan record by its unique identifier.

**Authentication**: None required (Phase 1)

**URL Parameters**:
- `id` (required) - Scan identifier

**Request**:
```http
GET /api/scans/scan-7102-20250322
Accept: application/json
```

**Response** (200 OK):
```json
{
  "id": "scan-7102-20250322",
  "patientId": "7102-4481-9352",
  "frames": [...],
  "riskScore": 78,
  "status": "Reviewed",
  ...
}
```

**Error Response** (404 Not Found):
```json
{
  "error": "Scan record not found",
  "statusCode": 404,
  "timestamp": "2025-03-22T16:00:00.000Z"
}
```

---

### Upload Triage Package

#### POST /api/scans

Upload a completed triage package from the midwife app (store-and-forward sync).

**Authentication**: None required (Phase 1)

**Request**:
```http
POST /api/scans
Content-Type: application/json
```

**Request Body**:
```json
{
  "id": "scan-1109-20250322",
  "patientId": "1109-8765-4321",
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
    },
    {
      "id": "frame-2",
      "sequenceNumber": 2,
      "imageData": "assets/ultrasound_sweep.png",
      "timestamp": 3200,
      "fetalClipClassification": {
        "plane": "abdominal",
        "confidence": 88
      }
    }
  ],
  "riskScore": 20,
  "riskLevel": "LOW RISK",
  "status": "Submitted",
  "fetalHeartRate": 138,
  "gestationalAgeEstimate": "Est: 18w 4d",
  "createdAt": "2025-03-22T13:00:00.000Z",
  "submittedAt": "2025-03-22T15:30:00.000Z"
}
```

**Required Fields**:
- `id` - Unique scan identifier
- `patientId` - Must match an existing patient record
- `frames` - At least 1 diagnostic frame
- `status` - Must be "Submitted" for new uploads

**Response** (201 Created):
```json
{
  "id": "scan-1109-20250322",
  "patientId": "1109-8765-4321",
  "status": "Submitted",
  "riskScore": 20,
  "createdAt": "2025-03-22T13:00:00.000Z",
  ...
}
```

**Error Response** (404 Not Found):
```json
{
  "error": "Patient not found",
  "statusCode": 404,
  "details": {
    "field": "patientId",
    "message": "No patient found with ID: 1109-8765-4321"
  },
  "timestamp": "2025-03-22T15:30:00.000Z"
}
```

---

## Specialist Verification

### Submit Specialist Verdict

#### PATCH /api/scans/:id/verify

Specialist submits diagnostic verdict and recommendations for a reviewed scan.

**Authentication**: None required (Phase 1); JWT required (Phase 2)

**URL Parameters**:
- `id` (required) - Scan identifier

**Request**:
```http
PATCH /api/scans/scan-7102-20250322/verify
Content-Type: application/json
```

**Request Body**:
```json
{
  "verdict": "Urgent Referral",
  "notes": "Immediate referral to tertiary care facility. Monitor BP closely. Signs of preeclampsia with severe features.",
  "specialistName": "Dr. Duque"
}
```

**Request Fields**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `verdict` | string | Yes | "Normal", "Warning", or "Urgent Referral" |
| `notes` | string | No | Clinical recommendations and observations |
| `specialistName` | string | No | Name of reviewing specialist (defaults to "Dr. Duque") |

**Response** (200 OK):
```json
{
  "success": true,
  "scan": {
    "id": "scan-7102-20250322",
    "patientId": "7102-4481-9352",
    "status": "Reviewed",
    "suggestedFlag": "Urgent Referral",
    "recommendation": "Immediate referral to tertiary care facility. Monitor BP closely. Signs of preeclampsia with severe features.",
    "specialistName": "Dr. Duque",
    "verifiedTime": "March 22, 2026 4:00 pm",
    "reviewedAt": "2025-03-22T16:00:00.000Z",
    ...
  }
}
```

**Side Effects**:
1. Updates scan status to "Reviewed"
2. Updates associated patient status to "Reviewed"
3. Creates a notification for the midwife app

**Error Response** (404 Not Found):
```json
{
  "error": "Scan not found",
  "statusCode": 404,
  "timestamp": "2025-03-22T16:00:00.000Z"
}
```

---

## Notification Endpoints

### Get All Notifications

#### GET /api/notifications

Retrieve all notifications for midwife app (specialist review results).

**Authentication**: None required (Phase 1)

**Polling Recommendation**: Poll this endpoint every 8 seconds when in Online Mode

**Request**:
```http
GET /api/notifications
Accept: application/json
```

**Response** (200 OK):
```json
[
  {
    "id": "notif-1711121234567-7102-4481-9352",
    "patientId": "7102-4481-9352",
    "patientName": "Maria Santos Cruz",
    "verdict": "Urgent Referral",
    "status": "unread",
    "iconType": "red",
    "timestamp": "March 22, 2026 4:00 pm"
  },
  {
    "id": "notif-1711121000000-1234-5678-9101",
    "patientId": "1234-5678-9101",
    "patientName": "Anna Reyes",
    "verdict": "Warning",
    "status": "read",
    "iconType": "orange",
    "timestamp": "March 22, 2026 3:45 pm"
  }
]
```

**Response Fields**:

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique notification identifier |
| `patientId` | string | Foreign key to patient record |
| `patientName` | string | Full name of patient for display |
| `verdict` | string | Specialist verdict: "Normal", "Warning", "Urgent Referral" |
| `status` | string | Read status: "unread" or "read" |
| `iconType` | string | UI color indicator: "red", "orange", "teal" |
| `timestamp` | string | Human-readable timestamp of notification creation |

---

### Mark Notification as Read

#### PATCH /api/notifications/:id/read

Mark a notification as read when the midwife views it.

**Authentication**: None required (Phase 1)

**URL Parameters**:
- `id` (required) - Notification identifier

**Request**:
```http
PATCH /api/notifications/notif-1711121234567-7102-4481-9352/read
Content-Type: application/json
```

**Request Body**: Empty (no body required)

**Response** (200 OK):
```json
{
  "success": true,
  "notification": {
    "id": "notif-1711121234567-7102-4481-9352",
    "patientId": "7102-4481-9352",
    "patientName": "Maria Santos Cruz",
    "verdict": "Urgent Referral",
    "status": "read",
    "iconType": "red",
    "timestamp": "March 22, 2026 4:00 pm"
  }
}
```

**Error Response** (404 Not Found):
```json
{
  "error": "Notification not found",
  "statusCode": 404,
  "timestamp": "2025-03-22T16:00:00.000Z"
}
```

---

## AI Simulation Endpoints

### Simulate AI Classification

#### POST /api/ai/classify

**Phase 1 Only**: Simulate FetalCLIP classification and risk assessment using rules-based logic.

**Note**: This endpoint is for Phase 1 demonstration only. Phase 2 will integrate actual AI models.

**Authentication**: None required

**Request**:
```http
POST /api/ai/classify
Content-Type: application/json
```

**Request Body**:
```json
{
  "firstName": "Maria",
  "lastName": "Cruz",
  "bp": "155/95",
  "bmi": 31.2
}
```

**Response** (200 OK):
```json
{
  "scanQualityScore": 92,
  "selectedBestFrame": "assets/ultrasound_sweep.png",
  "fetalHeartRate": 140,
  "gestationalAgeEstimate": "Est: 24w 3d",
  "preliminaryRiskLabel": "HIGH",
  "riskScore": 78,
  "suggestedFlag": "Urgent Referral"
}
```

**Classification Rules** (Phase 1):
- If name contains "Maria" OR BP ≥140/90 → HIGH risk (score 78, "Urgent Referral")
- If BP ≥130/85 → MODERATE risk (score 35, "Warning")
- Otherwise → LOW risk (score 20, "Normal")

---

## Data Models

### Patient Model

```typescript
interface Patient {
  id: string;                          // PhilHealth ID (XX-XXXXXXXXX-X)
  philhealthId: string;                // Same as id
  firstName: string;
  middleName?: string;
  lastName: string;
  dateOfBirth: string;                 // ISO 8601 date
  age: number;                         // Computed from DOB
  mobile: string;
  bloodPressure: string;               // "systolic/diastolic"
  bloodPressureSystolic: number;       // mmHg
  bloodPressureDiastolic: number;      // mmHg
  weight: number;                      // kg
  height: number;                      // cm
  bmi: number;                         // weight / (height/100)²
  lastMenstrualPeriod?: string;        // ISO 8601 date
  obstetricalHistory?: string;         // e.g., "G2 P1"
  location: string;
  midwifeId: string;
  riskFactors: {
    chronicHypertension: boolean;
    familyHistory: boolean;
    isFirstPregnancy: boolean;
    isMultiplePregnancy: boolean;
    hasDiabetes: boolean;
    hasPreviousCSection: boolean;
    hasAbdominalPain: boolean;
  };
  status: "Ready to Scan" | "Submitted" | "Reviewed";
  riskScore: number;                   // 5-95
  heartRate?: number;                  // BPM (null until scan)
  fetalAge?: string;                   // e.g., "Est: 24w 3d"
  createdAt: string;                   // ISO 8601 timestamp
  updatedAt?: string;                  // ISO 8601 timestamp
}
```

### Scan Model

```typescript
interface Scan {
  id: string;                          // Unique scan identifier
  patientId: string;                   // Foreign key to Patient
  frames: Frame[];                     // Diagnostic ultrasound frames
  riskScore: number;                   // 5-95
  riskLevel: "LOW RISK" | "MODERATE RISK" | "HIGH RISK";
  status: "Submitted" | "Reviewed" | "Failed";
  fetalHeartRate?: number;             // BPM
  gestationalAgeEstimate?: string;     // e.g., "Est: 24w 3d"
  suggestedFlag?: "Normal" | "Warning" | "Urgent Referral";
  specialistName?: string;             // Phase 1: "Dr. Duque"
  recommendation?: string;             // Specialist notes
  verifiedTime?: string;               // Human-readable timestamp
  createdAt: string;                   // ISO 8601 timestamp (scan time)
  submittedAt?: string;                // ISO 8601 timestamp (upload time)
  reviewedAt?: string;                 // ISO 8601 timestamp (review time)
}
```

### Frame Model

```typescript
interface Frame {
  id: string;                          // Unique frame identifier
  sequenceNumber: number;              // 1-10 (order in sweep)
  imageData: string;                   // Phase 1: asset path; Phase 2: base64
  timestamp: number;                   // ms since scan start
  fetalClipClassification?: {
    plane: "fetal_head" | "cardiac_4chamber" | "abdominal" | "femur" | "placenta";
    confidence: number;                // 0-100
  };
  qualityScore?: number;               // Phase 2: 0-100
  metadata?: {                         // Phase 2: DICOM metadata
    probeFrequency?: number;           // MHz
    depth?: number;                    // cm
    gain?: number;                     // dB
  };
}
```

### Notification Model

```typescript
interface Notification {
  id: string;                          // Unique notification identifier
  patientId: string;                   // Foreign key to Patient
  patientName: string;                 // Full name for display
  verdict: string;                     // Specialist verdict
  status: "unread" | "read";
  iconType: "red" | "orange" | "teal"; // UI color indicator
  timestamp: string;                   // Human-readable timestamp
}
```

---

## Error Handling

All error responses follow a consistent format:

```json
{
  "error": "Human-readable error message",
  "statusCode": 400,
  "details": {
    "field": "patientId",
    "message": "Additional context"
  },
  "timestamp": "2025-03-22T16:00:00.000Z"
}
```

### Common Error Scenarios

**Validation Error** (400 Bad Request):
```json
{
  "error": "Validation failed",
  "statusCode": 400,
  "details": {
    "field": "firstName",
    "message": "Patient must have a valid firstName"
  },
  "timestamp": "2025-03-22T16:00:00.000Z"
}
```

**Resource Not Found** (404 Not Found):
```json
{
  "error": "Patient not found",
  "statusCode": 404,
  "timestamp": "2025-03-22T16:00:00.000Z"
}
```

**Duplicate Resource** (409 Conflict):
```json
{
  "error": "Patient with this PhilHealth ID already exists",
  "statusCode": 409,
  "timestamp": "2025-03-22T16:00:00.000Z"
}
```

**Server Error** (500 Internal Server Error):
```json
{
  "error": "Internal server error",
  "statusCode": 500,
  "timestamp": "2025-03-22T16:00:00.000Z"
}
```

---

## Status Codes

| Code | Status | Description |
|------|--------|-------------|
| 200 | OK | Request successful |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Validation error or malformed request |
| 404 | Not Found | Resource does not exist |
| 409 | Conflict | Duplicate resource (e.g., PhilHealth ID) |
| 500 | Internal Server Error | Unexpected server error |

---

## Postman Collection

A Postman collection is available for API testing. See `KALINGA_AI_POSTMAN_COLLECTION.json` in the `docs/` directory.

### Collection Features

- All endpoints with example requests
- Environment variables for easy configuration
- Pre-configured test scripts
- Example responses for each endpoint
- Organized into folders by resource type

### Import Instructions

1. Open Postman
2. Click **Import** button
3. Select `KALINGA_AI_POSTMAN_COLLECTION.json`
4. Configure environment variables:
   - `base_url`: `http://localhost:5000`
   - `api_path`: `/api`

---

## Authentication (Phase 2)

**Phase 1**: No authentication required

**Phase 2 (Planned)**:
- JWT-based authentication
- Bearer token in Authorization header
- 8-hour session timeout
- Role-based access control (RBAC) for midwives and specialists

Example Phase 2 request:
```http
GET /api/scans/pending
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Rate Limiting

**Phase 1**: No rate limiting

**Phase 2 (Planned)**:
- 100 requests per minute per IP address
- 1000 requests per hour per authenticated user
- Rate limit headers in responses

---

## CORS Configuration

The API is configured to accept requests from:

- `http://localhost:5173` (default Vite dev server)
- Configurable via `CLIENT_URL` environment variable

---

## Database

**Phase 1**: JSON file-based storage at `server/data/db.json`

**Phase 2 (Planned)**: PostgreSQL or MongoDB with Sequelize/Mongoose ORM

---

## Support

For technical support or questions:
- Review the implementation guide: `client/IMPLEMENTATION_GUIDE.md`
- Check error handling documentation: `server/ERROR_HANDLING_DOCUMENTATION.md`
- See design document: `.kiro/specs/kalinga-ai-maternal-health-system/design.md`

---

**Document Version**: 1.0.0  
**Last Updated**: March 22, 2025  
**System Phase**: Phase 1 (MVP)
