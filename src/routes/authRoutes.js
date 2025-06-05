const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

// Gmail OAuth2 flow - properly bind context
router.get('/google', (req, res) => authController.redirectToGmail(req, res));
router.get('/google/callback', (req, res) => authController.handleGmailCallback(req, res));

// User session management
router.post('/logout', (req, res) => authController.logout(req, res));
router.get('/me', authMiddleware, (req, res) => authController.getCurrentUser(req, res));

module.exports = router; 