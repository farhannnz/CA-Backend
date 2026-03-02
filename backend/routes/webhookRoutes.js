const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhookController');

// Twilio WhatsApp webhook
router.post('/', webhookController.handleWhatsAppMessage);

// Test endpoint
router.get('/test', webhookController.testWebhook);

module.exports = router;
