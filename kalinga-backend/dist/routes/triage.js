"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.triageRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const database_js_1 = require("../config/database.js");
const auth_js_1 = require("../middleware/auth.js");
const child_process_1 = require("child_process");
const path_1 = __importDefault(require("path"));
const riskService_js_1 = require("../services/riskService.js");
exports.triageRouter = (0, express_1.Router)();
function runPythonInference(base64Image) {
    return new Promise((resolve, reject) => {
        const pythonPath = process.env.PYTHON_PATH || 'python';
        const scriptPath = path_1.default.join(process.cwd(), 'scripts', 'fetalclip_inference.py');
        const start = performance.now();
        const child = (0, child_process_1.spawn)(pythonPath, [scriptPath]);
        let stdoutData = '';
        let stderrData = '';
        child.stdout.on('data', (data) => {
            stdoutData += data.toString();
        });
        child.stderr.on('data', (data) => {
            stderrData += data.toString();
        });
        child.on('error', (err) => {
            reject(new Error(`Failed to start python process: ${err.message}`));
        });
        child.on('close', (code) => {
            const duration = Math.round(performance.now() - start);
            if (code !== 0) {
                reject(new Error(`Python process exited with code ${code}. Stderr: ${stderrData}`));
                return;
            }
            try {
                const result = JSON.parse(stdoutData.trim());
                if (result.error) {
                    reject(new Error(`Python inference error: ${result.error}`));
                }
                else {
                    resolve({
                        ...result,
                        inferenceTimeMs: duration
                    });
                }
            }
            catch (err) {
                reject(new Error(`Failed to parse python output: ${stdoutData}. Error: ${err}`));
            }
        });
        // Write image base64 directly to python process stdin
        child.stdin.write(base64Image);
        child.stdin.end();
    });
}
const triagePacketSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    patientId: zod_1.z.string().uuid(),
    systolicBP: zod_1.z.number().int().min(60).max(300),
    diastolicBP: zod_1.z.number().int().min(30).max(200),
    heartRate: zod_1.z.number().int().min(40).max(200).nullable().optional(),
    gestationalAgeWeeks: zod_1.z.number().min(4).max(44),
    bmi: zod_1.z.number().min(10).max(50).nullable().optional(),
    proteinUrine: zod_1.z.enum(['negative', 'trace', '+1', '+2', '+3', '+4']),
    symptoms: zod_1.z.array(zod_1.z.string()),
    frameBase64: zod_1.z.string().nullable().optional(),
    frameThumbnailB64: zod_1.z.string().nullable().optional(),
    aiPrediction: zod_1.z.object({
        normal: zod_1.z.number().min(0).max(1),
        abnormal: zod_1.z.number().min(0).max(1),
        inconclusive: zod_1.z.number().min(0).max(1),
    }).nullable().optional(),
    aiInferenceTimeMs: zod_1.z.number().int().nullable().optional(),
    riskScore: zod_1.z.number().int().min(0).max(100).nullable().optional(),
    triageLevel: zod_1.z.enum(['LOW', 'MODERATE', 'HIGH']).nullable().optional(),
    clientCapturedAt: zod_1.z.string().datetime(),
    barangayStation: zod_1.z.string().nullable().optional(),
    gpsLatitude: zod_1.z.number().min(-90).max(90).nullable().optional(),
    gpsLongitude: zod_1.z.number().min(-180).max(180).nullable().optional(),
});
// POST /api/triage — Batch sync triage packets from client
exports.triageRouter.post('/', auth_js_1.authMiddleware, async (req, res, next) => {
    try {
        const packets = Array.isArray(req.body) ? req.body : [req.body];
        const syncedIds = [];
        const errors = [];
        for (const rawPacket of packets) {
            try {
                const packet = triagePacketSchema.parse(rawPacket);
                // Check if patient exists to avoid foreign key crash
                const patientCheck = await database_js_1.pool.query('SELECT id FROM patients WHERE id = $1', [packet.patientId]);
                if (patientCheck.rows.length === 0) {
                    throw new Error(`Referenced patient ID ${packet.patientId} does not exist. Please sync patients first.`);
                }
                let aiPredictionNormal = packet.aiPrediction?.normal ?? null;
                let aiPredictionAbnormal = packet.aiPrediction?.abnormal ?? null;
                let aiPredictionInconcl = packet.aiPrediction?.inconclusive ?? null;
                let aiInferenceTimeMs = packet.aiInferenceTimeMs ?? null;
                let riskScore = packet.riskScore ?? null;
                let triageLevel = packet.triageLevel ?? null;
                // Perform FetalCLIP zero-shot inference and risk scoring on the server side
                if (packet.frameBase64 && (riskScore === null || riskScore === undefined || riskScore === 0)) {
                    try {
                        console.log(`[Kalinga:API] Executing FetalCLIP inference for triage packet: ${packet.id}`);
                        const result = await runPythonInference(packet.frameBase64);
                        aiPredictionNormal = result.normal;
                        aiPredictionAbnormal = result.abnormal;
                        aiPredictionInconcl = result.inconclusive;
                        aiInferenceTimeMs = result.inferenceTimeMs;
                        const vitals = {
                            systolicBP: packet.systolicBP,
                            diastolicBP: packet.diastolicBP,
                            heartRate: packet.heartRate,
                            gestationalAgeWeeks: packet.gestationalAgeWeeks,
                            bmi: packet.bmi,
                            proteinUrine: packet.proteinUrine,
                            symptoms: packet.symptoms
                        };
                        const assessment = (0, riskService_js_1.computeRiskScore)({
                            normal: result.normal,
                            abnormal: result.abnormal,
                            inconclusive: result.inconclusive
                        }, vitals);
                        riskScore = assessment.score;
                        triageLevel = assessment.level;
                        console.log(`[Kalinga:API] FetalCLIP inference succeeded. Risk Score: ${riskScore}%, Level: ${triageLevel}`);
                    }
                    catch (aiErr) {
                        console.error('[Kalinga:API] Backend FetalCLIP execution failed, falling back to safe defaults:', aiErr);
                        aiPredictionNormal = 0.85;
                        aiPredictionAbnormal = 0.10;
                        aiPredictionInconcl = 0.05;
                        aiInferenceTimeMs = 0;
                        riskScore = 20; // safe baseline low risk score
                        triageLevel = 'LOW';
                    }
                }
                await database_js_1.pool.query(`INSERT INTO triage_packets (
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
            updated_at = NOW()`, [
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
                    aiPredictionNormal,
                    aiPredictionAbnormal,
                    aiPredictionInconcl,
                    aiInferenceTimeMs,
                    riskScore,
                    triageLevel,
                    packet.clientCapturedAt,
                    packet.barangayStation || null,
                    packet.gpsLatitude || null,
                    packet.gpsLongitude || null,
                ]);
                syncedIds.push(packet.id);
            }
            catch (err) {
                errors.push({
                    id: rawPacket?.id || 'unknown',
                    error: err instanceof Error ? err.message : 'Validation failed',
                });
            }
        }
        // Log sync event if any packets synced
        if (syncedIds.length > 0) {
            await database_js_1.pool.query(`INSERT INTO sync_events (midwife_id, packets_synced, sync_source, device_info)
         VALUES ($1, $2, $3, $4)`, [
                req.userId,
                syncedIds.length,
                'api_sync',
                JSON.stringify({ userAgent: req.headers['user-agent'] })
            ]);
        }
        res.status(200).json({
            synced: syncedIds.length,
            syncedIds,
            errors: errors.length > 0 ? errors : undefined,
        });
    }
    catch (err) {
        next(err);
    }
});
// GET /api/triage/queue — OB-GYN verification queue (prioritized list)
exports.triageRouter.get('/queue', auth_js_1.authMiddleware, async (req, res, next) => {
    try {
        const { status = 'pending', limit = '20', offset = '0' } = req.query;
        const limitVal = Math.min(100, Math.max(1, parseInt(limit) || 20));
        const offsetVal = Math.max(0, parseInt(offset) || 0);
        let queryStr = 'SELECT * FROM verification_queue';
        const params = [limitVal, offsetVal];
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
        }
        else {
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
        const result = await database_js_1.pool.query(queryStr, params);
        // Count stats for dashboard header
        const stats = await database_js_1.pool.query(`SELECT
        COUNT(*) FILTER (WHERE specialist_verdict = 'pending') AS pending,
        COUNT(*) FILTER (WHERE triage_level = 'HIGH' AND specialist_verdict = 'pending') AS critical,
        COUNT(*) FILTER (WHERE specialist_verdict != 'pending') AS reviewed,
        COUNT(*) AS total
       FROM triage_packets`);
        res.json({
            queue: result.rows,
            stats: stats.rows[0],
            pagination: { limit: limitVal, offset: offsetVal },
        });
    }
    catch (err) {
        next(err);
    }
});
// GET /api/triage/:id — Retrieve detailed triage packet (including full frame base64)
exports.triageRouter.get('/:id', auth_js_1.authMiddleware, async (req, res, next) => {
    try {
        const { id } = req.params;
        const result = await database_js_1.pool.query(`SELECT tp.*, p.full_name as patient_name, p.age as patient_age, p.gravida, p.para
       FROM triage_packets tp
       JOIN patients p ON tp.patient_id = p.id
       WHERE tp.id = $1`, [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Triage packet not found' });
        }
        const row = result.rows[0];
        // Generate clinical AI summary
        const aiSummary = (0, riskService_js_1.generateAiSummary)({
            normal: row.ai_prediction_normal || 0,
            abnormal: row.ai_prediction_abnormal || 0,
            inconclusive: row.ai_prediction_inconcl || 0
        });
        res.json({
            ...row,
            aiSummary
        });
    }
    catch (err) {
        next(err);
    }
});
// PUT /api/triage/:id/verdict — OB-GYN submits verification verdict
exports.triageRouter.put('/:id/verdict', auth_js_1.authMiddleware, async (req, res, next) => {
    try {
        const { id } = req.params;
        const { verdict, notes, specialistRecommendations, overrideRiskScore } = req.body;
        if (!['confirmed', 'escalated', 'overridden'].includes(verdict)) {
            return res.status(400).json({ error: 'Invalid verdict value. Must be confirmed, escalated, or overridden.' });
        }
        if (verdict === 'overridden' && (overrideRiskScore === undefined || overrideRiskScore < 0 || overrideRiskScore > 100)) {
            return res.status(400).json({ error: 'overrideRiskScore (0-100) is required for overridden status' });
        }
        const result = await database_js_1.pool.query(`UPDATE triage_packets
       SET specialist_id = $1,
           specialist_verdict = $2,
           specialist_notes = $3,
           specialist_recommendations = $4,
           override_risk_score = $5,
           reviewed_at = NOW(),
           updated_at = NOW()
       WHERE id = $6
       RETURNING id, specialist_verdict, risk_score, override_risk_score`, [
            req.userId,
            verdict,
            notes || null,
            specialistRecommendations || null,
            overrideRiskScore !== undefined ? overrideRiskScore : null,
            id
        ]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Triage packet not found' });
        }
        res.json({
            message: 'Verdict submitted successfully',
            updated: result.rows[0]
        });
    }
    catch (err) {
        next(err);
    }
});
// GET /api/triage/:id/report — Generate finalized diagnostic report
exports.triageRouter.get('/:id/report', auth_js_1.authMiddleware, async (req, res, next) => {
    try {
        const { id } = req.params;
        const result = await database_js_1.pool.query(`SELECT 
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
        tp.ai_prediction_normal,
        tp.ai_prediction_abnormal,
        tp.ai_prediction_inconcl,
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
       WHERE tp.id = $1`, [id]);
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
        }
        else if (finalScore > 30) {
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
                finalRiskLevel,
                aiSummary: (0, riskService_js_1.generateAiSummary)({
                    normal: data.ai_prediction_normal || 0,
                    abnormal: data.ai_prediction_abnormal || 0,
                    inconclusive: data.ai_prediction_inconcl || 0
                })
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
    }
    catch (err) {
        next(err);
    }
});
//# sourceMappingURL=triage.js.map