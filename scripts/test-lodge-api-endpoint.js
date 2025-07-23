// Using built-in fetch (Node.js 18+)

async function testLodgeAPIEndpoint() {
  try {
    console.log('\n=== TESTING LODGE API ENDPOINT ===\n');

    const districtLodgeId = '681e751c2b05d4bc4be15dfc';
    const url = `http://localhost:3000/api/lodges/${districtLodgeId}`;

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
    
    console.log('\nLodge data:');
    console.log('- ID:', data._id);
    console.log('- Name:', data.name);
    console.log('- Member count:', data.members);
    console.log('- Member details count:', data.memberDetails?.length || 0);

    console.log('\nMember details:');
    if (data.memberDetails && data.memberDetails.length > 0) {
      data.memberDetails.forEach((member, index) => {
        console.log(`${index + 1}. ${member.name} (${member.email}) - Role: ${member.role} - Position: ${member.position}`);
      });
    } else {
      console.log('No member details found');
    }

    // Check if test 8 is in the member details
    const test8InDetails = data.memberDetails?.find(m => m.email === 'test8@example.com');
    console.log('\n=== TEST 8 CHECK ===');
    console.log('Test 8 in member details:', !!test8InDetails);
    if (test8InDetails) {
      console.log('Test 8 details:', {
        name: test8InDetails.name,
        email: test8InDetails.email,
        role: test8InDetails.role,
        position: test8InDetails.position
      });
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

testLodgeAPIEndpoint(); 