const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
require('dotenv').config({ path: 'env.local' });

async function testLoginFlow() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const { db } = await mongoose.connection;

    // Simulate the login API flow
    const email = 'test7@example.com';
    const password = 'Qwe123123';

    console.log('=== Testing Login Flow ===');
    console.log('Email:', email);
    console.log('Password:', password);

    // Step 1: Find user in User model first
    let user = await db.collection('users').findOne({ email });
    let isMember = false;

    console.log('\nStep 1: Check User model');
    if (user) {
      console.log('✅ Found in User model');
      console.log('- ID:', user._id);
      console.log('- Role:', user.role);
      console.log('- Status:', user.status);
      console.log('- Has passwordHash:', !!user.passwordHash);
    } else {
      console.log('❌ Not found in User model');
    }

    // Step 2: If not found in User, check Member model
    if (!user) {
      console.log('\nStep 2: Check Member model');
      user = await db.collection('members').findOne({ email });
      isMember = true;
      
      if (user) {
        console.log('✅ Found in Member model');
        console.log('- ID:', user._id);
        console.log('- Role:', user.role);
        console.log('- Has password:', !!user.password);
      } else {
        console.log('❌ Not found in Member model');
      }
    }

    if (!user) {
      console.log('\n❌ User not found in either collection');
      return;
    }

    // Step 3: Check if user is active (for User model)
    if (!isMember && user.status !== 'active') {
      console.log('\n❌ User account not active');
      return;
    }

    // Step 4: Verify password
    console.log('\nStep 4: Password verification');
    let isPasswordValid = false;

    if (isMember) {
      console.log('Using Member model password verification');
      if (!user.password) {
        console.log('❌ Member has no password set');
        return;
      }
      // Use bcrypt.compare directly like the Member model would
      isPasswordValid = await bcrypt.compare(password, user.password);
      console.log('Member password verification result:', isPasswordValid);
    } else {
      console.log('Using User model password verification');
      if (!user.passwordHash) {
        console.log('❌ User has no password hash set');
        return;
      }
      // Use bcrypt.compare directly like verifyPassword function
      isPasswordValid = await bcrypt.compare(password, user.passwordHash);
      console.log('User password verification result:', isPasswordValid);
    }

    if (!isPasswordValid) {
      console.log('\n❌ Password verification failed');
      return;
    }

    console.log('\n✅ Login would be successful!');
    console.log('User role:', user.role);
    console.log('Is member:', isMember);

    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  } catch (error) {
    console.error('Error:', error);
  }
}

testLoginFlow(); 