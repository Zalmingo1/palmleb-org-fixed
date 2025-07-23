const { MongoClient, ObjectId } = require('mongodb');

async function checkAdminUsers() {
  const uri = 'mongodb://localhost:27017/palmlebanon';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db('palmlebanon');
    
    // Check users collection for admin users
    const adminUsers = await db.collection('users').find({}).toArray();
    
    console.log(`Found ${adminUsers.length} users in users collection:`);
    adminUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name} (${user.email}) - Role: ${user.role}`);
      console.log(`   Has passwordHash: ${!!user.passwordHash}`);
      console.log(`   Status: ${user.status || 'N/A'}`);
      console.log('   ---');
    });

    // Check members collection for admin members
    const adminMembers = await db.collection('members').find({}).toArray();
    
    console.log(`\nFound ${adminMembers.length} members in members collection:`);
    adminMembers.forEach((member, index) => {
      console.log(`${index + 1}. ${member.firstName} ${member.lastName} (${member.email}) - Role: ${member.role}`);
      console.log(`   Has password: ${!!member.password}`);
      console.log(`   Status: ${member.status || 'N/A'}`);
      console.log('   ---');
    });

  } catch (error) {
    console.error('Error checking admin users:', error);
  } finally {
    await client.close();
    console.log('Disconnected from MongoDB');
  }
}

checkAdminUsers(); 