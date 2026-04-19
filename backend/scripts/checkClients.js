require('dotenv').config();
const mongoose = require('mongoose');
const Client = require('../models/Client');

async function checkClients() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');
    
    const clients = await Client.find().populate('createdBy', 'name email');
    
    console.log(`\n📋 Found ${clients.length} clients:\n`);
    
    if (clients.length === 0) {
      console.log('❌ No clients found. Add a client through the dashboard first.');
    } else {
      clients.forEach((client, index) => {
        console.log(`${index + 1}. ${client.name}`);
        console.log(`   WhatsApp: ${client.whatsappNumber}`);
        console.log(`   CA: ${client.createdBy?.name || 'Unknown'}`);
        console.log(`   Created: ${client.createdAt.toDateString()}\n`);
      });
    }
    
    mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkClients();