const mongoose = require('mongoose');
require('dotenv').config({ path: 'env.local' });

async function checkAdminStatus() {
  try {
    console.log('MongoDB URI:', process.env.MONGODB_URI ? 'Set' : 'Not set');
    
    if (!process.env.MONGODB_URI) {
      console.error('MONGODB_URI not found in environment variables');
      return;
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const { db } = await mongoose.connection;

    // Check for test5 and test6 in both collections
    console.log('\n=== Checking test5 and test6 status ===');
    
    const test5User = await db.collection('users').findOne({ email: 'test5@example.com' });
    const test5Member = await db.collection('members').findOne({ email: 'test5@example.com' });
    
    const test6User = await db.collection('users').findOne({ email: 'test6@example.com' });
    const test6Member = await db.collection('members').findOne({ email: 'test6@example.com' });

    console.log('\n--- Test5 Status ---');
    console.log('Users collection:', test5User ? `Found - Role: ${test5User.role}, ID: ${test5User._id}` : 'Not found');
    console.log('Members collection:', test5Member ? `Found - Role: ${test5Member.role}, ID: ${test5Member._id}` : 'Not found');

    console.log('\n--- Test6 Status ---');
    console.log('Users collection:', test6User ? `Found - Role: ${test6User.role}, ID: ${test6User._id}` : 'Not found');
    console.log('Members collection:', test6Member ? `Found - Role: ${test6Member.role}, ID: ${test6Member._id}` : 'Not found');

    // Check all DISTRICT_ADMIN users
    console.log('\n=== All DISTRICT_ADMIN users ===');
    const adminUsers = await db.collection('users').find({ role: 'DISTRICT_ADMIN' }).toArray();
    console.log('DISTRICT_ADMIN users found:', adminUsers.length);
    adminUsers.forEach(user => {
      console.log(`- User: ${user.email}, ID: ${user._id}, Role: ${user.role}`);
    });

    const adminMembers = await db.collection('members').find({ role: 'DISTRICT_ADMIN' }).toArray();
    console.log('DISTRICT_ADMIN members found:', adminMembers.length);
    adminMembers.forEach(member => {
      console.log(`- Member: ${member.email}, ID: ${member._id}, Role: ${member.role}`);
    });

    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  } catch (error) {
    console.error('Error:', error);
  }
}

checkAdminStatus(); 