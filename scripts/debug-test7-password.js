const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
require('dotenv').config({ path: 'env.local' });

async function debugTest7Password() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const { db } = await mongoose.connection;

    // Check test7 in users collection
    const test7User = await db.collection('users').findOne({ email: 'test7@example.com' });
    console.log('\n=== Test7 User Collection ===');
    if (test7User) {
      console.log('Found in users collection:');
      console.log('- ID:', test7User._id);
      console.log('- Email:', test7User.email);
      console.log('- Role:', test7User.role);
      console.log('- Password fields:', Object.keys(test7User).filter(key => key.includes('password')));
      console.log('- Full user object:', JSON.stringify(test7User, null, 2));
    } else {
      console.log('Not found in users collection');
    }

    // Check test7 in members collection
    const test7Member = await db.collection('members').findOne({ email: 'test7@example.com' });
    console.log('\n=== Test7 Member Collection ===');
    if (test7Member) {
      console.log('Found in members collection:');
      console.log('- ID:', test7Member._id);
      console.log('- Email:', test7Member.email);
      console.log('- Role:', test7Member.role);
      console.log('- Password fields:', Object.keys(test7Member).filter(key => key.includes('password')));
      console.log('- Full member object:', JSON.stringify(test7Member, null, 2));
    } else {
      console.log('Not found in members collection');
    }

    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  } catch (error) {
    console.error('Error:', error);
  }
}

debugTest7Password(); 