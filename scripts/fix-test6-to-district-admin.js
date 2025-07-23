const mongoose = require('mongoose');
require('dotenv').config({ path: 'env.local' });

async function fixTest6ToDistrictAdmin() {
  try {
    console.log('MongoDB URI:', process.env.MONGODB_URI ? 'Set' : 'Not set');
    
    if (!process.env.MONGODB_URI) {
      console.error('MONGODB_URI not found in environment variables');
      return;
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const { db } = await mongoose.connection;

    // Check current test6 role
    console.log('\n=== Current test6 role ===');
    const test6User = await db.collection('users').findOne({ email: 'test6@example.com' });
    const test6Member = await db.collection('members').findOne({ email: 'test6@example.com' });

    console.log('Current test6 user role:', test6User?.role);
    console.log('Current test6 member role:', test6Member?.role);

    // Fix the role to DISTRICT_ADMIN
    console.log('\n=== Fixing test6 role to DISTRICT_ADMIN ===');
    
    // Update test6 member to use 'DISTRICT_ADMIN'
    await db.collection('members').updateOne(
      { email: 'test6@example.com' },
      { $set: { role: 'DISTRICT_ADMIN' } }
    );
    console.log('✅ Updated test6 member role to DISTRICT_ADMIN');

    // Update test6 user to use 'DISTRICT_ADMIN'
    await db.collection('users').updateOne(
      { email: 'test6@example.com' },
      { $set: { role: 'DISTRICT_ADMIN' } }
    );
    console.log('✅ Updated test6 user role to DISTRICT_ADMIN');

    // Verify the changes
    console.log('\n=== Verifying changes ===');
    const updatedTest6User = await db.collection('users').findOne({ email: 'test6@example.com' });
    const updatedTest6Member = await db.collection('members').findOne({ email: 'test6@example.com' });

    console.log('Updated test6 user role:', updatedTest6User?.role);
    console.log('Updated test6 member role:', updatedTest6Member?.role);

    // Show all DISTRICT_ADMIN users
    console.log('\n=== All DISTRICT_ADMIN users after update ===');
    const adminUsers = await db.collection('users').find({ role: 'DISTRICT_ADMIN' }).toArray();
    console.log('DISTRICT_ADMIN users found:', adminUsers.length);
    adminUsers.forEach(user => {
      console.log(`- User: ${user.email}, Role: ${user.role}`);
    });

    const adminMembers = await db.collection('members').find({ role: 'DISTRICT_ADMIN' }).toArray();
    console.log('DISTRICT_ADMIN members found:', adminMembers.length);
    adminMembers.forEach(member => {
      console.log(`- Member: ${member.email}, Role: ${member.role}`);
    });

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
    console.log('\n🎉 Test6 is now properly set as DISTRICT_ADMIN!');
    console.log('You can now log in with test6@example.com and should have district admin access');
  } catch (error) {
    console.error('Error:', error);
  }
}

fixTest6ToDistrictAdmin(); 