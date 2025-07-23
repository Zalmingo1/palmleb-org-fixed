const mongoose = require('mongoose');
require('dotenv').config({ path: 'env.local' });

async function countUsers() {
  try {
    const MONGODB_URI = 'mongodb://localhost:27017/palmlebanon';
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB palmlebanon database');

    const { db } = await mongoose.connection;

    // Count total users
    const totalUsers = await db.collection('unifiedusers').countDocuments();
    console.log(`\n📊 Total Users in Unified Collection: ${totalUsers}`);

    // Count by role
    const roleCounts = await db.collection('unifiedusers').aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]).toArray();

    console.log('\n👥 Breakdown by Role:');
    roleCounts.forEach(role => {
      console.log(`  - ${role._id}: ${role.count} users`);
    });

    // Show all users with their details
    console.log('\n📋 All Users:');
    const allUsers = await db.collection('unifiedusers').find({}).toArray();
    allUsers.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.name} (${user.email}) - ${user.role}`);
    });

    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  } catch (error) {
    console.error('Error counting users:', error);
  }
}

countUsers(); 