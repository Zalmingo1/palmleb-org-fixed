const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function transferDistrictAdmin(fromEmail, toEmail) {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;
    
    console.log(`Transferring district admin privileges from ${fromEmail} to ${toEmail}...`);
    
    // Find the current district admin
    const currentAdmin = await db.collection('members').findOne({ 
      email: fromEmail,
      role: 'DISTRICT_ADMIN'
    });
    
    if (!currentAdmin) {
      console.error(`No district admin found with email: ${fromEmail}`);
      return;
    }
    
    // Find the new district admin candidate
    const newAdmin = await db.collection('members').findOne({ 
      email: toEmail 
    });
    
    if (!newAdmin) {
      console.error(`No member found with email: ${toEmail}`);
      return;
    }
    
    // Check if the new admin is a member of the District Grand Lodge of Syria-Lebanon
    const districtLodgeId = '681e751c2b05d4bc4be15dfc'; // District Grand Lodge of Syria-Lebanon
    
    const isDistrictMember = newAdmin.primaryLodge === districtLodgeId || 
                           (newAdmin.lodges && newAdmin.lodges.includes(districtLodgeId)) ||
                           (newAdmin.lodgeMemberships && newAdmin.lodgeMemberships.some(membership => 
                             membership.lodge === districtLodgeId));
    
    if (!isDistrictMember) {
      console.error(`❌ Error: ${toEmail} is not a member of the District Grand Lodge of Syria-Lebanon`);
      console.error(`   The new district admin must be a member of the district grand lodge.`);
      return;
    }
    
    // Update the current admin to LODGE_MEMBER
    await db.collection('members').updateOne(
      { email: fromEmail },
      { $set: { role: 'LODGE_MEMBER' } }
    );
    
    // Update the new admin to DISTRICT_ADMIN
    await db.collection('members').updateOne(
      { email: toEmail },
      { $set: { role: 'DISTRICT_ADMIN' } }
    );
    
    console.log(`✅ Successfully transferred district admin privileges:`);
    console.log(`   From: ${fromEmail} (now LODGE_MEMBER)`);
    console.log(`   To: ${toEmail} (now DISTRICT_ADMIN)`);
    console.log(`   ✅ Verified: ${toEmail} is a member of the District Grand Lodge of Syria-Lebanon`);
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

// Usage: node scripts/transfer-district-admin.js "old-admin@example.com" "new-admin@example.com"
const fromEmail = process.argv[2];
const toEmail = process.argv[3];

if (!fromEmail || !toEmail) {
  console.log('Usage: node scripts/transfer-district-admin.js "old-admin@example.com" "new-admin@example.com"');
  console.log('Example: node scripts/transfer-district-admin.js "admin@example.com" "newadmin@example.com"');
  process.exit(1);
}

transferDistrictAdmin(fromEmail, toEmail); 