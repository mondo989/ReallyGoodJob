const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const config = require('../config/config');

module.exports = (sequelize) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.UUID,
      defaultValue: uuidv4,
      primaryKey: true
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    oauthEncryptedTokens: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'AES-256 encrypted JSON of { access_token, refresh_token, expires_at }'
    },
    tier: {
      type: DataTypes.ENUM(config.TIERS.FREE, config.TIERS.PREMIUM),
      defaultValue: config.TIERS.FREE,
      allowNull: false
    },
    stripeCustomerId: {
      type: DataTypes.STRING,
      allowNull: true
    },
    isAdmin: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    }
  }, {
    tableName: 'users',
    indexes: [
      {
        unique: true,
        fields: ['email']
      }
    ]
  });

  return User;
}; 