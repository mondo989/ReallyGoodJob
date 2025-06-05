const express = require('express');
const router = express.Router();

// 1x1 transparent pixel for email open tracking
const TRANSPARENT_PIXEL_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

router.get('/open.png', async (req, res) => {
  try {
    const { emailLogId } = req.query;
    
    // TODO: Update EmailLog with openedAt timestamp when emailLogId is provided
    if (emailLogId) {
      console.log(`Email opened: ${emailLogId}`);
      // await EmailLog.update({ openedAt: new Date() }, { where: { id: emailLogId } });
    }
    
    // Return 1x1 transparent PNG
    res.set('Content-Type', 'image/png');
    res.set('Cache-Control', 'no-cache');
    res.send(Buffer.from(TRANSPARENT_PIXEL_BASE64, 'base64'));
  } catch (error) {
    console.error('Tracking pixel error:', error);
    // Still return the pixel even if tracking fails
    res.set('Content-Type', 'image/png');
    res.send(Buffer.from(TRANSPARENT_PIXEL_BASE64, 'base64'));
  }
});

module.exports = router; 