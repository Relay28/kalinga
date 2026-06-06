import { Router, Request, Response } from 'express';
import { pool } from '../config/database.js';

export const healthRouter = Router();

healthRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const dbResult = await pool.query('SELECT NOW() AS server_time');
    
    res.json({
      status: 'healthy',
      service: 'kalinga-api',
      version: '0.1.0',
      uptime: process.uptime(),
      database: 'connected',
      serverTime: dbResult.rows[0].server_time,
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        limit: '512 MB (Render Free)',
      },
    });
  } catch (err) {
    res.status(503).json({
      status: 'degraded',
      database: 'disconnected',
      error: err instanceof Error ? err.message : 'Unknown database error',
    });
  }
});
