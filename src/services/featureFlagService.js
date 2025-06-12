const config = require('../config/config');

class FeatureFlagService {
  constructor() {
    // Feature flags - can be toggled for testing
    this.flags = {
      // Premium features
      PREMIUM_MULTIPLE_SENDS: process.env.FEATURE_PREMIUM_MULTIPLE_SENDS === 'true' || true,
      PREMIUM_PERSONALIZED_MESSAGES: process.env.FEATURE_PREMIUM_PERSONALIZED_MESSAGES === 'true' || true,
      PREMIUM_ADVANCED_SCHEDULING: process.env.FEATURE_PREMIUM_ADVANCED_SCHEDULING === 'true' || true,
      
      // Testing flags
      FORCE_PREMIUM_FOR_ALL: process.env.FEATURE_FORCE_PREMIUM_FOR_ALL === 'true' || false,
      DISABLE_PREMIUM_CHECKS: process.env.FEATURE_DISABLE_PREMIUM_CHECKS === 'true' || false
    };
    
    console.log('🚩 Feature flags initialized:', this.flags);
  }

  /**
   * Check if a feature is enabled
   */
  isEnabled(flagName) {
    return this.flags[flagName] === true;
  }

  /**
   * Check if user has access to premium features
   */
  isPremiumUser(user) {
    // Force premium for testing
    if (this.isEnabled('FORCE_PREMIUM_FOR_ALL')) {
      return true;
    }
    
    // Disable premium checks for testing
    if (this.isEnabled('DISABLE_PREMIUM_CHECKS')) {
      return true;
    }
    
    return user && user.tier === 'Premium';
  }

  /**
   * Check if user can access a specific premium feature
   */
  canAccessPremiumFeature(user, featureName) {
    const featureFlag = `PREMIUM_${featureName.toUpperCase()}`;
    
    // Check if feature is enabled globally
    if (!this.isEnabled(featureFlag)) {
      return false;
    }
    
    // Check if user has premium access
    return this.isPremiumUser(user);
  }

  /**
   * Get premium feature validation result
   */
  validatePremiumFeature(user, featureName, friendlyName) {
    if (!this.canAccessPremiumFeature(user, featureName)) {
      return {
        allowed: false,
        error: `${friendlyName} is a Premium feature. Please upgrade your account.`,
        premiumFeature: featureName.toLowerCase()
      };
    }
    
    return { allowed: true };
  }

  /**
   * Toggle a feature flag (for testing)
   */
  toggleFlag(flagName, value = null) {
    if (value !== null) {
      this.flags[flagName] = value;
    } else {
      this.flags[flagName] = !this.flags[flagName];
    }
    
    console.log(`🚩 Feature flag ${flagName} toggled to:`, this.flags[flagName]);
    return this.flags[flagName];
  }

  /**
   * Get all feature flags status
   */
  getAllFlags() {
    return { ...this.flags };
  }

  /**
   * Get premium features available to user
   */
  getAvailableFeatures(user) {
    const isPremium = this.isPremiumUser(user);
    
    return {
      multipleSends: isPremium && this.isEnabled('PREMIUM_MULTIPLE_SENDS'),
      personalizedMessages: isPremium && this.isEnabled('PREMIUM_PERSONALIZED_MESSAGES'),
      advancedScheduling: isPremium && this.isEnabled('PREMIUM_ADVANCED_SCHEDULING'),
      userTier: user?.tier || 'Free',
      isPremium: isPremium
    };
  }
}

module.exports = new FeatureFlagService(); 