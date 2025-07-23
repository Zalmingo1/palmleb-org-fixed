const mongoose = require('mongoose');
require('dotenv').config({ path: 'env.local' });

async function testUnifiedLogin() {
  try {
    const MONGODB_URI = 'mongodb://localhost:27017/palmlebanon';
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB palmlebanon database');

    const { db } = await mongoose.connection;

    console.log('\n=== TESTING UNIFIED LOGIN ===\n');

    // Test 1: Check unified users collection
    console.log('📊 Test 1: Unified Users Collection');
    const unifiedUsers = await db.collection('unifiedusers').find({}).toArray();
    console.log(`- Total unified users: ${unifiedUsers.length}`);
    
    const roleDistribution = {};
    unifiedUsers.forEach(user => {
      roleDistribution[user.role] = (roleDistribution[user.role] || 0) + 1;
    });
    console.log('- Role distribution:', roleDistribution);

    // Test 2: Check specific users
    console.log('\n📋 Test 2: Specific User Details');
    const testUsers = ['test1@example.com', 'superadmin@palmleb.org', 'districtadmin@palmleb.org'];
    
    for (const email of testUsers) {
      const user = await db.collection('unifiedusers').findOne({ email: email.toLowerCase() });
      if (user) {
        console.log(`✅ ${email}:`);
        console.log(`  - Role: ${user.role}`);
        console.log(`  - Name: ${user.name}`);
        console.log(`  - Has passwordHash: ${!!user.passwordHash}`);
        console.log(`  - Status: ${user.status}`);
        console.log(`  - Primary Lodge: ${user.primaryLodge || 'None'}`);
      } else {
        console.log(`❌ ${email}: Not found`);
      }
    }

    // Test 3: Check overlapping users
    console.log('\n🔄 Test 3: Overlapping Users (Merged Data)');
    const overlappingEmails = ['test1@example.com', 'test2@example.com', 'test3@example.com'];
    
    for (const email of overlappingEmails) {
      const user = await db.collection('unifiedusers').findOne({ email: email.toLowerCase() });
      if (user) {
        console.log(`✅ ${email}:`);
        console.log(`  - First Name: ${user.firstName || 'N/A'}`);
        console.log(`  - Last Name: ${user.lastName || 'N/A'}`);
        console.log(`  - Phone: ${user.phone || 'N/A'}`);
        console.log(`  - Address: ${user.address || 'N/A'}`);
        console.log(`  - Occupation: ${user.occupation || 'N/A'}`);
        console.log(`  - Bio: ${user.bio || 'N/A'}`);
      }
    }

    // Test 4: Check password migration
    console.log('\n🔐 Test 4: Password Migration');
    const usersWithPasswords = await db.collection('unifiedusers').find({ 
      passwordHash: { $exists: true, $ne: null } 
    }).toArray();
    console.log(`- Users with passwordHash: ${usersWithPasswords.length}/${unifiedUsers.length}`);

    // Test 5: Check lodge memberships
    console.log('\n🏛️ Test 5: Lodge Memberships');
    const usersWithLodges = await db.collection('unifiedusers').find({ 
      lodges: { $exists: true, $ne: [] } 
    }).toArray();
    console.log(`- Users with lodge memberships: ${usersWithLodges.length}`);

    await mongoose.disconnect();
    console.log('\n✅ All tests completed successfully!');
  } catch (error) {
    console.error('Error during testing:', error);
  }
}

testUnifiedLogin(); 