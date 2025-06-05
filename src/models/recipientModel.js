const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');

module.exports = (sequelize) => {
  const Recipient = sequelize.define('Recipient', {
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
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isEmail: true
      }
    },
    displayName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    personalizedName: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Defaults to displayName if not provided'
    }
  }, {
    tableName: 'recipients',
    indexes: [
      {
        fields: ['campaignId']
      },
      {
        fields: ['email']
      }
    ],
    hooks: {
      beforeCreate: (recipient) => {
        if (!recipient.personalizedName) {
          recipient.personalizedName = recipient.displayName;
        }
      },
      beforeUpdate: (recipient) => {
        if (!recipient.personalizedName) {
          recipient.personalizedName = recipient.displayName;
        }
      }
    }
  });

  return Recipient;
}; 