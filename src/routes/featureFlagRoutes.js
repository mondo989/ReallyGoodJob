const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const featureFlagController = require('../controllers/featureFlagController');

// All routes require authentication
router.use(authMiddleware);

/**
 * Get user's available features
 * GET /api/features
 */
router.get('/', featureFlagController.getUserFeatures);

/**
 * Get all feature flags (Admin only)
 * GET /api/features/flags
 */
router.get('/flags', featureFlagController.getAllFeatureFlags);

/**
 * Toggle feature flag (Admin only)
 * POST /api/features/toggle
 */
router.post('/toggle', featureFlagController.toggleFeatureFlag);

/**
 * Simulate user tier change (Admin only, for testing)
 * POST /api/features/simulate-tier
 */
router.post('/simulate-tier', featureFlagController.simulateUserTier);

module.exports = router; 