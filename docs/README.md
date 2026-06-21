# Kalinga AI API Documentation

This directory contains comprehensive API documentation for the Kalinga AI Maternal Health System.

## 📚 Documentation Files

### 1. [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)
**Complete REST API Reference**

The comprehensive guide to all REST endpoints including:
- Detailed endpoint descriptions
- Request/response examples for every endpoint
- Complete data model specifications
- Error handling patterns
- Status code reference
- Authentication notes for Phase 2

**Use this when**: You need detailed information about any endpoint, request format, or response structure.

---

### 2. [API_QUICK_REFERENCE.md](./API_QUICK_REFERENCE.md)
**Quick Developer Reference**

Fast lookup guide with:
- All endpoints in table format
- Common curl examples
- Workflow examples
- Development tips
- Troubleshooting common issues

**Use this when**: You need a quick reminder of endpoint URLs, common commands, or integration patterns.

---

### 3. [KALINGA_AI_POSTMAN_COLLECTION.json](./KALINGA_AI_POSTMAN_COLLECTION.json)
**Postman API Collection**

Ready-to-import Postman collection containing:
- All API endpoints pre-configured
- Example requests with valid payloads
- Environment variables setup
- Response examples
- Organized folders by resource type

**Use this when**: You want to test the API interactively or explore endpoints hands-on.

**Import Instructions**:
1. Open Postman
2. Click **Import** → **Choose Files**
3. Select `KALINGA_AI_POSTMAN_COLLECTION.json`
4. Set environment variables:
   - `base_url` = `http://localhost:5000`
   - `api_path` = `/api`

---

### 4. [AUTHENTICATION_REQUIREMENTS.md](./AUTHENTICATION_REQUIREMENTS.md)
**Phase 2 Authentication Specification**

Security and authentication planning document:
- JWT-based authentication design
- Role-based access control (RBAC)
- Password requirements
- Session management
- Security measures (rate limiting, CORS, HTTPS)
- Implementation roadmap
- Database schema for users and sessions

**Use this when**: Planning or implementing Phase 2 authentication features.

---

## 🚀 Getting Started

### Prerequisites
- Node.js 14+ installed
- Git clone of Kalinga AI repository

### Start the Server

```bash
# Navigate to server directory
cd server

# Install dependencies
npm install

# Start the server
npm start
```

Server will start at `http://localhost:5000`

### Test the API

**Method 1: curl**
```bash
# Health check
curl http://localhost:5000/api/health

# Get all patients
curl http://localhost:5000/api/patients
```

**Method 2: Postman**
1. Import `KALINGA_AI_POSTMAN_COLLECTION.json`
2. Run "Get Health Status" request
3. Explore other endpoints

**Method 3: Browser**
```
http://localhost:5000/api/health
http://localhost:5000/api/patients
```

---

## 📖 Common Use Cases

### Use Case 1: Complete Triage Workflow

Follow this sequence to understand the full system workflow:

1. **Create Patient** (Midwife App)
   ```bash
   POST /api/patients
   ```
   → See [API_DOCUMENTATION.md#create-new-patient](./API_DOCUMENTATION.md#create-new-patient)

2. **Upload Scan** (Midwife App - when online)
   ```bash
   POST /api/scans
   ```
   → See [API_DOCUMENTATION.md#upload-triage-package](./API_DOCUMENTATION.md#upload-triage-package)

3. **Get Pending Scans** (Specialist Dashboard)
   ```bash
   GET /api/scans/pending
   ```
   → See [API_DOCUMENTATION.md#get-pending-scans](./API_DOCUMENTATION.md#get-pending-scans)

4. **Submit Verdict** (Specialist Dashboard)
   ```bash
   PATCH /api/scans/:id/verify
   ```
   → See [API_DOCUMENTATION.md#submit-specialist-verdict](./API_DOCUMENTATION.md#submit-specialist-verdict)

5. **Get Notifications** (Midwife App)
   ```bash
   GET /api/notifications
   ```
   → See [API_DOCUMENTATION.md#get-all-notifications](./API_DOCUMENTATION.md#get-all-notifications)

---

### Use Case 2: Testing AI Simulation (Phase 1)

```bash
POST /api/ai/classify
Body: {
  "firstName": "Maria",
  "lastName": "Cruz",
  "bp": "155/95",
  "bmi": 31.2
}
```

Response contains simulated AI risk assessment.

→ See [API_DOCUMENTATION.md#simulate-ai-classification](./API_DOCUMENTATION.md#simulate-ai-classification)

---

## 🔑 Authentication Status

### Phase 1 (Current)
- ✅ All endpoints publicly accessible
- ✅ No authentication required
- ✅ Suitable for MVP/demo purposes

### Phase 2 (Planned)
- 🔜 JWT-based authentication
- 🔜 Role-based access control
- 🔜 Session management
- 🔜 See [AUTHENTICATION_REQUIREMENTS.md](./AUTHENTICATION_REQUIREMENTS.md)

---

## 📊 System Architecture

### Components

```
┌─────────────────┐         ┌──────────────────┐
│  Midwife App    │────────▶│   REST API       │
│  (React SPA)    │  HTTPS  │   (Express.js)   │
└─────────────────┘         └──────────────────┘
                                      │
                                      ▼
                            ┌──────────────────┐
                            │  JSON Database   │
                            │  (Phase 1)       │
                            └──────────────────┘

┌─────────────────┐         ┌──────────────────┐
│  Specialist     │────────▶│   REST API       │
│  Dashboard      │  HTTPS  │   (Express.js)   │
└─────────────────┘         └──────────────────┘
```

### Store-and-Forward Pattern

1. **Offline Capture**: Midwife captures scan without connectivity
2. **Local Storage**: Triage package stored in browser localStorage
3. **Online Sync**: When online, upload via POST `/api/scans`
4. **Async Review**: Specialist reviews at tertiary facility
5. **Result Delivery**: Midwife polls `/api/notifications` for results

---

## 🗂️ Data Models

### Core Models

| Model | Endpoint | Description |
|-------|----------|-------------|
| **Patient** | `/api/patients` | Demographics, vitals, risk factors |
| **Scan** | `/api/scans` | Triage package with ultrasound frames |
| **Frame** | (embedded) | Individual ultrasound image with metadata |
| **Notification** | `/api/notifications` | Specialist verdict delivered to midwife |

See [API_DOCUMENTATION.md#data-models](./API_DOCUMENTATION.md#data-models) for complete specifications.

---

## 🛠️ Development Resources

### Server Implementation
- **Entry Point**: `server/src/index.js`
- **Routes**: `server/src/routes/`
- **Database**: `server/src/db.js`
- **Middleware**: `server/src/middleware/`

### Related Documentation
- **Requirements**: `.kiro/specs/kalinga-ai-maternal-health-system/requirements.md`
- **Design**: `.kiro/specs/kalinga-ai-maternal-health-system/design.md`
- **Tasks**: `.kiro/specs/kalinga-ai-maternal-health-system/tasks.md`
- **Error Handling**: `server/ERROR_HANDLING_DOCUMENTATION.md`

---

## 🧪 Testing

### Manual Testing with Postman
1. Import collection
2. Run requests in "Workflow Example" order
3. Verify responses match expected format

### Automated Testing (Future)
- Unit tests for route handlers
- Integration tests for endpoint workflows
- Security tests for Phase 2 authentication

---

## 🐛 Troubleshooting

### Server Won't Start
```bash
# Check if port 5000 is already in use
lsof -i :5000  # Mac/Linux
netstat -ano | findstr :5000  # Windows

# Kill existing process or change PORT in .env
PORT=5001 npm start
```

### CORS Errors
- Ensure `CLIENT_URL` environment variable matches your frontend URL
- Default: `http://localhost:5173` (Vite dev server)

### Database Issues
```bash
# Reset database
rm server/data/db.json
npm start  # Will regenerate with seed data
```

### 404 on All Endpoints
- Verify server is running: `curl http://localhost:5000/api/health`
- Check base URL includes `/api` prefix
- Review server console for startup errors

---

## 📞 Support

### Issues or Questions?

1. **Check Documentation**: Start with [API_QUICK_REFERENCE.md](./API_QUICK_REFERENCE.md)
2. **Review Examples**: See Postman collection for working requests
3. **Check Server Logs**: Server console shows all API activity
4. **Consult Design Docs**: `.kiro/specs/kalinga-ai-maternal-health-system/`

---

## 📝 Document Versions

| Document | Version | Last Updated |
|----------|---------|--------------|
| API_DOCUMENTATION.md | 1.0.0 | March 22, 2025 |
| API_QUICK_REFERENCE.md | 1.0.0 | March 22, 2025 |
| KALINGA_AI_POSTMAN_COLLECTION.json | 1.0.0 | March 22, 2025 |
| AUTHENTICATION_REQUIREMENTS.md | 1.0.0 | March 22, 2025 |

---

## 🗺️ Roadmap

### Phase 1 (Current - MVP)
- ✅ REST API with all core endpoints
- ✅ JSON file-based database
- ✅ No authentication
- ✅ Complete documentation

### Phase 2 (Planned)
- 🔜 JWT authentication
- 🔜 PostgreSQL database
- 🔜 Message queue integration
- 🔜 AES-256 encryption
- 🔜 Real AI model integration

### Phase 3 (Future)
- 🔜 Production deployment
- 🔜 Load balancing
- 🔜 Analytics dashboard
- 🔜 Audit logging
- 🔜 Data export features

---

**System**: Kalinga AI Maternal Health System  
**Phase**: Phase 1 (MVP)  
**Documentation Version**: 1.0.0  
**Last Updated**: March 22, 2025
