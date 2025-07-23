const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function listAllEvents() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;
    
    const events = await db.collection('events').find({}).toArray();
    
    console.log(`Total events in database: ${events.length}`);
    console.log('\nAll events:');
    events.forEach((event, index) => {
      console.log(`${index + 1}. ${event.title}`);
      console.log(`   Date: ${event.date}`);
      console.log(`   Audience: ${JSON.stringify(event.audience)}`);
      console.log(`   Lodge: ${event.lodge || 'N/A'}`);
      console.log('---');
    });
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

listAllEvents(); 