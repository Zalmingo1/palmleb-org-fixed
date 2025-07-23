const mongoose = require('mongoose');
require('dotenv').config({ path: 'env.local' });

async function restoreAdminPrivileges() {
  try {
    console.log('MongoDB URI:', process.env.MONGODB_URI ? 'Set' : 'Not set');
    
    if (!process.env.MONGODB_URI) {
      console.error('MONGODB_URI not found in environment variables');
      return;
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const { db } = await mongoose.connection;

    // First, let's check if test6 exists in either collection
    console.log('\n=== Checking if test6 exists ===');
    
    const test6User = await db.collection('users').findOne({ email: 'test6@example.com' });
    const test6Member = await db.collection('members').findOne({ email: 'test6@example.com' });

    console.log('Test6 in users collection:', test6User ? 'Found' : 'Not found');
    console.log('Test6 in members collection:', test6Member ? 'Found' : 'Not found');

    if (!test6User && !test6Member) {
      console.log('\n❌ Test6 user not found in either collection. Creating test6 user...');
      
      // Create test6 user in members collection
      const newTest6Member = {
        firstName: 'Test',
        lastName: '6',
        email: 'test6@example.com',
        role: 'DISTRICT_ADMIN',
        primaryLodge: '681e751c2b05d4bc4be15dfc', // District Grand Lodge of Syria-Lebanon
        lodges: ['681e751c2b05d4bc4be15dfc'],
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await db.collection('members').insertOne(newTest6Member);
      console.log('✅ Created test6 member with ID:', result.insertedId);
      
      // Also create in users collection for consistency
      const newTest6User = {
        name: 'Test 6',
        email: 'test6@example.com',
        role: 'DISTRICT_ADMIN',
        primaryLodge: '681e751c2b05d4bc4be15dfc',
        lodges: ['681e751c2b05d4bc4be15dfc'],
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const userResult = await db.collection('users').insertOne(newTest6User);
      console.log('✅ Created test6 user with ID:', userResult.insertedId);
    } else {
      console.log('\n✅ Test6 user found. Updating role to DISTRICT_ADMIN...');
      
      // Update existing test6 to DISTRICT_ADMIN
      if (test6Member) {
        await db.collection('members').updateOne(
          { email: 'test6@example.com' },
          { $set: { role: 'DISTRICT_ADMIN' } }
        );
        console.log('✅ Updated test6 member role to DISTRICT_ADMIN');
      }
      
      if (test6User) {
        await db.collection('users').updateOne(
          { email: 'test6@example.com' },
          { $set: { role: 'DISTRICT_ADMIN' } }
        );
        console.log('✅ Updated test6 user role to DISTRICT_ADMIN');
      }
    }

    // Verify the changes
    console.log('\n=== Verifying changes ===');
    const updatedTest6User = await db.collection('users').findOne({ email: 'test6@example.com' });
    const updatedTest6Member = await db.collection('members').findOne({ email: 'test6@example.com' });

    console.log('Updated test6 user:', updatedTest6User ? `Role: ${updatedTest6User.role}` : 'Not found');
    console.log('Updated test6 member:', updatedTest6Member ? `Role: ${updatedTest6Member.role}` : 'Not found');

    // Show all DISTRICT_ADMIN users
    console.log('\n=== All DISTRICT_ADMIN users after update ===');
    const adminUsers = await db.collection('users').find({ role: 'DISTRICT_ADMIN' }).toArray();
    const adminMembers = await db.collection('members').find({ role: 'DISTRICT_ADMIN' }).toArray();

    console.log('DISTRICT_ADMIN users:', adminUsers.length);
    adminUsers.forEach(user => {
      console.log(`- User: ${user.email}, Role: ${user.role}`);
    });

    console.log('DISTRICT_ADMIN members:', adminMembers.length);
    adminMembers.forEach(member => {
      console.log(`- Member: ${member.email}, Role: ${member.role}`);
    });

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
    console.log('\n🎉 Test6 now has DISTRICT_ADMIN privileges!');
    console.log('You can now log in with test6@example.com');
  } catch (error) {
    console.error('Error:', error);
  }
}

restoreAdminPrivileges(); 