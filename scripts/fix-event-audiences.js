const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function fixEventAudiences() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;
    
    console.log('Fixing event audiences...');
    
    // Get all events
    const events = await db.collection('events').find({}).toArray();
    console.log(`Found ${events.length} events to update`);
    
    // Update each event to have 'ALL' audience (so all members can see them)
    for (const event of events) {
      await db.collection('events').updateOne(
        { _id: event._id },
        { $set: { audience: 'ALL' } }
      );
      console.log(`Updated event: ${event.title} - Audience set to 'ALL'`);
    }
    
    console.log('All events updated successfully!');
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

fixEventAudiences(); 