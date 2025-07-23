const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function checkEventsForLodge(lodgeId) {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;
    
    console.log('Checking events for lodge:', lodgeId);
    
    // Check events in the events collection
    const events = await db.collection('events').find({
      $or: [
        { audience: { $in: [lodgeId] } },
        { audience: 'ALL' },
        { audience: 'PUBLIC' }
      ]
    }).toArray();
    
    console.log(`Found ${events.length} events for lodge ${lodgeId}:`);
    events.forEach(event => {
      console.log(`- ${event.title} (${event.date}) - Audience: ${JSON.stringify(event.audience)}`);
    });
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

// Check for the lodge that test6@example.com belongs to
checkEventsForLodge('681e751c2b05d4bc4be15dfc'); 