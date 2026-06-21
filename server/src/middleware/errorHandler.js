/**
 * Centralized Error Handling Middleware
 * Standardizes error response format: { error, message, details }
 */

class AppError extends Error {
  constructor(message, statusCode, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error handler middleware - must be mounted AFTER all routes
 */
function errorHandler(err, req, res, next) {
  // Default to 500 server error if status not specified
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  
  // Log error with context
  const logContext = {
    timestamp: new Date().toISOString(),
    endpoint: `${req.method} ${req.path}`,
    statusCode,
    message,
    user: req.user?.id || 'anonymous',
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('user-agent'),
    payload: req.method !== 'GET' ? sanitizePayload(req.body) : undefined,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  };

  // Log to console (in production, this would go to a logging service)
  if (statusCode >= 500) {
    console.error('[ERROR]', JSON.stringify(logContext, null, 2));
  } else {
    console.warn('[WARN]', JSON.stringify(logContext, null, 2));
  }

  // Send standardized error response
  const response = {
    error: getErrorType(statusCode),
    message,
    details: err.details || null
  };

  // Include stack trace in development
  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
}

/**
 * Sanitize sensitive fields from payload before logging
 */
function sanitizePayload(payload) {
  if (!payload || typeof payload !== 'object') return payload;
  
  const sanitized = { ...payload };
  const sensitiveFields = ['password', 'token', 'philhealthId', 'ssn'];
  
  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  });
  
  return sanitized;
}

/**
 * Map status code to error type for standardized responses
 */
function getErrorType(statusCode) {
  const errorTypes = {
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    422: 'Unprocessable Entity',
    500: 'Internal Server Error',
    503: 'Service Unavailable'
  };
  
  return errorTypes[statusCode] || 'Error';
}

/**
 * Async route wrapper to catch promise rejections
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * 404 handler for undefined routes
 */
function notFoundHandler(req, res, next) {
  const err = new AppError(`Route ${req.method} ${req.path} not found`, 404);
  next(err);
}

module.exports = {
  AppError,
  errorHandler,
  asyncHandler,
  notFoundHandler
};
