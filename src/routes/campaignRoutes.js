const express = require('express');
const router = express.Router();
const campaignController = require('../controllers/campaignController');
const authMiddleware = require('../middleware/authMiddleware');

// Apply auth middleware to all routes
router.use(authMiddleware);

// Campaign routes
router.get('/', (req, res) => campaignController.getActiveCampaigns(req, res));
router.post('/', (req, res) => campaignController.createCampaign(req, res));
router.get('/my', (req, res) => campaignController.getUserCampaigns(req, res));
router.get('/:id', (req, res) => campaignController.getCampaignDetails(req, res));

module.exports = router; 