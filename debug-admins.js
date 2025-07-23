const { MongoClient } = require('mongodb');

async function debugAdmins() {
  const client = new MongoClient(process.env.MONGODB_URI || 'mongodb://localhost:27017/palmleb');
  
  try {
    await client.connect();
    const db = client.db();
    
    console.log('=== COMPREHENSIVE ADMIN CHECK ===');
    
    // Check all collections for admins
    const collections = ['members', 'users', 'unifiedusers'];
    
    for (const collectionName of collections) {
      console.log(`\n--- ${collectionName.toUpperCase()} COLLECTION ---`);
      
      try {
        const collection = db.collection(collectionName);
        
        // Check all admin roles
        const allAdmins = await collection.find({
          role: { $in: ['SUPER_ADMIN', 'DISTRICT_ADMIN', 'LODGE_ADMIN'] }
        }).toArray();
        
        if (allAdmins.length === 0) {
          console.log(`No admins found in ${collectionName}`);
        } else {
          console.log(`Found ${allAdmins.length} admins in ${collectionName}:`);
          
          // Group by role
          const byRole = {};
          allAdmins.forEach(admin => {
            if (!byRole[admin.role]) byRole[admin.role] = [];
            byRole[admin.role].push(admin);
          });
          
          Object.keys(byRole).forEach(role => {
            console.log(`\n  ${role}:`);
            byRole[role].forEach(admin => {
              const name = admin.firstName && admin.lastName 
                ? `${admin.firstName} ${admin.lastName}`
                : admin.name || 'Unknown';
              console.log(`    - ${name} (${admin.email})`);
              console.log(`      Primary Lodge: ${admin.primaryLodge}`);
              console.log(`      Administered Lodges: ${admin.administeredLodges ? admin.administeredLodges.join(', ') : 'None'}`);
              console.log(`      ID: ${admin._id}`);
            });
          });
        }
        
        // Also check for any users with lodge admin role specifically
        const lodgeAdmins = await collection.find({ role: 'LODGE_ADMIN' }).toArray();
        if (lodgeAdmins.length > 0) {
          console.log(`\n  LODGE ADMINS DETAILS:`);
          lodgeAdmins.forEach(admin => {
            const name = admin.firstName && admin.lastName 
              ? `${admin.firstName} ${admin.lastName}`
              : admin.name || 'Unknown';
            console.log(`    - ${name} (${admin.email})`);
            console.log(`      Primary Lodge: ${admin.primaryLodge}`);
            console.log(`      Administered Lodges: ${admin.administeredLodges ? admin.administeredLodges.join(', ') : 'None'}`);
            console.log(`      ID: ${admin._id}`);
          });
        }
        
      } catch (err) {
        console.log(`Error checking ${collectionName}:`, err.message);
      }
    }
    
    // Check for any users with administeredLodges field
    console.log('\n--- USERS WITH ADMINISTERED LODGES ---');
    for (const collectionName of collections) {
      try {
        const collection = db.collection(collectionName);
        const usersWithAdministeredLodges = await collection.find({
          administeredLodges: { $exists: true, $ne: [] }
        }).toArray();
        
        if (usersWithAdministeredLodges.length > 0) {
          console.log(`\n${collectionName}:`);
          usersWithAdministeredLodges.forEach(user => {
            const name = user.firstName && user.lastName 
              ? `${user.firstName} ${user.lastName}`
              : user.name || 'Unknown';
            console.log(`  - ${name} (${user.email}) - ${user.role}`);
            console.log(`    Administered Lodges: ${user.administeredLodges.join(', ')}`);
          });
        }
      } catch (err) {
        console.log(`Error checking administered lodges in ${collectionName}:`, err.message);
      }
    }
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.close();
  }
}

debugAdmins(); 