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

    // Get all members
    const members = await db.collection('members')
      .find({})
      .toArray();
    console.log('All members:', members);

    // Get the current user
    const currentUser = await db.collection('members')
      .findOne({ _id: new ObjectId(token.userId) });
    console.log('Current user:', currentUser);

    // Get all event registrations
    const eventAttendees = await db.collection('eventAttendees')
      .find({})
      .toArray();
    console.log('All event registrations:', eventAttendees);

    // Get all registered user IDs
    const registeredUserIds = Array.from(new Set(eventAttendees.map(ea => ea.userId.toString())));
    console.log('Registered user IDs:', registeredUserIds);

    // Try to find each registered user
    const registeredUsers = await db.collection('members')
      .find({ _id: { $in: registeredUserIds.map(id => new ObjectId(id)) } })
      .toArray();
    console.log('Found registered users:', registeredUsers);

    // Get all user IDs in the database
    const allUserIds = members.map(m => m._id.toString());
    console.log('All user IDs in database:', allUserIds);

    // Check if registered users exist in the database
    const missingUsers = registeredUserIds.filter(id => !allUserIds.includes(id));
    console.log('Missing user IDs:', missingUsers);

    return NextResponse.json({
      users: members.map(m => ({
        _id: m._id.toString(),
        name: m.name || `${m.firstName} ${m.lastName}`,
        email: m.email,
        raw: m
      })),
      currentUser: currentUser ? {
        _id: currentUser._id.toString(),
        name: currentUser.name || `${currentUser.firstName} ${currentUser.lastName}`,
        email: currentUser.email,
        raw: currentUser
      } : null,
      eventAttendees: eventAttendees.map(ea => ({
        _id: ea._id.toString(),
        userId: ea.userId.toString(),
        eventId: ea.eventId.toString(),
        raw: ea
      })),
      debug: {
        registeredUserIds,
        allUserIds,
        missingUsers,
        registeredUsersCount: registeredUsers.length,
        eventAttendeesCount: eventAttendees.length,
        membersCount: members.length
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