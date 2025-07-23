const { MongoClient, ObjectId } = require('mongodb');

async function debugNotifications() {
  const uri = 'mongodb://localhost:27017/palmlebanon';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db('palmlebanon');
    
    // Get a specific user's notifications (Test 4's user ID)
    const test4UserId = '680de6b2cd5dcb66160da13a';
    console.log('Looking for notifications for user:', test4UserId);
    
    const notifications = await db.collection('notifications')
      .find({ userId: new ObjectId(test4UserId) })
      .sort({ createdAt: -1 })
      .toArray();

    console.log(`Found ${notifications.length} notifications for Test 4`);
    
    if (notifications.length > 0) {
      console.log('Recent notifications for Test 4:');
      notifications.slice(0, 5).forEach((notification, index) => {
        console.log(`${index + 1}. Type: ${notification.type}`);
        console.log(`   Message: ${notification.message}`);
        console.log(`   From: ${notification.fromUserName} (${notification.fromUserId})`);
        console.log(`   Read: ${notification.read}`);
        console.log(`   Created: ${notification.createdAt}`);
        console.log(`   PostId: ${notification.postId}`);
        console.log('   ---');
      });
    }

    // Check all notifications to see the structure
    const allNotifications = await db.collection('notifications').find({}).toArray();
    console.log(`\nTotal notifications in database: ${allNotifications.length}`);
    
    // Check for any notifications with different userId formats
    const userIds = [...new Set(allNotifications.map(n => n.userId?.toString()))];
    console.log('Unique userIds in notifications:', userIds);

  } catch (error) {
    console.error('Error debugging notifications:', error);
  } finally {
    await client.close();
    console.log('Disconnected from MongoDB');
  }
}

debugNotifications(); 