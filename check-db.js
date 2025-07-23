const { MongoClient } = require('mongodb');

async function checkDB() {
  const client = new MongoClient('mongodb://localhost:27017/palmlebanon');
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db('palmlebanon');
    const collections = await db.listCollections().toArray();
    
    console.log('\nCollections found:');
    for (const col of collections) {
      const count = await db.collection(col.name).countDocuments();
      console.log(`- ${col.name}: ${count} documents`);
      
      // If it's users or members collection, show some sample data
      if (col.name === 'users' || col.name === 'members') {
        const sample = await db.collection(col.name).find({}).limit(3).toArray();
        console.log(`  Sample data from ${col.name}:`);
        sample.forEach((doc, i) => {
          console.log(`    ${i + 1}. ${doc.name || doc.firstName || 'No name'} (${doc.email || 'No email'}) - Role: ${doc.role || 'No role'}`);
        });
      }
    }
    
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await client.close();
    console.log('\nDisconnected from MongoDB');
  }
}

checkDB(); 