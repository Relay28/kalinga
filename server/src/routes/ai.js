const express = require('express');
const router = express.Router();
const { classifyScan } = require('../services/mockClassifier');

// POST /api/ai/classify
router.post('/classify', async (req, res) => {
  try {
    const patientData = req.body;
    if (!patientData) {
      return res.status(400).json({ error: "Patient metadata is required" });
    }

    // Apply the deterministic demo mock rules
    const nameStr = (patientData.firstName || '') + ' ' + (patientData.lastName || '');
    const isMaria = nameStr.toLowerCase().includes('maria');
    
    // Check if BP is severe/moderate
    let isHighBP = false;
    let isModBP = false;
    if (patientData.bp && patientData.bp.includes('/')) {
      const parts = patientData.bp.split('/');
      const sys = parseInt(parts[0]);
      const dia = parseInt(parts[1]);
      if (sys >= 140 || dia >= 90) {
        isHighBP = true;
      } else if (sys >= 130 || dia >= 85) {
        isModBP = true;
      }
    }

    let aiResult;
    if (isMaria || isHighBP) {
      // Return HIGH risk
      aiResult = {
        scanQualityScore: 92,
        selectedBestFrame: 'assets/ultrasound_sweep.png',
        fetalHeartRate: 140,
        gestationalAgeEstimate: 'Est: 24w 3d',
        preliminaryRiskLabel: 'HIGH',
        riskScore: 78,
        suggestedFlag: 'Urgent Referral'
      };
    } else if (isModBP) {
      // Return MODERATE risk
      aiResult = {
        scanQualityScore: 88,
        selectedBestFrame: 'assets/ultrasound_sweep.png',
        fetalHeartRate: 142,
        gestationalAgeEstimate: 'Est: 20w 1d',
        preliminaryRiskLabel: 'MODERATE',
        riskScore: 35,
        suggestedFlag: 'Warning'
      };
    } else {
      // Return LOW risk
      aiResult = {
        scanQualityScore: 94,
        selectedBestFrame: 'assets/ultrasound_sweep.png',
        fetalHeartRate: 138,
        gestationalAgeEstimate: 'Est: 18w 4d',
        preliminaryRiskLabel: 'LOW',
        riskScore: 20,
        suggestedFlag: 'Normal'
      };
    }

    res.json(aiResult);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
