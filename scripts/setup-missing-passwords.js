const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: 'env.local' });

async function setupMissingPasswords() {
  try {
    const MONGODB_URI = 'mongodb://localhost:27017/palmlebanon';
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB palmlebanon database');

    const { db } = await mongoose.connection;

    console.log('\n=== SETTING UP MISSING PASSWORDS ===\n');

    // Get all unified users
    const unifiedUsers = await db.collection('unifiedusers').find({}).toArray();
    
    console.log(`📊 Total unified users: ${unifiedUsers.length}`);
    
    // Find users without passwordHash
    const usersWithoutPassword = unifiedUsers.filter(user => !user.passwordHash);
    console.log(`🔐 Users without passwordHash: ${usersWithoutPassword.length}`);
    
    if (usersWithoutPassword.length === 0) {
      console.log('✅ All users already have passwordHash');
      return;
    }

    console.log('\n📋 Users needing password setup:');
    usersWithoutPassword.forEach(user => {
      console.log(`- ${user.email} (${user.role})`);
    });

    // Set default passwords for users without passwordHash
    const defaultPassword = 'password123';
    const hashedPassword = await bcrypt.hash(defaultPassword, 12);
    
    console.log('\n🔧 Setting up passwords...');
    
    for (const user of usersWithoutPassword) {
      const result = await db.collection('unifiedusers').updateOne(
        { _id: user._id },
        { $set: { passwordHash: hashedPassword } }
      );
      
      if (result.modifiedCount > 0) {
        console.log(`✅ Set password for: ${user.email}`);
      } else {
        console.log(`❌ Failed to set password for: ${user.email}`);
      }
    }

    // Verify the update
    const updatedUsers = await db.collection('unifiedusers').find({}).toArray();
    const usersWithPassword = updatedUsers.filter(user => user.passwordHash);
    
    console.log(`\n✅ Verification:`);
    console.log(`- Users with passwordHash: ${usersWithPassword.length}/${updatedUsers.length}`);
    
    if (usersWithPassword.length === updatedUsers.length) {
      console.log('✅ All users now have passwordHash!');
      console.log(`\n🔑 Default password for all users: ${defaultPassword}`);
    } else {
      console.log('❌ Some users still missing passwordHash');
    }

    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  } catch (error) {
    console.error('Error setting up passwords:', error);
  }
}

setupMissingPasswords(); 