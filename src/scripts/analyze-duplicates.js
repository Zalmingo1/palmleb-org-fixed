const { MongoClient } = require('mongodb');

async function analyzeDuplicates() {
  const uri = 'mongodb://localhost:27017/palmlebanon';
  const client = new MongoClient(uri);

  try {
    // Connect to database
    await client.connect();
    console.log('Connected to database');

    const db = client.db('palmlebanon');

    // Get all collections
    const collections = await db.listCollections().toArray();

    console.log('\nCollection Analysis:');
    console.log('===================');
    
    // Analyze each collection
    for (const collection of collections) {
      const collectionName = collection.name;
      console.log(`\nAnalyzing collection: ${collectionName}`);
      
      // Get count of documents
      const count = await db.collection(collectionName).countDocuments();
      console.log(`- Total documents: ${count}`);

      // For members and users collections, check for email duplicates
      if (collectionName === 'members' || collectionName === 'users') {
        const docs = await db.collection(collectionName)
          .find({}, { projection: { email: 1 } })
          .toArray();
        
        const emailCounts = {};
        const duplicates = [];

        // Count occurrences of each email
        for (const doc of docs) {
          if (emailCounts[doc.email]) {
            emailCounts[doc.email]++;
            if (emailCounts[doc.email] === 2) {
              duplicates.push(doc.email);
            }
          } else {
            emailCounts[doc.email] = 1;
          }
        }
        
        console.log(`- Duplicate emails found: ${duplicates.length}`);
        if (duplicates.length > 0) {
          console.log('  Duplicate emails:');
          duplicates.forEach(email => console.log(`  - ${email}`));
        }
      }
    }

  } catch (error) {
    console.error('Error during analysis:', error);
  } finally {
    await client.close();
    console.log('\nDisconnected from database');
  }
}

analyzeDuplicates().catch(console.error); 