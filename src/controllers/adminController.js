const { Campaign, User, Recipient } = require('../models/database');
const config = require('../config/config');

class AdminController {
  /**
   * Get all pending campaigns for admin review
   * GET /admin/campaigns/pending
   */
  async getPendingCampaigns(req, res) {
    try {
      const campaigns = await Campaign.findAll({
        where: { status: config.CAMPAIGN_STATUS.PENDING },
        include: [
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'email', 'name']
          },
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
          createdBy: campaign.creator,
          recipientCount: campaign.Recipients.length,
          createdAt: campaign.createdAt,
          expirationAt: campaign.expirationAt
        }))
      });
    } catch (error) {
      console.error('Error fetching pending campaigns:', error);
      res.status(500).json({
        error: 'Failed to fetch pending campaigns'
      });
    }
  }

  /**
   * Approve a campaign
   * POST /admin/campaigns/:id/approve
   */
  async approveCampaign(req, res) {
    try {
      const { id } = req.params;
      const adminUser = req.user;

      const campaign = await Campaign.findByPk(id);
      if (!campaign) {
        return res.status(404).json({
          error: 'Campaign not found'
        });
      }

      if (campaign.status !== config.CAMPAIGN_STATUS.PENDING) {
        return res.status(400).json({
          error: 'Campaign is not pending approval'
        });
      }

      // Update campaign status
      await campaign.update({
        status: config.CAMPAIGN_STATUS.ACTIVE,
        approvedByAdminId: adminUser.id,
        approvedAt: new Date()
      });

      console.log(`✅ Campaign "${campaign.name}" approved by admin ${adminUser.email}`);

      res.json({
        success: true,
        message: 'Campaign approved successfully',
        campaign: {
          id: campaign.id,
          name: campaign.name,
          status: campaign.status,
          approvedAt: campaign.approvedAt
        }
      });
    } catch (error) {
      console.error('Error approving campaign:', error);
      res.status(500).json({
        error: 'Failed to approve campaign'
      });
    }
  }

  /**
   * Reject a campaign
   * POST /admin/campaigns/:id/reject
   */
  async rejectCampaign(req, res) {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const adminUser = req.user;

      const campaign = await Campaign.findByPk(id);
      if (!campaign) {
        return res.status(404).json({
          error: 'Campaign not found'
        });
      }

      if (campaign.status !== config.CAMPAIGN_STATUS.PENDING) {
        return res.status(400).json({
          error: 'Campaign is not pending approval'
        });
      }

      // Update campaign status
      await campaign.update({
        status: config.CAMPAIGN_STATUS.REJECTED,
        approvedByAdminId: adminUser.id,
        rejectionReason: reason || 'No reason provided'
      });

      console.log(`❌ Campaign "${campaign.name}" rejected by admin ${adminUser.email}`);

      res.json({
        success: true,
        message: 'Campaign rejected successfully',
        campaign: {
          id: campaign.id,
          name: campaign.name,
          status: campaign.status,
          rejectionReason: reason
        }
      });
    } catch (error) {
      console.error('Error rejecting campaign:', error);
      res.status(500).json({
        error: 'Failed to reject campaign'
      });
    }
  }

  /**
   * Update campaign information
   * PUT /admin/campaigns/:id
   */
  async updateCampaign(req, res) {
    try {
      const { id } = req.params;
      const { name, description, expirationAt } = req.body;
      const adminUser = req.user;

      const campaign = await Campaign.findByPk(id);
      if (!campaign) {
        return res.status(404).json({
          error: 'Campaign not found'
        });
      }

      // Update campaign fields
      const updates = {};
      if (name !== undefined) updates.name = name.trim();
      if (description !== undefined) updates.description = description.trim();
      if (expirationAt !== undefined) updates.expirationAt = new Date(expirationAt);

      await campaign.update(updates);

      console.log(`✏️ Campaign "${campaign.name}" updated by admin ${adminUser.email}`);

      res.json({
        success: true,
        message: 'Campaign updated successfully',
        campaign: {
          id: campaign.id,
          name: campaign.name,
          description: campaign.description,
          status: campaign.status,
          expirationAt: campaign.expirationAt
        }
      });
    } catch (error) {
      console.error('Error updating campaign:', error);
      res.status(500).json({
        error: 'Failed to update campaign'
      });
    }
  }

  /**
   * Get all campaigns (all statuses) for admin management
   * GET /admin/campaigns
   */
  async getAllCampaigns(req, res) {
    try {
      const campaigns = await Campaign.findAll({
        include: [
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'email', 'name']
          },
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
          createdBy: campaign.creator,
          recipientCount: campaign.Recipients.length,
          createdAt: campaign.createdAt,
          approvedAt: campaign.approvedAt,
          expirationAt: campaign.expirationAt
        }))
      });
    } catch (error) {
      console.error('Error fetching all campaigns:', error);
      res.status(500).json({
        error: 'Failed to fetch campaigns'
      });
    }
  }

  /**
   * Create a new campaign as admin
   * POST /admin/campaigns/create
   */
  async createCampaign(req, res) {
    try {
      const { name, description, expirationAt, status, recipients } = req.body;
      const adminUser = req.user;

      // Validation
      if (!name || !description || !expirationAt || !status) {
        return res.status(400).json({
          error: 'Name, description, expiration date, and status are required'
        });
      }

      if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
        return res.status(400).json({
          error: 'At least one recipient is required'
        });
      }

      // Validate status
      const validStatuses = [config.CAMPAIGN_STATUS.ACTIVE, config.CAMPAIGN_STATUS.PENDING];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          error: 'Invalid status. Must be Active or Pending'
        });
      }

      // Validate expiration date
      const expiration = new Date(expirationAt);
      if (expiration <= new Date()) {
        return res.status(400).json({
          error: 'Expiration date must be in the future'
        });
      }

      // Validate recipients
      for (const recipient of recipients) {
        if (!recipient.email || !recipient.email.includes('@')) {
          return res.status(400).json({
            error: 'All recipients must have valid email addresses'
          });
        }
      }

      // Create campaign
      const { v4: uuidv4 } = require('uuid');
      const campaignData = {
        id: `camp-admin-${Date.now()}`,
        name: name.trim(),
        description: description.trim(),
        status: status,
        createdByUserId: adminUser.id,
        expirationAt: expiration,
        duplicateWindowDays: config.DUPLICATE_WINDOW_DAYS,
        freeTierLimitPerMonth: config.FREE_TIER_MONTHLY_CAMPAIGNS,
        premiumTierLimitPerDay: config.PREMIUM_TIER_SENDS_PER_CAMPAIGN_DAY
      };

      // If admin creates it as Active, auto-approve it
      if (status === config.CAMPAIGN_STATUS.ACTIVE) {
        campaignData.approvedByAdminId = adminUser.id;
        campaignData.approvedAt = new Date();
      }

      const campaign = await Campaign.create(campaignData);

      // Create recipients
      const recipientData = recipients.map(recipient => ({
        campaignId: campaign.id,
        email: recipient.email.trim(),
        displayName: recipient.displayName ? recipient.displayName.trim() : recipient.email.split('@')[0],
        personalizedName: recipient.displayName ? recipient.displayName.trim() : recipient.email.split('@')[0]
      }));

      await Recipient.bulkCreate(recipientData);

      console.log(`🎯 Campaign "${campaign.name}" created by admin ${adminUser.email} with status ${status}`);

      res.json({
        success: true,
        message: `Campaign created successfully with status: ${status}`,
        campaign: {
          id: campaign.id,
          name: campaign.name,
          description: campaign.description,
          status: campaign.status,
          createdBy: {
            id: adminUser.id,
            email: adminUser.email,
            name: adminUser.name
          },
          recipientCount: recipients.length,
          expirationAt: campaign.expirationAt,
          approvedAt: campaign.approvedAt
        }
      });
    } catch (error) {
      console.error('Error creating campaign as admin:', error);
      res.status(500).json({
        error: 'Failed to create campaign'
      });
    }
  }

  /**
   * Get campaign recipients
   * GET /admin/campaigns/:id/recipients
   */
  async getCampaignRecipients(req, res) {
    try {
      const { id } = req.params;

      const campaign = await Campaign.findByPk(id, {
        include: [
          {
            model: Recipient,
            as: 'Recipients',
            attributes: ['id', 'email', 'displayName', 'personalizedName']
          }
        ]
      });

      if (!campaign) {
        return res.status(404).json({
          error: 'Campaign not found'
        });
      }

      res.json({
        success: true,
        recipients: campaign.Recipients || []
      });
    } catch (error) {
      console.error('Error fetching campaign recipients:', error);
      res.status(500).json({
        error: 'Failed to fetch campaign recipients'
      });
    }
  }

  /**
   * Update campaign recipients
   * PUT /admin/campaigns/:id/recipients
   */
  async updateCampaignRecipients(req, res) {
    try {
      const { id } = req.params;
      const { recipients } = req.body;
      const adminUser = req.user;

      const campaign = await Campaign.findByPk(id);
      if (!campaign) {
        return res.status(404).json({
          error: 'Campaign not found'
        });
      }

      // Get existing recipients
      const existingRecipients = await Recipient.findAll({
        where: { campaignId: id }
      });

      // Create a transaction to ensure data consistency
      const transaction = await campaign.sequelize.transaction();

      try {
        // If there are existing recipients, we need to handle foreign key constraints
        if (existingRecipients.length > 0) {
          // First, check if any recipients have been used in email logs
          const { EmailLog } = require('../models/database');
          const emailLogsExist = await EmailLog.count({
            where: { 
              recipientId: existingRecipients.map(r => r.id)
            }
          });

          if (emailLogsExist > 0) {
            // If email logs exist, we can't delete recipients due to foreign key constraints
            // Instead, we'll update existing recipients and add new ones
            console.log(`⚠️ Campaign has email logs, using update strategy instead of delete/recreate`);
            
            const existingEmails = existingRecipients.map(r => r.email);
            const newRecipients = recipients || [];

            // Update existing recipients that are still in the new list
            for (const existingRecipient of existingRecipients) {
              const newRecipient = newRecipients.find(r => r.email === existingRecipient.email);
              if (newRecipient) {
                await existingRecipient.update({
                  displayName: newRecipient.displayName || newRecipient.email.split('@')[0],
                  personalizedName: newRecipient.displayName || newRecipient.email.split('@')[0]
                }, { transaction });
              }
            }

            // Add new recipients that don't exist yet
            const recipientsToAdd = newRecipients.filter(r => !existingEmails.includes(r.email));
            if (recipientsToAdd.length > 0) {
              const recipientData = recipientsToAdd.map(recipient => ({
                campaignId: id,
                email: recipient.email,
                displayName: recipient.displayName || recipient.email.split('@')[0],
                personalizedName: recipient.displayName || recipient.email.split('@')[0]
              }));

              await Recipient.bulkCreate(recipientData, { transaction });
              console.log(`✅ Added ${recipientsToAdd.length} new recipients`);
            }

            // Note: We cannot remove recipients that have email logs due to foreign key constraints
            // This is a limitation when recipients have already been used for sending emails
          } else {
            // No email logs exist, but let's still use the safer update approach
            console.log(`📝 No email logs found, using safe update strategy`);
            
            const existingEmails = existingRecipients.map(r => r.email);
            const newRecipients = recipients || [];

            // Update existing recipients
            for (const existingRecipient of existingRecipients) {
              const newRecipient = newRecipients.find(r => r.email === existingRecipient.email);
              if (newRecipient) {
                await existingRecipient.update({
                  displayName: newRecipient.displayName || newRecipient.email.split('@')[0],
                  personalizedName: newRecipient.displayName || newRecipient.email.split('@')[0]
                }, { transaction });
              }
            }

            // Add new recipients that don't exist yet
            const recipientsToAdd = newRecipients.filter(r => !existingEmails.includes(r.email));
            if (recipientsToAdd.length > 0) {
              const recipientData = recipientsToAdd.map(recipient => ({
                campaignId: id,
                email: recipient.email,
                displayName: recipient.displayName || recipient.email.split('@')[0],
                personalizedName: recipient.displayName || recipient.email.split('@')[0]
              }));

              await Recipient.bulkCreate(recipientData, { transaction });
              console.log(`✅ Added ${recipientsToAdd.length} new recipients`);
            }
          }
        } else {
          // No existing recipients, just add new ones
          if (recipients && recipients.length > 0) {
            const recipientData = recipients.map(recipient => ({
              campaignId: id,
              email: recipient.email,
              displayName: recipient.displayName || recipient.email.split('@')[0],
              personalizedName: recipient.displayName || recipient.email.split('@')[0]
            }));

            await Recipient.bulkCreate(recipientData, { transaction });
          }
        }

        await transaction.commit();

        // Get final recipient count
        const finalRecipients = await Recipient.findAll({
          where: { campaignId: id }
        });

        console.log(`✏️ Campaign "${campaign.name}" recipients updated by admin ${adminUser.email}`);

        res.json({
          success: true,
          message: 'Recipients updated successfully',
          recipientCount: finalRecipients.length
        });
      } catch (transactionError) {
        await transaction.rollback();
        throw transactionError;
      }
    } catch (error) {
      console.error('Error updating campaign recipients:', error);
      res.status(500).json({
        error: 'Failed to update recipients'
      });
    }
  }

  /**
   * Get admin dashboard stats
   * GET /admin/stats
   */
  async getAdminStats(req, res) {
    try {
      const [pendingCount, activeCount, rejectedCount, totalUsers] = await Promise.all([
        Campaign.count({ where: { status: config.CAMPAIGN_STATUS.PENDING } }),
        Campaign.count({ where: { status: config.CAMPAIGN_STATUS.ACTIVE } }),
        Campaign.count({ where: { status: config.CAMPAIGN_STATUS.REJECTED } }),
        User.count()
      ]);

      res.json({
        success: true,
        stats: {
          campaigns: {
            pending: pendingCount,
            active: activeCount,
            rejected: rejectedCount,
            total: pendingCount + activeCount + rejectedCount
          },
          users: {
            total: totalUsers
          }
        }
      });
    } catch (error) {
      console.error('Error fetching admin stats:', error);
      res.status(500).json({
        error: 'Failed to fetch admin stats'
      });
    }
  }
}

module.exports = new AdminController(); 