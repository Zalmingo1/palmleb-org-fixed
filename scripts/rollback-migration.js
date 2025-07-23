const mongoose = require('mongoose');
require('dotenv').config({ path: 'env.local' });

async function rollbackMigration() {
  try {
    const MONGODB_URI = 'mongodb://localhost:27017/palmlebanon';
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB palmlebanon database');

    const { db } = await mongoose.connection;

    console.log('\n=== ROLLBACK MIGRATION ===\n');

    // Step 1: Check for backup collections
    console.log('📋 Step 1: Checking for backup collections...');
    const collections = await db.listCollections().toArray();
    const backupCollections = collections.filter(col => 
      col.name.includes('_backup_')
    ).sort((a, b) => b.name.localeCompare(a.name)); // Sort by newest first

    if (backupCollections.length === 0) {
      console.log('❌ No backup collections found. Cannot rollback.');
      return;
    }

    console.log('Found backup collections:');
    backupCollections.forEach(col => {
      console.log(`- ${col.name}`);
    });

    // Step 2: Find the most recent backup
    const latestBackup = backupCollections[0];
    console.log(`\n🔄 Step 2: Using latest backup: ${latestBackup.name}`);

    // Extract timestamp from backup name
    const timestampMatch = latestBackup.name.match(/_backup_(.+)$/);
    if (!timestampMatch) {
      console.log('❌ Invalid backup collection name format');
      return;
    }

    const timestamp = timestampMatch[1];
    const usersBackupName = `users_backup_${timestamp}`;
    const membersBackupName = `members_backup_${timestamp}`;

    // Step 3: Verify backup collections exist
    console.log('\n🔍 Step 3: Verifying backup collections...');
    const usersBackupExists = await db.collection(usersBackupName).countDocuments();
    const membersBackupExists = await db.collection(membersBackupName).countDocuments();

    console.log(`- Users backup: ${usersBackupExists} documents`);
    console.log(`- Members backup: ${membersBackupExists} documents`);

    if (usersBackupExists === 0 && membersBackupExists === 0) {
      console.log('❌ No valid backup data found');
      return;
    }

    // Step 4: Confirm rollback
    console.log('\n⚠️  WARNING: This will restore the original users and members collections.');
    console.log('This will overwrite any current data in these collections.');
    console.log('Make sure you have a current backup before proceeding.');
    
    // In a real scenario, you would ask for user confirmation here
    console.log('\nProceeding with rollback...');

    // Step 5: Restore users collection
    if (usersBackupExists > 0) {
      console.log('\n🔄 Step 5: Restoring users collection...');
      
      // Drop current users collection
      await db.collection('users').drop().catch(() => {
        console.log('No existing users collection to drop');
      });
      
      // Restore from backup
      const usersBackup = await db.collection(usersBackupName).find({}).toArray();
      if (usersBackup.length > 0) {
        await db.collection('users').insertMany(usersBackup);
        console.log(`✅ Restored ${usersBackup.length} users`);
      }
    }

    // Step 6: Restore members collection
    if (membersBackupExists > 0) {
      console.log('\n🔄 Step 6: Restoring members collection...');
      
      // Drop current members collection
      await db.collection('members').drop().catch(() => {
        console.log('No existing members collection to drop');
      });
      
      // Restore from backup
      const membersBackup = await db.collection(membersBackupName).find({}).toArray();
      if (membersBackup.length > 0) {
        await db.collection('members').insertMany(membersBackup);
        console.log(`✅ Restored ${membersBackup.length} members`);
      }
    }

    // Step 7: Remove unified users collection
    console.log('\n🔄 Step 7: Removing unified users collection...');
    await db.collection('unifiedusers').drop().catch(() => {
      console.log('No unifiedusers collection to drop');
    });
    console.log('✅ Removed unified users collection');

    // Step 8: Verification
    console.log('\n🔍 Step 8: Verifying rollback...');
    const currentUsersCount = await db.collection('users').countDocuments();
    const currentMembersCount = await db.collection('members').countDocuments();
    
    console.log(`- Current users: ${currentUsersCount}`);
    console.log(`- Current members: ${currentMembersCount}`);
    console.log(`- Original backup users: ${usersBackupExists}`);
    console.log(`- Original backup members: ${membersBackupExists}`);

    if (currentUsersCount === usersBackupExists && currentMembersCount === membersBackupExists) {
      console.log('✅ Rollback completed successfully!');
    } else {
      console.log('❌ Rollback verification failed!');
    }

    // Step 9: Clean up old backup collections (optional)
    console.log('\n🧹 Step 9: Cleaning up old backup collections...');
    const oldBackups = backupCollections.filter(col => 
      col.name !== usersBackupName && col.name !== membersBackupName
    );
    
    for (const backup of oldBackups) {
      await db.collection(backup.name).drop();
      console.log(`✅ Removed old backup: ${backup.name}`);
    }

    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  } catch (error) {
    console.error('Error during rollback:', error);
  }
}

rollbackMigration(); 