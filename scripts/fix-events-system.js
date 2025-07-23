const mongoose = require('mongoose');
require('dotenv').config({ path: 'env.local' });

async function fixEventsSystem() {
  try {
    console.log('MongoDB URI:', process.env.MONGODB_URI ? 'Set' : 'Not set');
    
    if (!process.env.MONGODB_URI) {
      console.error('MONGODB_URI not found in environment variables');
      return;
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const { db } = await mongoose.connection;

    // Step 1: Create the District Grand Lodge if it doesn't exist
    console.log('\n=== Creating District Grand Lodge ===');
    const districtLodgeId = '681e751c2b05d4bc4be15dfc';
    
    let districtLodge = await db.collection('lodges').findOne({ _id: new mongoose.Types.ObjectId(districtLodgeId) });
    
    if (!districtLodge) {
      const newDistrictLodge = {
        _id: new mongoose.Types.ObjectId(districtLodgeId),
        name: 'District Grand Lodge of Syria-Lebanon',
        description: 'The main district lodge',
        location: 'Beirut, Lebanon',
        district: districtLodgeId,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const result = await db.collection('lodges').insertOne(newDistrictLodge);
      console.log('✅ Created District Grand Lodge with ID:', result.insertedId);
      districtLodge = newDistrictLodge;
    } else {
      console.log('✅ District Grand Lodge already exists');
    }

    // Step 2: Create some sub-lodges in the district
    console.log('\n=== Creating Sub-Lodges ===');
    
    const subLodges = [
      {
        name: 'Lodge of Harmony',
        description: 'A lodge in the district',
        location: 'Beirut, Lebanon',
        district: districtLodgeId,
        parentLodge: districtLodgeId,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Lodge of Wisdom',
        description: 'Another lodge in the district',
        location: 'Tripoli, Lebanon',
        district: districtLodgeId,
        parentLodge: districtLodgeId,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Lodge of Unity',
        description: 'A third lodge in the district',
        location: 'Sidon, Lebanon',
        district: districtLodgeId,
        parentLodge: districtLodgeId,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    for (const lodge of subLodges) {
      const existingLodge = await db.collection('lodges').findOne({ name: lodge.name });
      if (!existingLodge) {
        const result = await db.collection('lodges').insertOne(lodge);
        console.log(`✅ Created ${lodge.name} with ID:`, result.insertedId);
      } else {
        console.log(`✅ ${lodge.name} already exists`);
      }
    }

    // Step 3: Create events for the district
    console.log('\n=== Creating District Events ===');
    
    const events = [
      {
        title: 'District Grand Meeting',
        date: '2024-12-25',
        time: '19:00',
        location: 'District Grand Lodge',
        description: 'Monthly district grand meeting for all lodges',
        lodgeId: new mongoose.Types.ObjectId(districtLodgeId),
        attendees: 0,
        isDistrictWide: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: 'District Charity Event',
        date: '2024-12-30',
        time: '18:00',
        location: 'Community Center',
        description: 'Annual charity event for the district',
        lodgeId: null,
        districtId: districtLodgeId,
        attendees: 0,
        isDistrictWide: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: 'Lodge of Harmony Meeting',
        date: '2024-12-20',
        time: '20:00',
        location: 'Lodge of Harmony',
        description: 'Regular meeting of Lodge of Harmony',
        lodgeId: null, // Will be set after lodge creation
        attendees: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    // Get the first sub-lodge for the third event
    const firstSubLodge = await db.collection('lodges').findOne({ 
      district: districtLodgeId,
      name: 'Lodge of Harmony'
    });

    if (firstSubLodge) {
      events[2].lodgeId = firstSubLodge._id;
    }

    for (const event of events) {
      const existingEvent = await db.collection('events').findOne({ 
        title: event.title,
        date: event.date
      });
      
      if (!existingEvent) {
        const result = await db.collection('events').insertOne(event);
        console.log(`✅ Created event "${event.title}" with ID:`, result.insertedId);
      } else {
        console.log(`✅ Event "${event.title}" already exists`);
      }
    }

    // Step 4: Verify the setup
    console.log('\n=== Verifying Setup ===');
    
    const totalLodges = await db.collection('lodges').countDocuments();
    const totalEvents = await db.collection('events').countDocuments();
    const districtLodges = await db.collection('lodges').find({ district: districtLodgeId }).toArray();
    const districtEvents = await db.collection('events').find({
      $or: [
        { lodgeId: new mongoose.Types.ObjectId(districtLodgeId) },
        { districtId: districtLodgeId },
        { isDistrictWide: true }
      ]
    }).toArray();

    console.log('Total lodges:', totalLodges);
    console.log('Total events:', totalEvents);
    console.log('District lodges:', districtLodges.length);
    console.log('District events:', districtEvents.length);

    console.log('\nDistrict lodges:');
    districtLodges.forEach(lodge => {
      console.log(`- ${lodge.name} (ID: ${lodge._id})`);
    });

    console.log('\nDistrict events:');
    districtEvents.forEach(event => {
      console.log(`- ${event.title} (${event.date}) - Lodge: ${event.lodgeId || 'District-wide'}`);
    });

    await mongoose.disconnect();
    console.log('\n✅ Events system fixed!');
    console.log('The district admin events page should now show events.');
  } catch (error) {
    console.error('Error:', error);
  }
}

fixEventsSystem(); 