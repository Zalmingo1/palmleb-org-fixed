const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function checkTest6Membership() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;
    
    console.log('Checking test6 membership...');
    
    // Find test6
    const test6 = await db.collection('members').findOne({ email: 'test6@example.com' });
    
    if (!test6) {
      console.log('test6 not found in members collection');
      return;
    }
    
    console.log('test6 found:', {
      _id: test6._id,
      name: `${test6.firstName} ${test6.lastName}`,
      email: test6.email,
      role: test6.role,
      primaryLodge: test6.primaryLodge,
      lodges: test6.lodges,
      lodgeMemberships: test6.lodgeMemberships
    });
    
    // Check if test6 is in the district lodge
    const districtLodgeId = '681e751c2b05d4bc4be15dfc';
    const isDistrictMember = test6.primaryLodge.toString() === districtLodgeId || 
                           (test6.lodges && test6.lodges.some(lodge => lodge.toString() === districtLodgeId)) ||
                           (test6.lodgeMemberships && test6.lodgeMemberships.some(membership => 
                             membership.lodge.toString() === districtLodgeId));
    
    console.log('Is test6 a district member?', isDistrictMember);
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkTest6Membership(); 