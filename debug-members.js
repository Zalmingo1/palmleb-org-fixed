const { MongoClient } = require('mongodb');

async function debugMembers() {
  const client = new MongoClient('mongodb://localhost:27017/palmlebanon');
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db('palmlebanon');
    
    // Get district lodge IDs
    const districtLodge = await db.collection('lodges').findOne({ name: 'District Grand Lodge of Syria-Lebanon' });
    console.log('District Lodge:', districtLodge);
    
    if (districtLodge) {
      const districtLodges = await db.collection('lodges').find({ district: districtLodge.district }).toArray();
      const districtLodgeIds = districtLodges.map(lodge => lodge._id.toString());
      console.log('District Lodge IDs:', districtLodgeIds);
      
      // Check members collection
      console.log('\n=== Members Collection ===');
      const members = await db.collection('members').find({}).toArray();
      console.log(`Total members: ${members.length}`);
      
      const districtMembers = members.filter(member => {
        const hasPrimaryLodge = member.primaryLodge && districtLodgeIds.includes(member.primaryLodge.toString());
        const hasLodgeMembership = member.lodgeMemberships && member.lodgeMemberships.some(m => 
          districtLodgeIds.includes(m.lodge.toString())
        );
        return hasPrimaryLodge || hasLodgeMembership;
      });
      
      console.log(`District members: ${districtMembers.length}`);
      districtMembers.forEach((member, i) => {
        console.log(`${i + 1}. ${member.firstName} ${member.lastName} (${member.email})`);
        console.log(`   Primary Lodge: ${member.primaryLodge}`);
        console.log(`   Lodge Memberships: ${member.lodgeMemberships?.map(m => m.lodge) || []}`);
      });
      
      // Check users collection
      console.log('\n=== Users Collection ===');
      const users = await db.collection('users').find({}).toArray();
      console.log(`Total users: ${users.length}`);
      
      const districtUsers = users.filter(user => {
        const hasLodgeId = user.lodgeId && districtLodgeIds.includes(user.lodgeId.toString());
        const hasPrimaryLodge = user.primaryLodge && districtLodgeIds.includes(user.primaryLodge.toString());
        const hasLodges = user.lodges && user.lodges.some(lodgeId => 
          districtLodgeIds.includes(lodgeId)
        );
        return hasLodgeId || hasPrimaryLodge || hasLodges;
      });
      
      console.log(`District users: ${districtUsers.length}`);
      districtUsers.forEach((user, i) => {
        console.log(`${i + 1}. ${user.name} (${user.email})`);
        console.log(`   Lodge ID: ${user.lodgeId}`);
        console.log(`   Primary Lodge: ${user.primaryLodge}`);
        console.log(`   Lodges: ${user.lodges || []}`);
      });
      
      // Check members_backup collection
      console.log('\n=== Members_Backup Collection ===');
      const membersBackup = await db.collection('members_backup').find({}).toArray();
      console.log(`Total members_backup: ${membersBackup.length}`);
      
      const districtMembersBackup = membersBackup.filter(member => {
        const hasPrimaryLodge = member.primaryLodge && districtLodgeIds.includes(member.primaryLodge.toString());
        const hasLodgeMembership = member.lodgeMemberships && member.lodgeMemberships.some(m => 
          districtLodgeIds.includes(m.lodge.toString())
        );
        return hasPrimaryLodge || hasLodgeMembership;
      });
      
      console.log(`District members_backup: ${districtMembersBackup.length}`);
      districtMembersBackup.forEach((member, i) => {
        console.log(`${i + 1}. ${member.name || member.firstName} (${member.email})`);
        console.log(`   Primary Lodge: ${member.primaryLodge}`);
        console.log(`   Lodge Memberships: ${member.lodgeMemberships?.map(m => m.lodge) || []}`);
      });
    }
    
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await client.close();
    console.log('\nDisconnected from MongoDB');
  }
}

debugMembers(); 