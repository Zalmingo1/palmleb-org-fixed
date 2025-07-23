const mongoose = require('mongoose');
require('dotenv').config({ path: 'env.local' });

async function debugTransferAdmin() {
  try {
    console.log('MongoDB URI:', process.env.MONGODB_URI ? 'Set' : 'Not set');
    
    if (!process.env.MONGODB_URI) {
      console.error('MONGODB_URI not found in environment variables');
      return;
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const { db } = await mongoose.connection;

    // Check for district admins in both collections
    console.log('\n=== Checking for DISTRICT_ADMIN users ===');
    
    const adminUsers = await db.collection('users').find({ role: 'DISTRICT_ADMIN' }).toArray();
    console.log('DISTRICT_ADMIN users found:', adminUsers.length);
    adminUsers.forEach(user => {
      console.log(`- User: ${user.email}, ID: ${user._id}, Role: ${user.role}`);
    });

    const adminMembers = await db.collection('members').find({ role: 'DISTRICT_ADMIN' }).toArray();
    console.log('DISTRICT_ADMIN members found:', adminMembers.length);
    adminMembers.forEach(member => {
      console.log(`- Member: ${member.email}, ID: ${member._id}, Role: ${member.role}`);
    });

    // Check for LODGE_MEMBER users in both collections
    console.log('\n=== Checking for LODGE_MEMBER users ===');
    
    const memberUsers = await db.collection('users').find({ role: 'LODGE_MEMBER' }).limit(5).toArray();
    console.log('LODGE_MEMBER users found (showing first 5):', memberUsers.length);
    memberUsers.forEach(user => {
      console.log(`- User: ${user.email}, ID: ${user._id}, Role: ${user.role}`);
    });

    const memberMembers = await db.collection('members').find({ role: 'LODGE_MEMBER' }).limit(5).toArray();
    console.log('LODGE_MEMBER members found (showing first 5):', memberMembers.length);
    memberMembers.forEach(member => {
      console.log(`- Member: ${member.email}, ID: ${member._id}, Role: ${member.role}`);
    });

    // Check district lodge membership
    console.log('\n=== Checking District Lodge Membership ===');
    const districtLodgeId = '681e751c2b05d4bc4be15dfc';
    
    const districtMembers = await db.collection('members').find({
      $or: [
        { primaryLodge: districtLodgeId },
        { primaryLodge: new mongoose.Types.ObjectId(districtLodgeId) },
        { lodges: districtLodgeId },
        { lodges: new mongoose.Types.ObjectId(districtLodgeId) },
        { 'lodgeMemberships.lodge': districtLodgeId },
        { 'lodgeMemberships.lodge': new mongoose.Types.ObjectId(districtLodgeId) }
      ]
    }).toArray();
    
    console.log('District lodge members found:', districtMembers.length);
    districtMembers.forEach(member => {
      console.log(`- Member: ${member.email}, Role: ${member.role}, Primary Lodge: ${member.primaryLodge}`);
    });

    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  } catch (error) {
    console.error('Error:', error);
  }
}

debugTransferAdmin(); 