const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: 'env.local' });

async function resetTestPasswords() {
  try {
    const MONGODB_URI = 'mongodb://localhost:27017/palmlebanon';
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB palmlebanon database');

    const { db } = await mongoose.connection;
    const testEmails = [
      'test1@example.com',
      'test2@example.com',
      'test3@example.com',
      'test4@example.com',
      'test5@example.com'
    ];
    const newPassword = 'Qwe123123';
    const passwordHash = await bcrypt.hash(newPassword, 12);

    let updatedCount = 0;
    for (const email of testEmails) {
      const result = await db.collection('unifiedusers').updateOne(
        { email },
        { $set: { passwordHash } }
      );
      if (result.modifiedCount > 0) {
        console.log(`✅ Password reset for ${email}`);
        updatedCount++;
      } else {
        console.log(`❌ No user found for ${email}`);
      }
    }

    console.log(`\nTotal updated: ${updatedCount} / ${testEmails.length}`);
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Error resetting passwords:', error);
  }
}

resetTestPasswords(); 