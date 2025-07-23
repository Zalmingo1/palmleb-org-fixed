// Using built-in fetch (Node.js 18+)

async function testLodgesAPI() {
  try {
    console.log('\n=== TESTING LODGES API ===\n');

    const url = 'http://localhost:3000/api/lodges?district=true';

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
    
    console.log('\nLodges data:');
    console.log('- Total lodges:', data.length);

    console.log('\nLodge details:');
    if (data && data.length > 0) {
      data.forEach((lodge, index) => {
        console.log(`${index + 1}. ${lodge.name}`);
        console.log(`   Location: ${lodge.location}`);
        console.log(`   Total members: ${lodge.memberCount}`);
        console.log(`   Active members: ${lodge.activeMemberCount}`);
        console.log(`   Is active: ${lodge.isActive}`);
      });
    } else {
      console.log('No lodges found');
    }

    // Check District Grand Lodge specifically
    const districtLodge = data?.find(lodge => lodge.name === 'District Grand Lodge of Syria-Lebanon');
    if (districtLodge) {
      console.log('\n=== DISTRICT GRAND LODGE DETAILS ===');
      console.log('Name:', districtLodge.name);
      console.log('Total members:', districtLodge.memberCount);
      console.log('Active members:', districtLodge.activeMemberCount);
      console.log('Is active:', districtLodge.isActive);
    } else {
      console.log('\n❌ District Grand Lodge not found in response');
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

testLodgesAPI(); 