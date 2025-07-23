import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Lodge from '@/models/Lodge';
import { getTokenData } from '@/lib/auth';
import { ObjectId } from 'mongodb';

interface Event {
  _id: ObjectId;
  title: string;
  date: string;
  location?: string;
  description?: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { lodgeId: string } }
) {
  try {
    // Check authentication
    const tokenData = await getTokenData(request);
    if (!tokenData) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Connect to database
    await connectToDatabase();

    // Validate the lodgeId parameter
    if (!params.lodgeId || typeof params.lodgeId !== 'string') {
      return NextResponse.json(
        { error: 'Invalid lodge ID' },
        { status: 400 }
      );
    }

    // Find the lodge and populate events
    const lodge = await Lodge.findById(params.lodgeId)
      .populate('events');

    if (!lodge) {
      return NextResponse.json(
        { error: 'Lodge not found' },
        { status: 404 }
      );
    }

    // Get current date
    const now = new Date();

    // Filter and sort upcoming events
    const upcomingEvents = (lodge.events as Event[])
      .filter((event: Event) => new Date(event.date) > now)
      .sort((a: Event, b: Event) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map((event: Event) => ({
        id: event._id.toString(),
        title: event.title,
        date: event.date,
        location: event.location || 'Lodge Hall',
        description: event.description
      }));

    return NextResponse.json(upcomingEvents);
  } catch (error) {
    console.error('Error fetching upcoming events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch upcoming events' },
      { status: 500 }
    );
  }
} 