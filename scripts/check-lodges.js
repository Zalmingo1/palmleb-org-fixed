const mongoose = require('mongoose');

async function checkLodges() {
  try {
    await mongoose.connect('mongodb://localhost:27017/palmlebanon');
    console.log('Connected to MongoDB');
    
    const db = mongoose.connection.db;
    const lodges = await db.collection('lodges').find({}).toArray();
    
    console.log('\nAll lodges:');
    lodges.forEach(lodge => {
      console.log(`${lodge.name} (ID: ${lodge._id})`);
    });
    
    // Check district lodge specifically
    const districtLodge = lodges.find(l => l.name.includes('District Grand Lodge'));
    if (districtLodge) {
      console.log(`\nDistrict Lodge: ${districtLodge.name} (ID: ${districtLodge._id})`);
    }
    
    // Check members in each lodge
    console.log('\nMembers by lodge:');
    for (const lodge of lodges) {
      const members = await db.collection('members').find({ primaryLodge: lodge._id.toString() }).toArray();
      console.log(`${lodge.name}: ${members.length} members`);
      members.forEach(member => {
        const name = member.firstName && member.lastName 
          ? `${member.firstName} ${member.lastName}`.trim()
          : member.name || 'Unknown Member';
        console.log(`  - ${name} (${member.role})`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

checkLodges(); 