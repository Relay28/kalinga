# Authentication Requirements (Phase 2)

## Overview

This document outlines the authentication and authorization requirements for Phase 2 of the Kalinga AI system. Phase 1 operates without authentication for MVP validation purposes.

## Current Status (Phase 1)

- **Authentication**: None
- **Authorization**: None
- **Access Control**: All endpoints publicly accessible
- **User Management**: Not implemented

## Phase 2 Requirements

### 1. User Roles

The system supports three user roles:

#### Midwife Role
- **Access**: Midwife App interface
- **Permissions**:
  - Create and view patient records
  - Upload triage packages (scans)
  - View notifications
  - Mark notifications as read
  - View own submitted scans

#### Specialist Role
- **Access**: Specialist Dashboard interface
- **Permissions**:
  - View all submitted scans
  - Submit verification verdicts
  - Add clinical recommendations
  - View patient details (masked PHI by default)
  - View scan history

#### Administrator Role (Future)
- **Access**: Admin dashboard (Phase 2+)
- **Permissions**:
  - User management
  - System configuration
  - Analytics and reporting
  - Data export
  - Audit log access

### 2. Authentication Method

**JWT (JSON Web Token) Based Authentication**

#### Login Flow

```
1. User submits credentials (username/password)
   POST /api/auth/login
   Body: { "username": "midwife@example.com", "password": "..." }

2. Server validates credentials against database

3. Server generates JWT token with claims:
   {
     "userId": "uuid",
     "role": "midwife|specialist|admin",
     "name": "User Name",
     "facilityId": "facility-uuid",
     "iat": timestamp,
     "exp": timestamp + 8h
   }

4. Server returns token
   Response: { "token": "eyJhbG...", "user": {...} }

5. Client stores token in secure storage (httpOnly cookie or localStorage)

6. Client includes token in subsequent requests:
   Authorization: Bearer eyJhbG...
```

#### Token Specifications

- **Algorithm**: HMAC SHA256 (HS256)
- **Expiration**: 8 hours from issuance
- **Refresh**: Not supported in Phase 2 (user must re-login)
- **Storage**: httpOnly secure cookies (preferred) or localStorage

### 3. Protected Endpoints

#### Midwife Endpoints (Require midwife or admin role)

```
POST   /api/patients          - Create patient
GET    /api/patients          - List own patients
POST   /api/scans             - Upload scan
GET    /api/scans?midwifeId=X - List own scans
GET    /api/notifications     - Get own notifications
PATCH  /api/notifications/:id/read - Mark own notification as read
```

#### Specialist Endpoints (Require specialist or admin role)

```
GET    /api/scans/pending     - List pending scans
GET    /api/scans/:id         - View any scan details
PATCH  /api/scans/:id/verify  - Submit verification
GET    /api/patients/:id      - View patient details
```

#### Public Endpoints (No authentication required)

```
GET    /api/health            - Health check
POST   /api/auth/login        - Login
POST   /api/auth/logout       - Logout (invalidate token)
```

### 4. Authorization Middleware

```javascript
// Example authorization middleware
const authorize = (allowedRoles) => {
  return (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      if (!allowedRoles.includes(decoded.role)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
      
      req.user = decoded;
      next();
    } catch (err) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
  };
};

// Usage
router.post('/scans', authorize(['midwife', 'admin']), createScan);
router.patch('/scans/:id/verify', authorize(['specialist', 'admin']), verifyScan);
```

### 5. Password Requirements

- **Minimum Length**: 8 characters
- **Complexity**: Must contain:
  - At least 1 uppercase letter
  - At least 1 lowercase letter
  - At least 1 number
  - At least 1 special character (@$!%*?&)
- **Hashing**: bcrypt with salt rounds = 10
- **Storage**: Never store plaintext passwords

### 6. Session Management

#### Session Duration
- **Standard Session**: 8 hours
- **Idle Timeout**: 30 minutes of inactivity
- **Maximum Concurrent Sessions**: 1 per user (Phase 2)

#### Session Termination
- Explicit logout (client-initiated)
- Token expiration (8 hours)
- Idle timeout (30 minutes)
- Server-side session revocation (admin action)

### 7. Security Measures

#### HTTPS Only
- All authentication traffic over TLS 1.3
- Redirect HTTP to HTTPS
- HSTS (HTTP Strict Transport Security) headers

#### CORS Configuration
```javascript
const corsOptions = {
  origin: [
    'https://midwife.kalingaai.ph',
    'https://specialist.kalingaai.ph'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
```

#### Rate Limiting
- **Login Endpoint**: 5 attempts per 15 minutes per IP
- **API Endpoints**: 100 requests per minute per user
- **Notification Polling**: 1 request per 8 seconds per user

#### Protection Against Common Attacks
- **SQL Injection**: Parameterized queries (Sequelize ORM)
- **XSS**: Content Security Policy headers, input sanitization
- **CSRF**: CSRF tokens for state-changing operations
- **Brute Force**: Account lockout after 5 failed login attempts (15-minute lockout)

### 8. Error Responses

#### Authentication Errors

**Missing Token** (401 Unauthorized):
```json
{
  "error": "Authentication required",
  "statusCode": 401,
  "message": "No authentication token provided",
  "timestamp": "2025-03-22T16:00:00.000Z"
}
```

**Invalid Token** (401 Unauthorized):
```json
{
  "error": "Invalid or expired token",
  "statusCode": 401,
  "message": "The provided token is invalid or has expired. Please log in again.",
  "timestamp": "2025-03-22T16:00:00.000Z"
}
```

**Insufficient Permissions** (403 Forbidden):
```json
{
  "error": "Insufficient permissions",
  "statusCode": 403,
  "message": "Your role does not have permission to access this resource",
  "requiredRole": "specialist",
  "userRole": "midwife",
  "timestamp": "2025-03-22T16:00:00.000Z"
}
```

**Too Many Login Attempts** (429 Too Many Requests):
```json
{
  "error": "Too many login attempts",
  "statusCode": 429,
  "message": "Account temporarily locked due to multiple failed login attempts",
  "retryAfter": 900,
  "timestamp": "2025-03-22T16:00:00.000Z"
}
```

### 9. Database Schema

#### Users Table (Phase 2)

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('midwife', 'specialist', 'admin')),
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  facility_id UUID REFERENCES facilities(id),
  phone VARCHAR(20),
  is_active BOOLEAN DEFAULT true,
  failed_login_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMP,
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
```

#### Sessions Table (Phase 2 - Optional)

```sql
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_token_hash ON sessions(token_hash);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
```

### 10. Implementation Roadmap

#### Phase 2.1: Basic Authentication (Sprint 1)
- [ ] User model and database schema
- [ ] Password hashing with bcrypt
- [ ] JWT generation and validation
- [ ] Login endpoint
- [ ] Logout endpoint
- [ ] Authentication middleware

#### Phase 2.2: Authorization (Sprint 2)
- [ ] Role-based authorization middleware
- [ ] Protect patient endpoints
- [ ] Protect scan endpoints
- [ ] Protect specialist endpoints
- [ ] Update Postman collection with auth examples

#### Phase 2.3: Security Enhancements (Sprint 3)
- [ ] HTTPS enforcement
- [ ] Rate limiting
- [ ] Account lockout mechanism
- [ ] Session management
- [ ] Audit logging

#### Phase 2.4: UI Integration (Sprint 4)
- [ ] Login screens for Midwife App
- [ ] Login screens for Specialist Dashboard
- [ ] Token storage in client apps
- [ ] Auto-logout on token expiration
- [ ] Session timeout warnings

### 11. Testing Requirements

#### Unit Tests
- [ ] Password hashing/verification
- [ ] JWT generation/validation
- [ ] Role authorization logic
- [ ] Rate limiting counters

#### Integration Tests
- [ ] Login with valid credentials
- [ ] Login with invalid credentials
- [ ] Access protected endpoint with valid token
- [ ] Access protected endpoint with expired token
- [ ] Access protected endpoint without token
- [ ] Role-based access control enforcement

#### Security Tests
- [ ] Brute force login attempts
- [ ] Token tampering detection
- [ ] CSRF protection
- [ ] XSS prevention
- [ ] SQL injection prevention

### 12. Migration from Phase 1

**No Breaking Changes**: Phase 1 endpoints remain functional during Phase 2 development.

**Migration Steps**:
1. Add authentication endpoints without requiring auth on existing endpoints
2. Create default admin user for testing
3. Create test midwife and specialist users
4. Gradually protect endpoints (non-breaking)
5. Update client applications to use authentication
6. Enable authentication requirement flag (breaking change)
7. Deprecate unauthenticated access

### 13. Environment Variables

```bash
# Phase 2 Authentication Configuration
JWT_SECRET=your-secret-key-min-32-chars
JWT_EXPIRATION=8h
SESSION_TIMEOUT=30m
BCRYPT_ROUNDS=10
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_DURATION=15m
RATE_LIMIT_WINDOW=15m
RATE_LIMIT_MAX=100
```

### 14. Compliance Considerations

#### Philippine Data Privacy Act 2012
- User credentials considered personal data
- Audit logging required for access to patient data
- Consent required for data processing
- Right to data portability

#### General Security Best Practices
- Principle of least privilege
- Defense in depth
- Fail securely
- Regular security audits
- Penetration testing before production deployment

---

**Document Version**: 1.0.0  
**Last Updated**: March 22, 2025  
**Status**: Phase 2 Planning  
**Approval Required**: Security team, System architect
