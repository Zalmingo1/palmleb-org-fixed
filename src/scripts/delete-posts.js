const { MongoClient } = require('mongodb');

async function deletePostsCollection() {
  const uri = 'mongodb://localhost:27017/palmlebanon';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db('palmlebanon');
    await db.collection('posts').drop();
    console.log('Posts collection deleted successfully');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
    console.log('Disconnected from MongoDB');
  }
}

deletePostsCollection(); 