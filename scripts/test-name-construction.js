const { MongoClient, ObjectId } = require('mongodb');

async function testNameConstruction() {
  const uri = 'mongodb://localhost:27017/palmlebanon';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db('palmlebanon');
    
    // Get Test 3's member record
    const test3Id = '680d4fcb919908c9de336c6b';
    const member = await db.collection('members').findOne({ _id: new ObjectId(test3Id) });
    
    console.log('Test 3 member record:', member);
    
    if (member) {
      // Test the name construction logic
      const fullName = member.name || `${member.firstName || ''} ${member.lastName || ''}`.trim();
      console.log('Constructed full name:', fullName);
      console.log('firstName:', member.firstName);
      console.log('lastName:', member.lastName);
      console.log('name field:', member.name);
    }

    // Test with Test 4 as well
    const test4Id = '680de6b2cd5dcb66160da13a';
    const member4 = await db.collection('members').findOne({ _id: new ObjectId(test4Id) });
    
    console.log('\nTest 4 member record:', member4);
    
    if (member4) {
      const fullName4 = member4.name || `${member4.firstName || ''} ${member4.lastName || ''}`.trim();
      console.log('Constructed full name for Test 4:', fullName4);
    }

  } catch (error) {
    console.error('Error testing name construction:', error);
  } finally {
    await client.close();
    console.log('Disconnected from MongoDB');
  }
}

testNameConstruction(); 