/**
 * Request Logging Middleware
 * Logs all API requests with context for debugging and monitoring
 * 
 * Features:
 * - Structured JSON logging format
 * - Daily log rotation with 7-day retention (Phase 1)
 * - Sanitization of sensitive data (PhilHealth IDs, patient names)
 * - Response time tracking
 * 
 * Requirements: 19.1, 19.2
 */

const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '..', '..', 'logs');

/**
 * Sanitizes sensitive data from log entries
 * Removes PhilHealth IDs and patient names from URLs, query params, and body
 * @param {Object} data - Data object to sanitize
 * @returns {Object} - Sanitized data object
 */
function sanitizeSensitiveData(data) {
  if (!data) return data;
  
  const sanitized = JSON.parse(JSON.stringify(data)); // Deep clone
  
  // Sanitize PhilHealth IDs (format: XX-XXXXXXXXX-X or similar patterns)
  const philhealthPattern = /\d{2,4}-\d{4,10}-\d{1}/g;
  
  // Sanitize string fields
  if (typeof sanitized === 'string') {
    return sanitized.replace(philhealthPattern, '****-********-*');
  }
  
  // Sanitize object fields
  if (typeof sanitized === 'object') {
    Object.keys(sanitized).forEach(key => {
      const lowerKey = key.toLowerCase();
      
      // Remove PhilHealth ID fields
      if (lowerKey.includes('philhealth') || lowerKey === 'id' && typeof sanitized[key] === 'string' && philhealthPattern.test(sanitized[key])) {
        sanitized[key] = '[REDACTED]';
      }
      
      // Remove patient name fields
      if (lowerKey.includes('name') || lowerKey === 'firstname' || lowerKey === 'lastname' || lowerKey === 'middlename') {
        sanitized[key] = '[REDACTED]';
      }
      
      // Recursively sanitize nested objects
      if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
        sanitized[key] = sanitizeSensitiveData(sanitized[key]);
      }
      
      // Sanitize string values for PhilHealth patterns
      if (typeof sanitized[key] === 'string') {
        sanitized[key] = sanitized[key].replace(philhealthPattern, '****-********-*');
      }
    });
  }
  
  return sanitized;
}

/**
 * Sanitizes URL path and query parameters
 * @param {string} url - URL to sanitize
 * @returns {string} - Sanitized URL
 */
function sanitizeUrl(url) {
  if (!url) return url;
  
  // Replace PhilHealth ID patterns in URL
  const philhealthPattern = /\d{2,4}-\d{4,10}-\d{1}/g;
  return url.replace(philhealthPattern, '****-********-*');
}

// Configure Winston logger with daily rotation
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    // Daily rotating file transport
    new DailyRotateFile({
      filename: path.join(logsDir, 'application-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxFiles: '7d', // 7-day retention
      maxSize: '20m', // Rotate if file exceeds 20MB
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    }),
    // Error log file (separate for high-priority issues)
    new DailyRotateFile({
      filename: path.join(logsDir, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxFiles: '7d',
      maxSize: '20m',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    }),
    // Console output (for development)
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          return `${timestamp} [${level}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
        })
      )
    })
  ]
});

/**
 * Request logger middleware
 * Logs method, endpoint, IP, timestamp, and response time
 * Sanitizes sensitive data (PhilHealth IDs, patient names)
 */
function requestLogger(req, res, next) {
  const startTime = Date.now();
  
  // Sanitize request data
  const sanitizedBody = sanitizeSensitiveData(req.body);
  const sanitizedQuery = sanitizeSensitiveData(req.query);
  const sanitizedPath = sanitizeUrl(req.path);
  
  // Log request with sanitized data
  const requestLog = {
    type: 'request',
    timestamp: new Date().toISOString(),
    method: req.method,
    endpoint: sanitizedPath,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('user-agent'),
    user: req.user?.id || 'anonymous',
    queryParams: Object.keys(sanitizedQuery).length > 0 ? sanitizedQuery : undefined,
    bodySize: req.body ? JSON.stringify(req.body).length : 0
  };

  logger.info('API Request', requestLog);

  // Capture response
  const originalSend = res.send;
  res.send = function (data) {
    res.send = originalSend; // Restore original send
    
    const responseTime = Date.now() - startTime;
    const responseLog = {
      type: 'response',
      timestamp: new Date().toISOString(),
      method: req.method,
      endpoint: sanitizedPath,
      statusCode: res.statusCode,
      responseTime: responseTime,
      responseTimeFormatted: `${responseTime}ms`,
      user: req.user?.id || 'anonymous'
    };

    // Log response with appropriate level
    if (res.statusCode >= 500) {
      logger.error('API Response - Server Error', responseLog);
    } else if (res.statusCode >= 400) {
      logger.warn('API Response - Client Error', responseLog);
    } else {
      logger.info('API Response', responseLog);
    }

    return originalSend.call(this, data);
  };

  next();
}

module.exports = {
  requestLogger,
  logger,
  sanitizeSensitiveData
};
