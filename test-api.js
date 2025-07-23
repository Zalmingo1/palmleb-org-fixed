const fetch = require('node-fetch');

async function testAPI() {
  try {
    // Generate a fake token for testing
    const token = 'test-token-123';
    
    console.log('Testing member API for Test 8...');
    
    const response = await fetch('http://localhost:3000/api/members/68715014bd280343b518f24c', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    const data = await response.json();
    console.log('Response data:', JSON.stringify(data, null, 2));
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testAPI(); 