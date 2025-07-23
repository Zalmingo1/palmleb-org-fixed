const axios = require('axios');

async function testLogin() {
  const baseURL = 'http://localhost:3000'; // or 3001, 3002 depending on which port is available
  const testUsers = [
    { email: 'test1@example.com', password: 'Qwe123123' },
    { email: 'test2@example.com', password: 'Qwe123123' },
    { email: 'test3@example.com', password: 'Qwe123123' },
    { email: 'test4@example.com', password: 'Qwe123123' },
    { email: 'test5@example.com', password: 'Qwe123123' },
    { email: 'test6@example.com', password: 'Qwe123123' },
    { email: 'test7@example.com', password: 'Qwe123123' },
    { email: 'superadmin@palmleb.org', password: 'password123' },
    { email: 'districtadmin@palmleb.org', password: 'password123' },
    { email: 'lodgeadmin@palmleb.org', password: 'password123' }
  ];

  console.log('Testing login for all users...\n');

  for (const user of testUsers) {
    try {
      console.log(`Testing login for: ${user.email}`);
      
      const response = await axios.post(`${baseURL}/api/auth/login`, {
        email: user.email,
        password: user.password
      });

      if (response.data.success) {
        console.log(`✅ Login successful for ${user.email}`);
        console.log(`   Role: ${response.data.user.role}`);
        console.log(`   Name: ${response.data.user.name}`);
        console.log(`   Token: ${response.data.token.substring(0, 20)}...`);
      } else {
        console.log(`❌ Login failed for ${user.email}: ${response.data.error}`);
      }
    } catch (error) {
      if (error.response) {
        console.log(`❌ Login failed for ${user.email}: ${error.response.data.error}`);
      } else {
        console.log(`❌ Network error for ${user.email}: ${error.message}`);
      }
    }
    console.log('');
  }
}

testLogin().catch(console.error); 