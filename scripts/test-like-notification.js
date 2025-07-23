const { MongoClient, ObjectId } = require('mongodb');

async function testLikeNotification() {
  const uri = 'mongodb://localhost:27017/palmlebanon';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db('palmlebanon');
    
    // Get a post to test with
    const posts = await db.collection('posts').find({}).toArray();
    if (posts.length === 0) {
      console.log('No posts found to test with');
      return;
    }

    const testPost = posts[0];
    console.log('Testing with post:', {
      _id: testPost._id,
      authorId: testPost.authorId,
      authorName: testPost.authorName,
      content: testPost.content?.substring(0, 50) + '...'
    });

    // Get users to test with
    const users = await db.collection('users').find({}).toArray();
    if (users.length < 2) {
      console.log('Need at least 2 users to test with');
      return;
    }

    const postAuthor = users.find(u => u._id.toString() === testPost.authorId);
    const liker = users.find(u => u._id.toString() !== testPost.authorId);

    if (!postAuthor || !liker) {
      console.log('Could not find appropriate users for testing');
      return;
    }

    console.log('Post author:', postAuthor.name);
    console.log('Liker:', liker.name);

    // Simulate the like notification creation logic
    const notification = {
      userId: new ObjectId(testPost.authorId),
      type: 'like',
      postId: testPost._id.toString(),
      fromUserId: liker._id.toString(),
      fromUserName: liker.name,
      message: `${liker.name} liked your post`,
      createdAt: new Date(),
      read: false
    };

    console.log('Creating notification:', notification);

    const result = await db.collection('notifications').insertOne(notification);
    console.log('Notification created successfully:', result.insertedId);

    // Verify the notification was created
    const createdNotification = await db.collection('notifications').findOne({ _id: result.insertedId });
    console.log('Created notification:', createdNotification);

  } catch (error) {
    console.error('Error testing like notification:', error);
  } finally {
    await client.close();
    console.log('Disconnected from MongoDB');
  }
}

testLikeNotification(); 