const mongoose = require('mongoose');
require('dotenv').config({ path: 'env.local' });

async function analyzeCollections() {
  try {
    const MONGODB_URI = 'mongodb://localhost:27017/palmlebanon';
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB palmlebanon database');

    const { db } = await mongoose.connection;

    console.log('\n=== COLLECTION ANALYSIS ===\n');

    // Analyze users collection
    console.log('📊 USERS COLLECTION:');
    const users = await db.collection('users').find({}).toArray();
    console.log(`- Total users: ${users.length}`);
    
    const userRoles = {};
    const userEmails = new Set();
    users.forEach(user => {
      userRoles[user.role] = (userRoles[user.role] || 0) + 1;
      userEmails.add(user.email);
    });
    console.log('- Role distribution:', userRoles);
    console.log('- Unique emails:', userEmails.size);

    // Analyze members collection
    console.log('\n📊 MEMBERS COLLECTION:');
    const members = await db.collection('members').find({}).toArray();
    console.log(`- Total members: ${members.length}`);
    
    const memberRoles = {};
    const memberEmails = new Set();
    members.forEach(member => {
      memberRoles[member.role] = (memberRoles[member.role] || 0) + 1;
      memberEmails.add(member.email);
    });
    console.log('- Role distribution:', memberRoles);
    console.log('- Unique emails:', memberEmails.size);

    // Find overlapping emails
    const overlappingEmails = [];
    userEmails.forEach(email => {
      if (memberEmails.has(email)) {
        overlappingEmails.push(email);
      }
    });
    console.log('\n🔄 OVERLAPPING EMAILS:');
    console.log(`- Count: ${overlappingEmails.length}`);
    if (overlappingEmails.length > 0) {
      console.log('- Emails:', overlappingEmails);
    }

    // Analyze field differences
    console.log('\n📋 FIELD ANALYSIS:');
    
    // Sample users to analyze fields
    const sampleUsers = users.slice(0, 3);
    const sampleMembers = members.slice(0, 3);
    
    console.log('\nUsers collection fields:');
    if (sampleUsers.length > 0) {
      console.log('- Fields:', Object.keys(sampleUsers[0]));
    }
    
    console.log('\nMembers collection fields:');
    if (sampleMembers.length > 0) {
      console.log('- Fields:', Object.keys(sampleMembers[0]));
    }

    // Check for orphaned records
    console.log('\n🔍 ORPHANED RECORDS:');
    const usersOnly = users.filter(user => !memberEmails.has(user.email));
    const membersOnly = members.filter(member => !userEmails.has(member.email));
    
    console.log(`- Users only: ${usersOnly.length}`);
    console.log(`- Members only: ${membersOnly.length}`);

    // Check password fields
    console.log('\n🔐 PASSWORD FIELD ANALYSIS:');
    const usersWithPasswordHash = users.filter(u => u.passwordHash).length;
    const membersWithPassword = members.filter(m => m.password).length;
    console.log(`- Users with passwordHash: ${usersWithPasswordHash}/${users.length}`);
    console.log(`- Members with password: ${membersWithPassword}/${members.length}`);

    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  } catch (error) {
    console.error('Error analyzing collections:', error);
  }
}

analyzeCollections(); 