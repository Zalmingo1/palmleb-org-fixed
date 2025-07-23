const { MongoClient, ObjectId } = require('mongodb');

async function testNotificationRead() {
  const uri = 'mongodb://localhost:27017/palmlebanon';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db('palmlebanon');
    
    // Get a notification to test with
    const notifications = await db.collection('notifications').find({}).limit(1).toArray();
    
    if (notifications.length === 0) {
      console.log('No notifications found to test with');
      return;
    }

    const testNotification = notifications[0];
    console.log('Testing with notification:', {
      _id: testNotification._id,
      message: testNotification.message,
      read: testNotification.read,
      userId: testNotification.userId
    });

    // Test the API endpoint
    const response = await fetch(`http://localhost:3002/api/notifications/${testNotification._id}/read`, {
      method: 'PUT',
      headers: {
        'Authorization': 'Bearer test-token',
        'Content-Type': 'application/json'
      }
    });

    console.log('Response status:', response.status);
    console.log('Response ok:', response.ok);
    
    if (response.ok) {
      const data = await response.json();
      console.log('Response data:', data);
    } else {
      const errorText = await response.text();
      console.log('Error response:', errorText);
    }

  } catch (error) {
    console.error('Error testing notification read:', error);
  } finally {
    await client.close();
    console.log('Disconnected from MongoDB');
  }
}

testNotificationRead(); 