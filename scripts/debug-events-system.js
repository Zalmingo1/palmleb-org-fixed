const mongoose = require('mongoose');
require('dotenv').config({ path: 'env.local' });

async function debugEventsSystem() {
  try {
    console.log('MongoDB URI:', process.env.MONGODB_URI ? 'Set' : 'Not set');
    
    if (!process.env.MONGODB_URI) {
      console.error('MONGODB_URI not found in environment variables');
      return;
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const { db } = await mongoose.connection;

    // Step 1: Check if events exist in the database
    console.log('\n=== Checking Events Database ===');
    const totalEvents = await db.collection('events').countDocuments();
    console.log('Total events in database:', totalEvents);

    if (totalEvents > 0) {
      const sampleEvents = await db.collection('events').find({}).limit(5).toArray();
      console.log('Sample events:');
      sampleEvents.forEach((event, index) => {
        console.log(`${index + 1}. ${event.title} (${event.date}) - Lodge: ${event.lodgeId || 'District-wide'}`);
      });
    }

    // Step 2: Check lodges in the district
    console.log('\n=== Checking District Lodges ===');
    const districtLodgeId = '681e751c2b05d4bc4be15dfc';
    
    const districtLodges = await db.collection('lodges').find({
      $or: [
        { _id: new mongoose.Types.ObjectId(districtLodgeId) },
        { district: districtLodgeId },
        { parentLodge: districtLodgeId }
      ]
    }).toArray();

    console.log('District lodges found:', districtLodges.length);
    districtLodges.forEach(lodge => {
      console.log(`- ${lodge.name} (ID: ${lodge._id})`);
    });

    // Step 3: Check events for district lodges
    console.log('\n=== Checking Events for District Lodges ===');
    const districtLodgeIds = districtLodges.map(lodge => lodge._id);
    
    const districtEvents = await db.collection('events').find({
      $or: [
        { lodgeId: { $in: districtLodgeIds } },
        { 
          lodgeId: null, 
          districtId: districtLodgeId,
          isDistrictWide: true 
        },
        { isDistrictWide: true }
      ]
    }).toArray();

    console.log('District events found:', districtEvents.length);
    districtEvents.forEach((event, index) => {
      console.log(`${index + 1}. ${event.title} (${event.date}) - Lodge: ${event.lodgeId || 'District-wide'}`);
    });

    // Step 4: Check test6 user data
    console.log('\n=== Checking Test6 User Data ===');
    const test6User = await db.collection('users').findOne({ email: 'test6@example.com' });
    const test6Member = await db.collection('members').findOne({ email: 'test6@example.com' });

    console.log('Test6 user data:');
    console.log('- User collection:', test6User ? {
      email: test6User.email,
      role: test6User.role,
      primaryLodge: test6User.primaryLodge,
      lodges: test6User.lodges
    } : 'Not found');
    
    console.log('- Member collection:', test6Member ? {
      email: test6Member.email,
      role: test6Member.role,
      primaryLodge: test6Member.primaryLodge,
      lodges: test6Member.lodges
    } : 'Not found');

    // Step 5: Simulate the API query logic
    console.log('\n=== Simulating API Query Logic ===');
    
    const user = test6User || test6Member;
    if (user) {
      console.log('User found:', {
        email: user.email,
        primaryLodge: user.primaryLodge,
        lodges: user.lodges
      });

      // Get lodges in the user's district
      const userDistrictLodges = await db.collection('lodges')
        .find({ district: user.primaryLodge })
        .toArray();

      console.log('User district lodges:', userDistrictLodges.length);
      userDistrictLodges.forEach(lodge => {
        console.log(`- ${lodge.name} (ID: ${lodge._id})`);
      });

      const userDistrictLodgeIds = userDistrictLodges.map(lodge => new mongoose.Types.ObjectId(lodge._id));
      
      // Find events for user's district
      const userDistrictEvents = await db.collection('events')
        .find({
          $or: [
            { lodgeId: { $in: userDistrictLodgeIds } },
            { 
              lodgeId: null, 
              districtId: user.primaryLodge,
              isDistrictWide: true 
            }
          ]
        })
        .toArray();

      console.log('User district events found:', userDistrictEvents.length);
      userDistrictEvents.forEach((event, index) => {
        console.log(`${index + 1}. ${event.title} (${event.date}) - Lodge: ${event.lodgeId || 'District-wide'}`);
      });
    }

    // Step 6: Create a test event if none exist
    if (totalEvents === 0) {
      console.log('\n=== Creating Test Event ===');
      
      const testEvent = {
        title: 'Test District Event',
        date: '2024-12-25',
        time: '19:00',
        location: 'District Grand Lodge',
        description: 'This is a test event for the district',
        lodgeId: new mongoose.Types.ObjectId(districtLodgeId),
        attendees: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await db.collection('events').insertOne(testEvent);
      console.log('✅ Created test event with ID:', result.insertedId);
    }

    await mongoose.disconnect();
    console.log('\n✅ Events system debug completed!');
  } catch (error) {
    console.error('Error:', error);
  }
}

debugEventsSystem(); 