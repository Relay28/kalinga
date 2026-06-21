require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });
const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');
const { seed } = require('./data/seed');
const { requestLogger } = require('./middleware/logger');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS from the frontend React Client
const corsOptions = {
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
};
app.use(cors(corsOptions));
app.use(express.json());

// Request logging middleware (before routes)
app.use(requestLogger);

// Serving static files (such as scan ultrasound frame assets)
app.use('/assets', express.static(path.join(__dirname, '..', '..', 'assets')));
app.use('/Screens', express.static(path.join(__dirname, '..', '..', 'Screens')));

// Mount routes
app.use('/api/patients', require('./routes/patients'));
app.use('/api/scans', require('./routes/scans'));
app.use('/api/scans', require('./routes/specialist')); // Mounts PATCH /api/scans/:id/verify
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/ai', require('./routes/ai'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date() });
});

// 404 handler for undefined routes (must be after all route definitions)
app.use(notFoundHandler);

// Global error handler (must be last middleware)
app.use(errorHandler);

// Start server after initializing database
async function startServer() {
  try {
    await db.init();
    await seed();
    
    app.listen(PORT, () => {
      console.log(`[KalingaAI Server] running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("Failed to start KalingaAI server:", err);
  }
}

startServer();
