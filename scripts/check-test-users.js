const mongoose = require('mongoose');
require('dotenv').config({ path: 'env.local' });

async function checkTestUsers() {
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

    console.log('Checking test users in unifiedusers collection...\n');

    for (const email of testEmails) {
      const user = await db.collection('unifiedusers').findOne({ email: email });
      
      if (user) {
        console.log(`✅ ${email}:`);
        console.log(`   - ID: ${user._id}`);
        console.log(`   - Name: ${user.name || 'Unknown'}`);
        console.log(`   - Role: ${user.role || 'Unknown'}`);
        console.log(`   - Has passwordHash: ${!!user.passwordHash}`);
        console.log(`   - PasswordHash type: ${typeof user.passwordHash}`);
        if (user.passwordHash) {
          console.log(`   - PasswordHash preview: ${user.passwordHash.substring(0, 20)}...`);
        }
        console.log('');
      } else {
        console.log(`❌ ${email}: NOT FOUND in unifiedusers collection\n`);
      }
    }

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Error checking test users:', error);
  }
}

checkTestUsers(); 