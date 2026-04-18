const express = require('express');
const router = express.Router();
const lexWebhookController = require('../controllers/lexWebhookController');

// Lex-enhanced WhatsApp webhook
router.post('/', lexWebhookController.handleWhatsAppMessage);

// Test endpoint
router.get('/test', lexWebhookController.testWebhook);

module.exports = router;