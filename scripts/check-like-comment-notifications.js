const { MongoClient, ObjectId } = require('mongodb');

async function checkLikeCommentNotifications() {
  const uri = 'mongodb://localhost:27017/palmlebanon';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db('palmlebanon');
    
    // Check for like notifications
    const likeNotifications = await db.collection('notifications')
      .find({ type: 'like' })
      .toArray();
    
    console.log(`Found ${likeNotifications.length} like notifications`);
    
    if (likeNotifications.length > 0) {
      console.log('Like notifications:');
      likeNotifications.forEach((notification, index) => {
        console.log(`${index + 1}. ${notification.message} - User: ${notification.userId} - Read: ${notification.read}`);
      });
    }

    // Check for comment notifications
    const commentNotifications = await db.collection('notifications')
      .find({ type: 'comment' })
      .toArray();
    
    console.log(`\nFound ${commentNotifications.length} comment notifications`);
    
    if (commentNotifications.length > 0) {
      console.log('Comment notifications:');
      commentNotifications.forEach((notification, index) => {
        console.log(`${index + 1}. ${notification.message} - User: ${notification.userId} - Read: ${notification.read}`);
      });
    }

    // Check all notification types
    const allNotifications = await db.collection('notifications').find({}).toArray();
    const typeCounts = {};
    allNotifications.forEach(n => {
      typeCounts[n.type] = (typeCounts[n.type] || 0) + 1;
    });
    
    console.log('\nNotification types summary:');
    Object.entries(typeCounts).forEach(([type, count]) => {
      console.log(`${type}: ${count}`);
    });

  } catch (error) {
    console.error('Error checking notifications:', error);
  } finally {
    await client.close();
    console.log('Disconnected from MongoDB');
  }
}

checkLikeCommentNotifications(); 