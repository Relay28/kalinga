"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const env_js_1 = require("./config/env.js");
const cors_js_1 = require("./config/cors.js");
const rateLimit_js_1 = require("./middleware/rateLimit.js");
const errorHandler_js_1 = require("./middleware/errorHandler.js");
const auth_js_1 = require("./routes/auth.js");
const triage_js_1 = require("./routes/triage.js");
const patients_js_1 = require("./routes/patients.js");
const health_js_1 = require("./routes/health.js");
const app = (0, express_1.default)();
const PORT = env_js_1.config.PORT;
// Global middleware
app.use((0, cors_1.default)(cors_js_1.corsOptions));
app.use(express_1.default.json({ limit: '5mb' })); // Limit body size to protect memory limit (512 MB Render)
app.use(rateLimit_js_1.rateLimiter);
// API Routes
app.use('/api/health', health_js_1.healthRouter);
app.use('/api/auth', auth_js_1.authRouter);
app.use('/api/patients', patients_js_1.patientsRouter);
app.use('/api/triage', triage_js_1.triageRouter);
// Global Error Handler
app.use(errorHandler_js_1.errorHandler);
// Start server
app.listen(PORT, () => {
    console.log(`[Kalinga:API] Server successfully running on port ${PORT}`);
    console.log(`[Kalinga:API] Environment: ${env_js_1.config.NODE_ENV}`);
});
//# sourceMappingURL=index.js.map