const { Campaign, User, Recipient } = require('../models/database');
const config = require('../config/config');

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
   * Send emails for a campaign
   * POST /campaigns/:id/send
   */
  async sendCampaignEmails(req, res) {
    try {
      const { id } = req.params;
      const user = req.user;

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

      const gmailService = require('../services/gmailService');
      const { TemplateMood } = require('../models/database');
      
      // Get a random mood for variety
      const moods = await TemplateMood.findAll();
      const randomMood = moods[Math.floor(Math.random() * moods.length)];

      let sentCount = 0;
      const errors = [];

      // Send emails to all recipients
      for (const recipient of campaign.Recipients) {
        try {
          const subject = `${campaign.name} - You're appreciated! 🎉`;
          const message = `Hello ${recipient.personalizedName},\n\n${campaign.description}\n\nThis message was sent with love through ReallyGoodJob!\n\nSent by: ${user.name || user.email}\nMood: ${randomMood?.name || 'Happy'}\n\nBest regards,\nThe ReallyGoodJob Team`;
          
          await gmailService.sendEmail(
            user.id,
            recipient.email,
            recipient.personalizedName,
            subject,
            message,
            {
              campaignId: campaign.id,
              recipientId: recipient.id,
              mood: randomMood?.name || 'Happy',
              senderName: user.name || user.email
            }
          );
          
          sentCount++;
          console.log(`📧 Email sent to ${recipient.email} for campaign "${campaign.name}"`);
        } catch (emailError) {
          console.error(`Failed to send email to ${recipient.email}:`, emailError);
          errors.push({
            recipient: recipient.email,
            error: emailError.message
          });
        }
      }

      console.log(`✅ Campaign "${campaign.name}" sent ${sentCount}/${campaign.Recipients.length} emails successfully`);

      res.json({
        success: true,
        sentCount,
        totalRecipients: campaign.Recipients.length,
        errors: errors.length > 0 ? errors : undefined,
        message: `Successfully sent ${sentCount} out of ${campaign.Recipients.length} emails`
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