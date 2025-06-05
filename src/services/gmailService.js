const { google } = require('googleapis');
const config = require('../config/config');
const { User } = require('../models/database');
const encryptionService = require('./encryptionService');

class GmailService {
  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      config.GOOGLE_CLIENT_ID,
      config.GOOGLE_CLIENT_SECRET,
      config.GOOGLE_REDIRECT_URI
    );
  }

  /**
   * Get valid Gmail API client for user
   * Automatically refreshes tokens if needed
   */
  async getGmailClient(userId) {
    try {
      const user = await User.findByPk(userId);
      if (!user || !user.oauthEncryptedTokens) {
        throw new Error('User not found or no Gmail tokens available');
      }

      // Decrypt stored tokens
      const tokens = encryptionService.decryptTokens(user.oauthEncryptedTokens);
      
      // Set credentials
      this.oauth2Client.setCredentials({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expiry_date: tokens.expires_at
      });

      // Check if token needs refresh
      if (this.isTokenExpired(tokens.expires_at)) {
        console.log(`🔄 Refreshing expired token for user: ${user.email}`);
        await this.refreshUserTokens(user);
      }

      return google.gmail({ version: 'v1', auth: this.oauth2Client });
    } catch (error) {
      console.error('Error getting Gmail client:', error);
      throw new Error(`Failed to initialize Gmail API: ${error.message}`);
    }
  }

  /**
   * Check if access token is expired or will expire soon (5 min buffer)
   */
  isTokenExpired(expiresAt) {
    const now = Date.now();
    const buffer = 5 * 60 * 1000; // 5 minutes
    return expiresAt <= (now + buffer);
  }

  /**
   * Refresh user's access token using refresh token
   */
  async refreshUserTokens(user) {
    try {
      const tokens = encryptionService.decryptTokens(user.oauthEncryptedTokens);
      
      this.oauth2Client.setCredentials({
        refresh_token: tokens.refresh_token
      });

      // Get new access token
      const { credentials } = await this.oauth2Client.refreshAccessToken();
      
      // Update stored tokens
      const updatedTokens = {
        access_token: credentials.access_token,
        refresh_token: tokens.refresh_token, // Keep existing refresh token
        expires_at: credentials.expiry_date
      };

      const encryptedTokens = encryptionService.encryptTokens(updatedTokens);
      
      await user.update({ oauthEncryptedTokens: encryptedTokens });
      
      console.log(`✅ Refreshed tokens for user: ${user.email}`);
      
      return updatedTokens;
    } catch (error) {
      console.error('Error refreshing tokens:', error);
      throw new Error('Failed to refresh Gmail access token');
    }
  }

  /**
   * Send email via Gmail API
   * @param {string} userId - User ID who is sending
   * @param {string} recipientEmail - Recipient email address
   * @param {string} subject - Email subject
   * @param {string} bodyText - Plain text email body
   * @param {string} emailLogId - For tracking pixel
   * @returns {Object} - Send result with status
   */
  async sendEmail(userId, recipientEmail, subject, bodyText, emailLogId = null) {
    try {
      const gmail = await this.getGmailClient(userId);
      const user = await User.findByPk(userId);

      // Build raw MIME message
      const rawMessage = this.buildMimeMessage({
        from: `${user.name} <${user.email}>`,
        to: recipientEmail,
        subject: subject,
        bodyText: bodyText,
        emailLogId: emailLogId
      });

      // Send via Gmail API
      const response = await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: Buffer.from(rawMessage).toString('base64url')
        }
      });

      console.log(`📧 Email sent successfully: ${recipientEmail} (ID: ${response.data.id})`);
      
      return {
        success: true,
        messageId: response.data.id,
        status: 'Sent'
      };

    } catch (error) {
      console.error('Error sending email:', error);
      
      return {
        success: false,
        error: error.message,
        status: 'Failed'
      };
    }
  }

  /**
   * Build MIME message for Gmail API
   */
  buildMimeMessage({ from, to, subject, bodyText, emailLogId }) {
    const lines = [
      `From: ${from}`,
      `To: ${to}`,
      `Subject: ${subject}`,
      'Content-Type: text/plain; charset="UTF-8"',
      'MIME-Version: 1.0',
      '',
      bodyText
    ];

    // Add tracking pixel if emailLogId is provided
    if (emailLogId) {
      lines.push('');
      lines.push(`<img src="${this.getTrackingPixelUrl(emailLogId)}" alt="" width="1" height="1" style="display:none;" />`);
    }

    return lines.join('\r\n');
  }

  /**
   * Generate tracking pixel URL
   */
  getTrackingPixelUrl(emailLogId) {
    const baseUrl = config.NODE_ENV === 'production' 
      ? 'https://yourdomain.com' 
      : `http://localhost:${config.PORT}`;
    return `${baseUrl}/track/open.png?emailLogId=${emailLogId}`;
  }

  /**
   * Check user's Gmail sending quota/status
   */
  async checkGmailQuota(userId) {
    try {
      const gmail = await this.getGmailClient(userId);
      
      // Get user profile to check quota info
      const profile = await gmail.users.getProfile({ userId: 'me' });
      
      return {
        threadsTotal: profile.data.threadsTotal,
        messagesTotal: profile.data.messagesTotal,
        historyId: profile.data.historyId
      };
    } catch (error) {
      console.error('Error checking Gmail quota:', error);
      throw new Error('Failed to check Gmail quota');
    }
  }

  /**
   * Validate Gmail API connection for user
   */
  async validateConnection(userId) {
    try {
      const gmail = await this.getGmailClient(userId);
      const profile = await gmail.users.getProfile({ userId: 'me' });
      
      return {
        valid: true,
        emailAddress: profile.data.emailAddress,
        messagesTotal: profile.data.messagesTotal
      };
    } catch (error) {
      console.error('Gmail connection validation failed:', error);
      return {
        valid: false,
        error: error.message
      };
    }
  }

  /**
   * Get user's Gmail profile information
   */
  async getGmailProfile(userId) {
    try {
      const gmail = await this.getGmailClient(userId);
      const profile = await gmail.users.getProfile({ userId: 'me' });
      
      return {
        emailAddress: profile.data.emailAddress,
        messagesTotal: profile.data.messagesTotal,
        threadsTotal: profile.data.threadsTotal,
        historyId: profile.data.historyId
      };
    } catch (error) {
      console.error('Error getting Gmail profile:', error);
      throw new Error('Failed to get Gmail profile');
    }
  }
}

module.exports = new GmailService(); 