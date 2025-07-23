const { MongoClient, ObjectId } = require('mongodb');

async function createSamplePosts() {
  const uri = 'mongodb://localhost:27017/palmlebanon';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db('palmlebanon');
    
    // Check if posts collection exists, if not create it
    const collections = await db.listCollections().toArray();
    if (!collections.some(c => c.name === 'posts')) {
      await db.createCollection('posts');
      console.log('Created posts collection');
    }

    // Clear existing posts
    await db.collection('posts').deleteMany({});
    console.log('Cleared existing posts');

    // Create sample posts
    const samplePosts = [
      {
        authorId: '507f1f77bcf86cd799439011', // Sample user ID
        authorName: 'John Smith',
        authorLodge: 'Phoenix Lodge',
        content: 'Welcome to our lodge! I\'m excited to see all the new members joining our community. Let\'s work together to strengthen our brotherhood.',
        files: [],
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        status: 'approved',
        likes: 15,
        comments: []
      },
      {
        authorId: '507f1f77bcf86cd799439012', // Sample user ID
        authorName: 'David Wilson',
        authorLodge: 'Cedar Lodge',
        content: 'Reminder to all brothers: Our annual charity event is scheduled for next month. Please mark your calendars and prepare to contribute to this noble cause.',
        files: [],
        createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), // 5 hours ago
        status: 'approved',
        likes: 8,
        comments: []
      },
      {
        authorId: '507f1f77bcf86cd799439013', // Sample user ID
        authorName: 'Michael Brown',
        authorLodge: 'Harmony Lodge',
        content: 'The minutes from our last meeting have been uploaded to the document library. Please review them before our next gathering.',
        files: [],
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
        status: 'approved',
        likes: 12,
        comments: []
      },
      {
        authorId: '507f1f77bcf86cd799439014', // Sample user ID
        authorName: 'Robert Johnson',
        authorLodge: 'Mount Lebanon Lodge',
        content: 'Annual dues reminder: Please ensure your membership dues are paid by the end of this month. Contact me if you have any questions about your status.',
        files: [],
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
        status: 'approved',
        likes: 24,
        comments: []
      },
      {
        authorId: '507f1f77bcf86cd799439015', // Sample user ID
        authorName: 'William Davis',
        authorLodge: 'Phoenix Lodge',
        content: 'I\'m pleased to announce that our lodge renovation project is now complete. Thanks to everyone who volunteered their time and skills!',
        files: [],
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
        status: 'approved',
        likes: 18,
        comments: []
      }
    ];

    const result = await db.collection('posts').insertMany(samplePosts);
    console.log(`Created ${result.insertedCount} sample posts`);
    console.log('Sample posts created successfully');

  } catch (error) {
    console.error('Error creating sample posts:', error);
  } finally {
    await client.close();
    console.log('Disconnected from MongoDB');
  }
}

createSamplePosts(); 