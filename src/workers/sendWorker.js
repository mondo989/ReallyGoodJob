const cron = require('node-cron');
const config = require('../config/config');

class SendWorker {
  constructor() {
    this.isRunning = false;
  }

  start() {
    if (this.isRunning) {
      console.log('Send worker is already running');
      return;
    }

    console.log('🔄 Starting send worker...');
    
    // Run at the start of each email window: 08:00, 12:00, 17:00
    // Cron pattern: minute hour * * *
    
    // Morning window: 08:00
    cron.schedule('0 8 * * *', () => {
      this.processWindow('Morning');
    }, {
      timezone: 'UTC'
    });

    // Afternoon window: 12:00
    cron.schedule('0 12 * * *', () => {
      this.processWindow('Afternoon');
    }, {
      timezone: 'UTC'
    });

    // Evening window: 17:00
    cron.schedule('0 17 * * *', () => {
      this.processWindow('Evening');
    }, {
      timezone: 'UTC'
    });

    // Daily reset at midnight
    cron.schedule('0 0 * * *', () => {
      this.dailyReset();
    }, {
      timezone: 'UTC'
    });

    this.isRunning = true;
    console.log('✅ Send worker started successfully');
  }

  async processWindow(window) {
    try {
      console.log(`🕐 Processing ${window} window...`);
      
      // TODO: Implement send logic
      // 1. Query SendSchedule records for this window
      // 2. Check remainingSendsThisWindow > 0
      // 3. Process each schedule
      // 4. Send emails to recipients
      // 5. Update send counters
      
      console.log(`📧 ${window} window processing complete`);
    } catch (error) {
      console.error(`Error processing ${window} window:`, error);
    }
  }

  async dailyReset() {
    try {
      console.log('🔄 Daily reset: Resetting send counters...');
      
      // TODO: Implement daily reset logic
      // 1. Reset dailySendsCount = 0 for all schedules
      // 2. Reset remainingSendsThisWindow = 1 for all windows
      
      console.log('✅ Daily reset complete');
    } catch (error) {
      console.error('Error during daily reset:', error);
    }
  }

  stop() {
    if (!this.isRunning) {
      console.log('Send worker is not running');
      return;
    }

    // Note: node-cron doesn't provide direct stop method for individual tasks
    // In production, you might want to track task references
    this.isRunning = false;
    console.log('🛑 Send worker stopped');
  }
}

module.exports = new SendWorker(); 