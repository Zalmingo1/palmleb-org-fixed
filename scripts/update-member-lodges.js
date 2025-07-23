const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function updateMemberLodges() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    
    // Get all members
    const members = await db.collection('members').find({}).toArray();
    console.log(`Found ${members.length} members to update`);

    let updatedCount = 0;
    
    for (const member of members) {
      const lodges = [];
      
      // Add primary lodge if it exists
      if (member.primaryLodge) {
        lodges.push(member.primaryLodge);
      }
      
      // Add lodges from lodgeMemberships
      if (member.lodgeMemberships && Array.isArray(member.lodgeMemberships)) {
        member.lodgeMemberships.forEach(membership => {
          if (membership.lodge && !lodges.includes(membership.lodge)) {
            lodges.push(membership.lodge);
          }
        });
      }
      
      // Update the member with the lodges field
      if (lodges.length > 0) {
        await db.collection('members').updateOne(
          { _id: member._id },
          { $set: { lodges: lodges } }
        );
        updatedCount++;
        console.log(`Updated member ${member.firstName} ${member.lastName} with lodges:`, lodges);
      }
    }
    
    console.log(`Updated ${updatedCount} members with lodges field`);
    
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Error:', error);
  }
}

updateMemberLodges(); 