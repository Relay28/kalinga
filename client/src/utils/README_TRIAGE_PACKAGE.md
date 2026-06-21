# Triage Package Utilities

This document describes the utilities for creating, validating, and managing triage packages in the Kalinga AI system.

## Overview

The triage package compilation system has been enhanced (Task 8.4) to include:

1. **Field Validation**: Comprehensive validation of all required fields before compilation
2. **UUID v4 Generation**: Unique scan identifiers using RFC4122-compliant UUID v4
3. **ISO 8601 Timestamps**: Standardized timestamp format for all packages
4. **Error Handling**: Robust error handling for storage quota and validation failures

## Implementation Details

### Requirements Satisfied

- **Requirement 8.1**: Validate all required fields present before compilation
- **Requirement 8.5**: Generate unique scan ID (UUID v4)
- **Requirement 8.6**: Generate ISO 8601 timestamp
- **Requirements 7.1-7.10**: Validate risk scoring and classification

### File Structure

```
client/src/utils/
├── uuid.js                      # UUID v4 generation and validation
├── triagePackageValidator.js    # Package validation and creation
└── README_TRIAGE_PACKAGE.md     # This documentation
```

## UUID Utilities (`uuid.js`)

### `generateUuidV4()`

Generates a RFC4122 version 4 compliant UUID.

**Returns:** `string` - UUID v4 (e.g., "550e8400-e29b-41d4-a716-446655440000")

**Implementation:**
- Uses `crypto.randomUUID()` if available (modern browsers)
- Falls back to `crypto.getRandomValues()` for broader compatibility
- Last resort fallback uses `Math.random()` (less secure, but works everywhere)

**Example:**
```javascript
import { generateUuidV4 } from './utils/uuid';

const scanId = generateUuidV4();
// => "550e8400-e29b-41d4-a716-446655440000"
```

### `isValidUuidV4(uuid)`

Validates if a string is a valid UUID v4.

**Parameters:**
- `uuid` (string): UUID string to validate

**Returns:** `boolean` - True if valid UUID v4

**Example:**
```javascript
import { isValidUuidV4 } from './utils/uuid';

isValidUuidV4('550e8400-e29b-41d4-a716-446655440000'); // => true
isValidUuidV4('not-a-uuid');                            // => false
```

## Triage Package Validator (`triagePackageValidator.js`)

### `validatePatientData(patient)`

Validates patient data required for triage package.

**Parameters:**
- `patient` (Object): Patient object with required fields

**Returns:** `{ valid: boolean, errors: string[] }`

**Required Patient Fields:**
- `id` - Patient identifier
- `firstName` - Patient first name (non-empty)
- `lastName` - Patient last name (non-empty)
- `bp` - Blood pressure in format "systolic/diastolic"
- `bmi` - Body Mass Index (numeric)

**Example:**
```javascript
import { validatePatientData } from './utils/triagePackageValidator';

const patient = {
  id: 'patient-123',
  firstName: 'Maria',
  lastName: 'Cruz',
  bp: '155/95',
  bmi: '25.4'
};

const result = validatePatientData(patient);
if (!result.valid) {
  console.error('Validation errors:', result.errors);
}
```

### `validateScanData(scan)`

Validates scan data required for triage package.

**Parameters:**
- `scan` (Object): Scan object with required fields

**Returns:** `{ valid: boolean, errors: string[] }`

**Required Scan Fields:**
- `riskScore` - Number between 5 and 95
- `fetalHeartRate` - Fetal heart rate (numeric)
- `gestationalAgeEstimate` - Gestational age estimate string

**Example:**
```javascript
import { validateScanData } from './utils/triagePackageValidator';

const scan = {
  riskScore: 78,
  fetalHeartRate: 140,
  gestationalAgeEstimate: 'Est: 24w 3d'
};

const result = validateScanData(scan);
if (!result.valid) {
  console.error('Validation errors:', result.errors);
}
```

### `validateTriagePackage(triagePackage)`

Validates complete triage package before storage.

**Parameters:**
- `triagePackage` (Object): Complete triage package

**Returns:** `{ valid: boolean, errors: string[] }`

**Validations Performed:**
1. Package has UUID v4 identifier
2. Package has patient ID
3. Package has valid ISO 8601 timestamp
4. Patient data is complete and valid
5. Scan data is complete and valid
6. Risk level classification matches risk score

**Risk Level Classification Rules:**
- Score ≥ 70: Risk level must be "HIGH"
- Score 40-69: Risk level must be "MODERATE"
- Score < 40: Risk level must be "LOW"

**Example:**
```javascript
import { validateTriagePackage } from './utils/triagePackageValidator';

const result = validateTriagePackage(triagePackage);
if (!result.valid) {
  console.error('Package validation failed:', result.errors);
  // Abort save operation
  return;
}
```

### `createTriagePackage(patient, scan, scanId)`

Creates a complete triage package with all required fields.

**Parameters:**
- `patient` (Object): Patient data
- `scan` (Object): Scan data
- `scanId` (string): UUID v4 for the scan

**Returns:** Complete triage package object

**Package Structure:**
```javascript
{
  // Package identifiers
  id: "550e8400-e29b-41d4-a716-446655440000",
  patientId: "patient-123",
  timestamp: "2024-01-15T10:30:45.123Z",
  
  // Patient data
  patient: {
    id: "patient-123",
    philhealthId: "12-345678901-2",
    firstName: "Maria",
    lastName: "Cruz",
    dateOfBirth: "1997-01-15",
    age: 27,
    bp: "155/95",
    weight: 65,
    height: 160,
    bmi: "25.4",
    riskFactors: { hypertension: true, family: false },
    location: "Langkas, Dalaguete, Cebu",
    lmp: "2024-01-01"
  },
  
  // Scan metadata
  selectedBestFrame: "assets/ultrasound_sweep.png",
  scanQualityScore: 92,
  
  // Fetal vitals
  fetalHeartRate: 140,
  gestationalAgeEstimate: "Est: 24w 3d",
  
  // Risk assessment
  riskScore: 78,
  preliminaryRiskLabel: "HIGH",
  suggestedFlag: "Urgent Referral",
  
  // Additional data
  findings: ["Elevated blood pressure detected"],
  riskDescription: "Potential Preeclampsia Indicators Detected",
  status: "Ready for Submission",
  location: "Langkas, Dalaguete, Cebu"
}
```

**Example:**
```javascript
import { generateUuidV4 } from './utils/uuid';
import { createTriagePackage } from './utils/triagePackageValidator';

const scanId = generateUuidV4();
const triagePackage = createTriagePackage(patient, scan, scanId);

console.log('Created package:', {
  id: triagePackage.id,
  timestamp: triagePackage.timestamp,
  patientName: `${triagePackage.patient.firstName} ${triagePackage.patient.lastName}`,
  riskScore: triagePackage.riskScore
});
```

## Integration with ScanConfirmation Component

The `ScanConfirmation.jsx` component has been updated to use these utilities:

### Workflow

1. **User clicks "Lock & Encrypt" button**
2. **Pre-validation**: Check if patient and scan data exist
3. **Generate UUID v4**: Create unique scan identifier
4. **Create package**: Call `createTriagePackage()` with patient, scan, and UUID
5. **Validate package**: Call `validateTriagePackage()` to ensure completeness
6. **Abort if invalid**: Show error toast with first validation error
7. **Proceed if valid**: Show encryption animation and save to localStorage/server

### Error Handling

**Validation Failures:**
```javascript
// If validation fails, user sees:
"✗ Validation failed: Patient first name is required"
// Component logs all errors to console for debugging
```

**Storage Quota Exceeded:**
```javascript
// User sees detailed dialog with options:
"Storage quota exceeded!
Cannot save scan to offline queue due to insufficient storage space.
Would you like to go to Storage Settings to free up space?"
```

**Network Upload Failure:**
```javascript
// Automatic fallback to offline queue:
"Upload failed. Scan saved to local offline queue."
```

### Console Logging

For debugging, the component logs:
```javascript
// Generated UUID
"Generated scan ID (UUID v4): 550e8400-e29b-41d4-a716-446655440000"

// Validation success
"Triage package validated successfully: { scanId, timestamp, patientName, riskScore }"

// Validation failure
"Validation error: Patient first name is required"

// Save operation
"Saving triage package: { id, timestamp, isOnline, status }"
```

## Testing

Comprehensive unit tests are provided in:
- `client/src/__tests__/unit/uuid.test.js`
- `client/src/__tests__/unit/triagePackageValidator.test.js`

**Run tests:**
```bash
npm run test:unit -- uuid.test.js triagePackageValidator.test.js
```

**Test Coverage:**
- UUID generation (uniqueness, format, version)
- UUID validation (valid/invalid formats)
- Patient data validation (all required fields)
- Scan data validation (risk score bounds, required fields)
- Complete package validation (timestamp format, risk level matching)
- Package creation (field completeness, ISO 8601 timestamps)

## Best Practices

### When Creating Triage Packages

1. **Always validate before saving**
   ```javascript
   const validation = validateTriagePackage(package);
   if (!validation.valid) {
     // Show error and abort
     return;
   }
   ```

2. **Use UUID v4 for all identifiers**
   ```javascript
   const scanId = generateUuidV4();  // ✓ Correct
   const scanId = `scan-${Date.now()}`; // ✗ Avoid
   ```

3. **Use ISO 8601 timestamps**
   ```javascript
   const timestamp = new Date().toISOString(); // ✓ Correct
   const timestamp = new Date().toLocaleString(); // ✗ Avoid
   ```

4. **Log validation errors for debugging**
   ```javascript
   if (!validation.valid) {
     validation.errors.forEach(error => console.error('Validation error:', error));
   }
   ```

### Error Handling

1. **Check validation before expensive operations**
2. **Provide specific error messages to users**
3. **Log detailed errors to console for debugging**
4. **Handle storage quota gracefully with user options**

## Future Enhancements (Phase 2)

1. **AES-256 Encryption**: Encrypt package data before local storage
2. **Frame Data**: Include actual captured ultrasound frames (base64 or blob)
3. **Digital Signatures**: Sign packages for integrity verification
4. **Compression**: Compress frame data to save storage space
5. **Offline Sync Retry**: Exponential backoff for failed uploads

## References

- **Requirements Document**: Section 8 (Triage Package Compilation and Security)
- **Design Document**: Section 1.4 (Triage Package Confirmation Module)
- **Tasks Document**: Task 8.4 (Improve triage package compilation)
