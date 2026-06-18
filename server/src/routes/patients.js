const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/patients
router.get('/', async (req, res) => {
  try {
    const list = await db.getPatients();
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/patients
router.post('/', async (req, res) => {
  try {
    const patient = req.body;
    if (!patient.id) {
      return res.status(400).json({ error: "Patient ID (PhilHealth number) is required" });
    }
    const saved = await db.savePatient(patient);
    res.status(201).json(saved);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
