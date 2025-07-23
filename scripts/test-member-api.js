const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function testMemberAPI() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;
    
    console.log('Testing member API for district lodge...');
    
    const districtLodgeId = '681e751c2b05d4bc4be15dfc';
    
    // Test the same queries as the API
    const users = await db.collection('users').find({ 
      $or: [
        { lodges: { $elemMatch: { $eq: districtLodgeId } } },
        { lodges: { $elemMatch: { $eq: new mongoose.Types.ObjectId(districtLodgeId) } } },
        { primaryLodge: districtLodgeId },
        { primaryLodge: new mongoose.Types.ObjectId(districtLodgeId) }
      ]
    }).toArray();
    
    const members = await db.collection('members').find({ 
      $or: [
        { lodgeMemberships: { $elemMatch: { lodge: districtLodgeId } } },
        { lodgeMemberships: { $elemMatch: { lodge: new mongoose.Types.ObjectId(districtLodgeId) } } },
        { primaryLodge: districtLodgeId },
        { primaryLodge: new mongoose.Types.ObjectId(districtLodgeId) }
      ]
    }).toArray();
    
    console.log('Users found:', users.length);
    users.forEach(user => {
      console.log(`- ${user.name} (${user.email}) - Role: ${user.role}`);
    });
    
    console.log('Members found:', members.length);
    members.forEach(member => {
      console.log(`- ${member.firstName} ${member.lastName} (${member.email}) - Role: ${member.role}`);
    });
    
    // Check test6 specifically
    const test6 = await db.collection('members').findOne({ email: 'test6@example.com' });
    if (test6) {
      console.log('\nTest6 details:', {
        _id: test6._id,
        name: `${test6.firstName} ${test6.lastName}`,
        email: test6.email,
        role: test6.role,
        primaryLodge: test6.primaryLodge,
        lodges: test6.lodges,
        lodgeMemberships: test6.lodgeMemberships
      });
    }
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

testMemberAPI(); 