const { MongoClient, ObjectId } = require('mongodb');

async function listMembers() {
  const uri = 'mongodb://localhost:27017/palmlebanon';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db('palmlebanon');
    
    // Get all members
    const members = await db.collection('members').find({}).toArray();
    console.log(`Found ${members.length} members in database`);
    
    members.forEach((member, index) => {
      console.log(`${index + 1}. Name: ${member.name || 'N/A'}`);
      console.log(`   Email: ${member.email || 'N/A'}`);
      console.log(`   ID: ${member._id}`);
      console.log(`   Status: ${member.status || 'N/A'}`);
      console.log('   ---');
    });

  } catch (error) {
    console.error('Error listing members:', error);
  } finally {
    await client.close();
    console.log('Disconnected from MongoDB');
  }
}

listMembers(); 