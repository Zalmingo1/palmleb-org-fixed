const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const memberSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  email: String,
  password: String,
  role: String,
  primaryLodge: mongoose.Schema.Types.ObjectId,
  primaryLodgePosition: String,
  status: String
});

const Member = mongoose.models.Member || mongoose.model('Member', memberSchema);

async function createTestMember() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Create a test member
    const member = new Member({
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      password: 'password123',
      role: 'LODGE_MEMBER',
      primaryLodge: new mongoose.Types.ObjectId(), // You'll need to replace this with a valid lodge ID
      primaryLodgePosition: 'MEMBER',
      status: 'active'
    });

    await member.save();
    console.log('Test member created:', member._id.toString());
    
    // List all members
    const allMembers = await Member.find({}, '_id name email');
    console.log('All members in database:', allMembers);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

createTestMember(); 