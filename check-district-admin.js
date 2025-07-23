const { MongoClient } = require('mongodb');

async function checkDistrictAdmin() {
  const client = new MongoClient('mongodb://localhost:27017/palmlebanon');
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db('palmlebanon');
    
    // Check for district admin users in all collections
    console.log('\nChecking for district admin users:');
    
    // Check users collection
    const users = await db.collection('users').find({ role: 'DISTRICT_ADMIN' }).toArray();
    console.log(`\nUsers collection - Found ${users.length} district admins:`);
    users.forEach((user, i) => {
      console.log(`${i + 1}. ${user.name} (${user.email})`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Lodge: ${user.primaryLodge || user.lodge || 'No lodge'}`);
      console.log(`   Administered lodges: ${user.administeredLodges || []}`);
      console.log('   ---');
    });
    
    // Check members collection
    const members = await db.collection('members').find({ role: 'DISTRICT_ADMIN' }).toArray();
    console.log(`\nMembers collection - Found ${members.length} district admins:`);
    members.forEach((member, i) => {
      console.log(`${i + 1}. ${member.name || member.firstName} (${member.email})`);
      console.log(`   Role: ${member.role}`);
      console.log(`   Lodge: ${member.primaryLodge || member.lodge || 'No lodge'}`);
      console.log('   ---');
    });
    
    // Check members_backup collection
    const membersBackup = await db.collection('members_backup').find({ role: 'DISTRICT_ADMIN' }).toArray();
    console.log(`\nMembers_backup collection - Found ${membersBackup.length} district admins:`);
    membersBackup.forEach((member, i) => {
      console.log(`${i + 1}. ${member.name || member.firstName} (${member.email})`);
      console.log(`   Role: ${member.role}`);
      console.log(`   Lodge: ${member.primaryLodge || member.lodge || 'No lodge'}`);
      console.log('   ---');
    });
    
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await client.close();
    console.log('\nDisconnected from MongoDB');
  }
}

checkDistrictAdmin(); 