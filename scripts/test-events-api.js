const { MongoClient } = require('mongodb');
require('dotenv').config({ path: 'env.local' });

async function testEventsAPI() {
  try {
    // Connect to the palmlebanon database
    const MONGODB_URI = 'mongodb://localhost:27017/palmlebanon';
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    console.log('Connected to MongoDB palmlebanon database');

    const db = client.db('palmlebanon');

    // Check all events
    console.log('\n=== ALL EVENTS IN DATABASE ===');
    const allEvents = await db.collection('events').find({}).toArray();
    console.log(`Total events in database: ${allEvents.length}`);
    
    if (allEvents.length > 0) {
      console.log('\nEvents details:');
      allEvents.forEach((event, index) => {
        console.log(`Event ${index + 1}:`);
        console.log(`  ID: ${event._id}`);
        console.log(`  Title: ${event.title}`);
        console.log(`  Date: ${event.date}`);
        console.log(`  LodgeId: ${event.lodgeId}`);
        console.log(`  DistrictId: ${event.districtId}`);
        console.log(`  IsDistrictWide: ${event.isDistrictWide}`);
        console.log('  ---');
      });
    }

    // Check super admin user
    console.log('\n=== SUPER ADMIN USER ===');
    const superAdmin = await db.collection('unifiedusers').findOne({ 
      email: 'superadmin@example.com' 
    });
    
    if (superAdmin) {
      console.log('Super admin found:');
      console.log(`  ID: ${superAdmin.userId}`);
      console.log(`  Email: ${superAdmin.email}`);
      console.log(`  Role: ${superAdmin.role}`);
      console.log(`  Primary Lodge: ${superAdmin.primaryLodge}`);
    } else {
      console.log('Super admin not found');
    }

    await client.close();
    console.log('\nDisconnected from MongoDB');
  } catch (error) {
    console.error('Error testing events API:', error);
  }
}

testEventsAPI(); 