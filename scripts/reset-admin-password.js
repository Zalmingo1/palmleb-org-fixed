const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');

async function resetSuperAdminPassword() {
  const uri = 'mongodb://localhost:27017/palmlebanon';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db('palmlebanon');
    
    // Find the super admin user
    const superAdmin = await db.collection('users').findOne({ 
      email: 'superadmin@example.com' 
    });

    if (!superAdmin) {
      console.log('❌ Super admin user not found');
      return;
    }

    console.log('Found super admin user:', {
      userId: superAdmin._id,
      name: superAdmin.name,
      email: superAdmin.email
    });

    // Hash the new password
    const saltRounds = 10;
    const newPassword = 'Qwe123123';
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update the password
    const result = await db.collection('users').updateOne(
      { _id: superAdmin._id },
      { 
        $set: { 
          passwordHash: passwordHash,
          updatedAt: new Date()
        } 
      }
    );

    if (result.modifiedCount > 0) {
      console.log('✅ Super admin password updated successfully');
      console.log('New credentials:');
      console.log('Email: superadmin@example.com');
      console.log('Password: Qwe123123');
    } else {
      console.log('❌ Failed to update super admin password');
    }

  } catch (error) {
    console.error('Error resetting super admin password:', error);
  } finally {
    await client.close();
    console.log('Disconnected from MongoDB');
  }
}

resetSuperAdminPassword(); 