const { MongoClient } = require('mongodb');

async function dropDatabase() {
  const uri = 'mongodb://localhost:27017/palmleb';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db('palmleb');
    await db.dropDatabase();
    console.log('Successfully dropped palmleb database');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
    console.log('Disconnected from MongoDB');
  }
}

dropDatabase().catch(console.error); 