import pg from 'pg';
const { Pool } = pg;
import { config } from './env.js';

// Determine if we need SSL (SSL is required for Neon serverless PostgreSQL)
const useSsl = config.DATABASE_URL.includes('sslmode=require') || 
               config.DATABASE_URL.includes('neon.tech') || 
               config.DATABASE_URL.includes('.aws.') ||
               config.NODE_ENV === 'production';

export const pool = new Pool({
  connectionString: config.DATABASE_URL,
  ssl: useSsl ? { rejectUnauthorized: false } : undefined,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('connect', () => {
  console.log('[Kalinga:DB] Database pool client successfully connected.');
});

pool.on('error', (err) => {
  console.error('[Kalinga:DB] Unexpected error on idle database client:', err);
});
