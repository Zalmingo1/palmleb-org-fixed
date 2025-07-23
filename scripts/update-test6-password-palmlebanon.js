const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
require('dotenv').config({ path: 'env.local' });

async function updateTest6PasswordPalmlebanon() {
  try {
    // Connect to the palmlebanon database
    const MONGODB_URI = 'mongodb://localhost:27017/palmlebanon';
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB palmlebanon database');

    const { db } = await mongoose.connection;
    const saltRounds = 10;

    // Hash the new password
    const newPassword = 'Qwe123123';
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);

    console.log('Updating password for test6@example.com in palmlebanon database');

    // Update the password in users collection
    const userResult = await db.collection('users').updateOne(
      { email: 'test6@example.com' },
      {
        $set: {
          passwordHash: passwordHash,
        }
      }
    );

    if (userResult.modifiedCount > 0) {
      console.log('✅ test6@example.com password updated successfully in users collection');
      console.log('Password: Qwe123123');
    } else {
      console.log('❌ Failed to update test6@example.com password in users collection');
    }

    // Update the password in members collection
    const memberResult = await db.collection('members').updateOne(
      { email: 'test6@example.com' },
      {
        $set: {
          password: passwordHash,
        }
      }
    );

    if (memberResult.modifiedCount > 0) {
      console.log('✅ test6@example.com password updated successfully in members collection');
      console.log('Password: Qwe123123');
    } else {
      console.log('❌ Failed to update test6@example.com password in members collection');
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
    console.error('Error updating password:', error);
  }
}

updateTest6PasswordPalmlebanon(); 