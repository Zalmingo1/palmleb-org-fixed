const { MongoClient } = require('mongodb');

async function checkLodges() {
  const client = new MongoClient('mongodb://localhost:27017/palmlebanon');
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db('palmlebanon');
    
    // Check if lodges collection exists
    const collections = await db.listCollections().toArray();
    const hasLodges = collections.some(col => col.name === 'lodges');
    console.log(`Lodges collection exists: ${hasLodges}`);
    
    if (hasLodges) {
      const lodges = await db.collection('lodges').find({}).toArray();
      console.log(`\nFound ${lodges.length} lodges:`);
      
      lodges.forEach((lodge, i) => {
        console.log(`${i + 1}. ${lodge.name || 'No name'} (ID: ${lodge._id})`);
        console.log(`   District: ${lodge.district || 'No district'}`);
        console.log(`   Location: ${lodge.location || 'No location'}`);
        console.log(`   Members: ${lodge.members || 0}`);
        console.log('   ---');
      });
    } else {
      console.log('No lodges collection found');
    }
    
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await client.close();
    console.log('\nDisconnected from MongoDB');
  }
}

checkLodges(); 