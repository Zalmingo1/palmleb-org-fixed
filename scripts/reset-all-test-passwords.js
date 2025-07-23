const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: 'env.local' });

async function resetAllTestPasswords() {
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
      'test5@example.com',
      'test6@example.com',
      'test7@example.com'
    ];
    
    const newPassword = 'Qwe123123';
    const passwordHash = await bcrypt.hash(newPassword, 12);

    console.log(`Resetting passwords for all test users to: ${newPassword}`);
    console.log(`New hash: ${passwordHash.substring(0, 20)}...\n`);

    let updatedCount = 0;
    let notFoundCount = 0;

    for (const email of testEmails) {
      const result = await db.collection('unifiedusers').updateOne(
        { email: email },
        { $set: { passwordHash: passwordHash } }
      );

      if (result.matchedCount > 0) {
        if (result.modifiedCount > 0) {
          console.log(`✅ ${email}: Password updated`);
          updatedCount++;
        } else {
          console.log(`⚠️  ${email}: Password already set to this value`);
        }
      } else {
        console.log(`❌ ${email}: User not found in unifiedusers collection`);
        notFoundCount++;
      }
    }

    console.log(`\nSummary:`);
    console.log(`- Updated: ${updatedCount} users`);
    console.log(`- Not found: ${notFoundCount} users`);
    console.log(`- Total processed: ${testEmails.length} emails`);

    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  } catch (error) {
    console.error('Error resetting passwords:', error);
  }
}

resetAllTestPasswords(); 