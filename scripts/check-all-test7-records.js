const mongoose = require('mongoose');
require('dotenv').config({ path: 'env.local' });

async function checkAllTest7Records() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const { db } = await mongoose.connection;

    // Find all test7 records in users collection
    console.log('\n=== All test7@example.com records in users collection ===');
    const allTest7Users = await db.collection('users').find({ email: 'test7@example.com' }).toArray();
    console.log('Found', allTest7Users.length, 'records in users collection:');
    
    allTest7Users.forEach((user, index) => {
      console.log(`\nUser ${index + 1}:`);
      console.log('- ID:', user._id);
      console.log('- Name:', user.name);
      console.log('- Email:', user.email);
      console.log('- Role:', user.role);
      console.log('- Status:', user.status);
      console.log('- Has passwordHash:', !!user.passwordHash);
      console.log('- Created:', user.createdAt);
    });

    // Find all test7 records in members collection
    console.log('\n=== All test7@example.com records in members collection ===');
    const allTest7Members = await db.collection('members').find({ email: 'test7@example.com' }).toArray();
    console.log('Found', allTest7Members.length, 'records in members collection:');
    
    allTest7Members.forEach((member, index) => {
      console.log(`\nMember ${index + 1}:`);
      console.log('- ID:', member._id);
      console.log('- Name:', member.name || `${member.firstName} ${member.lastName}`);
      console.log('- Email:', member.email);
      console.log('- Role:', member.role);
      console.log('- Has password:', !!member.password);
      console.log('- Created:', member.createdAt);
    });

    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  } catch (error) {
    console.error('Error:', error);
  }
}

checkAllTest7Records(); 