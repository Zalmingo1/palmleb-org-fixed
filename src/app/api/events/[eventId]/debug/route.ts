import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { getTokenData } from '@/lib/auth';
import { ObjectId } from 'mongodb';

export async function GET(
  req: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const token = await getTokenData(req);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    const eventId = params.eventId;

    // Get the event details
    const event = await db.collection('events').findOne({ _id: new ObjectId(eventId) });
    console.log('Event details:', event);

    // Get all registrations for this event
    const registrations = await db.collection('eventAttendees')
      .find({ eventId: new ObjectId(eventId) })
      .toArray();
    console.log('Registrations:', registrations);

    // Get user details for each registration
    const attendeeIds = registrations.map(reg => reg.userId);
    console.log('Attendee IDs:', attendeeIds);

    // Try to find users with both ObjectId and string formats
    const attendees = await db.collection('users')
      .find({
        $or: [
          { _id: { $in: attendeeIds.map(id => new ObjectId(id)) } },
          { _id: { $in: attendeeIds.map(id => id.toString()) } }
        ]
      })
      .project({ name: 1, email: 1, _id: 1 })
      .toArray();
    console.log('Found attendees:', attendees);

    // Get a sample user to check the ID format
    const sampleUser = await db.collection('users').findOne({});
    console.log('Sample user:', sampleUser);

    // Get the current user's details
    const currentUser = await db.collection('users')
      .findOne({ _id: new ObjectId(token.userId) });
    console.log('Current user:', currentUser);

    // Get all users to check their IDs
    const allUsers = await db.collection('users')
      .find({})
      .project({ _id: 1, name: 1, email: 1 })
      .limit(5)
      .toArray();
    console.log('Sample users from database:', allUsers);

    // Try to find each attendee individually
    const individualAttendeeChecks = await Promise.all(
      attendeeIds.map(async (id) => {
        const user = await db.collection('users').findOne({ _id: new ObjectId(id) });
        return {
          id: id.toString(),
          found: !!user,
          user: user ? {
            _id: user._id.toString(),
            name: user.name,
            email: user.email
          } : null
        };
      })
    );
    console.log('Individual attendee checks:', individualAttendeeChecks);

    return NextResponse.json({
      event: event ? {
        _id: event._id.toString(),
        title: event.title,
        attendees: event.attendees
      } : null,
      registrations: registrations.map(reg => ({
        _id: reg._id.toString(),
        userId: reg.userId.toString(),
        eventId: reg.eventId.toString()
      })),
      attendees: attendees.map(att => ({
        _id: att._id.toString(),
        name: att.name,
        email: att.email
      })),
      debug: {
        eventId,
        attendeeIds: attendeeIds.map(id => id.toString()),
        tokenUserId: token.userId,
        sampleUserId: sampleUser?._id?.toString(),
        currentUserId: currentUser?._id?.toString(),
        sampleUsers: allUsers.map(u => ({
          _id: u._id.toString(),
          name: u.name,
          email: u.email
        })),
        individualAttendeeChecks
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