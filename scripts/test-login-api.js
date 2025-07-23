const fetch = require('node-fetch');

async function testLoginAPI() {
  console.log('\n=== TESTING UNIFIED LOGIN API ===\n');

  const baseUrl = 'http://localhost:3001';
  
  // Test cases with known users
  const testCases = [
    {
      email: 'test1@example.com',
      password: 'password123',
      description: 'Test user with merged data'
    },
    {
      email: 'test2@example.com', 
      password: 'password123',
      description: 'Another test user'
    },
    {
      email: 'superadmin@palmleb.org',
      password: 'admin123',
      description: 'Super admin (may need password setup)'
    }
  ];

  for (const testCase of testCases) {
    console.log(`\n🔐 Testing: ${testCase.description}`);
    console.log(`Email: ${testCase.email}`);
    
    try {
      const response = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: testCase.email,
          password: testCase.password
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        console.log('✅ Login successful!');
        console.log(`- User ID: ${data.user._id}`);
        console.log(`- Name: ${data.user.name}`);
        console.log(`- Role: ${data.user.role}`);
        console.log(`- Has token: ${!!data.token}`);
        console.log(`- Token length: ${data.token?.length || 0}`);
      } else {
        console.log('❌ Login failed');
        console.log(`- Status: ${response.status}`);
        console.log(`- Error: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.log('❌ Request failed');
      console.log(`- Error: ${error.message}`);
    }
  }

  console.log('\n=== LOGIN API TEST COMPLETE ===');
}

testLoginAPI(); 