const { Sequelize } = require('sequelize');
const config = require('../config/config');

// Initialize Sequelize with SQLite
const sequelize = new Sequelize(config.DATABASE_URL, {
  dialect: 'sqlite',
  logging: config.NODE_ENV === 'development' ? console.log : false,
  define: {
    timestamps: true,
    underscored: false,
    freezeTableName: true
  }
});

// Import all models
const User = require('./userModel')(sequelize);
const Campaign = require('./campaignModel')(sequelize);
const Recipient = require('./recipientModel')(sequelize);
const TemplateMood = require('./templateMoodModel')(sequelize);
const SendSchedule = require('./scheduleModel')(sequelize);
const EmailLog = require('./emailLogModel')(sequelize);

// Define associations
Campaign.belongsTo(User, { foreignKey: 'createdByUserId', as: 'creator' });
Campaign.belongsTo(User, { foreignKey: 'approvedByAdminId', as: 'approver' });
User.hasMany(Campaign, { foreignKey: 'createdByUserId', as: 'createdCampaigns' });

Recipient.belongsTo(Campaign, { foreignKey: 'campaignId' });
Campaign.hasMany(Recipient, { foreignKey: 'campaignId' });

SendSchedule.belongsTo(Campaign, { foreignKey: 'campaignId' });
SendSchedule.belongsTo(User, { foreignKey: 'userId' });
SendSchedule.belongsTo(TemplateMood, { foreignKey: 'currentMoodId', as: 'currentMood' });

EmailLog.belongsTo(Campaign, { foreignKey: 'campaignId' });
EmailLog.belongsTo(Recipient, { foreignKey: 'recipientId' });
EmailLog.belongsTo(User, { foreignKey: 'userId' });
EmailLog.belongsTo(TemplateMood, { foreignKey: 'moodId' });

// Test connection
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully.');
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error);
  }
};

// Sync database (create tables)
const syncDatabase = async (force = false) => {
  try {
    await sequelize.sync({ force });
    console.log(`✅ Database synced successfully${force ? ' (forced)' : ''}.`);
  } catch (error) {
    console.error('❌ Error syncing database:', error);
  }
};

module.exports = {
  sequelize,
  User,
  Campaign,
  Recipient,
  TemplateMood,
  SendSchedule,
  EmailLog,
  testConnection,
  syncDatabase
}; 