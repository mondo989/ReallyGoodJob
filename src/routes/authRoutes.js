const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

// Gmail OAuth2 flow
router.get('/google', authController.redirectToGmail);
router.get('/google/callback', authController.handleGmailCallback);

// User session management
router.post('/logout', authController.logout);
router.get('/me', authMiddleware, authController.getCurrentUser);

module.exports = router; 