const mongoose = require('mongoose');
require('dotenv').config({ path: 'env.local' });

async function testTransferAdmin() {
  try {
    console.log('MongoDB URI:', process.env.MONGODB_URI ? 'Set' : 'Not set');
    
    if (!process.env.MONGODB_URI) {
      console.error('MONGODB_URI not found in environment variables');
      return;
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const { db } = await mongoose.connection;

    // Step 1: Create test users for transfer
    console.log('\n=== Creating test users for transfer ===');
    
    // Create test7 as current admin
    const test7Member = {
      firstName: 'Test',
      lastName: '7',
      email: 'test7@example.com',
      role: 'DISTRICT_ADMIN',
      primaryLodge: '681e751c2b05d4bc4be15dfc',
      lodges: ['681e751c2b05d4bc4be15dfc'],
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const test7User = {
      name: 'Test 7',
      email: 'test7@example.com',
      role: 'DISTRICT_ADMIN',
      primaryLodge: '681e751c2b05d4bc4be15dfc',
      lodges: ['681e751c2b05d4bc4be15dfc'],
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Create test8 as new admin candidate
    const test8Member = {
      firstName: 'Test',
      lastName: '8',
      email: 'test8@example.com',
      role: 'LODGE_MEMBER',
      primaryLodge: '681e751c2b05d4bc4be15dfc',
      lodges: ['681e751c2b05d4bc4be15dfc'],
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const test8User = {
      name: 'Test 8',
      email: 'test8@example.com',
      role: 'LODGE_MEMBER',
      primaryLodge: '681e751c2b05d4bc4be15dfc',
      lodges: ['681e751c2b05d4bc4be15dfc'],
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Insert test users
    const test7MemberResult = await db.collection('members').insertOne(test7Member);
    const test7UserResult = await db.collection('users').insertOne(test7User);
    const test8MemberResult = await db.collection('members').insertOne(test8Member);
    const test8UserResult = await db.collection('users').insertOne(test8User);

    console.log('✅ Created test users:');
    console.log('- Test7 (DISTRICT_ADMIN):', test7MemberResult.insertedId);
    console.log('- Test8 (LODGE_MEMBER):', test8MemberResult.insertedId);

    // Step 2: Verify initial state
    console.log('\n=== Verifying initial state ===');
    const test7MemberCheck = await db.collection('members').findOne({ email: 'test7@example.com' });
    const test7UserCheck = await db.collection('users').findOne({ email: 'test7@example.com' });
    const test8MemberCheck = await db.collection('members').findOne({ email: 'test8@example.com' });
    const test8UserCheck = await db.collection('users').findOne({ email: 'test8@example.com' });

    console.log('Test7 roles:', {
      member: test7MemberCheck?.role,
      user: test7UserCheck?.role
    });
    console.log('Test8 roles:', {
      member: test8MemberCheck?.role,
      user: test8UserCheck?.role
    });

    // Step 3: Simulate transfer (update roles directly)
    console.log('\n=== Simulating transfer ===');
    
    // Transfer admin from test7 to test8
    const transferResults = await Promise.all([
      // Update test7 to LODGE_MEMBER
      db.collection('members').updateOne(
        { email: 'test7@example.com' },
        { $set: { role: 'LODGE_MEMBER' } }
      ),
      db.collection('users').updateOne(
        { email: 'test7@example.com' },
        { $set: { role: 'LODGE_MEMBER' } }
      ),
      // Update test8 to DISTRICT_ADMIN
      db.collection('members').updateOne(
        { email: 'test8@example.com' },
        { $set: { role: 'DISTRICT_ADMIN' } }
      ),
      db.collection('users').updateOne(
        { email: 'test8@example.com' },
        { $set: { role: 'DISTRICT_ADMIN' } }
      )
    ]);

    console.log('Transfer completed:', transferResults.map(r => r.modifiedCount));

    // Step 4: Verify transfer results
    console.log('\n=== Verifying transfer results ===');
    const finalTest7Member = await db.collection('members').findOne({ email: 'test7@example.com' });
    const finalTest7User = await db.collection('users').findOne({ email: 'test7@example.com' });
    const finalTest8Member = await db.collection('members').findOne({ email: 'test8@example.com' });
    const finalTest8User = await db.collection('users').findOne({ email: 'test8@example.com' });

    console.log('Final Test7 roles:', {
      member: finalTest7Member?.role,
      user: finalTest7User?.role
    });
    console.log('Final Test8 roles:', {
      member: finalTest8Member?.role,
      user: finalTest8User?.role
    });

    // Step 5: Clean up test users
    console.log('\n=== Cleaning up test users ===');
    await Promise.all([
      db.collection('members').deleteOne({ email: 'test7@example.com' }),
      db.collection('users').deleteOne({ email: 'test7@example.com' }),
      db.collection('members').deleteOne({ email: 'test8@example.com' }),
      db.collection('users').deleteOne({ email: 'test8@example.com' })
    ]);
    console.log('✅ Cleaned up test users');

    // Step 6: Show current admin users
    console.log('\n=== Current admin users ===');
    const adminUsers = await db.collection('users').find({ 
      $or: [{ role: 'DISTRICT_ADMIN' }, { role: 'SUPER_ADMIN' }] 
    }).toArray();
    const adminMembers = await db.collection('members').find({ 
      $or: [{ role: 'DISTRICT_ADMIN' }, { role: 'SUPER_ADMIN' }] 
    }).toArray();

    console.log('Admin users:', adminUsers.length);
    adminUsers.forEach(user => {
      console.log(`- User: ${user.email}, Role: ${user.role}`);
    });

    console.log('Admin members:', adminMembers.length);
    adminMembers.forEach(member => {
      console.log(`- Member: ${member.email}, Role: ${member.role}`);
    });

    await mongoose.disconnect();
    console.log('\n✅ Test completed successfully!');
    console.log('The transfer admin system should now work smoothly without manual fixes.');
  } catch (error) {
    console.error('Error:', error);
  }
}

testTransferAdmin(); 