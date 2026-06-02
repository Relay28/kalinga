import { Router, Response } from 'express';
import { z } from 'zod';
import { pool } from '../config/database.js';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';

export const triageRouter = Router();

const triagePacketSchema = z.object({
  id: z.string().uuid(),
  patientId: z.string().uuid(),
  systolicBP: z.number().int().min(60).max(300),
  diastolicBP: z.number().int().min(30).max(200),
  heartRate: z.number().int().min(40).max(200).nullable().optional(),
  gestationalAgeWeeks: z.number().min(4).max(44),
  bmi: z.number().min(10).max(50).nullable().optional(),
  proteinUrine: z.enum(['negative', 'trace', '+1', '+2', '+3', '+4']),
  symptoms: z.array(z.string()),
  frameBase64: z.string().nullable().optional(),
  frameThumbnailB64: z.string().nullable().optional(),
  aiPrediction: z.object({
    normal: z.number().min(0).max(1),
    abnormal: z.number().min(0).max(1),
    inconclusive: z.number().min(0).max(1),
  }),
  aiInferenceTimeMs: z.number().int(),
  riskScore: z.number().int().min(0).max(100),
  triageLevel: z.enum(['LOW', 'MODERATE', 'HIGH']),
  clientCapturedAt: z.string().datetime(),
  barangayStation: z.string().nullable().optional(),
  gpsLatitude: z.number().min(-90).max(90).nullable().optional(),
  gpsLongitude: z.number().min(-180).max(180).nullable().optional(),
});

// POST /api/triage — Batch sync triage packets from client
triageRouter.post('/', authMiddleware, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const packets = Array.isArray(req.body) ? req.body : [req.body];
    const syncedIds: string[] = [];
    const errors: { id: string; error: string }[] = [];

    for (const rawPacket of packets) {
      try {
        const packet = triagePacketSchema.parse(rawPacket);

        // Check if patient exists to avoid foreign key crash
        const patientCheck = await pool.query('SELECT id FROM patients WHERE id = $1', [packet.patientId]);
        if (patientCheck.rows.length === 0) {
          throw new Error(`Referenced patient ID ${packet.patientId} does not exist. Please sync patients first.`);
        }

        await pool.query(
          `INSERT INTO triage_packets (
            id, patient_id, midwife_id,
            systolic_bp, diastolic_bp, heart_rate,
            gestational_age_weeks, bmi, protein_urine, symptoms,
            frame_base64, frame_thumbnail_b64,
            ai_prediction_normal, ai_prediction_abnormal, ai_prediction_inconcl,
            ai_inference_time_ms, risk_score, triage_level,
            client_captured_at, barangay_station, gps_latitude, gps_longitude
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
          ON CONFLICT (id) DO UPDATE SET
            systolic_bp = EXCLUDED.systolic_bp,
            diastolic_bp = EXCLUDED.diastolic_bp,
            heart_rate = EXCLUDED.heart_rate,
            gestational_age_weeks = EXCLUDED.gestational_age_weeks,
            bmi = EXCLUDED.bmi,
            protein_urine = EXCLUDED.protein_urine,
            symptoms = EXCLUDED.symptoms,
            frame_base64 = EXCLUDED.frame_base64,
            frame_thumbnail_b64 = EXCLUDED.frame_thumbnail_b64,
            ai_prediction_normal = EXCLUDED.ai_prediction_normal,
            ai_prediction_abnormal = EXCLUDED.ai_prediction_abnormal,
            ai_prediction_inconcl = EXCLUDED.ai_prediction_inconcl,
            ai_inference_time_ms = EXCLUDED.ai_inference_time_ms,
            risk_score = EXCLUDED.risk_score,
            triage_level = EXCLUDED.triage_level,
            gps_latitude = EXCLUDED.gps_latitude,
            gps_longitude = EXCLUDED.gps_longitude,
            updated_at = NOW()`,
          [
            packet.id,
            packet.patientId,
            req.userId,
            packet.systolicBP,
            packet.diastolicBP,
            packet.heartRate || null,
            packet.gestationalAgeWeeks,
            packet.bmi || null,
            packet.proteinUrine,
            packet.symptoms,
            packet.frameBase64 || null,
            packet.frameThumbnailB64 || null,
            packet.aiPrediction.normal,
            packet.aiPrediction.abnormal,
            packet.aiPrediction.inconclusive,
            packet.aiInferenceTimeMs,
            packet.riskScore,
            packet.triageLevel,
            packet.clientCapturedAt,
            packet.barangayStation || null,
            packet.gpsLatitude || null,
            packet.gpsLongitude || null,
          ]
        );

        syncedIds.push(packet.id);
      } catch (err) {
        errors.push({
          id: rawPacket?.id || 'unknown',
          error: err instanceof Error ? err.message : 'Validation failed',
        });
      }
    }

    // Log sync event if any packets synced
    if (syncedIds.length > 0) {
      await pool.query(
        `INSERT INTO sync_events (midwife_id, packets_synced, sync_source, device_info)
         VALUES ($1, $2, $3, $4)`,
        [
          req.userId,
          syncedIds.length,
          'api_sync',
          JSON.stringify({ userAgent: req.headers['user-agent'] })
        ]
      );
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

// GET /api/triage/queue — OB-GYN verification queue (prioritized list)
triageRouter.get('/queue', authMiddleware, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { status = 'pending', limit = '20', offset = '0' } = req.query;

    const limitVal = Math.min(100, Math.max(1, parseInt(limit as string) || 20));
    const offsetVal = Math.max(0, parseInt(offset as string) || 0);

    let queryStr = 'SELECT * FROM verification_queue';
    const params: any[] = [limitVal, offsetVal];

    if (status !== 'all') {
      queryStr = `
        SELECT
          tp.id,
          tp.risk_score,
          tp.triage_level,
          tp.systolic_bp,
          tp.diastolic_bp,
          tp.gestational_age_weeks,
          tp.protein_urine,
          tp.symptoms,
          tp.frame_thumbnail_b64,
          tp.ai_prediction_abnormal,
          tp.specialist_verdict,
          tp.client_captured_at,
          tp.synced_at,
          p.full_name AS patient_name,
          p.age AS patient_age,
          p.gravida,
          p.para,
          u.full_name AS midwife_name,
          u.barangay AS station
        FROM triage_packets tp
        JOIN patients p ON tp.patient_id = p.id
        LEFT JOIN users u ON tp.midwife_id = u.id
        WHERE tp.specialist_verdict = $3
        ORDER BY tp.risk_score DESC, tp.synced_at ASC
        LIMIT $1 OFFSET $2
      `;
      params.push(status);
    } else {
      queryStr = `
        SELECT
          tp.id,
          tp.risk_score,
          tp.triage_level,
          tp.systolic_bp,
          tp.diastolic_bp,
          tp.gestational_age_weeks,
          tp.protein_urine,
          tp.symptoms,
          tp.frame_thumbnail_b64,
          tp.ai_prediction_abnormal,
          tp.specialist_verdict,
          tp.client_captured_at,
          tp.synced_at,
          p.full_name AS patient_name,
          p.age AS patient_age,
          p.gravida,
          p.para,
          u.full_name AS midwife_name,
          u.barangay AS station
        FROM triage_packets tp
        JOIN patients p ON tp.patient_id = p.id
        LEFT JOIN users u ON tp.midwife_id = u.id
        ORDER BY tp.risk_score DESC, tp.synced_at ASC
        LIMIT $1 OFFSET $2
      `;
    }

    const result = await pool.query(queryStr, params);

    // Count stats for dashboard header
    const stats = await pool.query(
      `SELECT
        COUNT(*) FILTER (WHERE specialist_verdict = 'pending') AS pending,
        COUNT(*) FILTER (WHERE triage_level = 'HIGH' AND specialist_verdict = 'pending') AS critical,
        COUNT(*) FILTER (WHERE specialist_verdict != 'pending') AS reviewed,
        COUNT(*) AS total
       FROM triage_packets`
    );

    res.json({
      queue: result.rows,
      stats: stats.rows[0],
      pagination: { limit: limitVal, offset: offsetVal },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/triage/:id — Retrieve detailed triage packet (including full frame base64)
triageRouter.get('/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT tp.*, p.full_name as patient_name, p.age as patient_age, p.gravida, p.para
       FROM triage_packets tp
       JOIN patients p ON tp.patient_id = p.id
       WHERE tp.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Triage packet not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// PUT /api/triage/:id/verdict — OB-GYN submits verification verdict
triageRouter.put('/:id/verdict', authMiddleware, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { id } = req.params;
    const { verdict, notes, specialistRecommendations, overrideRiskScore } = req.body;

    if (!['confirmed', 'escalated', 'overridden'].includes(verdict)) {
      return res.status(400).json({ error: 'Invalid verdict value. Must be confirmed, escalated, or overridden.' });
    }

    if (verdict === 'overridden' && (overrideRiskScore === undefined || overrideRiskScore < 0 || overrideRiskScore > 100)) {
      return res.status(400).json({ error: 'overrideRiskScore (0-100) is required for overridden status' });
    }

    const result = await pool.query(
      `UPDATE triage_packets
       SET specialist_id = $1,
           specialist_verdict = $2,
           specialist_notes = $3,
           specialist_recommendations = $4,
           override_risk_score = $5,
           reviewed_at = NOW(),
           updated_at = NOW()
       WHERE id = $6
       RETURNING id, specialist_verdict, risk_score, override_risk_score`,
      [
        req.userId,
        verdict,
        notes || null,
        specialistRecommendations || null,
        overrideRiskScore !== undefined ? overrideRiskScore : null,
        id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Triage packet not found' });
    }

    res.json({
      message: 'Verdict submitted successfully',
      updated: result.rows[0]
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/triage/:id/report — Generate finalized diagnostic report
triageRouter.get('/:id/report', authMiddleware, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      `SELECT 
        tp.id AS triage_id,
        tp.systolic_bp,
        tp.diastolic_bp,
        tp.heart_rate,
        tp.gestational_age_weeks,
        tp.bmi,
        tp.protein_urine,
        tp.symptoms,
        tp.risk_score,
        tp.triage_level,
        tp.specialist_verdict,
        tp.specialist_notes,
        tp.specialist_recommendations,
        tp.override_risk_score,
        tp.reviewed_at,
        tp.client_captured_at,
        tp.barangay_station,
        tp.gps_latitude,
        tp.gps_longitude,
        p.full_name AS patient_name,
        p.age AS patient_age,
        p.lmp AS patient_lmp,
        p.estimated_due_date AS patient_edd,
        p.gravida,
        p.para,
        p.risk_factors,
        u.full_name AS midwife_name,
        doc.full_name AS specialist_name,
        doc.license_number AS specialist_license
       FROM triage_packets tp
       JOIN patients p ON tp.patient_id = p.id
       LEFT JOIN users u ON tp.midwife_id = u.id
       LEFT JOIN users doc ON tp.specialist_id = doc.id
       WHERE tp.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Triage packet not found' });
    }

    const data = result.rows[0];

    // Compute active triage score (use override if available)
    const finalScore = data.override_risk_score !== null ? data.override_risk_score : data.risk_score;
    
    // Classify risk level based on final score
    let finalRiskLevel = 'LOW';
    if (finalScore > 60) {
      finalRiskLevel = 'HIGH';
    } else if (finalScore > 30) {
      finalRiskLevel = 'MODERATE';
    }

    res.json({
      reportHeader: {
        title: "KALINGA AI — MATERNAL TRIAGE DIAGNOSTIC REPORT",
        referenceId: data.triage_id,
        timestamp: new Date().toISOString(),
        frameworkCompliance: "NPC Advisory 2024.12.19 (Data Privacy Act of 2012)",
        disclaimer: "⚠️ Prototype proof-of-concept. Must be verified by a licensed specialist before clinical intervention."
      },
      patientInfo: {
        name: data.patient_name,
        age: data.patient_age,
        gravida: data.gravida,
        para: data.para,
        lmp: data.patient_lmp,
        edd: data.patient_edd,
        clinicalHistory: data.risk_factors || []
      },
      clinicalData: {
        vitals: {
          bloodPressure: `${data.systolic_bp}/${data.diastolic_bp} mmHg`,
          heartRate: data.heart_rate ? `${data.heart_rate} bpm` : "N/A",
          bmi: data.bmi ? `${data.bmi}` : "N/A",
          gestationalAge: `${data.gestational_age_weeks} weeks`
        },
        triageIndicators: {
          proteinuria: data.protein_urine,
          symptoms: data.symptoms || []
        }
      },
      assessment: {
        initialAiScore: data.risk_score,
        initialAiLevel: data.triage_level,
        specialistOverrideScore: data.override_risk_score,
        finalScore,
        finalRiskLevel
      },
      verification: {
        verdict: data.specialist_verdict,
        reviewedAt: data.reviewed_at,
        specialistName: data.specialist_name || "Pending Review",
        specialistLicense: data.specialist_license || "N/A",
        notes: data.specialist_notes || "No notes provided",
        clinicalRecommendations: data.specialist_recommendations || "No recommendations provided"
      },
      epidemiology: {
        barangayHealthStation: data.barangay_station || "Unknown BHS",
        midwife: data.midwife_name || "Unknown Midwife",
        capturedAt: data.client_captured_at,
        coordinates: {
          latitude: data.gps_latitude,
          longitude: data.gps_longitude
        }
      }
    });
  } catch (err) {
    next(err);
  }
});
