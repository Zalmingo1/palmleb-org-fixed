import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { getTokenData } from '@/lib/auth';
import { ObjectId } from 'mongodb';

export async function POST(
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
    const userId = token.userId;

    console.log('Unregistering user:', userId, 'from event:', eventId);

    // Verify the event exists
    const event = await db.collection('events').findOne({ _id: new ObjectId(eventId) });
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Verify the user exists
    const user = await db.collection('members').findOne({ _id: new ObjectId(userId) });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if the user is registered
    const registration = await db.collection('eventAttendees').findOne({
      eventId: new ObjectId(eventId),
      userId: new ObjectId(userId)
    });

    if (!registration) {
      return NextResponse.json({ error: 'Not registered for this event' }, { status: 400 });
    }

    // Remove the registration
    const result = await db.collection('eventAttendees').deleteOne({
      eventId: new ObjectId(eventId),
      userId: new ObjectId(userId)
    });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Failed to unregister from event' }, { status: 500 });
    }

    // Update the event's attendee count
    await db.collection('events').updateOne(
      { _id: new ObjectId(eventId) },
      { $inc: { attendees: -1 } }
    );

    return NextResponse.json({ 
      message: 'Successfully unregistered from event',
      debug: {
        eventId,
        userId,
        deletedCount: result.deletedCount
      }
    });
  } catch (error) {
    console.error('Error in unregister endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to unregister from event', details: error },
      { status: 500 }
    );
  }
} 