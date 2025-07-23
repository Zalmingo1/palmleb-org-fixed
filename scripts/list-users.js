const { MongoClient, ObjectId } = require('mongodb');

async function listUsers() {
  const uri = 'mongodb://localhost:27017/palmlebanon';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db('palmlebanon');
    
    // Get all users
    const users = await db.collection('users').find({}).toArray();
    console.log(`Found ${users.length} users in database`);
    
    users.forEach((user, index) => {
      console.log(`${index + 1}. Name: ${user.name || 'N/A'}`);
      console.log(`   Email: ${user.email || 'N/A'}`);
      console.log(`   ID: ${user._id}`);
      console.log(`   Role: ${user.role || 'N/A'}`);
      console.log('   ---');
    });

  } catch (error) {
    console.error('Error listing users:', error);
  } finally {
    await client.close();
    console.log('Disconnected from MongoDB');
  }
}

listUsers(); 