import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { getTokenData } from '@/lib/auth';
import { ObjectId } from 'mongodb';

export async function GET(req: NextRequest) {
  try {
    const token = await getTokenData(req);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { db } = await connectToDatabase();

    // Get all collections
    const collections = await db.listCollections().toArray();
    console.log('Available collections:', collections.map(c => c.name));

    // Get raw data from each collection
    const data: Record<string, any> = {};
    
    // Users collection
    const users = await db.collection('users')
      .find({})
      .toArray();
    data.users = users.map(u => ({
      _id: u._id.toString(),
      name: u.name,
      email: u.email,
      raw: u
    }));

    // Events collection
    const events = await db.collection('events')
      .find({})
      .toArray();
    data.events = events.map(e => ({
      _id: e._id.toString(),
      title: e.title,
      attendees: e.attendees,
      raw: e
    }));

    // EventAttendees collection
    const eventAttendees = await db.collection('eventAttendees')
      .find({})
      .toArray();
    data.eventAttendees = eventAttendees.map(ea => ({
      _id: ea._id.toString(),
      userId: ea.userId.toString(),
      eventId: ea.eventId.toString(),
      raw: ea
    }));

    // Get the current user's details
    const currentUser = await db.collection('users')
      .findOne({ _id: new ObjectId(token.userId) });
    data.currentUser = currentUser ? {
      _id: currentUser._id.toString(),
      name: currentUser.name,
      email: currentUser.email,
      raw: currentUser
    } : null;

    // Get all registrations for the current user
    const userRegistrations = await db.collection('eventAttendees')
      .find({ userId: new ObjectId(token.userId) })
      .toArray();
    data.userRegistrations = userRegistrations.map(reg => ({
      _id: reg._id.toString(),
      userId: reg.userId.toString(),
      eventId: reg.eventId.toString(),
      raw: reg
    }));

    // Get all users who have registered for any event
    const registeredUserIds = Array.from(new Set(eventAttendees.map(ea => ea.userId.toString())));
    const registeredUsers = await db.collection('users')
      .find({ _id: { $in: registeredUserIds.map(id => new ObjectId(id)) } })
      .toArray();
    data.registeredUsers = registeredUsers.map(u => ({
      _id: u._id.toString(),
      name: u.name,
      email: u.email,
      raw: u
    }));

    // Try to find each registered user individually
    const userLookupResults = await Promise.all(
      registeredUserIds.map(async (id) => {
        // Try with ObjectId
        const userWithObjectId = await db.collection('users').findOne({ _id: new ObjectId(id) });

        return {
          id,
          foundWithObjectId: !!userWithObjectId,
          userWithObjectId: userWithObjectId ? {
            _id: userWithObjectId._id.toString(),
            name: userWithObjectId.name,
            email: userWithObjectId.email
          } : null
        };
      })
    );

    return NextResponse.json({
      collections: collections.map(c => c.name),
      data,
      debug: {
        tokenUserId: token.userId,
        registeredUserIds,
        registeredUsersCount: registeredUsers.length,
        eventAttendeesCount: eventAttendees.length,
        userRegistrationsCount: userRegistrations.length,
        usersCount: users.length,
        eventsCount: events.length,
        userLookupResults
      }
    });
  } catch (error) {
    console.error('Error in debug endpoint:', error);
    return NextResponse.json(
      { error: 'Debug endpoint failed', details: error },
      { status: 500 }
    );
  }
} 