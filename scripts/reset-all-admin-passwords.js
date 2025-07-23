const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');

async function resetAllAdminPasswords() {
  const uri = 'mongodb://localhost:27017/palmlebanon';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db('palmlebanon');
    
    // Reset passwords for all admin users
    const adminUsers = [
      { email: 'superadmin@example.com', password: 'Qwe123123', name: 'Super Admin' },
      { email: 'lodgeadmin@example.com', password: 'Qwe123123', name: 'Lodge Admin' },
      { email: 'secretary@example.com', password: 'Qwe123123', name: 'Lodge Secretary' },
      { email: 'member@example.com', password: 'Qwe123123', name: 'Regular Member' }
    ];

    for (const adminUser of adminUsers) {
      const user = await db.collection('users').findOne({ email: adminUser.email });
      
      if (user) {
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(adminUser.password, saltRounds);

        const result = await db.collection('users').updateOne(
          { _id: user._id },
          { 
            $set: { 
              passwordHash: passwordHash,
              updatedAt: new Date()
            } 
          }
        );

        if (result.modifiedCount > 0) {
          console.log(`✅ ${adminUser.name} password updated successfully`);
          console.log(`   Email: ${adminUser.email}`);
          console.log(`   Password: ${adminUser.password}`);
        } else {
          console.log(`❌ Failed to update ${adminUser.name} password`);
        }
      } else {
        console.log(`❌ User not found: ${adminUser.email}`);
      }
      console.log('   ---');
    }

    console.log('\n🎉 All admin passwords have been reset!');
    console.log('You can now login with any of these accounts:');
    console.log('Email: superadmin@example.com, Password: Qwe123123');
    console.log('Email: lodgeadmin@example.com, Password: Qwe123123');
    console.log('Email: secretary@example.com, Password: Qwe123123');
    console.log('Email: member@example.com, Password: Qwe123123');

  } catch (error) {
    console.error('Error resetting admin passwords:', error);
  } finally {
    await client.close();
    console.log('Disconnected from MongoDB');
  }
}

resetAllAdminPasswords(); 