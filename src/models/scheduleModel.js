const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const config = require('../config/config');

module.exports = (sequelize) => {
  const SendSchedule = sequelize.define('SendSchedule', {
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
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    currentMoodId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'template_moods',
        key: 'id'
      },
      comment: 'Points to the next mood in rotation for Premium users'
    },
    window: {
      type: DataTypes.ENUM(
        config.EMAIL_WINDOWS.MORNING,
        config.EMAIL_WINDOWS.AFTERNOON,
        config.EMAIL_WINDOWS.EVENING
      ),
      allowNull: false
    },
    nextRunAt: {
      type: DataTypes.DATE,
      allowNull: false,
      comment: 'Next scheduled execution time'
    },
    remainingSendsThisWindow: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      allowNull: false,
      comment: 'Free=1, Premium=1, resets after send'
    },
    dailySendsCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
      comment: 'Resets at midnight'
    },
    senderNote: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Optional personal note from user'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false
    }
  }, {
    tableName: 'send_schedules',
    indexes: [
      {
        fields: ['campaignId']
      },
      {
        fields: ['userId']
      },
      {
        fields: ['nextRunAt']
      },
      {
        fields: ['window']
      },
      {
        fields: ['isActive']
      }
    ]
  });

  return SendSchedule;
}; 