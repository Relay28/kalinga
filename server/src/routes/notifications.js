const express = require('express');
const router = express.Router();
const db = require('../db');
const { validate } = require('../middleware/validation');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

// GET /api/notifications
router.get('/', asyncHandler(async (req, res) => {
  const list = await db.getNotifications();
  res.json(list);
}));

// PATCH /api/notifications/:id/read
router.patch('/:id/read', validate('markNotificationRead'), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const notifs = await db.getNotifications();
  const match = notifs.find(n => n.id === id);
  
  if (!match) {
    throw new AppError('Notification not found', 404);
  }
  
  match.status = 'read';
  await db.saveNotification(match);
  res.json({ success: true, notification: match });
}));

module.exports = router;
