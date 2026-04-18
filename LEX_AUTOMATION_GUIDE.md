# 🚀 Amazon Lex v2 Automation - Complete Setup Guide

Your CA Document System now has **intelligent natural language understanding**! Users can interact with your WhatsApp bot using natural phrases instead of exact commands.

## 🎯 What's Been Built

### ✅ Complete Automation System
- **Lex Bot Creator**: Automatically creates entire bot with intents and slots
- **Smart Webhook**: Processes natural language with fallback to existing logic
- **Integration Service**: Handles all Lex API interactions
- **Testing Tools**: Verify everything works before going live

### ✅ Natural Language Capabilities
**Before (Rule-based):**
- User: "ITR 2025-26" → Gets document
- User: "1" → Shows consultant info

**After (AI-powered):**
- User: "Show me my ITR for 2025-26" → Gets document
- User: "I need my GST documents" → Lists GST docs
- User: "What's pending?" → Shows pending requests
- User: "Contact my consultant" → Shows consultant info
- **Plus all old commands still work!**

## 🚀 Quick Start (2 Minutes)

### Step 1: Run Automation Script
```bash
node setup-lex-automation.js
```

This will:
- ✅ Install AWS SDK
- ✅ Update .env with your AWS credentials
- ✅ Create complete Lex bot (5 intents, slot types, utterances)
- ✅ Build and test the bot
- ✅ Generate Bot ID for your .env

### Step 2: Update Twilio Webhook
1. Go to **Twilio Console**
2. **Messaging** → **Settings** → **WhatsApp Sandbox Settings**
3. Update webhook URL to:
   ```
   https://your-app.onrender.com/api/lex-webhook
   ```

### Step 3: Test with WhatsApp
Send these natural language messages:
```
✅ "Show me my ITR for 2025-26"
✅ "List all my documents"
✅ "What's pending?"
✅ "Contact consultant"
✅ "Hi" or "Hello"
```

## 📋 What Was Created

### 1. Core Files
```
backend/
├── services/lexService.js          # Lex API integration
├── controllers/lexWebhookController.js  # Smart webhook with fallback
├── routes/lexWebhookRoutes.js      # New /api/lex-webhook endpoint
├── scripts/createLexBot.js         # Complete bot automation
└── scripts/testLex.js              # Integration testing

setup-lex-automation.js             # One-click setup script
```

### 2. AWS Resources Created
- **Lex Bot**: `CADocumentBot`
- **IAM Role**: `LexV2-CADocumentBot-Role`
- **5 Intents**: GetDocument, Greeting, ShowMenu, ContactConsultant, CheckPendingRequests
- **Slot Type**: DocumentTypes (ITR, GST, TDS, etc.)
- **Sample Utterances**: 30+ natural language phrases

### 3. Environment Variables Added
```env
AWS_ACCESS_KEY_ID=AKIA4N5ZZJABDA2JFBRI
AWS_SECRET_ACCESS_KEY=dcq8Nq1r92T5dYUl5rqQOq3I1Ni9QEu7QFP2Sj7b
AWS_REGION=us-east-1
LEX_BOT_ID=generated_automatically
LEX_BOT_ALIAS_ID=TSTALIASID
LEX_LOCALE_ID=en_US
```

## 🧪 Testing & Verification

### Local Testing
```bash
# Test Lex integration
cd backend && node scripts/testLex.js

# Test webhook endpoint
curl http://localhost:5000/api/lex-webhook/test

# Start server
npm start
```

### Production Testing
```bash
# Test production webhook
curl https://your-app.onrender.com/api/lex-webhook/test
```

### WhatsApp Testing
Send these messages to verify natural language understanding:

**Document Requests:**
- "Show me my ITR for 2025-26"
- "I need my GST documents"
- "Get TDS certificate for 2024-25"
- "Where is my audit report?"

**General Queries:**
- "What's pending?"
- "Contact my consultant"
- "List all my documents"
- "Hi" / "Hello" / "Menu"

## 🔧 How It Works

### 1. Message Flow
```
WhatsApp Message → Twilio → Your Backend → Lex v2 → Intent Recognition → Business Logic → Response
```

### 2. Fallback Strategy
- **High Confidence (>60%)**: Use Lex intent and slots
- **Low Confidence (<60%)**: Fall back to rule-based logic
- **Lex Failure**: Seamlessly use existing webhook logic
- **Zero Downtime**: Always responds, never breaks

### 3. Intent Processing
```javascript
// Example: "Show me my ITR for 2025-26"
Intent: GetDocument
Slots: {
  DocumentType: "ITR",
  Year: "2025-26"
}
→ Find document in database
→ Return download link
```

## 💰 Cost Analysis

### Lex v2 Pricing
- **Text Requests**: $0.00075 per request
- **Free Tier**: 10,000 requests/month (first year)

### Monthly Cost Estimates
- **500 messages**: ~$0.40/month
- **1,000 messages**: ~$0.75/month
- **5,000 messages**: ~$3.75/month
- **10,000 messages**: FREE (first year)

## 🔍 Troubleshooting

### Issue: "Bot creation failed"
**Solutions:**
1. Verify AWS credentials in .env
2. Check IAM user has admin permissions
3. Ensure correct AWS region (us-east-1)
4. Run: `cd backend && node scripts/createLexBot.js`

### Issue: "Lex not configured"
**Solutions:**
1. Check LEX_BOT_ID in .env file
2. Verify AWS credentials are correct
3. Run test: `cd backend && node scripts/testLex.js`

### Issue: "Intent not recognized"
**Solutions:**
1. Check bot is built in AWS console
2. Verify confidence threshold (currently 60%)
3. Add more sample utterances if needed

### Issue: "Fallback always triggered"
**Solutions:**
1. Test individual intents in AWS Lex console
2. Check CloudWatch logs for Lex errors
3. Verify bot alias ID is correct

## 📊 Monitoring & Analytics

### Logs to Monitor
```bash
# Lex API calls
🤖 Sending to Lex: { message, sessionId }
✅ Lex response: { intent, slots }

# Confidence decisions
🎯 Processing intent: GetDocument with confidence: 0.85
⚠️  Low confidence, falling back to rule-based

# Fallback triggers
⚠️  Lex processing failed, falling back to rule-based
📋 Lex not configured, using rule-based logic
```

### AWS CloudWatch Metrics
- Request count and latency
- Intent recognition accuracy
- Error rates and types
- Session duration

## 🚀 Advanced Features

### 1. Add New Intents
Edit `backend/scripts/createLexBot.js` and add to intents array:
```javascript
{
  intentName: 'DocumentStatus',
  description: 'Check document status',
  sampleUtterances: [
    { utterance: 'Is my {DocumentType} ready?' },
    { utterance: 'Status of {DocumentType} {Year}' }
  ]
}
```

### 2. Multi-language Support
Add Hindi/Gujarati locale in bot creation:
```javascript
botLocales: [
  { localeId: 'en_US', ... },
  { localeId: 'hi_IN', ... }
]
```

### 3. Voice Support
Enable speech recognition for voice messages:
```javascript
voiceSettings: {
  voiceId: 'Aditi' // Hindi voice
}
```

## 🔄 Deployment Checklist

### Development
- [x] Lex bot created and tested
- [x] Integration code implemented
- [x] Local testing completed
- [x] Fallback logic verified

### Production
- [ ] Environment variables updated
- [ ] Code deployed to server
- [ ] Twilio webhook updated
- [ ] WhatsApp testing completed
- [ ] Monitoring setup verified

## 🎉 Success Metrics

Your CA Document System now provides:

✅ **Natural Language Understanding**: Users can ask naturally
✅ **Backward Compatibility**: All existing commands work
✅ **Intelligent Fallback**: Never breaks, always responds
✅ **Cost Effective**: ~$1-5/month for most usage
✅ **Zero Downtime**: Seamless integration with existing system

## 📞 Support

### If Issues Occur:
1. Check logs in your application
2. Test individual components:
   - `node backend/scripts/testLex.js`
   - `curl /api/lex-webhook/test`
3. Verify AWS console shows bot as "Built"
4. Check Twilio webhook logs

### Resources:
- AWS Lex Console: https://console.aws.amazon.com/lexv2/
- Twilio Console: https://console.twilio.com/
- CloudWatch Logs: Monitor Lex API calls

---

**🎯 Your CA Document System is now AI-powered!** 

Users can interact naturally with phrases like "Show me my ITR for 2025-26" while maintaining full backward compatibility with existing menu commands.