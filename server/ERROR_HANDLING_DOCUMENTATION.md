# API Error Handling Documentation

## Overview

The Kalinga AI backend implements standardized error handling with consistent response formats, request validation using Joi, proper HTTP status codes, and comprehensive logging.

## Standardized Error Response Format

All API errors return a consistent JSON structure:

```json
{
  "error": "Error Type",
  "message": "Human-readable error description",
  "details": null | object | array
}
```

### Error Response Fields

- **error**: The error type/category (e.g., "Bad Request", "Not Found", "Unprocessable Entity")
- **message**: A clear, actionable error message
- **details**: Additional context (validation errors, field-specific messages, etc.)

## HTTP Status Codes

The API uses proper HTTP status codes to indicate the result of operations:

| Status Code | Error Type | Usage |
|-------------|------------|-------|
| **200** | OK | Successful GET requests |
| **201** | Created | Successful POST requests that create resources |
| **400** | Bad Request | Malformed request syntax or invalid request message |
| **404** | Not Found | Resource not found or endpoint doesn't exist |
| **422** | Unprocessable Entity | Validation errors - request syntax is valid but semantically incorrect |
| **500** | Internal Server Error | Unexpected server errors |

## Request Validation

### Validation Library: Joi

The API uses **Joi** for robust request validation with custom error messages.

### Validated Endpoints

#### 1. POST /api/patients

**Required Fields:**
- `id` (string): PhilHealth number
- `firstName` (string, 1-100 chars)
- `lastName` (string, 1-100 chars)
- `dob` (ISO date string)

**Optional Fields with Validation:**
- `bp` (string): Must match format `systolic/diastolic` (e.g., "120/80")
- `weight` (number): 30-200 kg
- `height` (number): 100-250 cm
- `mobile` (string): 10-15 digits
- `bmi` (number): 10-60
- `riskScore` (number): 5-95
- `heartRate` (number): 60-200

**Example Error Response:**
```json
{
  "error": "Unprocessable Entity",
  "message": "Validation failed",
  "details": [
    {
      "field": "id",
      "message": "Patient ID (PhilHealth number) is required"
    },
    {
      "field": "bp",
      "message": "Blood pressure must be in format: systolic/diastolic (e.g., 120/80)"
    }
  ]
}
```

#### 2. POST /api/scans

**Required Fields:**
- `id` (string): Unique scan identifier
- `patientId` (string): Must reference existing patient
- `riskScore` (number): 5-95

**Optional Fields:**
- `frames` (array): 1-10 frame objects
- `riskLevel` (string): "LOW RISK", "MODERATE RISK", or "HIGH RISK"
- `status` (string): "Submitted", "Reviewed", or "Failed"

**Business Logic Validation:**
- Checks if referenced patient exists (404 if not found)

#### 3. PATCH /api/scans/:id/verify

**Required Fields:**
- `verdict` (string): Must be one of "Normal", "High Risk", or "Urgent Referral"

**Optional Fields:**
- `notes` (string, max 1000 chars)
- `specialistName` (string, defaults to "Dr. Duque")

**Example Error Response:**
```json
{
  "error": "Unprocessable Entity",
  "message": "Validation failed",
  "details": [
    {
      "field": "verdict",
      "message": "Verdict must be one of: Normal, High Risk, Urgent Referral"
    }
  ]
}
```

## Error Logging

### Request Logging

Every API request is logged with:
- Timestamp (ISO 8601)
- HTTP method
- Endpoint path
- Client IP address
- User agent
- User ID (if authenticated, otherwise "anonymous")

**Example Request Log:**
```json
{
  "timestamp": "2026-06-21T12:37:26.535Z",
  "method": "POST",
  "endpoint": "/api/patients",
  "ip": "::ffff:127.0.0.1",
  "userAgent": "Mozilla/5.0...",
  "user": "anonymous"
}
```

### Response Logging

Every API response is logged with:
- Timestamp
- HTTP method
- Endpoint path
- Status code
- Response time (in milliseconds)
- User ID

**Example Response Log:**
```json
{
  "timestamp": "2026-06-21T12:37:26.535Z",
  "method": "POST",
  "endpoint": "/api/patients",
  "statusCode": 422,
  "responseTime": "5ms",
  "user": "anonymous"
}
```

### Error Logging

Errors (4xx and 5xx responses) are logged with full context:
- All request information
- Error message
- Status code
- Request payload (with sensitive fields redacted)
- Stack trace (in development mode only)

**Sensitive Field Sanitization:**

The following fields are automatically redacted from logs:
- `password`
- `token`
- `philhealthId`
- `ssn`

These fields appear as `[REDACTED]` in logs.

**Example Error Log:**
```json
{
  "timestamp": "2026-06-21T12:37:26.549Z",
  "endpoint": "POST /api/patients",
  "statusCode": 422,
  "message": "Validation failed",
  "user": "anonymous",
  "ip": "::ffff:127.0.0.1",
  "userAgent": "node",
  "payload": {
    "id": "test-123",
    "firstName": "John",
    "lastName": "Doe",
    "bp": "invalid-format"
  }
}
```

## Middleware Architecture

### 1. Request Logger Middleware

**Location:** `server/src/middleware/logger.js`

**Purpose:** Logs all incoming requests and outgoing responses

**Order:** Applied BEFORE route handlers

### 2. Validation Middleware

**Location:** `server/src/middleware/validation.js`

**Purpose:** Validates request body/params/query against Joi schemas

**Order:** Applied PER-ROUTE using `validate(schemaName)` wrapper

**Usage Example:**
```javascript
router.post('/', validate('createPatient'), asyncHandler(async (req, res) => {
  // req.body is now validated
  const patient = req.body;
  // ...
}));
```

### 3. Async Handler Wrapper

**Purpose:** Catches promise rejections in async route handlers and passes to error handler

**Usage Example:**
```javascript
router.get('/:id', asyncHandler(async (req, res) => {
  const scan = await db.getScanById(req.params.id);
  if (!scan) {
    throw new AppError('Scan record not found', 404);
  }
  res.json(scan);
}));
```

### 4. 404 Not Found Handler

**Location:** `server/src/middleware/errorHandler.js`

**Purpose:** Catches requests to undefined routes

**Order:** Applied AFTER all route definitions

### 5. Global Error Handler

**Location:** `server/src/middleware/errorHandler.js`

**Purpose:** Centralized error handling and response formatting

**Order:** Applied LAST (after all routes and 404 handler)

## Custom Error Class

### AppError

**Location:** `server/src/middleware/errorHandler.js`

**Purpose:** Create operational errors with status codes and details

**Constructor:**
```javascript
new AppError(message, statusCode, details = null)
```

**Usage Example:**
```javascript
if (!patient) {
  throw new AppError('Patient not found', 404);
}

// With details
if (duplicateId) {
  throw new AppError('Patient already exists', 409, {
    field: 'id',
    message: 'PhilHealth ID must be unique'
  });
}
```

## Testing

### Manual Test Script

**Location:** `server/test-error-handling.js`

**Run Tests:**
```bash
node test-error-handling.js
```

**Tests Covered:**
1. ✅ Missing required fields (422)
2. ✅ Invalid data format (422)
3. ✅ Non-existent resource (404)
4. ✅ Invalid route (404)
5. ✅ Invalid reference (404 with details)
6. ✅ Valid request (201)
7. ✅ Missing required field in nested object (422)
8. ✅ Invalid enum value (422)

All tests verify:
- Correct HTTP status code
- Standardized error response format
- Appropriate error messages
- Detailed validation errors where applicable

## Environment-Specific Behavior

### Development Mode

- Stack traces included in error responses
- Detailed console logging
- Error details exposed to client

### Production Mode

- Stack traces hidden from responses
- Sanitized error messages
- Sensitive data redacted from logs

**Set Environment:**
```bash
NODE_ENV=production npm start
```

## Common Error Scenarios

### 1. Validation Error (422)

**When:** Request has valid syntax but invalid semantics

**Example:**
- Missing required fields
- Invalid field format
- Out-of-range values
- Invalid enum values

### 2. Not Found (404)

**When:** Resource doesn't exist or invalid route

**Example:**
- GET /api/scans/nonexistent-id
- POST /api/scans with invalid patientId
- GET /api/invalid-endpoint

### 3. Conflict (409)

**When:** Resource already exists (duplicate)

**Example:**
- Creating patient with existing PhilHealth ID

### 4. Internal Server Error (500)

**When:** Unexpected server errors

**Example:**
- Database connection failures
- File system errors
- Unhandled exceptions

## Best Practices

1. **Always use AppError for operational errors:**
   ```javascript
   throw new AppError('Clear message', statusCode, optionalDetails);
   ```

2. **Use asyncHandler wrapper for async routes:**
   ```javascript
   router.get('/', asyncHandler(async (req, res) => {
     // Automatically catches promise rejections
   }));
   ```

3. **Add validation middleware to routes that accept data:**
   ```javascript
   router.post('/', validate('schemaName'), asyncHandler(...));
   ```

4. **Use specific HTTP status codes:**
   - 400: Bad Request (malformed syntax)
   - 404: Not Found (resource doesn't exist)
   - 422: Unprocessable Entity (validation error)
   - 500: Internal Server Error (unexpected errors)

5. **Include helpful error details:**
   ```javascript
   throw new AppError('Patient not found', 404, {
     field: 'patientId',
     message: `No patient found with ID: ${patientId}`
   });
   ```

## Migration from Old Error Handling

**Before (inconsistent):**
```javascript
router.post('/', async (req, res) => {
  try {
    if (!req.body.id) {
      return res.status(400).json({ error: "ID required" });
    }
    // ...
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
```

**After (standardized):**
```javascript
router.post('/', validate('createPatient'), asyncHandler(async (req, res) => {
  // Validation handled by middleware
  const saved = await db.save(req.body);
  res.status(201).json(saved);
}));
```

## Future Enhancements

- Centralized logging service integration (e.g., Winston, ELK stack)
- Error tracking service (e.g., Sentry)
- Rate limiting for API endpoints
- CORS configuration per environment
- API versioning with different error formats per version
