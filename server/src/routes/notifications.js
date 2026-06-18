const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/notifications
router.get('/', async (req, res) => {
  try {
    const list = await db.getNotifications();
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/notifications/:id/read
router.patch('/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    const notifs = await db.getNotifications();
    const match = notifs.find(n => n.id === id);
    if (match) {
      match.status = 'read';
      await db.saveNotification(match);
      return res.json({ success: true, notification: match });
    }
    res.status(404).json({ error: "Notification not found" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
