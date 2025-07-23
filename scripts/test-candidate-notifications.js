const { MongoClient, ObjectId } = require('mongodb');

async function testCandidateNotifications() {
  const uri = 'mongodb://localhost:27017/palmlebanon';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db('palmlebanon');
    
    // Check candidates collection
    const candidates = await db.collection('candidates').find({}).toArray();
    console.log(`Found ${candidates.length} candidates in database`);
    
    if (candidates.length > 0) {
      console.log('Sample candidate:', {
        _id: candidates[0]._id,
        firstName: candidates[0].firstName,
        lastName: candidates[0].lastName,
        lodge: candidates[0].lodge,
        lodgeId: candidates[0].lodgeId,
        submittedBy: candidates[0].submittedBy
      });
    }

    // Check notifications collection for candidate notifications
    const candidateNotifications = await db.collection('notifications')
      .find({ type: 'candidate' })
      .toArray();
    console.log(`Found ${candidateNotifications.length} candidate notifications in database`);
    
    if (candidateNotifications.length > 0) {
      console.log('Sample candidate notifications:');
      candidateNotifications.slice(0, 3).forEach((notification, index) => {
        console.log(`${index + 1}. ${notification.title}: ${notification.message}`);
        console.log(`   - User ID: ${notification.userId}`);
        console.log(`   - Candidate ID: ${notification.candidateId}`);
        console.log(`   - Lodge ID: ${notification.lodgeId}`);
        console.log(`   - Read: ${notification.read}`);
        console.log(`   - Created: ${notification.createdAt}`);
        console.log('');
      });
    }

    // Check members collection to see who should be notified
    const members = await db.collection('members').find({}).toArray();
    console.log(`Found ${members.length} members in database`);
    
    if (members.length > 0) {
      console.log('Sample members:');
      members.slice(0, 3).forEach((member, index) => {
        console.log(`${index + 1}. ${member.firstName} ${member.lastName} (${member.email})`);
        console.log(`   - Primary Lodge: ${member.primaryLodge}`);
        console.log(`   - Lodges: ${member.lodges ? member.lodges.join(', ') : 'None'}`);
        console.log('');
      });
    }

    // Test notification creation for a specific lodge
    if (candidates.length > 0 && members.length > 0) {
      const testCandidate = candidates[0];
      const testLodgeId = testCandidate.lodgeId;
      
      if (testLodgeId) {
        console.log(`Testing notification creation for lodge: ${testLodgeId}`);
        
        // Find members of this lodge
        const lodgeMembers = await db.collection('members').find({
          $or: [
            { primaryLodge: testLodgeId },
            { lodges: testLodgeId }
          ]
        }).toArray();
        
        console.log(`Found ${lodgeMembers.length} members in lodge ${testLodgeId}`);
        
        if (lodgeMembers.length > 0) {
          // Create a test notification
          const testNotification = {
            userId: lodgeMembers[0]._id,
            type: 'candidate',
            title: 'Test Candidate Notification',
            message: `Test candidate notification for ${testCandidate.firstName} ${testCandidate.lastName}`,
            candidateId: testCandidate._id,
            lodgeId: testLodgeId,
            createdAt: new Date(),
            read: false
          };
          
          const result = await db.collection('notifications').insertOne(testNotification);
          console.log(`Created test notification with ID: ${result.insertedId}`);
          
          // Clean up test notification
          await db.collection('notifications').deleteOne({ _id: result.insertedId });
          console.log('Cleaned up test notification');
        }
      }
    }

  } catch (error) {
    console.error('Error testing candidate notifications:', error);
  } finally {
    await client.close();
    console.log('Disconnected from MongoDB');
  }
}

testCandidateNotifications(); 