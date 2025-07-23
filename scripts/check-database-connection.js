const mongoose = require('mongoose');
require('dotenv').config({ path: 'env.local' });

async function checkDatabaseConnection() {
  try {
    console.log('MongoDB URI:', process.env.MONGODB_URI);
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const { db } = await mongoose.connection;
    console.log('Database name:', db.databaseName);
    
    // List all collections
    const collections = await db.listCollections().toArray();
    console.log('\nCollections in database:');
    collections.forEach(collection => {
      console.log('-', collection.name);
    });
    
    // Check users collection
    const usersCount = await db.collection('users').countDocuments();
    console.log('\nUsers collection count:', usersCount);
    
    // Check members collection
    const membersCount = await db.collection('members').countDocuments();
    console.log('Members collection count:', membersCount);
    
    // Find all test7 records
    const test7Users = await db.collection('users').find({ email: 'test7@example.com' }).toArray();
    console.log('\nAll test7@example.com users found:', test7Users.length);
    test7Users.forEach((user, index) => {
      console.log(`User ${index + 1}: ID=${user._id}, Role=${user.role}, HasPassword=${!!user.passwordHash}`);
    });
    
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  } catch (error) {
    console.error('Error:', error);
  }
}

checkDatabaseConnection(); 