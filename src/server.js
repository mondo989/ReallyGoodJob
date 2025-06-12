const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const config = require('./config/config');

// Import database
const { testConnection, syncDatabase } = require('./models/database');

// Import middleware
const authMiddleware = require('./middleware/authMiddleware');
const errorHandler = require('./middleware/errorHandler');

// Import routes
const authRoutes = require('./routes/authRoutes');
const campaignRoutes = require('./routes/campaignRoutes');
const recipientRoutes = require('./routes/recipientRoutes');
const scheduleRoutes = require('./routes/scheduleRoutes');
const adminRoutes = require('./routes/adminRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const trackingRoutes = require('./routes/trackingRoutes');
const featureFlagRoutes = require('./routes/featureFlagRoutes');

// Import worker
const sendWorker = require('./workers/sendWorker');

const app = express();

// Security middleware with CSP configuration
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: config.NODE_ENV === 'development' 
        ? ["'self'", "'unsafe-inline'", "'unsafe-eval'"] 
        : ["'self'"],
      scriptSrcAttr: config.NODE_ENV === 'development' 
        ? ["'unsafe-inline'"] 
        : ["'none'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
}));

app.use(cors());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files
app.use(express.static(path.join(__dirname, '../public')));

// Routes
app.use('/auth', authRoutes);
app.use('/api', campaignRoutes);
app.use('/api', recipientRoutes);
app.use('/api', scheduleRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/features', featureFlagRoutes);
app.use('/track', trackingRoutes);

// Basic landing page route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Dashboard route
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/dashboard.html'));
});

// Admin route
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/admin.html'));
});

// Test email endpoint
app.post('/api/test-email', authMiddleware, async (req, res) => {
  try {
    const gmailService = require('./services/gmailService');
    const { TemplateMood } = require('./models/database');
    
    // Get a random mood for testing
    const moods = await TemplateMood.findAll();
    const randomMood = moods[Math.floor(Math.random() * moods.length)];
    
    // Send test email to the authenticated user
    await gmailService.sendEmail(
      req.user.id,
      req.user.email,
      req.user.name || 'Friend',
      'Test Email from ReallyGoodJob',
      `This is a test email to verify your email sending is working! 🎉\n\nMood: ${randomMood?.name || 'Happy'}\n\nBest regards,\nReallyGoodJob Team`,
      { mood: randomMood?.name || 'Happy' }
    );
    
    res.json({ success: true, message: 'Test email sent successfully!' });
  } catch (error) {
    console.error('Error sending test email:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Initialize and start server
async function startServer() {
  try {
    // Test database connection
    await testConnection();
    
    // Sync database (create tables if they don't exist)
    await syncDatabase();
    
    // Start server
    const PORT = config.PORT;
    app.listen(PORT, () => {
      console.log(`🚀 ReallyGoodJob server running on port ${PORT}`);
      console.log(`📧 Environment: ${config.NODE_ENV}`);
      console.log(`🌐 Visit: http://localhost:${PORT}`);
      
      // Initialize send worker
      sendWorker.start();
      console.log('📅 Send worker initialized');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

module.exports = app; 