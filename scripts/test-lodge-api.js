const mongoose = require('mongoose');

async function testLodgeAPI() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const { db } = await mongoose.connection;

    console.log('\n=== TESTING LODGE API ===\n');

    // Get the District Grand Lodge ID
    const districtLodge = await db.collection('lodges').findOne({ 
      name: 'District Grand Lodge of Syria-Lebanon' 
    });

    if (!districtLodge) {
      console.log('❌ District Grand Lodge not found');
      return;
    }

    console.log('District Lodge ID:', districtLodge._id.toString());

    // Test the same queries as the lodge API
    const objectId = new mongoose.Types.ObjectId(districtLodge._id);
    
    const [users, members, unifiedUsers] = await Promise.all([
      db.collection('users').find({ 
        $or: [
          { lodges: objectId },
          { primaryLodge: objectId }
        ]
      }).toArray(),
      db.collection('members').find({ 
        $or: [
          { lodgeMemberships: { $elemMatch: { lodge: objectId } } },
          { primaryLodge: objectId }
        ]
      }).toArray(),
      db.collection('unifiedusers').find({ 
        $or: [
          { lodges: { $elemMatch: { $eq: objectId } } },
          { primaryLodge: objectId },
          { lodgeMemberships: { $elemMatch: { lodge: objectId } } }
        ]
      }).toArray()
    ]);

    console.log('\nUsers found:', users.length);
    users.forEach(user => {
      console.log(`- ${user.name} (${user.email}) - Role: ${user.role}`);
    });

    console.log('\nMembers found:', members.length);
    members.forEach(member => {
      console.log(`- ${member.firstName} ${member.lastName} (${member.email}) - Role: ${member.role}`);
    });

    console.log('\nUnified Users found:', unifiedUsers.length);
    unifiedUsers.forEach(user => {
      console.log(`- ${user.name} (${user.email}) - Role: ${user.role}`);
    });

    // Check if test 8 is in any of the results
    const test8InUsers = users.find(u => u.email === 'test8@example.com');
    const test8InMembers = members.find(m => m.email === 'test8@example.com');
    const test8InUnified = unifiedUsers.find(u => u.email === 'test8@example.com');

    console.log('\n=== TEST 8 CHECK ===');
    console.log('Test 8 in users:', !!test8InUsers);
    console.log('Test 8 in members:', !!test8InMembers);
    console.log('Test 8 in unified users:', !!test8InUnified);

    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  } catch (error) {
    console.error('Error:', error);
  }
}

testLodgeAPI(); 