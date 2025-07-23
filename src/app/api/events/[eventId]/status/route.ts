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
    const userId = token.userId;
    const eventId = params.eventId;

    console.log('Checking registration status for:', {
      userId,
      eventId
    });

    // Check if user is registered
    const existingRegistration = await db.collection('eventAttendees').findOne({
      userId: new ObjectId(userId),
      eventId: new ObjectId(eventId)
    });

    console.log('Registration check result:', existingRegistration);

    return NextResponse.json({ isRegistered: !!existingRegistration });
  } catch (error) {
    console.error('Error checking event registration status:', error);
    return NextResponse.json(
      { error: 'Failed to check registration status' },
      { status: 500 }
    );
  }
} 