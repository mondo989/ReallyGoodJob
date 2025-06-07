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
            model: Recipient
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
            model: Recipient
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

      // Remove all existing recipients for this campaign
      await Recipient.destroy({
        where: { campaignId: id }
      });

      // Add new recipients
      if (recipients && recipients.length > 0) {
        const recipientData = recipients.map(recipient => ({
          campaignId: id,
          email: recipient.email,
          displayName: recipient.displayName || recipient.email.split('@')[0],
          personalizedName: recipient.displayName || recipient.email.split('@')[0]
        }));

        await Recipient.bulkCreate(recipientData);
      }

      console.log(`✏️ Campaign "${campaign.name}" recipients updated by admin ${adminUser.email}`);

      res.json({
        success: true,
        message: 'Recipients updated successfully',
        recipientCount: recipients ? recipients.length : 0
      });
    } catch (error) {
      console.error('Error updating campaign recipients:', error);
      res.status(500).json({
        error: 'Failed to update campaign recipients'
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