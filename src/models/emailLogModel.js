const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const config = require('../config/config');

module.exports = (sequelize) => {
  const EmailLog = sequelize.define('EmailLog', {
    id: {
      type: DataTypes.UUID,
      defaultValue: uuidv4,
      primaryKey: true
    },
    campaignId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'campaigns',
        key: 'id'
      }
    },
    recipientId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'recipients',
        key: 'id'
      }
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    moodId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'template_moods',
        key: 'id'
      }
    },
    subjectSent: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'The actual subject line sent (after placeholder replacement)'
    },
    bodySent: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'The actual body text sent (after placeholder replacement)'
    },
    status: {
      type: DataTypes.ENUM(
        config.EMAIL_STATUS.SENT,
        config.EMAIL_STATUS.FAILED
      ),
      allowNull: false
    },
    errorMessage: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Error details if status is Failed'
    },
    openedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When the recipient opened the email (via tracking pixel)'
    },
    sentAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'email_logs',
    indexes: [
      {
        fields: ['campaignId']
      },
      {
        fields: ['recipientId']
      },
      {
        fields: ['userId']
      },
      {
        fields: ['status']
      },
      {
        fields: ['sentAt']
      },
      {
        fields: ['openedAt']
      },
      {
        // Composite index for duplicate prevention
        fields: ['campaignId', 'recipientId', 'sentAt']
      }
    ]
  });

  return EmailLog;
}; 