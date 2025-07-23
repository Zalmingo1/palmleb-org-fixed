const mongoose = require('mongoose');

async function debugTest8Lodge() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const { db } = await mongoose.connection;

    console.log('\n=== DEBUGGING TEST 8 LODGE MEMBERSHIP ===\n');

    // Find test 8 in unifiedusers collection
    const test8 = await db.collection('unifiedusers').findOne({ email: 'test8@example.com' });
    
    if (!test8) {
      console.log('❌ Test 8 not found in unifiedusers collection');
      return;
    }

    console.log('✅ Test 8 found in unifiedusers collection:');
    console.log('- ID:', test8._id);
    console.log('- Name:', test8.name);
    console.log('- Email:', test8.email);
    console.log('- Role:', test8.role);
    console.log('- Status:', test8.status);
    console.log('- Primary Lodge:', test8.primaryLodge);
    console.log('- Lodges array:', test8.lodges);
    console.log('- Lodge Memberships:', test8.lodgeMemberships);

    // Get the District Grand Lodge ID
    const districtLodge = await db.collection('lodges').findOne({ 
      name: 'District Grand Lodge of Syria-Lebanon' 
    });

    if (!districtLodge) {
      console.log('❌ District Grand Lodge not found');
      return;
    }

    console.log('\n=== DISTRICT LODGE INFO ===');
    console.log('- District Lodge ID:', districtLodge._id);
    console.log('- District Lodge Name:', districtLodge.name);

    // Check if test 8 is in the district lodge
    const districtLodgeId = districtLodge._id.toString();
    const isInLodgesArray = test8.lodges && test8.lodges.some(lodge => lodge.toString() === districtLodgeId);
    const isPrimaryLodge = test8.primaryLodge && test8.primaryLodge.toString() === districtLodgeId;
    const isInLodgeMemberships = test8.lodgeMemberships && test8.lodgeMemberships.some(membership => 
      membership.lodge.toString() === districtLodgeId
    );

    console.log('\n=== MEMBERSHIP CHECKS ===');
    console.log('- Is in lodges array?', isInLodgesArray);
    console.log('- Is primary lodge?', isPrimaryLodge);
    console.log('- Is in lodgeMemberships?', isInLodgeMemberships);

    // Test the lodge members API query
    console.log('\n=== TESTING LODGE MEMBERS API QUERY ===');
    
    const lodgeMembersQuery = {
      $or: [
        { lodges: { $elemMatch: { $eq: new mongoose.Types.ObjectId(districtLodgeId) } } },
        { primaryLodge: new mongoose.Types.ObjectId(districtLodgeId) },
        { lodgeMemberships: { $elemMatch: { lodge: new mongoose.Types.ObjectId(districtLodgeId) } } }
      ]
    };

    console.log('Query:', JSON.stringify(lodgeMembersQuery, null, 2));

    const membersFound = await db.collection('unifiedusers').find(lodgeMembersQuery).toArray();
    console.log('\nMembers found with this query:', membersFound.length);
    
    membersFound.forEach((member, index) => {
      console.log(`${index + 1}. ${member.name} (${member.email}) - Role: ${member.role}`);
    });

    // Check if test 8 is in the results
    const test8InResults = membersFound.find(m => m.email === 'test8@example.com');
    console.log('\nIs test 8 in the results?', !!test8InResults);

    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  } catch (error) {
    console.error('Error:', error);
  }
}

debugTest8Lodge(); 