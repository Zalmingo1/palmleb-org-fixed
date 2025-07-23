const { MongoClient } = require('mongodb');

async function migrateData() {
  const sourceUri = 'mongodb://localhost:27017/palmleb';
  const targetUri = 'mongodb://localhost:27017/palmlebanon';
  
  const sourceClient = new MongoClient(sourceUri);
  const targetClient = new MongoClient(targetUri);

  try {
    // Connect to both databases
    await sourceClient.connect();
    await targetClient.connect();
    console.log('Connected to both databases');

    const sourceDb = sourceClient.db('palmleb');
    const targetDb = targetClient.db('palmlebanon');

    // Get all collections from source database
    const collections = await sourceDb.listCollections().toArray();
    console.log('Found collections:', collections.map(c => c.name));

    // Migrate each collection
    for (const collection of collections) {
      const collectionName = collection.name;
      console.log(`Migrating collection: ${collectionName}`);

      // Get all documents from source collection
      const documents = await sourceDb.collection(collectionName).find({}).toArray();
      console.log(`Found ${documents.length} documents in ${collectionName}`);

      if (documents.length > 0) {
        // Handle users collection differently due to unique email constraint
        if (collectionName === 'users') {
          const operations = documents.map(doc => {
            const { _id, ...updateDoc } = doc;
            return {
              updateOne: {
                filter: { email: doc.email },
                update: { $set: updateDoc },
                upsert: true
              }
            };
          });
          const result = await targetDb.collection(collectionName).bulkWrite(operations);
          console.log(`Users collection: Upserted ${result.upsertedCount} documents, modified ${result.modifiedCount} documents`);
        } else {
          // For other collections, use _id as filter but don't update it
          const operations = documents.map(doc => {
            const { _id, ...updateDoc } = doc;
            return {
              updateOne: {
                filter: { _id },
                update: { $set: updateDoc },
                upsert: true
              }
            };
          });
          const result = await targetDb.collection(collectionName).bulkWrite(operations);
          console.log(`${collectionName}: Upserted ${result.upsertedCount} documents, modified ${result.modifiedCount} documents`);
        }
      }
    }

    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Error during migration:', error);
  } finally {
    await sourceClient.close();
    await targetClient.close();
    console.log('Disconnected from databases');
  }
}

migrateData().catch(console.error); 