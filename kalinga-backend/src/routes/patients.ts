import { Router, Response } from 'express';
import { z } from 'zod';
import { pool } from '../config/database.js';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';

export const patientsRouter = Router();

const patientSchema = z.object({
  id: z.string().uuid(),
  fullName: z.string().min(2),
  philhealthId: z.string().optional().nullable(),
  age: z.number().int().min(12).max(60),
  lmp: z.string().optional().nullable(),
  estimatedDueDate: z.string().optional().nullable(),
  gravida: z.number().int().default(1),
  para: z.number().int().default(0),
  riskFactors: z.array(z.string()).default([]),
  barangay: z.string().optional().nullable(),
  municipality: z.string().optional().nullable(),
  province: z.string().optional().nullable(),
  contactNumber: z.string().optional().nullable(),
});

// POST /api/patients — Batch sync patients
patientsRouter.post('/', authMiddleware, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const rawPatients = Array.isArray(req.body) ? req.body : [req.body];
    const syncedIds: string[] = [];
    const errors: { id: string; error: string }[] = [];

    for (const rawPatient of rawPatients) {
      try {
        const patient = patientSchema.parse(rawPatient);

        await pool.query(
          `INSERT INTO patients (
            id, midwife_id, full_name, philhealth_id, age, lmp, estimated_due_date,
            gravida, para, risk_factors, barangay, municipality, province, contact_number
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
           ON CONFLICT (id) DO UPDATE SET
            full_name = EXCLUDED.full_name,
            philhealth_id = EXCLUDED.philhealth_id,
            age = EXCLUDED.age,
            lmp = EXCLUDED.lmp,
            estimated_due_date = EXCLUDED.estimated_due_date,
            gravida = EXCLUDED.gravida,
            para = EXCLUDED.para,
            risk_factors = EXCLUDED.risk_factors,
            barangay = EXCLUDED.barangay,
            municipality = EXCLUDED.municipality,
            province = EXCLUDED.province,
            contact_number = EXCLUDED.contact_number,
            updated_at = NOW()`,
          [
            patient.id,
            req.userId,
            patient.fullName,
            patient.philhealthId || null,
            patient.age,
            patient.lmp || null,
            patient.estimatedDueDate || null,
            patient.gravida,
            patient.para,
            patient.riskFactors,
            patient.barangay || null,
            patient.municipality || null,
            patient.province || null,
            patient.contactNumber || null,
          ]
        );

        syncedIds.push(patient.id);
      } catch (err) {
        errors.push({
          id: rawPatient?.id || 'unknown',
          error: err instanceof Error ? err.message : 'Validation failed',
        });
      }
    }

    res.status(200).json({
      synced: syncedIds.length,
      syncedIds,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/patients — Retrieve midwife's registered patients
patientsRouter.get('/', authMiddleware, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const result = await pool.query(
      `SELECT * FROM patients WHERE midwife_id = $1 ORDER BY full_name ASC`,
      [req.userId]
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// GET /api/patients/:id — Retrieve specific patient by ID
patientsRouter.get('/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM patients WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});
