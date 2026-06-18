const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/scans
router.get('/', async (req, res) => {
  try {
    const list = await db.getScans();
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/scans/pending
router.get('/pending', async (req, res) => {
  try {
    const list = await db.getScans();
    const pending = list.filter(s => s.status === 'Submitted');
    res.json(pending);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/scans/:id
router.get('/:id', async (req, res) => {
  try {
    const scan = await db.getScanById(req.params.id);
    if (!scan) return res.status(404).json({ error: "Scan record not found" });
    res.json(scan);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/scans
router.post('/', async (req, res) => {
  try {
    const scan = req.body;
    if (!scan.id) {
      return res.status(400).json({ error: "Scan ID is required" });
    }
    const saved = await db.saveScan(scan);
    res.status(201).json(saved);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
