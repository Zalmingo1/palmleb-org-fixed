const mongoose = require('mongoose');
require('dotenv').config({ path: 'env.local' });

async function fixTest6Role() {
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

    // Fix the role to match the login system expectations
    console.log('\n=== Fixing test6 role ===');
    
    // Update test6 member to use 'district_admin' (lowercase) which will be mapped to 'SUPER_ADMIN'
    await db.collection('members').updateOne(
      { email: 'test6@example.com' },
      { $set: { role: 'district_admin' } }
    );
    console.log('✅ Updated test6 member role to district_admin');

    // Update test6 user to use 'SUPER_ADMIN' (which is what the login system expects)
    await db.collection('users').updateOne(
      { email: 'test6@example.com' },
      { $set: { role: 'SUPER_ADMIN' } }
    );
    console.log('✅ Updated test6 user role to SUPER_ADMIN');

    // Verify the changes
    console.log('\n=== Verifying changes ===');
    const updatedTest6User = await db.collection('users').findOne({ email: 'test6@example.com' });
    const updatedTest6Member = await db.collection('members').findOne({ email: 'test6@example.com' });

    console.log('Updated test6 user role:', updatedTest6User?.role);
    console.log('Updated test6 member role:', updatedTest6Member?.role);

    // Show all admin users
    console.log('\n=== All admin users after update ===');
    const adminUsers = await db.collection('users').find({ 
      $or: [{ role: 'SUPER_ADMIN' }, { role: 'DISTRICT_ADMIN' }] 
    }).toArray();
    console.log('Admin users found:', adminUsers.length);
    adminUsers.forEach(user => {
      console.log(`- User: ${user.email}, Role: ${user.role}`);
    });

    const adminMembers = await db.collection('members').find({ 
      $or: [{ role: 'district_admin' }, { role: 'DISTRICT_ADMIN' }] 
    }).toArray();
    console.log('Admin members found:', adminMembers.length);
    adminMembers.forEach(member => {
      console.log(`- Member: ${member.email}, Role: ${member.role}`);
    });

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
    console.log('\n🎉 Test6 role fixed!');
    console.log('You can now log in with test6@example.com and should have proper admin access');
  } catch (error) {
    console.error('Error:', error);
  }
}

fixTest6Role(); 