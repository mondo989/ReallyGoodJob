const express = require('express');
const router = express.Router();
const campaignController = require('../controllers/campaignController');
const authMiddleware = require('../middleware/authMiddleware');

// Apply auth middleware to all routes
router.use(authMiddleware);

// Campaign routes - specific routes must come before parameterized routes
router.get('/campaigns/with-stats', (req, res) => campaignController.getCampaignsWithStats(req, res));
router.get('/campaigns/my', (req, res) => campaignController.getUserCampaigns(req, res));
router.get('/campaigns', (req, res) => campaignController.getActiveCampaigns(req, res));
router.post('/campaigns', (req, res) => campaignController.createCampaign(req, res));
router.get('/campaigns/:id', (req, res) => campaignController.getCampaignDetails(req, res));
router.post('/campaigns/:id/send', (req, res) => campaignController.sendCampaignEmails(req, res));

module.exports = router; 