"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pool = void 0;
const pg_1 = __importDefault(require("pg"));
const { Pool } = pg_1.default;
const env_js_1 = require("./env.js");
// Determine if we need SSL (SSL is required for Neon serverless PostgreSQL)
const useSsl = env_js_1.config.DATABASE_URL.includes('sslmode=require') ||
    env_js_1.config.DATABASE_URL.includes('neon.tech') ||
    env_js_1.config.DATABASE_URL.includes('.aws.') ||
    env_js_1.config.NODE_ENV === 'production';
exports.pool = new Pool({
    connectionString: env_js_1.config.DATABASE_URL,
    ssl: useSsl ? { rejectUnauthorized: false } : undefined,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
});
exports.pool.on('connect', () => {
    console.log('[Kalinga:DB] Database pool client successfully connected.');
});
exports.pool.on('error', (err) => {
    console.error('[Kalinga:DB] Unexpected error on idle database client:', err);
});
//# sourceMappingURL=database.js.map