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
            as: 'recipients'
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
          recipientCount: campaign.recipients.length,
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