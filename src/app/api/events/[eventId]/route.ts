import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { verifyToken } from '@/lib/auth/auth';
import { Event } from '@/models/Event';
import { ObjectId } from 'mongodb';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { role } = decoded;
    if (role !== 'LODGE_ADMIN' && role !== 'SUPER_ADMIN' && role !== 'DISTRICT_ADMIN') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { title, date, time, location, description, lodgeId } = body;

    if (!title || !date || !time || !location || !description || !lodgeId) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    await connectToDatabase();
    const event = await Event.findById(eventId);
    
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Update event fields
    event.title = title;
    event.date = date;
    event.time = time;
    event.location = location;
    event.description = description;
    event.lodgeId = new ObjectId(lodgeId);
    event.updatedAt = new Date();

    await event.save();
    
    // Transform the saved event to include id field
    const savedEvent = {
      ...event.toObject(),
      _id: event._id.toString(),
      id: event._id.toString(),
      lodgeId: event.lodgeId.toString()
    };
    
    return NextResponse.json(savedEvent);
  } catch (error) {
    console.error('Error updating event:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { role } = decoded;
    if (role !== 'LODGE_ADMIN' && role !== 'SUPER_ADMIN' && role !== 'DISTRICT_ADMIN') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    await connectToDatabase();
    const event = await Event.findById(eventId);
    
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    await event.deleteOne();
    return NextResponse.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Error deleting event:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 