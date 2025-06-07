const express = require('express');
const router = express.Router();

// 1x1 transparent pixel for email open tracking
const TRANSPARENT_PIXEL_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

router.get('/open.png', async (req, res) => {
  try {
    const { emailLogId } = req.query;
    
    // Update EmailLog with openedAt timestamp when emailLogId is provided
    if (emailLogId) {
      try {
        const { EmailLog } = require('../models/database');
        const result = await EmailLog.update(
          { openedAt: new Date() }, 
          { 
            where: { 
              id: emailLogId,
              openedAt: null // Only update if not already opened
            } 
          }
        );
        
        if (result[0] > 0) {
          console.log(`📖 Email opened tracked: ${emailLogId}`);
        }
      } catch (dbError) {
        console.error('Error updating email log:', dbError);
      }
    }
    
    // Return 1x1 transparent PNG
    res.set('Content-Type', 'image/png');
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.send(Buffer.from(TRANSPARENT_PIXEL_BASE64, 'base64'));
  } catch (error) {
    console.error('Tracking pixel error:', error);
    // Still return the pixel even if tracking fails
    res.set('Content-Type', 'image/png');
    res.set('Cache-Control', 'no-cache');
    res.send(Buffer.from(TRANSPARENT_PIXEL_BASE64, 'base64'));
  }
});

module.exports = router; 