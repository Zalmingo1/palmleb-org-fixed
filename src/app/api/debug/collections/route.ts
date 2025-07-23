import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { getTokenData } from '@/lib/auth';
import { ObjectId } from 'mongodb';

export async function GET(req: NextRequest) {
  // Disable debug routes in production
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Debug endpoints disabled in production' }, { status: 404 });
  }

  try {
    const token = await getTokenData(req);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { db } = await connectToDatabase();

    // Get all collections
    const collections = await db.listCollections().toArray();

    // Get sample data from each collection
    const data: Record<string, any> = {};
    
    // Users collection
    const users = await db.collection('users')
      .find({})
      .limit(5)
      .toArray();
    data.users = users.map(u => ({
      _id: u._id.toString(),
      name: u.name,
      email: u.email
    }));

    // Events collection
    const events = await db.collection('events')
      .find({})
      .limit(5)
      .toArray();
    data.events = events.map(e => ({
      _id: e._id.toString(),
      title: e.title,
      attendees: e.attendees
    }));

    // EventAttendees collection - get ALL registrations
    const eventAttendees = await db.collection('eventAttendees')
      .find({})
      .toArray();
    data.eventAttendees = eventAttendees.map(ea => ({
      _id: ea._id.toString(),
      userId: ea.userId.toString(),
      eventId: ea.eventId.toString()
    }));

    // Get the current user's details
    const currentUser = await db.collection('users')
      .findOne({ _id: new ObjectId(token.userId) });
    data.currentUser = currentUser ? {
      _id: currentUser._id.toString(),
      name: currentUser.name,
      email: currentUser.email
    } : null;

    // Get all registrations for the current user
    const userRegistrations = await db.collection('eventAttendees')
      .find({ userId: new ObjectId(token.userId) })
      .toArray();
    data.userRegistrations = userRegistrations.map(reg => ({
      _id: reg._id.toString(),
      userId: reg.userId.toString(),
      eventId: reg.eventId.toString()
    }));

    // Get all users who have registered for any event
    const registeredUserIds = Array.from(new Set(eventAttendees.map(ea => ea.userId.toString())));
    const registeredUsers = await db.collection('users')
      .find({ _id: { $in: registeredUserIds.map(id => new ObjectId(id)) } })
      .project({ _id: 1, name: 1, email: 1 })
      .toArray();
    data.registeredUsers = registeredUsers.map(u => ({
      _id: u._id.toString(),
      name: u.name,
      email: u.email
    }));

    return NextResponse.json({
      collections: collections.map(c => c.name),
      data,
      debug: {
        tokenUserId: token.userId,
        registeredUserIds,
        registeredUsersCount: registeredUsers.length,
        eventAttendeesCount: eventAttendees.length,
        userRegistrationsCount: userRegistrations.length
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Debug endpoint failed' },
      { status: 500 }
    );
  }
} 