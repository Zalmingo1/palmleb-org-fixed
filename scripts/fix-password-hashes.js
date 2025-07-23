const mongoose = require('mongoose');
require('dotenv').config({ path: 'env.local' });

async function fixPasswordHashes() {
  try {
    // Connect to the palmlebanon database
    const MONGODB_URI = 'mongodb://localhost:27017/palmlebanon';
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB palmlebanon database');

    const { db } = await mongoose.connection;

    console.log('Checking and fixing password hashes in unifiedusers collection...');

    // Get all users from unifiedusers collection
    const users = await db.collection('unifiedusers').find({}).toArray();
    console.log(`Found ${users.length} users in unifiedusers collection`);

    let fixedCount = 0;
    let alreadyCorrectCount = 0;

    for (const user of users) {
      console.log(`\nChecking user: ${user.email}`);
      console.log(`- Current passwordHash type: ${typeof user.passwordHash}`);
      
      if (user.passwordHash && typeof user.passwordHash === 'object') {
        console.log(`- passwordHash is an object, converting to string...`);
        
        // Convert object to string (assuming it's a bcrypt hash object)
        const hashString = user.passwordHash.toString();
        console.log(`- Converted to string: ${hashString.substring(0, 20)}...`);
        
        // Update the user with the string hash
        const result = await db.collection('unifiedusers').updateOne(
          { _id: user._id },
          { $set: { passwordHash: hashString } }
        );
        
        if (result.modifiedCount > 0) {
          console.log(`✅ Fixed passwordHash for ${user.email}`);
          fixedCount++;
        } else {
          console.log(`❌ Failed to update passwordHash for ${user.email}`);
        }
      } else if (user.passwordHash && typeof user.passwordHash === 'string') {
        console.log(`✅ passwordHash is already a string for ${user.email}`);
        alreadyCorrectCount++;
      } else {
        console.log(`⚠️  No passwordHash found for ${user.email}`);
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`- Total users: ${users.length}`);
    console.log(`- Fixed password hashes: ${fixedCount}`);
    console.log(`- Already correct: ${alreadyCorrectCount}`);
    console.log(`- Users without password hash: ${users.length - fixedCount - alreadyCorrectCount}`);

    // Verify the fixes
    console.log(`\n🔍 Verifying fixes...`);
    const updatedUsers = await db.collection('unifiedusers').find({}).toArray();
    let allCorrect = true;
    
    for (const user of updatedUsers) {
      if (user.passwordHash && typeof user.passwordHash !== 'string') {
        console.log(`❌ ${user.email} still has invalid passwordHash type: ${typeof user.passwordHash}`);
        allCorrect = false;
      }
    }
    
    if (allCorrect) {
      console.log(`✅ All password hashes are now strings!`);
    }

    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  } catch (error) {
    console.error('Error fixing password hashes:', error);
  }
}

fixPasswordHashes(); 