import { Request, Response, NextFunction } from 'express';
import { config } from '../config/env.js';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  const statusCode = (err as any).status || (err as any).statusCode || 500;
  
  // Log critical error
  console.error(`[Kalinga:ERROR] [${req.method} ${req.path}]:`, err.stack || err.message);

  res.status(statusCode).json({
    error: statusCode === 500 ? 'Internal Server Error' : err.message,
    details: config.NODE_ENV === 'development' ? err.stack : undefined,
  });
}
