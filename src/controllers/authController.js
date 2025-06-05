const jwt = require('jsonwebtoken');
const { google } = require('googleapis');
const config = require('../config/config');
const { User } = require('../models/database');
const encryptionService = require('../services/encryptionService');

class AuthController {
  constructor() {
    // Initialize Google OAuth2 client
    this.oauth2Client = new google.auth.OAuth2(
      config.GOOGLE_CLIENT_ID,
      config.GOOGLE_CLIENT_SECRET,
      config.GOOGLE_REDIRECT_URI
    );
  }

  /**
   * Redirect user to Gmail OAuth consent screen
   * GET /auth/google
   */
  async redirectToGmail(req, res) {
    try {
      const authUrl = this.oauth2Client.generateAuthUrl({
        access_type: 'offline', // Needed for refresh token
        scope: config.GMAIL_SCOPES,
        prompt: 'consent', // Force consent screen to ensure refresh token
        include_granted_scopes: true
      });

      console.log('🔗 Redirecting to Gmail OAuth:', authUrl);
      res.redirect(authUrl);
    } catch (error) {
      console.error('Error generating Gmail auth URL:', error);
      res.status(500).json({
        error: 'Failed to initialize Gmail authentication'
      });
    }
  }

  /**
   * Handle Gmail OAuth callback and create/login user
   * GET /auth/google/callback
   */
  async handleGmailCallback(req, res) {
    try {
      const { code, error: authError } = req.query;

      // Handle authorization errors
      if (authError) {
        console.error('Gmail OAuth error:', authError);
        return res.redirect('/?error=access_denied');
      }

      if (!code) {
        return res.redirect('/?error=missing_code');
      }

      // Exchange authorization code for tokens
      const { tokens } = await this.oauth2Client.getAccessToken(code);
      
      if (!tokens.access_token) {
        throw new Error('No access token received');
      }

      // Set credentials to get user info
      this.oauth2Client.setCredentials(tokens);

      // Get user profile information
      const oauth2 = google.oauth2({ version: 'v2', auth: this.oauth2Client });
      const { data: profile } = await oauth2.userinfo.get();

      // Validate it's a Gmail account
      if (!this.isGmailAccount(profile.email)) {
        console.log(`Rejected non-Gmail account: ${profile.email}`);
        return res.redirect('/?error=gmail_required');
      }

      // Find or create user
      const user = await this.findOrCreateUser(profile, tokens);

      // Generate JWT token
      const jwtToken = this.generateJwtToken(user);

      console.log(`✅ Gmail authentication successful for: ${user.email}`);

      // Redirect to dashboard with token (in production, use httpOnly cookies)
      res.redirect(`/dashboard?token=${jwtToken}`);

    } catch (error) {
      console.error('Gmail callback error:', error);
      res.redirect('/?error=auth_failed');
    }
  }

  /**
   * Check if email is from Gmail or Google Workspace
   */
  isGmailAccount(email) {
    // Allow @gmail.com and Google Workspace domains
    // Google Workspace users also have Gmail access
    return email && (
      email.endsWith('@gmail.com') || 
      this.isGoogleWorkspaceAccount(email)
    );
  }

  /**
   * Check if email is from Google Workspace by attempting to verify
   * For MVP, we'll be more permissive and allow any Google-authenticated account
   */
  isGoogleWorkspaceAccount(email) {
    // In production, you might want to verify this more strictly
    // For now, if they authenticated via Google OAuth, we'll allow it
    return true;
  }

  /**
   * Find existing user or create new one
   */
  async findOrCreateUser(profile, tokens) {
    try {
      // Look for existing user
      let user = await User.findOne({ where: { email: profile.email } });

      if (user) {
        // Update existing user's tokens and info
        const encryptedTokens = encryptionService.encryptTokens({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expires_at: tokens.expiry_date || Date.now() + (3600 * 1000) // 1 hour default
        });

        await user.update({
          name: profile.name,
          oauthEncryptedTokens: encryptedTokens
        });

        console.log(`📝 Updated existing user: ${user.email}`);
      } else {
        // Create new user
        const encryptedTokens = encryptionService.encryptTokens({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expires_at: tokens.expiry_date || Date.now() + (3600 * 1000)
        });

        user = await User.create({
          email: profile.email,
          name: profile.name,
          oauthEncryptedTokens: encryptedTokens,
          tier: config.TIERS.FREE, // Default to free tier
          isAdmin: false
        });

        console.log(`✨ Created new user: ${user.email}`);
      }

      return user;
    } catch (error) {
      console.error('Error finding/creating user:', error);
      throw new Error('Failed to process user account');
    }
  }

  /**
   * Generate JWT token for session management
   */
  generateJwtToken(user) {
    return jwt.sign(
      {
        userId: user.id,
        email: user.email,
        tier: user.tier,
        isAdmin: user.isAdmin
      },
      config.JWT_SECRET,
      {
        expiresIn: '7d' // 7 days
      }
    );
  }

  /**
   * Logout user (client-side token removal)
   * POST /auth/logout
   */
  async logout(req, res) {
    try {
      // Check if this is a browser request vs API request
      const acceptHeader = req.get('Accept');
      const isBrowserRequest = acceptHeader && acceptHeader.includes('text/html');
      
      if (isBrowserRequest) {
        // Redirect to home with success message
        res.redirect('/?success=logout');
      } else {
        // API response for client-side handling
        res.json({
          success: true,
          message: 'Logged out successfully'
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({
        error: 'Failed to logout'
      });
    }
  }

  /**
   * Get current user profile
   * GET /auth/me
   */
  async getCurrentUser(req, res) {
    try {
      const user = req.user; // Set by auth middleware

      res.json({
        id: user.id,
        email: user.email,
        name: user.name,
        tier: user.tier,
        isAdmin: user.isAdmin,
        createdAt: user.createdAt
      });
    } catch (error) {
      console.error('Get current user error:', error);
      res.status(500).json({
        error: 'Failed to get user profile'
      });
    }
  }
}

module.exports = new AuthController(); 