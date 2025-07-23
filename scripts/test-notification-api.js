const { MongoClient, ObjectId } = require('mongodb');

async function testNotificationAPI() {
  const uri = 'mongodb://localhost:27017/palmlebanon';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db('palmlebanon');
    
    // Get Test 4's notifications
    const test4Id = '680de6b2cd5dcb66160da13a';
    const notifications = await db.collection('notifications')
      .find({ userId: new ObjectId(test4Id) })
      .limit(1)
      .toArray();
    
    if (notifications.length === 0) {
      console.log('No notifications found for Test 4');
      return;
    }

    const testNotification = notifications[0];
    console.log('Testing with notification:', {
      _id: testNotification._id.toString(),
      message: testNotification.message,
      read: testNotification.read,
      type: testNotification.type
    });

    console.log('API endpoint to test:', `/api/notifications/${testNotification._id}/read`);

  } catch (error) {
    console.error('Error testing notification API:', error);
  } finally {
    await client.close();
    console.log('Disconnected from MongoDB');
  }
}

testNotificationAPI(); 