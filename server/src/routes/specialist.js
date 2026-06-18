const express = require('express');
const router = express.Router();
const db = require('../db');

// PATCH /api/scans/:id/verify
router.patch('/:id/verify', async (req, res) => {
  try {
    const { id } = req.params;
    const { verdict, recommendation, specialistName } = req.body;
    
    if (!verdict) {
      return res.status(400).json({ error: "Verdict is required" });
    }

    const scan = await db.getScanById(id);
    if (!scan) {
      return res.status(404).json({ error: "Scan not found" });
    }

    const verifiedTime = new Date().toLocaleString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).replace(' at', '');

    // Update scan details
    scan.status = 'Reviewed';
    scan.suggestedFlag = verdict;
    scan.recommendation = recommendation || '';
    scan.specialistName = specialistName || 'Dr. Duque';
    scan.verifiedTime = verifiedTime;

    // Save scan (which automatically updates patient status)
    await db.saveScan(scan);

    // Fetch patient info to generate notification details
    const patient = await db.getPatientById(scan.patientId);
    if (patient) {
      // Set patient status and details
      patient.status = 'Reviewed';
      await db.savePatient(patient);

      // Create notification
      let iconType = 'teal';
      if (verdict === 'Urgent Referral') iconType = 'red';
      else if (verdict === 'Warning') iconType = 'orange';

      const newNotif = {
        id: `notif-${Date.now()}-${patient.id}`,
        patientId: patient.id,
        patientName: `${patient.firstName} ${patient.lastName}`,
        verdict: verdict,
        status: 'unread',
        iconType: iconType,
        timestamp: verifiedTime
      };
      await db.saveNotification(newNotif);
    }

    res.json({ success: true, scan });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
