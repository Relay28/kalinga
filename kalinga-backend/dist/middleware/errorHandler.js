"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
const env_js_1 = require("../config/env.js");
function errorHandler(err, req, res, _next) {
    const statusCode = err.status || err.statusCode || 500;
    // Log critical error
    console.error(`[Kalinga:ERROR] [${req.method} ${req.path}]:`, err.stack || err.message);
    res.status(statusCode).json({
        error: statusCode === 500 ? 'Internal Server Error' : err.message,
        details: env_js_1.config.NODE_ENV === 'development' ? err.stack : undefined,
    });
}
//# sourceMappingURL=errorHandler.js.map