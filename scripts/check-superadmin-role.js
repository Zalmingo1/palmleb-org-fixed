const { MongoClient, ObjectId } = require('mongodb');

async function checkSuperAdminRole() {
  const uri = 'mongodb://localhost:27017/palmlebanon';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db('palmlebanon');
    
    // Check in users collection
    const user = await db.collection('users').findOne({ 
      email: 'superadmin@example.com' 
    });

    if (user) {
      console.log('Found user in users collection:');
      console.log({
        userId: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status
      });
    } else {
      console.log('❌ User superadmin@example.com not found in users collection');
    }

    // Check in members collection
    const member = await db.collection('members').findOne({ 
      email: 'superadmin@example.com' 
    });

    if (member) {
      console.log('\nFound user in members collection:');
      console.log({
        userId: member._id,
        name: member.name || `${member.firstName} ${member.lastName}`,
        email: member.email,
        role: member.role
      });
    } else {
      console.log('\n❌ User superadmin@example.com not found in members collection');
    }

    // Check all users with admin roles
    console.log('\n=== All Users with Admin Roles ===');
    const adminUsers = await db.collection('users').find({ 
      role: { $in: ['SUPER_ADMIN', 'DISTRICT_ADMIN', 'LODGE_ADMIN'] } 
    }).toArray();
    
    console.log('Users collection admin users:');
    adminUsers.forEach(user => {
      console.log(`- ${user.email}: ${user.role}`);
    });

    const adminMembers = await db.collection('members').find({ 
      role: { $in: ['SUPER_ADMIN', 'DISTRICT_ADMIN', 'LODGE_ADMIN', 'district_admin', 'lodge_admin'] } 
    }).toArray();
    
    console.log('\nMembers collection admin users:');
    adminMembers.forEach(member => {
      console.log(`- ${member.email}: ${member.role}`);
    });

  } catch (error) {
    console.error('Error checking super admin role:', error);
  } finally {
    await client.close();
    console.log('\nDisconnected from MongoDB');
  }
}

// Run the function
checkSuperAdminRole().catch(console.error); 