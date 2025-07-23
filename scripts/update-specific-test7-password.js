const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
require('dotenv').config({ path: 'env.local' });

async function updateSpecificTest7Password() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const { db } = await mongoose.connection;
    const saltRounds = 10;

    // The specific user ID that the server is finding
    const specificUserId = '686da71bfa889021a961d400';
    const newPassword = 'Qwe123123';
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);

    console.log('Updating password for user ID:', specificUserId);

    // Update the password in users collection for the specific ID
    const userResult = await db.collection('users').updateOne(
      { _id: new mongoose.Types.ObjectId(specificUserId) },
      {
        $set: {
          passwordHash: passwordHash,
        }
      }
    );

    if (userResult.modifiedCount > 0) {
      console.log('✅ Password updated successfully for user ID:', specificUserId);
      console.log('Password: Qwe123123');
    } else {
      console.log('❌ Failed to update password for user ID:', specificUserId);
      console.log('User might not exist with this ID');
    }

    // Also update any test7@example.com records in members collection
    const memberResult = await db.collection('members').updateOne(
      { email: 'test7@example.com' },
      {
        $set: {
          password: passwordHash,
        }
      }
    );

    if (memberResult.modifiedCount > 0) {
      console.log('✅ Password updated successfully in members collection');
    } else {
      console.log('❌ Failed to update password in members collection');
    }

    // Verify the update
    const updatedUser = await db.collection('users').findOne({ _id: new mongoose.Types.ObjectId(specificUserId) });
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
    console.error('Error updating password:', error);
  }
}

updateSpecificTest7Password(); 