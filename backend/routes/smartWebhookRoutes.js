const express = require('express');
const router = express.Router();
const newSmartWebhookController = require('../controllers/newSmartWebhookController');

// New conversational WhatsApp webhook
router.post('/', newSmartWebhookController.handleWhatsAppMessage);

// Test endpoint
router.get('/test', newSmartWebhookController.testWebhook);

module.exports = router;