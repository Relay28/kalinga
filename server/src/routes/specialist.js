const express = require('express');
const router = express.Router();
const db = require('../db');
const { validate } = require('../middleware/validation');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

// PATCH /api/scans/:id/verify
router.patch('/:id/verify', validate('verifyVerdict'), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { verdict, notes, specialistName } = req.body;
  
  const scan = await db.getScanById(id);
  if (!scan) {
    throw new AppError('Scan not found', 404);
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
  scan.recommendation = notes || '';
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
      specialistName: specialistName || 'Dr. Duque',
      status: 'unread',
      iconType: iconType,
      createdAt: new Date().toISOString(),
      timestamp: verifiedTime
    };
    await db.saveNotification(newNotif);
  }

  res.json({ success: true, scan });
}));

module.exports = router;
