const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const config = require('../config/config');

module.exports = (sequelize) => {
  const TemplateMood = sequelize.define('TemplateMood', {
    id: {
      type: DataTypes.UUID,
      defaultValue: uuidv4,
      primaryKey: true
    },
    name: {
      type: DataTypes.ENUM(
        config.MOODS.HAPPY,
        config.MOODS.CHEERFUL,
        config.MOODS.ECSTATIC,
        config.MOODS.GRATEFUL,
        config.MOODS.PROFESSIONAL,
        config.MOODS.WARM,
        config.MOODS.ENTHUSIASTIC,
        config.MOODS.HEARTFELT,
        config.MOODS.INSPIRING
      ),
      allowNull: false,
      unique: true
    },
    subjectLine: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Subject template with placeholders like [Sender Name], [Campaign Name]'
    },
    bodyText: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'Body template with placeholders like [Recipient Name], [Sender Note]'
    }
  }, {
    tableName: 'template_moods',
    indexes: [
      {
        unique: true,
        fields: ['name']
      }
    ]
  });

  return TemplateMood;
}; 