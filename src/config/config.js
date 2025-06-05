require('dotenv').config();

module.exports = {
  // Server Configuration
  PORT: process.env.PORT || 3000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // Database Configuration
  DATABASE_URL: process.env.DATABASE_URL,
  
  // Google OAuth2 Configuration
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI,
  
  // Security Configuration
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
  JWT_SECRET: process.env.JWT_SECRET,
  
  // Gmail API Configuration
  MAX_SENDS_PER_DAY: parseInt(process.env.MAX_SENDS_PER_DAY) || 100,
  
  // Application Constants
  TIERS: {
    FREE: 'Free',
    PREMIUM: 'Premium'
  },
  
  CAMPAIGN_STATUS: {
    PENDING: 'Pending',
    ACTIVE: 'Active',
    REJECTED: 'Rejected',
    EXPIRED: 'Expired'
  },
  
  EMAIL_WINDOWS: {
    MORNING: 'Morning',
    AFTERNOON: 'Afternoon',
    EVENING: 'Evening'
  },
  
  WINDOW_TIMES: {
    MORNING: { start: 8, end: 12 },
    AFTERNOON: { start: 12, end: 17 },
    EVENING: { start: 17, end: 21 }
  },
  
  MOODS: {
    HAPPY: 'Happy',
    CHEERFUL: 'Cheerful',
    ECSTATIC: 'Ecstatic'
  },
  
  EMAIL_STATUS: {
    SENT: 'Sent',
    FAILED: 'Failed'
  },
  
  // Free Tier Limits
  FREE_TIER_MONTHLY_CAMPAIGNS: 5,
  FREE_TIER_SENDS_PER_CAMPAIGN_DAY: 1,
  
  // Premium Tier Limits
  PREMIUM_TIER_SENDS_PER_CAMPAIGN_DAY: 3,
  
  // Duplicate Prevention
  DUPLICATE_WINDOW_DAYS: 30,
  
  // Gmail OAuth Scopes
  GMAIL_SCOPES: [
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/gmail.send'
  ]
}; 