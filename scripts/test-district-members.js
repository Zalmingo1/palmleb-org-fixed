const mongoose = require('mongoose');

async function testDistrictMembers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const { db } = await mongoose.connection;

    console.log('\n=== TESTING DISTRICT MEMBERS API ===\n');

    // Get the District Grand Lodge
    const districtLodge = await db.collection('lodges').findOne({ 
      name: 'District Grand Lodge of Syria-Lebanon' 
    });

    if (!districtLodge) {
      console.log('❌ District Grand Lodge not found');
      return;
    }

    console.log('District Lodge ID:', districtLodge._id.toString());

    // Test the district filter query
    const districtLodgeId = districtLodge._id.toString();
    const objectId = new mongoose.Types.ObjectId(districtLodgeId);
    
    const query = {
      $or: [
        { 'lodgeMemberships.lodge': { $in: [objectId] } },
        { primaryLodge: { $in: [objectId] } },
        { lodges: { $in: [objectId] } }
      ]
    };

    console.log('Query:', JSON.stringify(query, null, 2));

    const members = await db.collection('unifiedusers').find(query).toArray();

    console.log('\nMembers found:', members.length);
    members.forEach((member, index) => {
      console.log(`${index + 1}. ${member.name} (${member.email}) - Role: ${member.role} - Status: ${member.status}`);
      console.log(`   Primary Lodge: ${member.primaryLodge}`);
      console.log(`   Lodges: ${member.lodges?.map(l => l.toString()) || []}`);
      console.log(`   Lodge Memberships: ${member.lodgeMemberships?.map(m => m.lodge) || []}`);
    });

    // Check specific members
    const test8 = members.find(m => m.email === 'test8@example.com');
    const test5 = members.find(m => m.email === 'test5@example.com');
    const test6 = members.find(m => m.email === 'test6@example.com');
    const test7 = members.find(m => m.email === 'test7@example.com');

    console.log('\n=== SPECIFIC MEMBER CHECKS ===');
    console.log('Test 8 found:', !!test8);
    console.log('Test 5 found:', !!test5);
    console.log('Test 6 found:', !!test6);
    console.log('Test 7 found:', !!test7);

    if (test8) {
      console.log('\nTest 8 details:');
      console.log('- Name:', test8.name);
      console.log('- Role:', test8.role);
      console.log('- Status:', test8.status);
      console.log('- Primary Lodge:', test8.primaryLodge);
      console.log('- Lodges:', test8.lodges?.map(l => l.toString()) || []);
      console.log('- Lodge Memberships:', test8.lodgeMemberships || []);
    }

    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  } catch (error) {
    console.error('Error:', error);
  }
}

testDistrictMembers(); 