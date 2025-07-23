const mongoose = require('mongoose');
require('dotenv').config({ path: 'env.local' });

async function downgradeTest6Role() {
  try {
    // Connect to the palmlebanon database
    const MONGODB_URI = 'mongodb://localhost:27017/palmlebanon';
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB palmlebanon database');

    const { db } = await mongoose.connection;

    console.log('Downgrading test6@example.com from DISTRICT_ADMIN to LODGE_MEMBER');

    // Update the role in users collection
    const userResult = await db.collection('users').updateOne(
      { email: 'test6@example.com' },
      {
        $set: {
          role: 'LODGE_MEMBER',
        }
      }
    );

    if (userResult.modifiedCount > 0) {
      console.log('✅ test6@example.com role downgraded successfully in users collection');
      console.log('New role: LODGE_MEMBER');
    } else {
      console.log('❌ Failed to downgrade test6@example.com role in users collection');
    }

    // Update the role in members collection
    const memberResult = await db.collection('members').updateOne(
      { email: 'test6@example.com' },
      {
        $set: {
          role: 'LODGE_MEMBER',
        }
      }
    );

    if (memberResult.modifiedCount > 0) {
      console.log('✅ test6@example.com role downgraded successfully in members collection');
      console.log('New role: LODGE_MEMBER');
    } else {
      console.log('❌ Failed to downgrade test6@example.com role in members collection');
    }

    // Verify the update
    const updatedUser = await db.collection('users').findOne({ email: 'test6@example.com' });
    if (updatedUser) {
      console.log('\nUpdated user details:');
      console.log('- ID:', updatedUser._id);
      console.log('- Email:', updatedUser.email);
      console.log('- Role:', updatedUser.role);
      console.log('- Has passwordHash:', !!updatedUser.passwordHash);
    }

    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  } catch (error) {
    console.error('Error downgrading role:', error);
  }
}

downgradeTest6Role(); 