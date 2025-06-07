const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middleware/authMiddleware');

// Admin middleware to check if user is admin
const adminMiddleware = (req, res, next) => {
  if (!req.user.isAdmin) {
    return res.status(403).json({
      error: 'Admin access required'
    });
  }
  next();
};

// Apply auth and admin middleware to all routes
router.use(authMiddleware);
router.use(adminMiddleware);

// Admin campaign management routes
router.get('/campaigns/pending', (req, res) => adminController.getPendingCampaigns(req, res));
router.post('/campaigns/:id/approve', (req, res) => adminController.approveCampaign(req, res));
router.post('/campaigns/:id/reject', (req, res) => adminController.rejectCampaign(req, res));
router.get('/stats', (req, res) => adminController.getAdminStats(req, res));

module.exports = router; 