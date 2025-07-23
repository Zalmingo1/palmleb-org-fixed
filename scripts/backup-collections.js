const mongoose = require('mongoose');
require('dotenv').config({ path: 'env.local' });

async function backupCollections() {
  try {
    const MONGODB_URI = 'mongodb://localhost:27017/palmlebanon';
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB palmlebanon database');

    const { db } = await mongoose.connection;

    console.log('\n=== BACKING UP COLLECTIONS ===\n');

    // Create backup collections with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const usersBackupName = `users_backup_${timestamp}`;
    const membersBackupName = `members_backup_${timestamp}`;

    console.log('📦 Creating backup collections...');
    console.log(`- Users backup: ${usersBackupName}`);
    console.log(`- Members backup: ${membersBackupName}`);

    // Backup users collection
    const users = await db.collection('users').find({}).toArray();
    if (users.length > 0) {
      await db.collection(usersBackupName).insertMany(users);
      console.log(`✅ Backed up ${users.length} users`);
    } else {
      console.log('⚠️  No users to backup');
    }

    // Backup members collection
    const members = await db.collection('members').find({}).toArray();
    if (members.length > 0) {
      await db.collection(membersBackupName).insertMany(members);
      console.log(`✅ Backed up ${members.length} members`);
    } else {
      console.log('⚠️  No members to backup');
    }

    // Verify backups
    console.log('\n🔍 Verifying backups...');
    const usersBackupCount = await db.collection(usersBackupName).countDocuments();
    const membersBackupCount = await db.collection(membersBackupName).countDocuments();
    
    console.log(`- Users backup count: ${usersBackupCount} (original: ${users.length})`);
    console.log(`- Members backup count: ${membersBackupCount} (original: ${members.length})`);

    if (usersBackupCount === users.length && membersBackupCount === members.length) {
      console.log('✅ All backups verified successfully!');
    } else {
      console.log('❌ Backup verification failed!');
    }

    // List all backup collections
    const collections = await db.listCollections().toArray();
    const backupCollections = collections.filter(col => 
      col.name.includes('_backup_')
    );
    
    console.log('\n📋 All backup collections:');
    backupCollections.forEach(col => {
      console.log(`- ${col.name}`);
    });

    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  } catch (error) {
    console.error('Error backing up collections:', error);
  }
}

backupCollections(); 