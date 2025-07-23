const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

// Set this to the _id of the District Grand Lodge of Syria-Lebanon
const DISTRICT_ID = '681e751c2b05d4bc4be15dfc';

async function fixEventDistrictFields() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;
    
    console.log('Updating all events to be district-wide for district:', DISTRICT_ID);
    
    const result = await db.collection('events').updateMany(
      {},
      {
        $set: {
          districtId: DISTRICT_ID,
          isDistrictWide: true,
          lodgeId: null
        }
      }
    );
    
    console.log(`Updated ${result.modifiedCount} events.`);
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

fixEventDistrictFields(); 