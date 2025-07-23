const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');

async function updateTest4Password() {
  const uri = 'mongodb://localhost:27017/palmlebanon';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db('palmlebanon');
    
    // Find the user with email test4@example.com
    const user = await db.collection('users').findOne({ 
      email: 'test4@example.com' 
    });

    if (!user) {
      console.log('❌ User test4@example.com not found in users collection');
      
      // Check if user exists in members collection
      const member = await db.collection('members').findOne({ 
        email: 'test4@example.com' 
      });
      
      if (!member) {
        console.log('❌ User test4@example.com not found in members collection either');
        return;
      }
      
      console.log('Found user in members collection:', {
        userId: member._id,
        name: member.name || `${member.firstName} ${member.lastName}`,
        email: member.email
      });

      // Hash the new password
      const saltRounds = 10;
      const newPassword = 'Qwe123123';
      const passwordHash = await bcrypt.hash(newPassword, saltRounds);

      // Update the password in members collection
      const result = await db.collection('members').updateOne(
        { _id: member._id },
        { 
          $set: { 
            password: passwordHash,
            updatedAt: new Date()
          } 
        }
      );

      if (result.modifiedCount > 0) {
        console.log('✅ test4@example.com password updated successfully in members collection');
        console.log('New credentials:');
        console.log('Email: test4@example.com');
        console.log('Password: Qwe123123');
      } else {
        console.log('❌ Failed to update test4@example.com password');
      }
      
      return;
    }

    console.log('Found user in users collection:', {
      userId: user._id,
      name: user.name,
      email: user.email
    });

    // Hash the new password
    const saltRounds = 10;
    const newPassword = 'Qwe123123';
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update the password
    const result = await db.collection('users').updateOne(
      { _id: user._id },
      { 
        $set: { 
          passwordHash: passwordHash,
          updatedAt: new Date()
        } 
      }
    );

    if (result.modifiedCount > 0) {
      console.log('✅ test4@example.com password updated successfully in users collection');
      console.log('New credentials:');
      console.log('Email: test4@example.com');
      console.log('Password: Qwe123123');
    } else {
      console.log('❌ Failed to update test4@example.com password');
    }

  } catch (error) {
    console.error('Error updating test4@example.com password:', error);
  } finally {
    await client.close();
    console.log('Disconnected from MongoDB');
  }
}

// Run the function
updateTest4Password().catch(console.error); 