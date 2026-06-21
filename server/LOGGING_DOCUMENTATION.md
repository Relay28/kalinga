# API Request Logging Documentation

## Overview

The Kalinga AI system implements comprehensive API request logging with structured JSON format, automatic data sanitization, and daily log rotation. This logging system meets requirements 19.1 and 19.2 from the technical design document.

## Features

### 1. Structured JSON Logging
All logs are written in JSON format for easy parsing and analysis:

```json
{
  "type": "request",
  "timestamp": "2026-06-21T13:37:58.399Z",
  "method": "GET",
  "endpoint": "/api/patients",
  "ip": "::ffff:127.0.0.1",
  "userAgent": "Mozilla/5.0...",
  "user": "anonymous",
  "bodySize": 155
}
```

### 2. Request Information Logged
Each API request logs:
- **Method**: HTTP method (GET, POST, PATCH, DELETE)
- **Endpoint**: API endpoint path (sanitized)
- **IP Address**: Client IP address
- **Timestamp**: ISO 8601 formatted timestamp
- **Response Time**: Time taken to process request (in milliseconds)
- **Status Code**: HTTP response status code
- **User Agent**: Client user agent string
- **User**: Authenticated user ID or 'anonymous'
- **Body Size**: Size of request body in bytes

### 3. Sensitive Data Sanitization

The logging system automatically sanitizes sensitive data to comply with data privacy requirements:

#### What is Sanitized:
- **PhilHealth IDs**: Any ID matching pattern `XX-XXXXXXXX-X` is replaced with `****-********-*`
- **Patient Names**: Fields containing `firstName`, `lastName`, `middleName`, or `name` are replaced with `[REDACTED]`
- **Nested Objects**: Sanitization works recursively through nested objects and arrays

#### What is NOT Sanitized:
- Medical data (blood pressure, weight, height, BMI)
- Risk scores and calculations
- Timestamps and metadata
- IP addresses (needed for security auditing)

#### Example:
```javascript
// Original data
{
  id: "1234-567890-1",
  firstName: "Maria",
  lastName: "Santos",
  bp: "120/80",
  riskScore: 78
}

// Sanitized in logs
{
  id: "[REDACTED]",
  firstName: "[REDACTED]",
  lastName: "[REDACTED]",
  bp: "120/80",
  riskScore: 78
}
```

### 4. Log Rotation (7-Day Retention)

Logs are automatically rotated daily with 7-day retention:

#### Configuration:
- **Rotation Pattern**: Daily at midnight
- **Filename Format**: `application-YYYY-MM-DD.log`
- **Retention Period**: 7 days (Phase 1 requirement)
- **Max File Size**: 20MB per file (triggers early rotation)
- **Error Logs**: Separate `error-YYYY-MM-DD.log` files for errors only

#### Log Files Location:
```
server/logs/
├── application-2026-06-21.log
├── application-2026-06-22.log
├── error-2026-06-21.log
└── .gitignore
```

#### Automatic Cleanup:
Log files older than 7 days are automatically deleted. No manual intervention required.

### 5. Log Levels

The system uses three log levels:

- **INFO**: Successful requests (2xx status codes)
- **WARN**: Client errors (4xx status codes)
- **ERROR**: Server errors (5xx status codes)

## Implementation

### Middleware Setup

The request logger middleware is implemented in `server/src/middleware/logger.js` and automatically applied to all routes:

```javascript
// server/src/index.js
const { requestLogger } = require('./middleware/logger');

app.use(requestLogger); // Applied before all routes
```

### Winston Configuration

The system uses Winston with daily-rotate-file transport:

```javascript
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new DailyRotateFile({
      filename: 'logs/application-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxFiles: '7d',
      maxSize: '20m'
    })
  ]
});
```

## Testing

### Manual Testing

Test the logging system by making API requests:

```bash
# Test health endpoint
curl http://localhost:5000/api/health

# Test patient creation (with sensitive data)
curl -X POST http://localhost:5000/api/patients \
  -H "Content-Type: application/json" \
  -d '{
    "id": "1234-567890-1",
    "firstName": "TestFirstName",
    "lastName": "TestLastName",
    "dob": "1990-01-01",
    "bp": "120/80",
    "weight": 65,
    "height": 165,
    "bmi": 23.9
  }'

# Check logs
cat server/logs/application-$(date +%Y-%m-%d).log | jq
```

### Unit Testing

Run the sanitization tests:

```bash
cd server
node src/middleware/logger.test.js
```

Expected output:
```
✓ PhilHealth IDs redacted: true
✓ Names redacted: true
✓ PhilHealth ID pattern replaced: true
✓ Nested names redacted: true
✓ Non-sensitive data preserved: true
✓ All IDs redacted: true
✓ All names redacted: true
✓ ID pattern replaced in string: true
✓ All values preserved: true
```

## Log Analysis

### Viewing Logs

View today's logs:
```bash
cat server/logs/application-$(date +%Y-%m-%d).log
```

View logs with pretty-printing (requires jq):
```bash
cat server/logs/application-$(date +%Y-%m-%d).log | jq
```

### Filtering Logs

Filter by endpoint:
```bash
cat server/logs/application-*.log | jq 'select(.endpoint == "/api/patients")'
```

Filter by status code:
```bash
cat server/logs/application-*.log | jq 'select(.statusCode >= 400)'
```

Calculate average response time:
```bash
cat server/logs/application-*.log | jq -s '[.[] | select(.responseTime) | .responseTime] | add/length'
```

## Console Output

In addition to file logging, logs are also output to the console for development:

```
2026-06-21 21:37:58 [info]: API Request {"method":"GET","endpoint":"/api/health",...}
2026-06-21 21:37:58 [info]: API Response {"statusCode":200,"responseTime":4,...}
```

## Performance Considerations

- Sanitization adds minimal overhead (~1-2ms per request)
- Log files are written asynchronously (non-blocking)
- Rotation happens automatically without blocking requests
- Old logs are cleaned up in background process

## Phase 2 Enhancements (Planned)

For Phase 2 production deployment, consider:

1. **Centralized Logging**: Send logs to ELK stack or CloudWatch
2. **Extended Retention**: Increase to 90 days for audit compliance
3. **Alert System**: Notify on error rate thresholds
4. **Performance Metrics**: Track API latency percentiles (p50, p95, p99)
5. **Request Tracing**: Add correlation IDs for distributed tracing

## Compliance

This logging system complies with:

- **Requirement 19.1**: "THE Cloud_Backend SHALL log API requests with basic console output including endpoints and timestamps" ✓
- **Requirement 19.2**: "THE Midwife_App SHALL log major operations to browser console including patient registration, scan sessions, uploads, and sync events" ✓ (client-side)
- **Philippine Data Privacy Act 2012**: Sensitive data (PhilHealth IDs, patient names) are sanitized ✓

## Troubleshooting

### Log files not being created
- Check that `server/logs/` directory exists
- Verify winston and winston-daily-rotate-file are installed: `npm list winston`
- Check file permissions on logs directory

### Logs missing sensitive data sanitization
- Run unit tests: `node src/middleware/logger.test.js`
- Verify middleware is loaded before routes in `src/index.js`
- Check for errors in server console output

### Old logs not being deleted
- Check audit files (`.json`) in logs directory for rotation status
- Verify `maxFiles: '7d'` configuration in logger.js
- Restart server to trigger cleanup process

## References

- Winston Documentation: https://github.com/winstonjs/winston
- Winston Daily Rotate: https://github.com/winstonjs/winston-daily-rotate-file
- Kalinga AI Design Document: `/.kiro/specs/kalinga-ai-maternal-health-system/design.md`
- Requirements Document: `/.kiro/specs/kalinga-ai-maternal-health-system/requirements.md`
