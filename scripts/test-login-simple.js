const https = require('https');
const http = require('http');

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
      const postData = JSON.stringify({
        email: testCase.email,
        password: testCase.password
      });

      const options = {
        hostname: 'localhost',
        port: 3001,
        path: '/api/auth/login',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      const req = http.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            const responseData = JSON.parse(data);
            
            if (res.statusCode === 200) {
              console.log('✅ Login successful!');
              console.log(`- User ID: ${responseData.user._id}`);
              console.log(`- Name: ${responseData.user.name}`);
              console.log(`- Role: ${responseData.user.role}`);
              console.log(`- Has token: ${!!responseData.token}`);
              console.log(`- Token length: ${responseData.token?.length || 0}`);
            } else {
              console.log('❌ Login failed');
              console.log(`- Status: ${res.statusCode}`);
              console.log(`- Error: ${responseData.error || 'Unknown error'}`);
            }
          } catch (parseError) {
            console.log('❌ Failed to parse response');
            console.log(`- Status: ${res.statusCode}`);
            console.log(`- Raw response: ${data}`);
          }
        });
      });

      req.on('error', (error) => {
        console.log('❌ Request failed');
        console.log(`- Error: ${error.message}`);
      });

      req.write(postData);
      req.end();

      // Wait a bit between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.log('❌ Request failed');
      console.log(`- Error: ${error.message}`);
    }
  }

  console.log('\n=== LOGIN API TEST COMPLETE ===');
}

testLoginAPI(); 