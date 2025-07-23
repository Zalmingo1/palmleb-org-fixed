const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
require('dotenv').config({ path: 'env.local' });

async function testPasswordVerification() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const { db } = await mongoose.connection;

    // Test password: Qwe123123
    const testPassword = 'Qwe123123';

    // Check users collection
    const test7User = await db.collection('users').findOne({ email: 'test7@example.com' });
    console.log('\n=== Testing User Collection ===');
    if (test7User) {
      console.log('User found with passwordHash:', test7User.passwordHash ? 'Yes' : 'No');
      if (test7User.passwordHash) {
        const isUserPasswordValid = await bcrypt.compare(testPassword, test7User.passwordHash);
        console.log('User password verification result:', isUserPasswordValid);
      }
    }

    // Check members collection
    const test7Member = await db.collection('members').findOne({ email: 'test7@example.com' });
    console.log('\n=== Testing Member Collection ===');
    if (test7Member) {
      console.log('Member found with password:', test7Member.password ? 'Yes' : 'No');
      if (test7Member.password) {
        const isMemberPasswordValid = await bcrypt.compare(testPassword, test7Member.password);
        console.log('Member password verification result:', isMemberPasswordValid);
      }
    }

    // Test creating a new hash to see if it matches
    console.log('\n=== Testing New Hash ===');
    const newHash = await bcrypt.hash(testPassword, 10);
    console.log('New hash for Qwe123123:', newHash);
    
    if (test7User && test7User.passwordHash) {
      const matchesUser = await bcrypt.compare(testPassword, test7User.passwordHash);
      console.log('New hash matches user hash:', matchesUser);
    }

    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  } catch (error) {
    console.error('Error:', error);
  }
}

testPasswordVerification(); 