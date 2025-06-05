const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const config = require('../config/config');

module.exports = (sequelize) => {
  const Campaign = sequelize.define('Campaign', {
    id: {
      type: DataTypes.UUID,
      defaultValue: uuidv4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM(
        config.CAMPAIGN_STATUS.PENDING,
        config.CAMPAIGN_STATUS.ACTIVE,
        config.CAMPAIGN_STATUS.REJECTED,
        config.CAMPAIGN_STATUS.EXPIRED
      ),
      defaultValue: config.CAMPAIGN_STATUS.PENDING,
      allowNull: false
    },
    createdByUserId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    approvedByAdminId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    approvedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    expirationAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: () => new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 days from now
    },
    duplicateWindowDays: {
      type: DataTypes.INTEGER,
      defaultValue: config.DUPLICATE_WINDOW_DAYS,
      allowNull: false
    },
    freeTierLimitPerMonth: {
      type: DataTypes.INTEGER,
      defaultValue: config.FREE_TIER_MONTHLY_CAMPAIGNS,
      allowNull: false
    },
    premiumTierLimitPerDay: {
      type: DataTypes.INTEGER,
      defaultValue: config.PREMIUM_TIER_SENDS_PER_CAMPAIGN_DAY,
      allowNull: false
    }
  }, {
    tableName: 'campaigns',
    indexes: [
      {
        fields: ['status']
      },
      {
        fields: ['createdByUserId']
      },
      {
        fields: ['approvedByAdminId']
      }
    ]
  });

  return Campaign;
}; 