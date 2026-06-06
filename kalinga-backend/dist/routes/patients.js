"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.patientsRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const database_js_1 = require("../config/database.js");
const auth_js_1 = require("../middleware/auth.js");
exports.patientsRouter = (0, express_1.Router)();
const patientSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    fullName: zod_1.z.string().min(2),
    philhealthId: zod_1.z.string().optional().nullable(),
    age: zod_1.z.number().int().min(12).max(60),
    lmp: zod_1.z.string().optional().nullable(),
    estimatedDueDate: zod_1.z.string().optional().nullable(),
    gravida: zod_1.z.number().int().default(1),
    para: zod_1.z.number().int().default(0),
    riskFactors: zod_1.z.array(zod_1.z.string()).default([]),
    barangay: zod_1.z.string().optional().nullable(),
    municipality: zod_1.z.string().optional().nullable(),
    province: zod_1.z.string().optional().nullable(),
    contactNumber: zod_1.z.string().optional().nullable(),
});
// POST /api/patients — Batch sync patients
exports.patientsRouter.post('/', auth_js_1.authMiddleware, async (req, res, next) => {
    try {
        const rawPatients = Array.isArray(req.body) ? req.body : [req.body];
        const syncedIds = [];
        const errors = [];
        for (const rawPatient of rawPatients) {
            try {
                const patient = patientSchema.parse(rawPatient);
                await database_js_1.pool.query(`INSERT INTO patients (
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
            updated_at = NOW()`, [
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
                ]);
                syncedIds.push(patient.id);
            }
            catch (err) {
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
    }
    catch (err) {
        next(err);
    }
});
// GET /api/patients — Retrieve midwife's registered patients
exports.patientsRouter.get('/', auth_js_1.authMiddleware, async (req, res, next) => {
    try {
        const result = await database_js_1.pool.query(`SELECT * FROM patients WHERE midwife_id = $1 ORDER BY full_name ASC`, [req.userId]);
        res.json(result.rows);
    }
    catch (err) {
        next(err);
    }
});
// GET /api/patients/:id — Retrieve specific patient by ID
exports.patientsRouter.get('/:id', auth_js_1.authMiddleware, async (req, res, next) => {
    try {
        const { id } = req.params;
        const result = await database_js_1.pool.query('SELECT * FROM patients WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Patient not found' });
        }
        res.json(result.rows[0]);
    }
    catch (err) {
        next(err);
    }
});
//# sourceMappingURL=patients.js.map