const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
require('dotenv').config({ path: 'env.local' });

async function resetTest7Password() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const { db } = await mongoose.connection;
    const saltRounds = 10;

    // Hash the new password
    const bcrypt = require('bcrypt');
    const newPassword = 'Qwe123123';
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update the password in members collection
    const memberResult = await db.collection('members').updateOne(
      { email: 'test7@example.com' },
      {
        $set: {
          password: passwordHash,
        }
      }
    );

    if (memberResult.modifiedCount > 0) {
      console.log('✅ test7@example.com password updated successfully in members collection');
      console.log('Password: Qwe123123');
    } else {
      console.log('❌ Failed to update test7@example.com password in members collection');
    }

    // Update the password in users collection
    const userResult = await db.collection('users').updateOne(
      { email: 'test7@example.com' },
      {
        $set: {
          passwordHash: passwordHash,
        }
      }
    );

    if (userResult.modifiedCount > 0) {
      console.log('✅ test7@example.com password updated successfully in users collection');
      console.log('Password: Qwe123123');
    } else {
      console.log('❌ Failed to update test7@example.com password in users collection');
    }

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Error updating test7@example.com password:', error);
  }
}

resetTest7Password().catch(console.error); 