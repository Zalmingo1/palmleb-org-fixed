const { MongoClient, ObjectId } = require('mongodb');

async function checkMemberStructure() {
  const uri = 'mongodb://localhost:27017/palmlebanon';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db('palmlebanon');
    
    // Get Test 3's member record
    const test3Id = '680d4fcb919908c9de336c6b';
    const member = await db.collection('members').findOne({ _id: new ObjectId(test3Id) });
    
    console.log('Test 3 member record:');
    console.log(JSON.stringify(member, null, 2));
    
    // Check what fields are available
    if (member) {
      console.log('\nAvailable fields:');
      Object.keys(member).forEach(key => {
        console.log(`- ${key}: ${member[key]}`);
      });
    }

  } catch (error) {
    console.error('Error checking member structure:', error);
  } finally {
    await client.close();
    console.log('Disconnected from MongoDB');
  }
}

checkMemberStructure(); 