const mongoose = require('mongoose');
require('dotenv').config({ path: 'env.local' });

async function fixTest7Role() {
  try {
    // Connect to the palmlebanon database
    const MONGODB_URI = 'mongodb://localhost:27017/palmlebanon';
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB palmlebanon database');

    const { db } = await mongoose.connection;

    console.log('Updating role for test7@example.com to DISTRICT_ADMIN');

    // Update the role in users collection
    const userResult = await db.collection('users').updateOne(
      { email: 'test7@example.com' },
      {
        $set: {
          role: 'DISTRICT_ADMIN',
        }
      }
    );

    if (userResult.modifiedCount > 0) {
      console.log('✅ test7@example.com role updated successfully in users collection');
    } else {
      console.log('❌ Failed to update test7@example.com role in users collection');
    }

    // Update the role in members collection
    const memberResult = await db.collection('members').updateOne(
      { email: 'test7@example.com' },
      {
        $set: {
          role: 'DISTRICT_ADMIN',
        }
      }
    );

    if (memberResult.modifiedCount > 0) {
      console.log('✅ test7@example.com role updated successfully in members collection');
    } else {
      console.log('❌ Failed to update test7@example.com role in members collection');
    }

    // Verify the update
    const updatedUser = await db.collection('users').findOne({ email: 'test7@example.com' });
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
    console.error('Error updating role:', error);
  }
}

fixTest7Role(); 