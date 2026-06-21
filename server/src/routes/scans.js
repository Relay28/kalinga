const express = require('express');
const router = express.Router();
const db = require('../db');
const { validate } = require('../middleware/validation');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

// GET /api/scans
router.get('/', asyncHandler(async (req, res) => {
  const list = await db.getScans();
  res.json(list);
}));

// GET /api/scans/pending
router.get('/pending', asyncHandler(async (req, res) => {
  const list = await db.getScans();
  const pending = list.filter(s => s.status === 'Submitted');
  res.json(pending);
}));

// GET /api/scans/:id
router.get('/:id', asyncHandler(async (req, res) => {
  const scan = await db.getScanById(req.params.id);
  
  if (!scan) {
    throw new AppError('Scan record not found', 404);
  }
  
  res.json(scan);
}));

// POST /api/scans
router.post('/', validate('createScan'), asyncHandler(async (req, res) => {
  const scan = req.body;
  
  // Verify patient exists
  const patient = await db.getPatientById(scan.patientId);
  if (!patient) {
    throw new AppError('Patient not found', 404, {
      field: 'patientId',
      message: `No patient found with ID: ${scan.patientId}`
    });
  }
  
  const saved = await db.saveScan(scan);
  res.status(201).json(saved);
}));

module.exports = router;
