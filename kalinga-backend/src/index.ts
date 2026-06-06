import express from 'express';
import cors from 'cors';
import { config } from './config/env.js';
import { corsOptions } from './config/cors.js';
import { rateLimiter } from './middleware/rateLimit.js';
import { errorHandler } from './middleware/errorHandler.js';
import { authRouter } from './routes/auth.js';
import { triageRouter } from './routes/triage.js';
import { patientsRouter } from './routes/patients.js';
import { healthRouter } from './routes/health.js';

const app = express();
const PORT = config.PORT;

// Global middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '5mb' })); // Limit body size to protect memory limit (512 MB Render)
app.use(rateLimiter);

// API Routes
app.use('/api/health', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/patients', patientsRouter);
app.use('/api/triage', triageRouter);

// Global Error Handler
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`[Kalinga:API] Server successfully running on port ${PORT}`);
  console.log(`[Kalinga:API] Environment: ${config.NODE_ENV}`);
});
