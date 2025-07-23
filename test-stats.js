const { MongoClient } = require('mongodb');

async function testStatsAPI() {
  const client = new MongoClient('mongodb://localhost:27017/palmlebanon');
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db('palmlebanon');
    
    // Test the same logic as the stats API
    console.log('\nTesting stats API logic:');
    
    // Check all possible member collections
    const [totalUsers, totalMembers, totalMembersBackup] = await Promise.all([
      db.collection('users').countDocuments().catch(() => 0),
      db.collection('members').countDocuments().catch(() => 0),
      db.collection('members_backup').countDocuments().catch(() => 0)
    ]);
    
    console.log(`- users collection: ${totalUsers} documents`);
    console.log(`- members collection: ${totalMembers} documents`);
    console.log(`- members_backup collection: ${totalMembersBackup} documents`);
    console.log(`- Total members: ${totalUsers + totalMembers + totalMembersBackup}`);
    
    // Check what's actually in members_backup
    console.log('\nSample data from members_backup:');
    const sampleMembers = await db.collection('members_backup').find({}).limit(3).toArray();
    sampleMembers.forEach((member, i) => {
      console.log(`${i + 1}. ${member.name || member.firstName || 'No name'} (${member.email || 'No email'}) - Role: ${member.role || 'No role'}`);
    });
    
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await client.close();
    console.log('\nDisconnected from MongoDB');
  }
}

testStatsAPI(); 