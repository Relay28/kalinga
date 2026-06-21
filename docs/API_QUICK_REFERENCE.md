# Kalinga AI REST API - Quick Reference

## Base URL
```
http://localhost:5000/api
```

## Quick Links
- **Full Documentation**: [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)
- **Postman Collection**: [KALINGA_AI_POSTMAN_COLLECTION.json](./KALINGA_AI_POSTMAN_COLLECTION.json)
- **Authentication (Phase 2)**: [AUTHENTICATION_REQUIREMENTS.md](./AUTHENTICATION_REQUIREMENTS.md)

---

## Endpoints Overview

### Health Check
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Server health status |

### Patients
| Method | Endpoint | Description | Auth (Phase 2) |
|--------|----------|-------------|----------------|
| GET | `/patients` | List all patients | Midwife |
| POST | `/patients` | Create new patient | Midwife |

### Scans
| Method | Endpoint | Description | Auth (Phase 2) |
|--------|----------|-------------|----------------|
| GET | `/scans` | List all scans | Any authenticated |
| GET | `/scans/pending` | List pending scans | Specialist |
| GET | `/scans/:id` | Get scan by ID | Any authenticated |
| POST | `/scans` | Upload triage package | Midwife |

### Specialist Verification
| Method | Endpoint | Description | Auth (Phase 2) |
|--------|----------|-------------|----------------|
| PATCH | `/scans/:id/verify` | Submit specialist verdict | Specialist |

### Notifications
| Method | Endpoint | Description | Auth (Phase 2) |
|--------|----------|-------------|----------------|
| GET | `/notifications` | Get all notifications | Midwife |
| PATCH | `/notifications/:id/read` | Mark as read | Midwife |

### AI Simulation (Phase 1 Only)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/ai/classify` | Simulate AI classification |

---

## Common Request Examples

### Create Patient
```bash
curl -X POST http://localhost:5000/api/patients \
  -H "Content-Type: application/json" \
  -d '{
    "id": "1234-5678-9101",
    "firstName": "Anna",
    "lastName": "Reyes",
    "bloodPressure": "135/85",
    "weight": 62,
    "height": 158,
    "bmi": 24.8
  }'
```

### Upload Scan
```bash
curl -X POST http://localhost:5000/api/scans \
  -H "Content-Type: application/json" \
  -d '{
    "id": "scan-123",
    "patientId": "1234-5678-9101",
    "status": "Submitted",
    "riskScore": 35,
    "frames": [...]
  }'
```

### Get Pending Scans
```bash
curl http://localhost:5000/api/scans/pending
```

### Submit Specialist Verdict
```bash
curl -X PATCH http://localhost:5000/api/scans/scan-123/verify \
  -H "Content-Type: application/json" \
  -d '{
    "verdict": "Urgent Referral",
    "notes": "Immediate referral needed.",
    "specialistName": "Dr. Duque"
  }'
```

### Get Notifications
```bash
curl http://localhost:5000/api/notifications
```

---

## Status Codes

| Code | Meaning | When |
|------|---------|------|
| 200 | OK | Request successful |
| 201 | Created | Resource created |
| 400 | Bad Request | Validation error |
| 401 | Unauthorized | Auth required (Phase 2) |
| 403 | Forbidden | Insufficient permissions (Phase 2) |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate resource |
| 500 | Server Error | Unexpected error |

---

## Key Data Models

### Patient (Minimal)
```json
{
  "id": "PhilHealth ID",
  "firstName": "string",
  "lastName": "string",
  "bloodPressure": "sys/dia",
  "weight": number,
  "height": number,
  "bmi": number,
  "riskScore": number
}
```

### Scan (Minimal)
```json
{
  "id": "string",
  "patientId": "string",
  "status": "Submitted|Reviewed",
  "riskScore": number,
  "riskLevel": "LOW RISK|MODERATE RISK|HIGH RISK",
  "frames": [...]
}
```

### Notification
```json
{
  "id": "string",
  "patientId": "string",
  "patientName": "string",
  "verdict": "Normal|Warning|Urgent Referral",
  "status": "unread|read"
}
```

---

## Error Response Format

```json
{
  "error": "Error message",
  "statusCode": 400,
  "details": { ... },
  "timestamp": "ISO 8601"
}
```

---

## Testing with Postman

1. Import collection: `KALINGA_AI_POSTMAN_COLLECTION.json`
2. Set variables:
   - `base_url`: `http://localhost:5000`
   - `api_path`: `/api`
3. Run requests in order:
   1. Health Check
   2. Create Patient
   3. Upload Scan
   4. Get Pending Scans
   5. Submit Verdict
   6. Get Notifications

---

## Workflow Example

### Complete Triage Workflow

```bash
# 1. Create patient
POST /api/patients
{ "id": "1234", "firstName": "Anna", ... }

# 2. Midwife captures scan offline
# (Local processing in Midwife App)

# 3. Upload triage package when online
POST /api/scans
{ "id": "scan-123", "patientId": "1234", "status": "Submitted", ... }

# 4. Specialist checks pending scans
GET /api/scans/pending

# 5. Specialist reviews and submits verdict
PATCH /api/scans/scan-123/verify
{ "verdict": "Urgent Referral", "notes": "..." }

# 6. Midwife polls for notifications
GET /api/notifications
# Returns notification with verdict

# 7. Midwife marks notification as read
PATCH /api/notifications/notif-123/read
```

---

## Development Tips

### Start Server
```bash
cd server
npm install
npm start
```

### Watch Logs
```bash
# Server logs show API requests
[KalingaAI Server] GET /api/patients 200 12ms
[KalingaAI Server] POST /api/scans 201 45ms
```

### Database Location
```
server/data/db.json
```

### Reset Database
```bash
# Delete database to reset
rm server/data/db.json
# Restart server to regenerate with seed data
npm start
```

---

## Integration Checklist

### Midwife App Integration
- [ ] Patient registration form → POST `/api/patients`
- [ ] Offline queue → stores scans in localStorage
- [ ] Sync button → POST `/api/scans` for each queued scan
- [ ] Notification polling → GET `/api/notifications` every 8s
- [ ] View results → PATCH `/api/notifications/:id/read`

### Specialist Dashboard Integration
- [ ] Login (Phase 2) → POST `/api/auth/login`
- [ ] Pending scans list → GET `/api/scans/pending`
- [ ] Case details → GET `/api/scans/:id`
- [ ] Submit verdict → PATCH `/api/scans/:id/verify`

---

## Common Issues

### CORS Error
**Problem**: Browser blocks request  
**Solution**: Server allows `http://localhost:5173` by default. Update `CLIENT_URL` env var if needed.

### 404 Not Found
**Problem**: Patient not found when uploading scan  
**Solution**: Create patient first with POST `/api/patients`

### Duplicate PhilHealth ID
**Problem**: 409 Conflict when creating patient  
**Solution**: PhilHealth IDs must be unique. Check existing patients first.

### Empty Notifications
**Problem**: GET `/api/notifications` returns `[]`  
**Solution**: Specialist must submit verdict first to generate notification.

---

## Environment Variables

```bash
# .env file
PORT=5000
CLIENT_URL=http://localhost:5173
NODE_ENV=development

# Phase 2 (Planned)
JWT_SECRET=your-secret-key
DATABASE_URL=postgresql://...
```

---

## Next Steps

1. **Read Full Documentation**: [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)
2. **Import Postman Collection**: Test all endpoints
3. **Review Authentication Plan**: [AUTHENTICATION_REQUIREMENTS.md](./AUTHENTICATION_REQUIREMENTS.md) (Phase 2)
4. **Check Requirements**: [requirements.md](../.kiro/specs/kalinga-ai-maternal-health-system/requirements.md)
5. **Review Design**: [design.md](../.kiro/specs/kalinga-ai-maternal-health-system/design.md)

---

**Version**: 1.0.0  
**Phase**: Phase 1 (MVP)  
**Last Updated**: March 22, 2025
