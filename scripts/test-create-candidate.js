const { MongoClient, ObjectId } = require('mongodb');

async function testCreateCandidate() {
  const uri = 'mongodb://localhost:27017/palmlebanon';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db('palmlebanon');
    
    // First, let's find a lodge and some members to work with
    console.log('Finding lodges...');
    const lodges = await db.collection('lodges').find({}).toArray();
    console.log(`Found ${lodges.length} lodges in database`);
    
    if (lodges.length === 0) {
      console.log('No lodges found. Cannot test candidate creation.');
      return;
    }
    
    const testLodge = lodges[0];
    console.log(`Using lodge: ${testLodge.name} (ID: ${testLodge._id})`);
    
    // Find members of this lodge
    console.log('Finding lodge members...');
    const lodgeMembers = await db.collection('members').find({
      $or: [
        { primaryLodge: testLodge._id.toString() },
        { lodges: testLodge._id.toString() }
      ]
    }).toArray();
    
    console.log(`Found ${lodgeMembers.length} members in lodge ${testLodge.name}`);
    
    if (lodgeMembers.length === 0) {
      console.log('No members found in this lodge. Cannot test notifications.');
      return;
    }
    
    // Count notifications before creating candidate
    console.log('Counting notifications before...');
    const notificationsBefore = await db.collection('notifications').countDocuments();
    console.log(`Notifications before candidate creation: ${notificationsBefore}`);
    
    // Create a test candidate
    const testCandidate = {
      firstName: 'Test',
      lastName: 'Candidate',
      dateOfBirth: '1990-01-01',
      livingLocation: 'Test Location',
      profession: 'Test Profession',
      notes: 'Test candidate for notification testing',
      status: 'pending',
      submittedBy: 'Test User',
      submissionDate: new Date().toISOString(),
      idPhotoUrl: '/default-avatar.png',
      daysLeft: 20,
      lodge: testLodge.name,
      lodgeId: testLodge._id.toString(),
      timing: {
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      }
    };
    
    console.log('Creating test candidate:', testCandidate);
    
    const candidateResult = await db.collection('candidates').insertOne(testCandidate);
    console.log(`Created candidate with ID: ${candidateResult.insertedId}`);
    
    // Now create notifications for lodge members
    const notifications = lodgeMembers.map(member => ({
      userId: member._id,
      type: 'candidate',
      title: 'New Candidate Added',
      message: `A new candidate, ${testCandidate.firstName} ${testCandidate.lastName}, has been added to ${testCandidate.lodge}.`,
      candidateId: candidateResult.insertedId,
      lodgeId: testCandidate.lodgeId,
      createdAt: new Date(),
      read: false
    }));
    
    console.log(`Creating ${notifications.length} notifications for lodge members`);
    
    if (notifications.length > 0) {
      const notificationResult = await db.collection('notifications').insertMany(notifications);
      console.log(`Created ${notificationResult.insertedCount} notifications`);
    }
    
    // Count notifications after creating candidate
    const notificationsAfter = await db.collection('notifications').countDocuments();
    console.log(`Notifications after candidate creation: ${notificationsAfter}`);
    console.log(`New notifications created: ${notificationsAfter - notificationsBefore}`);
    
    // Show the new candidate notifications
    const newCandidateNotifications = await db.collection('notifications')
      .find({ 
        type: 'candidate',
        candidateId: candidateResult.insertedId 
      })
      .toArray();
    
    console.log('\nNew candidate notifications:');
    newCandidateNotifications.forEach((notification, index) => {
      console.log(`${index + 1}. ${notification.title}: ${notification.message}`);
      console.log(`   - User ID: ${notification.userId}`);
      console.log(`   - Read: ${notification.read}`);
      console.log('');
    });
    
    // Clean up test data
    console.log('Cleaning up test data...');
    await db.collection('candidates').deleteOne({ _id: candidateResult.insertedId });
    await db.collection('notifications').deleteMany({ candidateId: candidateResult.insertedId });
    console.log('Test data cleaned up');

  } catch (error) {
    console.error('Error testing candidate creation:', error);
    console.error('Error stack:', error.stack);
  } finally {
    await client.close();
    console.log('Disconnected from MongoDB');
  }
}

console.log('Starting test...');
testCreateCandidate().catch(error => {
  console.error('Unhandled error:', error);
  console.error('Error stack:', error.stack);
}); 