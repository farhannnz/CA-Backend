const express = require('express');
const router = express.Router();
const smartWebhookController = require('../controllers/smartWebhookController');

// Smart keyword-based WhatsApp webhook
router.post('/', smartWebhookController.handleWhatsAppMessage);

// Test endpoint
router.get('/test', smartWebhookController.testWebhook);

module.exports = router;