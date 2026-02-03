/**
 * Centralized error handling, logging, and response utilities
 */

// ===== ERROR TYPES =====

export class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.timestamp = new Date().toISOString();
  }
}

export class ValidationError extends AppError {
  constructor(message) {
    super(message, 400, 'VALIDATION_ERROR');
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource conflict') {
    super(message, 409, 'CONFLICT');
  }
}

export class DatabaseError extends AppError {
  constructor(message) {
    super(message, 500, 'DATABASE_ERROR');
  }
}

// ===== LOGGING UTILITIES =====

const LogLevel = {
  DEBUG: 'DEBUG',
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR',
};

function formatLog(level, message, meta = {}) {
  const timestamp = new Date().toISOString();
  const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
  return `[${timestamp}] [${level}] ${message}${metaStr}`;
}

export const logger = {
  debug: (message, meta) => console.log(formatLog(LogLevel.DEBUG, message, meta)),
  info: (message, meta) => console.log(formatLog(LogLevel.INFO, message, meta)),
  warn: (message, meta) => console.warn(formatLog(LogLevel.WARN, message, meta)),
  error: (message, meta) => console.error(formatLog(LogLevel.ERROR, message, meta)),
};

// ===== RESPONSE UTILITIES =====

export function successResponse(data, message = 'Success') {
  return {
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
  };
}

export function errorResponse(error, statusCode = 500) {
  if (error instanceof AppError) {
    return {
      success: false,
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
      timestamp: error.timestamp,
    };
  }

  // Handle generic errors
  return {
    success: false,
    message: error.message || 'An error occurred',
    code: 'INTERNAL_ERROR',
    statusCode,
    timestamp: new Date().toISOString(),
  };
}

// ===== MIDDLEWARE =====

/**
 * Express middleware for unified error handling
 */
export function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    logger.warn(`${req.method} ${req.path}`, { error: err.message, code: err.code });
    return res.status(err.statusCode).json(errorResponse(err, err.statusCode));
  }

  // Unhandled error
  logger.error(`Unhandled error on ${req.method} ${req.path}`, { error: err.message, stack: err.stack });
  res.status(500).json(errorResponse(new AppError('Internal server error', 500, 'INTERNAL_ERROR'), 500));
}

/**
 * Express middleware for request logging
 */
export function requestLogger(req, res, next) {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const statusCode = res.statusCode;
    const level = statusCode >= 400 ? 'warn' : 'info';
    logger[level](`${req.method} ${req.path}`, { statusCode, duration: `${duration}ms` });
  });

  next();
}

// ===== HEALTH CHECK UTILITIES =====

export function createHealthCheck(db) {
  return async (req, res) => {
    try {
      // Test database connection
      const result = await db.get('SELECT 1');
      
      res.status(200).json({
        success: true,
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        database: 'connected',
        checks: {
          database: true,
        },
      });
    } catch (err) {
      logger.error('Health check failed', { error: err.message });
      
      res.status(503).json({
        success: false,
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        database: 'disconnected',
        checks: {
          database: false,
        },
        error: err.message,
      });
    }
  };
}
