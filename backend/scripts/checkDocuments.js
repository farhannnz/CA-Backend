require('dotenv').config();
const mongoose = require('mongoose');
const Document = require('../models/Document');
const Client = require('../models/Client');

async function checkDocuments() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');
    
    const documents = await Document.find().populate('clientId', 'name whatsappNumber');
    
    console.log(`\n📋 Found ${documents.length} documents:\n`);
    
    if (documents.length === 0) {
      console.log('❌ No documents found. Upload some documents first.');
    } else {
      documents.forEach((doc, index) => {
        console.log(`${index + 1}. ${doc.documentType} ${doc.year}`);
        console.log(`   Client: ${doc.clientId?.name || 'Unknown'}`);
        console.log(`   WhatsApp: ${doc.clientId?.whatsappNumber || 'Unknown'}`);
        console.log(`   File: ${doc.fileName}`);
        console.log(`   URL: ${doc.fileUrl}`);
        console.log(`   Uploaded: ${doc.uploadDate.toDateString()}\n`);
      });
      
      // Group by client
      console.log('\n📊 Documents by Client:\n');
      const byClient = {};
      documents.forEach(doc => {
        const clientKey = doc.clientId?.whatsappNumber || 'Unknown';
        if (!byClient[clientKey]) {
          byClient[clientKey] = [];
        }
        byClient[clientKey].push(`${doc.documentType} ${doc.year}`);
      });
      
      Object.keys(byClient).forEach(whatsapp => {
        console.log(`📱 ${whatsapp}:`);
        byClient[whatsapp].forEach(doc => {
          console.log(`   • ${doc}`);
        });
        console.log('');
      });
    }
    
    mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkDocuments();