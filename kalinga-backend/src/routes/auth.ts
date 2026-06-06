import { Router, Response } from 'express';
import { z } from 'zod';
import { pool } from '../config/database.js';
import { hashPassword, verifyPassword, generateToken } from '../services/authService.js';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';

export const authRouter = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  role: z.enum(['midwife', 'obgyn', 'admin']),
  licenseNumber: z.string().optional(),
  barangay: z.string().optional(),
  specialization: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

// POST /api/auth/register — Register user
authRouter.post('/register', async (req, res, next) => {
  try {
    const data = registerSchema.parse(req.body);

    // Check if user already exists
    const checkUser = await pool.query('SELECT id FROM users WHERE email = $1', [data.email]);
    if (checkUser.rows.length > 0) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Hash password
    const hashed = await hashPassword(data.password);

    // Save user
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, full_name, role, license_number, barangay, specialization)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, email, full_name, role`,
      [
        data.email.toLowerCase(),
        hashed,
        data.fullName,
        data.role,
        data.licenseNumber || null,
        data.barangay || null,
        data.specialization || null,
      ]
    );

    const user = result.rows[0];
    const token = generateToken(user.id, user.role);

    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors });
    }
    next(err);
  }
});

// POST /api/auth/login — User login
authRouter.post('/login', async (req, res, next) => {
  try {
    const data = loginSchema.parse(req.body);

    const result = await pool.query(
      'SELECT id, email, password_hash, full_name, role FROM users WHERE email = $1 AND is_active = true',
      [data.email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];
    const isPasswordValid = await verifyPassword(data.password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = generateToken(user.id, user.role);

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors });
    }
    next(err);
  }
});

// GET /api/auth/me — Retrieve active user session profile
authRouter.get('/me', authMiddleware, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const result = await pool.query(
      `SELECT id, email, full_name, role, license_number, barangay, specialization, created_at
       FROM users WHERE id = $1`,
      [req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User session not found' });
    }

    const dbUser = result.rows[0];
    res.json({
      user: {
        id: dbUser.id,
        email: dbUser.email,
        fullName: dbUser.full_name,
        role: dbUser.role,
        licenseNumber: dbUser.license_number,
        barangay: dbUser.barangay,
        specialization: dbUser.specialization,
        createdAt: dbUser.created_at,
      },
    });
  } catch (err) {
    next(err);
  }
});
