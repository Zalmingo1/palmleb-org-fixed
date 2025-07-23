const { MongoClient, ObjectId } = require('mongodb');

async function testDeleteMember() {
  const client = new MongoClient('mongodb://localhost:27017/palmlebanon');
  
  try {
    await client.connect();
    console.log('=== TESTING MEMBER DELETION ===');
    
    const db = client.db('palmlebanon');
    
    // Find the member we want to delete
    const memberToDelete = await db.collection('members').findOne({ 
      email: 'districtadmin@palmleb.org' 
    });
    
    if (memberToDelete) {
      console.log('Found member to delete:');
      console.log(`- Name: ${memberToDelete.name || memberToDelete.firstName || 'No name'}`);
      console.log(`- Email: ${memberToDelete.email}`);
      console.log(`- Role: ${memberToDelete.role}`);
      console.log(`- ID: ${memberToDelete._id}`);
      
      // Check if they have admin privileges
      const adminRoles = ['SUPER_ADMIN', 'DISTRICT_ADMIN', 'LODGE_ADMIN'];
      if (adminRoles.includes(memberToDelete.role)) {
        console.log(`❌ Cannot delete - user has admin role: ${memberToDelete.role}`);
        console.log('You need to change their role to LODGE_MEMBER first');
      } else {
        console.log('✅ User can be deleted (no admin privileges)');
        
        // Try to delete
        const result = await db.collection('members').deleteOne({ 
          _id: memberToDelete._id 
        });
        
        if (result.deletedCount > 0) {
          console.log('✅ Member deleted successfully');
        } else {
          console.log('❌ Failed to delete member');
        }
      }
    } else {
      console.log('❌ Member not found');
    }
    
    // Show remaining members
    const remainingMembers = await db.collection('members').find({}).toArray();
    console.log(`\nRemaining members: ${remainingMembers.length}`);
    
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await client.close();
    console.log('\nDisconnected from MongoDB');
  }
}

testDeleteMember(); 