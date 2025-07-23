const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: 'env.local' });

async function migrateToUnifiedUsers() {
  try {
    const MONGODB_URI = 'mongodb://localhost:27017/palmlebanon';
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB palmlebanon database');

    const { db } = await mongoose.connection;

    console.log('\n=== MIGRATING TO UNIFIED USERS ===\n');

    // Step 1: Create the unified users collection
    console.log('📋 Step 1: Creating unified users collection...');
    
    // Define the unified user schema for the migration
    const unifiedUserSchema = new mongoose.Schema({
      email: { type: String, required: true, unique: true },
      passwordHash: { type: String, required: true },
      name: { type: String, required: true },
      firstName: { type: String },
      lastName: { type: String },
      role: { type: String, enum: ['SUPER_ADMIN', 'DISTRICT_ADMIN', 'LODGE_ADMIN', 'LODGE_MEMBER'], default: 'LODGE_MEMBER' },
      status: { type: String, enum: ['active', 'inactive', 'pending'], default: 'active' },
      phone: { type: String },
      address: { type: String },
      city: { type: String },
      state: { type: String },
      zipCode: { type: String },
      country: { type: String },
      occupation: { type: String },
      bio: { type: String },
      interests: [{ type: String }],
      profileImage: { type: String },
      primaryLodge: { type: mongoose.Schema.Types.ObjectId, ref: 'Lodge' },
      primaryLodgePosition: { type: String, default: 'MEMBER' },
      lodges: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Lodge' }],
      lodgeMemberships: [{
        lodge: { type: mongoose.Schema.Types.ObjectId, ref: 'Lodge', required: true },
        position: { type: String, required: true },
        startDate: { type: Date, default: Date.now },
        endDate: { type: Date },
        isActive: { type: Boolean, default: true }
      }],
      administeredLodges: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Lodge' }],
      memberSince: { type: Date, default: Date.now },
      lastLogin: { type: Date },
      created: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now }
    }, { timestamps: true });

    const UnifiedUser = mongoose.models.UnifiedUser || mongoose.model('UnifiedUser', unifiedUserSchema);

    // Step 2: Get all existing users and members
    console.log('📊 Step 2: Analyzing existing data...');
    const users = await db.collection('users').find({}).toArray();
    const members = await db.collection('members').find({}).toArray();
    
    console.log(`- Found ${users.length} users`);
    console.log(`- Found ${members.length} members`);

    // Step 3: Create a map of all emails to avoid duplicates
    const emailMap = new Map();
    const unifiedUsers = [];

    // Process users first (they have passwordHash)
    console.log('\n🔄 Step 3: Processing users collection...');
    for (const user of users) {
      const email = user.email.toLowerCase();
      
      if (emailMap.has(email)) {
        console.log(`⚠️  Duplicate email found: ${email} (skipping user)`);
        continue;
      }

      // Convert user to unified format
      const unifiedUser = {
        email: email,
        passwordHash: user.passwordHash,
        name: user.name || 'Unknown User',
        firstName: user.name ? user.name.split(' ')[0] : '',
        lastName: user.name ? user.name.split(' ').slice(1).join(' ') : '',
        role: user.role || 'LODGE_MEMBER',
        status: user.status || 'active',
        phone: '',
        address: '',
        city: '',
        state: '',
        zipCode: '',
        country: '',
        occupation: user.occupation || '',
        bio: user.bio || '',
        interests: [],
        profileImage: user.profileImage || '',
        primaryLodge: user.primaryLodge || null,
        primaryLodgePosition: 'MEMBER',
        lodges: user.lodges || [],
        lodgeMemberships: [],
        administeredLodges: user.administeredLodges || [],
        memberSince: user.memberSince ? new Date(user.memberSince) : new Date(),
        lastLogin: user.lastLogin ? new Date(user.lastLogin) : null,
        created: user.created ? new Date(user.created) : new Date(),
        updatedAt: new Date()
      };

      emailMap.set(email, unifiedUser);
      unifiedUsers.push(unifiedUser);
      console.log(`✅ Processed user: ${email}`);
    }

    // Process members (they have password field)
    console.log('\n🔄 Step 4: Processing members collection...');
    for (const member of members) {
      const email = member.email.toLowerCase();
      
      if (emailMap.has(email)) {
        // Merge with existing user data
        const existingUser = emailMap.get(email);
        console.log(`🔄 Merging member data for: ${email}`);
        
        // Merge fields, preferring member data for personal info
        existingUser.firstName = member.firstName || existingUser.firstName;
        existingUser.lastName = member.lastName || existingUser.lastName;
        existingUser.name = member.firstName && member.lastName ? 
          `${member.firstName} ${member.lastName}` : existingUser.name;
        
        // Merge contact information
        existingUser.phone = member.phone || existingUser.phone;
        existingUser.address = member.address || existingUser.address;
        existingUser.city = member.city || existingUser.city;
        existingUser.state = member.state || existingUser.state;
        existingUser.zipCode = member.zipCode || existingUser.zipCode;
        existingUser.country = member.country || existingUser.country;
        existingUser.occupation = member.occupation || existingUser.occupation;
        existingUser.bio = member.bio || existingUser.bio;
        existingUser.interests = member.interests || existingUser.interests;
        existingUser.profileImage = member.profileImage || existingUser.profileImage;
        
        // Merge lodge information
        existingUser.primaryLodge = member.primaryLodge || existingUser.primaryLodge;
        existingUser.primaryLodgePosition = member.primaryLodgePosition || existingUser.primaryLodgePosition;
        
        // Merge lodge memberships
        if (member.lodgeMemberships && member.lodgeMemberships.length > 0) {
          existingUser.lodgeMemberships = member.lodgeMemberships;
        }
        
        // Merge lodges arrays
        const allLodges = new Set([
          ...(existingUser.lodges || []),
          ...(member.lodges || []),
          ...(member.lodgeMemberships ? member.lodgeMemberships.map(m => m.lodge) : [])
        ]);
        existingUser.lodges = Array.from(allLodges);
        
        // Use higher role if different
        const roleHierarchy = {
          'LODGE_MEMBER': 1,
          'LODGE_ADMIN': 2,
          'DISTRICT_ADMIN': 3,
          'SUPER_ADMIN': 4
        };
        
        const currentRoleLevel = roleHierarchy[existingUser.role] || 0;
        const memberRoleLevel = roleHierarchy[member.role] || 0;
        
        if (memberRoleLevel > currentRoleLevel) {
          existingUser.role = member.role;
          console.log(`  - Upgraded role to: ${member.role}`);
        }
        
        // Use member password if user doesn't have passwordHash
        if (!existingUser.passwordHash && member.password) {
          try {
            existingUser.passwordHash = await bcrypt.hash(member.password, 12);
            console.log(`  - Migrated password for: ${email}`);
          } catch (error) {
            console.log(`  ⚠️  Failed to hash password for: ${email}`);
          }
        }
        
      } else {
        // New member, convert to unified format
        const unifiedUser = {
          email: email,
          passwordHash: member.password ? await bcrypt.hash(member.password, 12) : '',
          name: member.firstName && member.lastName ? 
            `${member.firstName} ${member.lastName}` : 'Unknown Member',
          firstName: member.firstName || '',
          lastName: member.lastName || '',
          role: member.role || 'LODGE_MEMBER',
          status: member.status || 'active',
          phone: member.phone || '',
          address: member.address || '',
          city: member.city || '',
          state: member.state || '',
          zipCode: member.zipCode || '',
          country: member.country || '',
          occupation: member.occupation || '',
          bio: member.bio || '',
          interests: member.interests || [],
          profileImage: member.profileImage || '',
          primaryLodge: member.primaryLodge || null,
          primaryLodgePosition: member.primaryLodgePosition || 'MEMBER',
          lodges: member.lodges || [],
          lodgeMemberships: member.lodgeMemberships || [],
          administeredLodges: [],
          memberSince: member.memberSince ? new Date(member.memberSince) : new Date(),
          lastLogin: null,
          created: member.createdAt ? new Date(member.createdAt) : new Date(),
          updatedAt: new Date()
        };

        emailMap.set(email, unifiedUser);
        unifiedUsers.push(unifiedUser);
        console.log(`✅ Processed member: ${email}`);
      }
    }

    // Step 5: Insert unified users
    console.log('\n💾 Step 5: Inserting unified users...');
    
    if (unifiedUsers.length > 0) {
      // Clear existing unified users collection if it exists
      await db.collection('unifiedusers').drop().catch(() => {
        console.log('No existing unifiedusers collection to drop');
      });
      
      // Insert all unified users
      const result = await db.collection('unifiedusers').insertMany(unifiedUsers);
      console.log(`✅ Inserted ${result.insertedCount} unified users`);
      
      // Verify insertion
      const count = await db.collection('unifiedusers').countDocuments();
      console.log(`📊 Total unified users in database: ${count}`);
    } else {
      console.log('⚠️  No users to migrate');
    }

    // Step 6: Create indexes for performance
    console.log('\n🔍 Step 6: Creating indexes...');
    await db.collection('unifiedusers').createIndex({ email: 1 }, { unique: true });
    await db.collection('unifiedusers').createIndex({ role: 1 });
    await db.collection('unifiedusers').createIndex({ primaryLodge: 1 });
    await db.collection('unifiedusers').createIndex({ lodges: 1 });
    await db.collection('unifiedusers').createIndex({ status: 1 });
    console.log('✅ Indexes created');

    // Step 7: Verification
    console.log('\n🔍 Step 7: Verification...');
    const verificationCount = await db.collection('unifiedusers').countDocuments();
    const originalTotal = users.length + members.length;
    const uniqueEmails = emailMap.size;
    
    console.log(`- Original total records: ${originalTotal}`);
    console.log(`- Unique emails processed: ${uniqueEmails}`);
    console.log(`- Unified users created: ${verificationCount}`);
    
    if (verificationCount === uniqueEmails) {
      console.log('✅ Migration completed successfully!');
    } else {
      console.log('❌ Migration verification failed!');
    }

    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  } catch (error) {
    console.error('Error during migration:', error);
  }
}

migrateToUnifiedUsers(); 