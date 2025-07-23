// Using built-in fetch (Node.js 18+)

async function testDistrictAPIEndpoint() {
  try {
    console.log('\n=== TESTING DISTRICT MEMBERS API ENDPOINT ===\n');

    const url = 'http://localhost:3000/api/members?district=true';

    console.log('Calling API:', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response:', errorText);
      return;
    }

    const data = await response.json();
    
    console.log('\nDistrict members data:');
    console.log('- Total members:', data.length);

    console.log('\nMember details:');
    if (data && data.length > 0) {
      data.forEach((member, index) => {
        console.log(`${index + 1}. ${member.name} (${member.email}) - Role: ${member.role} - Status: ${member.status}`);
        console.log(`   Primary Lodge: ${member.primaryLodge}`);
        console.log(`   Lodges: ${member.lodges || []}`);
      });
    } else {
      console.log('No member details found');
    }

    // Check specific members
    const test8InData = data?.find(m => m.email === 'test8@example.com');
    const test5InData = data?.find(m => m.email === 'test5@example.com');
    const test6InData = data?.find(m => m.email === 'test6@example.com');
    const test7InData = data?.find(m => m.email === 'test7@example.com');

    console.log('\n=== SPECIFIC MEMBER CHECKS ===');
    console.log('Test 8 in data:', !!test8InData);
    console.log('Test 5 in data:', !!test5InData);
    console.log('Test 6 in data:', !!test6InData);
    console.log('Test 7 in data:', !!test7InData);

    if (test8InData) {
      console.log('\nTest 8 details:');
      console.log('- Name:', test8InData.name);
      console.log('- Email:', test8InData.email);
      console.log('- Role:', test8InData.role);
      console.log('- Status:', test8InData.status);
      console.log('- Primary Lodge:', test8InData.primaryLodge);
      console.log('- Lodges:', test8InData.lodges);
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

testDistrictAPIEndpoint(); 