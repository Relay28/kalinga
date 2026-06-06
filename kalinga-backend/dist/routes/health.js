"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthRouter = void 0;
const express_1 = require("express");
const database_js_1 = require("../config/database.js");
exports.healthRouter = (0, express_1.Router)();
exports.healthRouter.get('/', async (_req, res) => {
    try {
        const dbResult = await database_js_1.pool.query('SELECT NOW() AS server_time');
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
    }
    catch (err) {
        res.status(503).json({
            status: 'degraded',
            database: 'disconnected',
            error: err instanceof Error ? err.message : 'Unknown database error',
        });
    }
});
//# sourceMappingURL=health.js.map