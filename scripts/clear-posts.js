const { MongoClient } = require('mongodb');

async function clearPosts() {
  const uri = 'mongodb://localhost:27017/palmlebanon';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db('palmlebanon');
    const result = await db.collection('posts').deleteMany({});
    console.log(`Deleted ${result.deletedCount} posts.`);
  } catch (error) {
    console.error('Error clearing posts:', error);
  } finally {
    await client.close();
    console.log('Disconnected from MongoDB');
  }
}

clearPosts(); 