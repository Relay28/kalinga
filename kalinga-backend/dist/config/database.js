"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pool = void 0;
const serverless_1 = require("@neondatabase/serverless");
const env_js_1 = require("./env.js");
exports.pool = new serverless_1.Pool({
    connectionString: env_js_1.config.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 5, // Keep the pool size small for Neon's free tier
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
});
// Test connection
exports.pool.on('error', (err) => {
    console.error('[Kalinga:DB] Unexpected error on idle client:', err);
});
//# sourceMappingURL=database.js.map