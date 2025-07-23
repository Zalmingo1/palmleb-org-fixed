const { MongoClient, ObjectId } = require('mongodb');
const mongoose = require('mongoose');

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/palmlebanon';

async function connectToDatabase() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');
    return mongoose.connection.db;
  } catch (error) {
    console.error('Error connecting to database:', error);
    throw error;
  }
}

async function transferDistrictAdminRole(currentDistrictAdminId, newDistrictAdminId) {
  try {
    const db = await connectToDatabase();
    
    console.log('Starting district admin role transfer...');
    console.log('Current district admin ID:', currentDistrictAdminId);
    console.log('New district admin ID:', newDistrictAdminId);
    
    // Find the current district admin
    const currentAdmin = await db.collection('members').findOne({ 
      _id: new ObjectId(currentDistrictAdminId) 
    });
    
    if (!currentAdmin) {
      console.error('Current district admin not found');
      return false;
    }
    
    if (currentAdmin.role !== 'DISTRICT_ADMIN') {
      console.error('Current user is not a district admin');
      return false;
    }
    
    // Find the new district admin candidate
    const newAdmin = await db.collection('members').findOne({ 
      _id: new ObjectId(newDistrictAdminId) 
    });
    
    if (!newAdmin) {
      console.error('New district admin candidate not found');
      return false;
    }
    
    if (newAdmin.role === 'DISTRICT_ADMIN') {
      console.error('Target user is already a district admin');
      return false;
    }
    
    // Check if they're in the same district (same primary lodge)
    if (currentAdmin.primaryLodge !== newAdmin.primaryLodge) {
      console.error('Users are not in the same district');
      return false;
    }
    
    console.log('Transferring district admin role...');
    
    // Step 1: Demote current district admin to lodge admin
    await db.collection('members').updateOne(
      { _id: new ObjectId(currentDistrictAdminId) },
      { $set: { role: 'LODGE_ADMIN' } }
    );
    
    // Step 2: Promote new district admin
    await db.collection('members').updateOne(
      { _id: new ObjectId(newDistrictAdminId) },
      { $set: { role: 'DISTRICT_ADMIN' } }
    );
    
    // Step 3: Update users collection if they exist
    const currentAdminUser = await db.collection('users').findOne({ 
      _id: new ObjectId(currentDistrictAdminId) 
    });
    
    if (currentAdminUser) {
      await db.collection('users').updateOne(
        { _id: new ObjectId(currentDistrictAdminId) },
        { $set: { role: 'LODGE_ADMIN' } }
      );
    }
    
    const newAdminUser = await db.collection('users').findOne({ 
      _id: new ObjectId(newDistrictAdminId) 
    });
    
    if (newAdminUser) {
      await db.collection('users').updateOne(
        { _id: new ObjectId(newDistrictAdminId) },
        { $set: { role: 'DISTRICT_ADMIN' } }
      );
    } else {
      // Create user record for the new district admin
      const memberName = newAdmin.firstName && newAdmin.lastName 
        ? `${newAdmin.firstName} ${newAdmin.lastName}`.trim()
        : newAdmin.name || 'Unknown Member';
        
      await db.collection('users').insertOne({
        _id: new ObjectId(newDistrictAdminId),
        name: memberName,
        email: newAdmin.email,
        passwordHash: newAdmin.password,
        role: 'DISTRICT_ADMIN',
        status: 'active',
        primaryLodge: newAdmin.primaryLodge,
        lodges: newAdmin.lodgeMemberships?.map((m) => m.lodge.toString()) || [],
        administeredLodges: newAdmin.administeredLodges || [],
        profileImage: newAdmin.profileImage,
        created: newAdmin.created || new Date(),
        lastLogin: newAdmin.lastLogin || new Date(),
        memberSince: newAdmin.memberSince?.toISOString() || new Date().toISOString()
      });
    }
    
    console.log('District admin role transfer completed successfully!');
    console.log('Previous district admin:', currentAdmin.name);
    console.log('New district admin:', newAdmin.name);
    
    return true;
  } catch (error) {
    console.error('Error transferring district admin role:', error);
    return false;
  } finally {
    await mongoose.disconnect();
  }
}

// Command line usage
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length !== 2) {
    console.log('Usage: node transfer-district-admin-role.js <currentDistrictAdminId> <newDistrictAdminId>');
    console.log('Example: node transfer-district-admin-role.js 507f1f77bcf86cd799439011 507f1f77bcf86cd799439012');
    process.exit(1);
  }
  
  const [currentAdminId, newAdminId] = args;
  
  transferDistrictAdminRole(currentAdminId, newAdminId)
    .then(success => {
      if (success) {
        console.log('Role transfer completed successfully!');
        process.exit(0);
      } else {
        console.log('Role transfer failed!');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('Script error:', error);
      process.exit(1);
    });
}

module.exports = { transferDistrictAdminRole }; 