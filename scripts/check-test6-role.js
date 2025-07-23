const mongoose = require('mongoose');
require('dotenv').config({ path: 'env.local' });

async function checkTest6Role() {
  try {
    console.log('MongoDB URI:', process.env.MONGODB_URI ? 'Set' : 'Not set');
    
    if (!process.env.MONGODB_URI) {
      console.error('MONGODB_URI not found in environment variables');
      return;
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const { db } = await mongoose.connection;

    // Check test6 in both collections
    console.log('\n=== Checking test6 role ===');
    
    const test6User = await db.collection('users').findOne({ email: 'test6@example.com' });
    const test6Member = await db.collection('members').findOne({ email: 'test6@example.com' });

    console.log('\n--- Test6 User Collection ---');
    if (test6User) {
      console.log('Found in users collection:');
      console.log('- Email:', test6User.email);
      console.log('- Role:', test6User.role);
      console.log('- ID:', test6User._id);
      console.log('- Name:', test6User.name);
      console.log('- Primary Lodge:', test6User.primaryLodge);
    } else {
      console.log('❌ Not found in users collection');
    }

    console.log('\n--- Test6 Member Collection ---');
    if (test6Member) {
      console.log('Found in members collection:');
      console.log('- Email:', test6Member.email);
      console.log('- Role:', test6Member.role);
      console.log('- ID:', test6Member._id);
      console.log('- Name:', `${test6Member.firstName} ${test6Member.lastName}`);
      console.log('- Primary Lodge:', test6Member.primaryLodge);
    } else {
      console.log('❌ Not found in members collection');
    }

    // Check all users with DISTRICT_ADMIN role
    console.log('\n=== All DISTRICT_ADMIN users ===');
    const adminUsers = await db.collection('users').find({ role: 'DISTRICT_ADMIN' }).toArray();
    console.log('DISTRICT_ADMIN users found:', adminUsers.length);
    adminUsers.forEach(user => {
      console.log(`- User: ${user.email}, Role: ${user.role}, ID: ${user._id}`);
    });

    const adminMembers = await db.collection('members').find({ role: 'DISTRICT_ADMIN' }).toArray();
    console.log('DISTRICT_ADMIN members found:', adminMembers.length);
    adminMembers.forEach(member => {
      console.log(`- Member: ${member.email}, Role: ${member.role}, ID: ${member._id}`);
    });

    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  } catch (error) {
    console.error('Error:', error);
  }
}

checkTest6Role(); 