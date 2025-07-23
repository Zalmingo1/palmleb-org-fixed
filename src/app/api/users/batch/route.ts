import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { getTokenData } from '@/lib/auth';
import { ObjectId } from 'mongodb';

export async function POST(req: NextRequest) {
  try {
    const token = await getTokenData(req);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userIds } = await req.json();
    if (!userIds || !Array.isArray(userIds)) {
      return NextResponse.json({ error: 'Invalid user IDs' }, { status: 400 });
    }

    const { db } = await connectToDatabase();

    console.log('Looking for users with IDs:', userIds);

    // First, let's check if these users exist at all
    const allUsers = await db.collection('members')
      .find({})
      .project({ _id: 1, name: 1, email: 1 })
      .limit(5)
      .toArray();

    console.log('Sample users in database:', allUsers.map(u => ({
      _id: u._id.toString(),
      name: u.name,
      email: u.email
    })));

    // Try to find the specific users
    const users = await db.collection('members')
      .find({
        $or: [
          { _id: { $in: userIds.map(id => new ObjectId(id)) } },
          { _id: { $in: userIds } }
        ]
      })
      .project({ name: 1, email: 1, _id: 1 })
      .toArray();

    console.log('Found users:', users.map(u => ({
      _id: u._id.toString(),
      name: u.name,
      email: u.email
    })));

    // If no users found, try to find them one by one
    if (users.length === 0) {
      console.log('No users found in batch query, trying individual queries...');
      for (const userId of userIds) {
        try {
          const user = await db.collection('members').findOne({ _id: new ObjectId(userId) });
          console.log(`User ${userId}:`, user ? {
            _id: user._id.toString(),
            name: user.name,
            email: user.email
          } : 'Not found');
        } catch (error) {
          console.log(`Error looking up user ${userId}:`, error);
        }
      }
    }

    return NextResponse.json({ 
      users,
      debug: {
        requestedIds: userIds,
        sampleUsers: allUsers.map(u => ({
          _id: u._id.toString(),
          name: u.name,
          email: u.email
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users', details: error },
      { status: 500 }
    );
  }
} 