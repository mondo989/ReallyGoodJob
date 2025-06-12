const featureFlagService = require('../services/featureFlagService');

class FeatureFlagController {
  /**
   * Get user's available features
   * GET /api/features
   */
  async getUserFeatures(req, res) {
    try {
      const user = req.user;
      const features = featureFlagService.getAvailableFeatures(user);
      
      res.json({
        success: true,
        features: features,
        user: {
          id: user.id,
          email: user.email,
          tier: user.tier,
          isAdmin: user.isAdmin
        }
      });
    } catch (error) {
      console.error('Error getting user features:', error);
      res.status(500).json({
        error: 'Failed to get user features'
      });
    }
  }

  /**
   * Toggle feature flag (Admin only)
   * POST /api/features/toggle
   */
  async toggleFeatureFlag(req, res) {
    try {
      const user = req.user;
      const { flagName, value } = req.body;

      // Check if user is admin
      if (!user.isAdmin) {
        return res.status(403).json({
          error: 'Admin access required to toggle feature flags'
        });
      }

      if (!flagName) {
        return res.status(400).json({
          error: 'Flag name is required'
        });
      }

      const newValue = featureFlagService.toggleFlag(flagName, value);
      
      res.json({
        success: true,
        flagName: flagName,
        newValue: newValue,
        allFlags: featureFlagService.getAllFlags()
      });
    } catch (error) {
      console.error('Error toggling feature flag:', error);
      res.status(500).json({
        error: 'Failed to toggle feature flag'
      });
    }
  }

  /**
   * Get all feature flags (Admin only)
   * GET /api/features/flags
   */
  async getAllFeatureFlags(req, res) {
    try {
      const user = req.user;

      // Check if user is admin
      if (!user.isAdmin) {
        return res.status(403).json({
          error: 'Admin access required to view feature flags'
        });
      }

      const flags = featureFlagService.getAllFlags();
      
      res.json({
        success: true,
        flags: flags,
        descriptions: {
          PREMIUM_MULTIPLE_SENDS: 'Allow premium users to send multiple times per day',
          PREMIUM_PERSONALIZED_MESSAGES: 'Allow premium users to add personalized messages',
          PREMIUM_ADVANCED_SCHEDULING: 'Allow premium users advanced scheduling features',
          FORCE_PREMIUM_FOR_ALL: 'Force all users to have premium features (testing)',
          DISABLE_PREMIUM_CHECKS: 'Disable all premium checks (testing)'
        }
      });
    } catch (error) {
      console.error('Error getting feature flags:', error);
      res.status(500).json({
        error: 'Failed to get feature flags'
      });
    }
  }

  /**
   * Simulate user tier change (Admin only, for testing)
   * POST /api/features/simulate-tier
   */
  async simulateUserTier(req, res) {
    try {
      const user = req.user;
      const { userId, tier } = req.body;

      // Check if user is admin
      if (!user.isAdmin) {
        return res.status(403).json({
          error: 'Admin access required to simulate user tier'
        });
      }

      if (!userId || !tier) {
        return res.status(400).json({
          error: 'User ID and tier are required'
        });
      }

      if (!['Free', 'Premium'].includes(tier)) {
        return res.status(400).json({
          error: 'Tier must be Free or Premium'
        });
      }

      const { User } = require('../models/database');
      const targetUser = await User.findByPk(userId);
      
      if (!targetUser) {
        return res.status(404).json({
          error: 'User not found'
        });
      }

      await targetUser.update({ tier: tier });
      
      console.log(`🔄 Admin ${user.email} changed user ${targetUser.email} tier to ${tier}`);
      
      res.json({
        success: true,
        message: `User ${targetUser.email} tier changed to ${tier}`,
        user: {
          id: targetUser.id,
          email: targetUser.email,
          tier: targetUser.tier
        },
        features: featureFlagService.getAvailableFeatures(targetUser)
      });
    } catch (error) {
      console.error('Error simulating user tier:', error);
      res.status(500).json({
        error: 'Failed to simulate user tier'
      });
    }
  }
}

module.exports = new FeatureFlagController();