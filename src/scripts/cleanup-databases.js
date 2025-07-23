const { MongoClient } = require('mongodb');

async function cleanupDatabase() {
  const uri = 'mongodb://localhost:27017/palmlebanon';
  const client = new MongoClient(uri);

  try {
    // Connect to database
    await client.connect();
    console.log('Connected to database');

    const db = client.db('palmlebanon');

    // Get all collections
    const collections = await db.listCollections().toArray();

    console.log('\nStarting database cleanup...');
    console.log('========================');

    for (const collection of collections) {
      const collectionName = collection.name;
      console.log(`\nProcessing collection: ${collectionName}`);

      // Get all documents
      const docs = await db.collection(collectionName).find({}).toArray();
      console.log(`- Found ${docs.length} documents`);

      if (docs.length > 0) {
        // For members and users collections, handle email uniqueness
        if (collectionName === 'members' || collectionName === 'users') {
          const emails = new Set();
          const duplicates = [];

          // Find duplicate emails
          for (const doc of docs) {
            if (emails.has(doc.email)) {
              duplicates.push(doc);
            } else {
              emails.add(doc.email);
            }
          }

          if (duplicates.length > 0) {
            console.log(`- Found ${duplicates.length} duplicate documents`);
            // Remove duplicates
            for (const doc of duplicates) {
              await db.collection(collectionName).deleteOne({ _id: doc._id });
            }
            console.log(`- Removed ${duplicates.length} duplicate documents`);
          }
        }
      }
    }

    console.log('\nCleanup completed successfully!');
    console.log('===========================');

  } catch (error) {
    console.error('Error during cleanup:', error);
  } finally {
    await client.close();
    console.log('\nDisconnected from database');
  }
}

cleanupDatabase().catch(console.error); 