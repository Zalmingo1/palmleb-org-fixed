const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function listLodges() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;
    
    const lodges = await db.collection('lodges').find({}).toArray();
    
    console.log(`Total lodges in database: ${lodges.length}`);
    console.log('\nAll lodges:');
    lodges.forEach((lodge, index) => {
      console.log(`${index + 1}. ${lodge.name} (ID: ${lodge._id})`);
      console.log(`   Location: ${lodge.location || 'N/A'}`);
      console.log('---');
    });
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

listLodges(); 