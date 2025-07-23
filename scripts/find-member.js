const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function findMemberByEmail(email) {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;
    const member = await db.collection('members').findOne({ email });
    if (!member) {
      console.log('No member found with email:', email);
    } else {
      console.log('Member document:', JSON.stringify(member, null, 2));
    }
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

findMemberByEmail('test6@example.com'); 