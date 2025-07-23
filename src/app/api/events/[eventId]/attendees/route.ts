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

    console.log('Fetching attendees for event:', eventId);

    // Get all registrations for this event
    const registrations = await db.collection('eventAttendees')
      .find({ eventId: new ObjectId(eventId) })
      .toArray();

    console.log('Found registrations:', registrations);

    if (registrations.length === 0) {
      console.log('No registrations found for event');
      return NextResponse.json({ attendees: [] });
    }

    // Get user details for each registration
    const attendeeIds = registrations.map(reg => reg.userId);
    console.log('Looking up users with IDs:', attendeeIds);

    // Try to find users with both ObjectId and string formats
    const attendees = await db.collection('users')
      .find({
        $or: [
          { _id: { $in: attendeeIds } },
          { _id: { $in: attendeeIds.map(id => id.toString()) } }
        ]
      })
      .project({ name: 1, email: 1 })
      .toArray();

    console.log('Found attendees:', attendees);

    return NextResponse.json({ attendees });
  } catch (error) {
    console.error('Error fetching event attendees:', error);
    return NextResponse.json(
      { error: 'Failed to fetch attendees' },
      { status: 500 }
    );
  }
} 