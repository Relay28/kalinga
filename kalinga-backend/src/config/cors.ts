import cors from 'cors';

const ALLOWED_ORIGINS = [
  'https://kalinga-ai.vercel.app', // Production frontend
  'http://localhost:3000',           // Local Next.js development server
  'http://localhost:5173',           // Local Vite React development server
  'http://127.0.0.1:5173',           // Local Vite React loopback
];

export const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (ALLOWED_ORIGINS.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
