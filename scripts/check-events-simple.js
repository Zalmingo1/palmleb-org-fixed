const { MongoClient } = require('mongodb');
require('dotenv').config({ path: 'env.local' });

async function checkEvents() {
  try {
    // Connect to the palmlebanon database
    const MONGODB_URI = 'mongodb://localhost:27017/palmlebanon';
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    console.log('Connected to MongoDB palmlebanon database');

    const db = client.db('palmlebanon');

    // Check all events
    console.log('\n=== ALL EVENTS ===');
    const allEvents = await db.collection('events').find({}).toArray();
    console.log(`Total events in database: ${allEvents.length}`);
    
    if (allEvents.length > 0) {
      console.log('\nAll events details:');
      allEvents.forEach((event, index) => {
        console.log(`Event ${index + 1}:`);
        console.log(`  ID: ${event._id}`);
        console.log(`  Title: ${event.title}`);
        console.log(`  Lodge ID: ${event.lodgeId}`);
        console.log(`  District ID: ${event.districtId}`);
        console.log(`  Date: ${event.date}`);
        console.log(`  Is District Wide: ${event.isDistrictWide || false}`);
        console.log(`  Full event object:`, JSON.stringify(event, null, 2));
        console.log('');
      });
    }

    // Check events for specific lodge
    const lodgeId = '681df4a0c3d150939b5a298e';
    console.log(`\n=== EVENTS FOR LODGE ${lodgeId} ===`);
    const lodgeEvents = await db.collection('events').find({
      lodgeId: new (require('mongodb').ObjectId)(lodgeId)
    }).toArray();
    console.log(`Events for lodge ${lodgeId}: ${lodgeEvents.length}`);

    // Check district-wide events
    console.log('\n=== DISTRICT-WIDE EVENTS ===');
    const districtEvents = await db.collection('events').find({
      isDistrictWide: true
    }).toArray();
    console.log(`District-wide events: ${districtEvents.length}`);

    // Check events with null lodgeId
    console.log('\n=== EVENTS WITH NULL LODGE ID ===');
    const nullLodgeEvents = await db.collection('events').find({
      lodgeId: null
    }).toArray();
    console.log(`Events with null lodgeId: ${nullLodgeEvents.length}`);

    // Check lodges
    console.log('\n=== LODGES ===');
    const lodges = await db.collection('lodges').find({}).toArray();
    console.log(`Total lodges: ${lodges.length}`);
    
    if (lodges.length > 0) {
      console.log('\nFirst few lodges:');
      lodges.slice(0, 3).forEach((lodge, index) => {
        console.log(`Lodge ${index + 1}:`);
        console.log(`  ID: ${lodge._id}`);
        console.log(`  Name: ${lodge.name}`);
        console.log(`  District: ${lodge.district}`);
        console.log(`  Parent Lodge: ${lodge.parentLodge}`);
        console.log('');
      });
    }

    await client.close();
    console.log('\nDisconnected from MongoDB');
  } catch (error) {
    console.error('Error checking events:', error);
  }
}

checkEvents(); 