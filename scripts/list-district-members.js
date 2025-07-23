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

async function listDistrictMembers(districtLodgeId) {
  try {
    const db = await connectToDatabase();
    
    console.log('Listing members for district lodge:', districtLodgeId);
    
    // Find all members in the district
    const members = await db.collection('members').find({
      primaryLodge: districtLodgeId
    }).toArray();
    
    if (members.length === 0) {
      console.log('No members found in this district');
      return;
    }
    
    console.log(`\nFound ${members.length} members in the district:\n`);
    
    members.forEach((member, index) => {
      const name = member.firstName && member.lastName 
        ? `${member.firstName} ${member.lastName}`.trim()
        : member.name || 'Unknown Member';
      
      console.log(`${index + 1}. ${name}`);
      console.log(`   ID: ${member._id}`);
      console.log(`   Email: ${member.email}`);
      console.log(`   Role: ${member.role}`);
      console.log(`   Status: ${member.status || 'active'}`);
      console.log(`   Primary Lodge: ${member.primaryLodge}`);
      console.log('');
    });
    
    // Show district admin candidates (non-district admins)
    const candidates = members.filter(m => m.role !== 'DISTRICT_ADMIN');
    
    if (candidates.length > 0) {
      console.log('\n=== District Admin Transfer Candidates ===');
      candidates.forEach((member, index) => {
        const name = member.firstName && member.lastName 
          ? `${member.firstName} ${member.lastName}`.trim()
          : member.name || 'Unknown Member';
        
        console.log(`${index + 1}. ${name} (${member.role})`);
        console.log(`   ID: ${member._id}`);
        console.log(`   Email: ${member.email}`);
        console.log('');
      });
    }
    
  } catch (error) {
    console.error('Error listing district members:', error);
  } finally {
    await mongoose.disconnect();
  }
}

// Command line usage
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length !== 1) {
    console.log('Usage: node list-district-members.js <districtLodgeId>');
    console.log('Example: node list-district-members.js 681e751c2b05d4bc4be15dfc');
    process.exit(1);
  }
  
  const districtLodgeId = args[0];
  
  listDistrictMembers(districtLodgeId)
    .then(() => {
      console.log('Listing completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('Script error:', error);
      process.exit(1);
    });
}

module.exports = { listDistrictMembers }; 