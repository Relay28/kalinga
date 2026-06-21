const express = require('express');
const router = express.Router();
const db = require('../db');
const { validate } = require('../middleware/validation');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

// GET /api/patients
router.get('/', asyncHandler(async (req, res) => {
  const list = await db.getPatients();
  res.json(list);
}));

// POST /api/patients
router.post('/', validate('createPatient'), asyncHandler(async (req, res) => {
  const patient = req.body;
  
  // Check for duplicate PhilHealth ID
  const existingPatients = await db.getPatients();
  const duplicate = existingPatients.find(p => p.id === patient.id && p.id !== patient.id);
  
  if (duplicate) {
    throw new AppError('Patient with this PhilHealth ID already exists', 409);
  }
  
  const saved = await db.savePatient(patient);
  res.status(201).json(saved);
}));

// PATCH /api/patients/:id - Update patient data and recalculate risk score
router.patch('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  
  // Get existing patient
  const existingPatient = await db.getPatientById(id);
  
  if (!existingPatient) {
    throw new AppError('Patient not found', 404);
  }
  
  // Merge updates with existing patient data
  const updatedPatient = {
    ...existingPatient,
    ...updates,
    id, // Preserve the original ID
    lastUpdated: new Date().toISOString()
  };
  
  // Save updated patient
  const saved = await db.savePatient(updatedPatient);
  
  res.json(saved);
}));

module.exports = router;
