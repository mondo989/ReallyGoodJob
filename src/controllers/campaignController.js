const { Campaign, User, Recipient } = require('../models/database');
const config = require('../config/config');
const featureFlagService = require('../services/featureFlagService');

class CampaignController {
  /**
   * Get all active (approved) campaigns for browsing
   * GET /campaigns
   */
  async getActiveCampaigns(req, res) {
    try {
      const campaigns = await Campaign.findAll({
        where: { 
          status: config.CAMPAIGN_STATUS.ACTIVE,
          expirationAt: {
            [require('sequelize').Op.gt]: new Date() // Not expired
          }
        },
        include: [
          {
            model: User,
            as: 'creator',
            attributes: ['name']
          },
          {
            model: Recipient,
            as: 'Recipients'
          }
        ],
        order: [['approvedAt', 'DESC']]
      });

      res.json({
        success: true,
        campaigns: campaigns.map(campaign => ({
          id: campaign.id,
          name: campaign.name,
          description: campaign.description,
          status: campaign.status,
          createdBy: campaign.creator.name,
          recipientCount: campaign.Recipients.length,
          approvedAt: campaign.approvedAt,
          expirationAt: campaign.expirationAt
        }))
      });
    } catch (error) {
      console.error('Error fetching active campaigns:', error);
      res.status(500).json({
        error: 'Failed to fetch campaigns'
      });
    }
  }

  /**
   * Get campaign details with recipients
   * GET /campaigns/:id
   */
  async getCampaignDetails(req, res) {
    try {
      const { id } = req.params;

      const campaign = await Campaign.findOne({
        where: { 
          id,
          status: config.CAMPAIGN_STATUS.ACTIVE,
          expirationAt: {
            [require('sequelize').Op.gt]: new Date()
          }
        },
        include: [
          {
            model: User,
            as: 'creator',
            attributes: ['name']
          },
          {
            model: Recipient,
            as: 'Recipients',
            attributes: ['id', 'email', 'displayName', 'personalizedName']
          }
        ]
      });

      if (!campaign) {
        return res.status(404).json({
          error: 'Campaign not found or not available'
        });
      }

      res.json({
        success: true,
        campaign: {
          id: campaign.id,
          name: campaign.name,
          description: campaign.description,
          createdBy: campaign.creator.name,
          recipients: campaign.Recipients,
          approvedAt: campaign.approvedAt,
          expirationAt: campaign.expirationAt
        }
      });
    } catch (error) {
      console.error('Error fetching campaign details:', error);
      res.status(500).json({
        error: 'Failed to fetch campaign details'
      });
    }
  }

  /**
   * Create a new campaign for approval
   * POST /campaigns
   */
  async createCampaign(req, res) {
    try {
      const { name, description, recipients, senderNote } = req.body;
      const user = req.user;

      // Validate input
      if (!name || !description || !recipients || !Array.isArray(recipients)) {
        return res.status(400).json({
          error: 'Name, description, and recipients array are required'
        });
      }

      if (recipients.length === 0) {
        return res.status(400).json({
          error: 'At least one recipient is required'
        });
      }

      // Create campaign
      const campaign = await Campaign.create({
        name: name.trim(),
        description: description.trim(),
        status: config.CAMPAIGN_STATUS.PENDING,
        createdByUserId: user.id,
        expirationAt: new Date(Date.now() + (90 * 24 * 60 * 60 * 1000)) // 90 days from now
      });

      // Create recipients
      const recipientRecords = await Promise.all(
        recipients.map(recipient => 
          Recipient.create({
            campaignId: campaign.id,
            email: recipient.email.trim(),
            displayName: recipient.displayName.trim(),
            personalizedName: recipient.personalizedName?.trim() || recipient.displayName.trim()
          })
        )
      );

      console.log(`📋 New campaign "${name}" submitted by ${user.email} with ${recipients.length} recipients`);

      res.status(201).json({
        success: true,
        message: 'Campaign submitted for approval',
        campaign: {
          id: campaign.id,
          name: campaign.name,
          description: campaign.description,
          status: campaign.status,
          recipientCount: recipientRecords.length,
          createdAt: campaign.createdAt
        }
      });
    } catch (error) {
      console.error('Error creating campaign:', error);
      res.status(500).json({
        error: 'Failed to create campaign'
      });
    }
  }

  /**
   * Get user's own campaigns
   * GET /campaigns/my
   */
  async getUserCampaigns(req, res) {
    try {
      const user = req.user;

      const campaigns = await Campaign.findAll({
        where: { createdByUserId: user.id },
        include: [
          {
            model: Recipient,
            as: 'Recipients'
          }
        ],
        order: [['createdAt', 'DESC']]
      });

      res.json({
        success: true,
        campaigns: campaigns.map(campaign => ({
          id: campaign.id,
          name: campaign.name,
          description: campaign.description,
          status: campaign.status,
          recipientCount: campaign.Recipients.length,
          createdAt: campaign.createdAt,
          approvedAt: campaign.approvedAt,
          expirationAt: campaign.expirationAt
        }))
      });
    } catch (error) {
      console.error('Error fetching user campaigns:', error);
      res.status(500).json({
        error: 'Failed to fetch your campaigns'
      });
    }
  }

  /**
   * Send or schedule emails for a campaign
   * POST /campaigns/:id/send
   */
  async sendCampaignEmails(req, res) {
    try {
      const { id } = req.params;
      const { 
        mood, 
        sendNow = true, 
        frequency = 'once',
        window, 
        timeWindows = [],
        scheduledDate,
        personalizedMessage 
      } = req.body;
      const user = req.user;

      console.log(`📧 Send email request for campaign ${id}:`, {
        mood,
        sendNow,
        frequency,
        window,
        timeWindows,
        scheduledDate,
        personalizedMessage: personalizedMessage ? 'PROVIDED' : 'NONE',
        userId: user.id,
        userTier: user.tier
      });

      // Validate mood selection
      if (!mood || !['Happy', 'Cheerful', 'Ecstatic'].includes(mood)) {
        return res.status(400).json({
          error: 'Valid mood selection is required (Happy, Cheerful, or Ecstatic)'
        });
      }

      // Check premium features using feature flag service
      const isPremiumUser = featureFlagService.isPremiumUser(user);
      
      // Validate personalized message (Premium feature)
      if (personalizedMessage) {
        const validation = featureFlagService.validatePremiumFeature(user, 'PERSONALIZED_MESSAGES', 'Personalized messages');
        if (!validation.allowed) {
          return res.status(403).json({
            error: validation.error,
            premiumFeature: validation.premiumFeature
          });
        }
      }

      // Validate multiple sends per day (Premium feature)
      if (frequency === 'multiple') {
        const validation = featureFlagService.validatePremiumFeature(user, 'MULTIPLE_SENDS', 'Multiple sends per day');
        if (!validation.allowed) {
          return res.status(403).json({
            error: validation.error,
            premiumFeature: validation.premiumFeature
          });
        }
      }

      // Validate scheduling parameters if not sending now
      if (!sendNow) {
        if (!scheduledDate) {
          return res.status(400).json({
            error: 'Scheduled date is required'
          });
        }

        const selectedDate = new Date(scheduledDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (selectedDate < today) {
          return res.status(400).json({
            error: 'Cannot schedule emails for past dates'
          });
        }

        if (frequency === 'multiple') {
          // Validate multiple time windows
          if (!timeWindows || timeWindows.length === 0) {
            return res.status(400).json({
              error: 'At least one time window is required for multiple sends'
            });
          }
          
          const validWindows = ['morning', 'afternoon', 'evening'];
          const invalidWindows = timeWindows.filter(w => !validWindows.includes(w));
          if (invalidWindows.length > 0) {
            return res.status(400).json({
              error: `Invalid time windows: ${invalidWindows.join(', ')}`
            });
          }
        } else {
          // Validate single time window
          if (!window || !['morning', 'afternoon', 'evening'].includes(window)) {
            return res.status(400).json({
              error: 'Valid time window is required for scheduling (morning, afternoon, or evening)'
            });
          }
        }
      }

      // Get campaign with recipients
      const campaign = await Campaign.findOne({
        where: { 
          id,
          status: config.CAMPAIGN_STATUS.ACTIVE,
          expirationAt: {
            [require('sequelize').Op.gt]: new Date()
          }
        },
        include: [
          {
            model: Recipient,
            as: 'Recipients'
          }
        ]
      });

      console.log(`🔍 Campaign lookup for ${id}:`, campaign ? {
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
        recipientCount: campaign.Recipients?.length || 0,
        expirationAt: campaign.expirationAt
      } : 'NOT FOUND');

      if (!campaign) {
        return res.status(404).json({
          error: 'Campaign not found or not available'
        });
      }

      if (campaign.Recipients.length === 0) {
        return res.status(400).json({
          error: 'No recipients found for this campaign'
        });
      }

      // If scheduling, create schedule entries
      if (!sendNow) {
        const { SendSchedule } = require('../models/database');
        
        // Map window to time ranges
        const windowTimes = {
          morning: { start: 8, end: 12 },
          afternoon: { start: 12, end: 17 },
          evening: { start: 17, end: 21 }
        };
        
        const scheduleDate = new Date(scheduledDate);
        
        // Get the selected mood template for scheduling
        const { TemplateMood } = require('../models/database');
        const selectedMood = await TemplateMood.findOne({
          where: { name: mood }
        });

        if (!selectedMood) {
          return res.status(400).json({
            error: `Template mood "${mood}" not found`
          });
        }

        const scheduleEntries = [];
        
        if (frequency === 'multiple') {
          // Create multiple schedule entries for each time window
          for (const timeWindow of timeWindows) {
            const windowTime = windowTimes[timeWindow];
            const nextRunAt = new Date(scheduleDate);
            nextRunAt.setHours(windowTime.start, 0, 0, 0);
            
            const scheduleEntry = await SendSchedule.create({
              campaignId: campaign.id,
              userId: user.id,
              currentMoodId: selectedMood.id,
              window: timeWindow,
              nextRunAt: nextRunAt,
              isActive: true,
              remainingSendsThisWindow: 1,
              dailySendsCount: 0,
              personalizedMessage: personalizedMessage || null,
              frequency: 'multiple'
            });
            
            scheduleEntries.push(scheduleEntry);
          }
          
          console.log(`📅 Campaign "${campaign.name}" scheduled for ${timeWindows.length} time windows on ${scheduledDate} with ${mood} mood (Premium)`);
          
          return res.json({
            success: true,
            scheduled: true,
            frequency: 'multiple',
            timeWindows: timeWindows,
            scheduledDate: scheduledDate,
            mood: mood,
            personalizedMessage: personalizedMessage ? 'included' : null,
            recipientCount: campaign.Recipients.length,
            scheduleCount: scheduleEntries.length,
            message: `Campaign scheduled for ${timeWindows.length} time windows on ${scheduledDate} with ${mood} mood`
          });
        } else {
          // Single schedule entry
          const windowTime = windowTimes[window];
          const nextRunAt = new Date(scheduleDate);
          nextRunAt.setHours(windowTime.start, 0, 0, 0);
          
          await SendSchedule.create({
            campaignId: campaign.id,
            userId: user.id,
            currentMoodId: selectedMood.id,
            window: window,
            nextRunAt: nextRunAt,
            isActive: true,
            remainingSendsThisWindow: 1,
            dailySendsCount: 0,
            personalizedMessage: personalizedMessage || null,
            frequency: 'once'
          });

          console.log(`📅 Campaign "${campaign.name}" scheduled for ${window} window on ${scheduledDate} with ${mood} mood`);

          return res.json({
            success: true,
            scheduled: true,
            frequency: 'once',
            window: window,
            scheduledDate: scheduledDate,
            mood: mood,
            personalizedMessage: personalizedMessage ? 'included' : null,
            recipientCount: campaign.Recipients.length,
            message: `Campaign scheduled for ${window} window on ${scheduledDate} with ${mood} mood`
          });
        }
      }

      // Send immediately
      const gmailService = require('../services/gmailService');
      const { TemplateMood } = require('../models/database');
      
      // Get the selected mood template
      const selectedMoodTemplate = await TemplateMood.findOne({
        where: { name: mood }
      });

      if (!selectedMoodTemplate) {
        return res.status(400).json({
          error: `Template mood "${mood}" not found`
        });
      }

      let sentCount = 0;
      const errors = [];

      // Send emails to all recipients
      for (const recipient of campaign.Recipients) {
        try {
          // Use the mood-specific template first
          const subject = selectedMoodTemplate.subjectLine
            .replace('[Campaign Name]', campaign.name)
            .replace('[Sender Name]', user.name || user.email);
            
          let message = selectedMoodTemplate.bodyText
            .replace('[Recipient Name]', recipient.personalizedName)
            .replace('[Campaign Name]', campaign.name)
            .replace('[Sender Name]', user.name || user.email)
            .replace('[Sender Note]', campaign.description);
          
          // Add personalized message if provided (Premium feature)
          if (personalizedMessage && isPremiumUser) {
            message += '\n\n---\n' + personalizedMessage;
          }

          // Create email log entry with all required fields
          const { EmailLog } = require('../models/database');
          const emailLog = await EmailLog.create({
            campaignId: campaign.id,
            recipientId: recipient.id,
            userId: user.id,
            moodId: selectedMoodTemplate.id,
            subjectSent: subject,
            bodySent: message,
            status: config.EMAIL_STATUS.SENT, // Will be updated if there's an error
            sentAt: new Date()
          });
          
          const emailResult = await gmailService.sendEmail(
            user.id,
            recipient.email,
            subject,
            message,
            emailLog.id // Pass the email log ID for tracking
          );

          // Update email log with result if failed
          if (!emailResult.success) {
            await emailLog.update({
              status: config.EMAIL_STATUS.FAILED,
              errorMessage: emailResult.error
            });
          }
          
          if (emailResult.success) {
            sentCount++;
            console.log(`📧 Email sent to ${recipient.email} for campaign "${campaign.name}" with ${mood} mood`);
          } else {
            throw new Error(emailResult.error);
          }
        } catch (emailError) {
          console.error(`Failed to send email to ${recipient.email}:`, emailError);
          errors.push({
            recipient: recipient.email,
            error: emailError.message
          });
        }
      }

      console.log(`✅ Campaign "${campaign.name}" sent ${sentCount}/${campaign.Recipients.length} emails successfully with ${mood} mood`);

      res.json({
        success: true,
        sentCount,
        totalRecipients: campaign.Recipients.length,
        mood: mood,
        errors: errors.length > 0 ? errors : undefined,
        message: `Successfully sent ${sentCount} out of ${campaign.Recipients.length} emails with ${mood} mood`
      });
    } catch (error) {
      console.error('Error sending campaign emails:', error);
      res.status(500).json({
        error: 'Failed to send campaign emails'
      });
    }
  }
}

module.exports = new CampaignController(); 