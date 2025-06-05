const express = require('express');
const router = express.Router();

// Placeholder routes - to be implemented
router.post('/schedules', (req, res) => {
  res.json({ message: 'Create schedule - to be implemented' });
});

router.get('/schedules', (req, res) => {
  res.json({ message: 'Get schedules - to be implemented' });
});

module.exports = router; 