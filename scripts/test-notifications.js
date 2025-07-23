const { MongoClient, ObjectId } = require('mongodb');

async function testNotifications() {
  const uri = 'mongodb://localhost:27017/palmlebanon';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db('palmlebanon');
    
    // Check posts collection
    const posts = await db.collection('posts').find({}).toArray();
    console.log(`Found ${posts.length} posts in database`);
    
    if (posts.length > 0) {
      console.log('Sample post:', {
        _id: posts[0]._id,
        authorId: posts[0].authorId,
        authorName: posts[0].authorName,
        content: posts[0].content?.substring(0, 50) + '...'
      });
    }

    // Check notifications collection
    const notifications = await db.collection('notifications').find({}).toArray();
    console.log(`Found ${notifications.length} notifications in database`);
    
    if (notifications.length > 0) {
      console.log('Sample notifications:');
      notifications.slice(0, 3).forEach((notification, index) => {
        console.log(`${index + 1}. ${notification.message} (${notification.type}) - Read: ${notification.read}`);
      });
    }

    // Check users collection
    const users = await db.collection('users').find({}).toArray();
    console.log(`Found ${users.length} users in database`);
    
    if (users.length > 0) {
      console.log('Sample users:');
      users.slice(0, 3).forEach((user, index) => {
        console.log(`${index + 1}. ${user.name} (${user.email}) - ID: ${user._id}`);
      });
    }

  } catch (error) {
    console.error('Error testing notifications:', error);
  } finally {
    await client.close();
    console.log('Disconnected from MongoDB');
  }
}

testNotifications(); 