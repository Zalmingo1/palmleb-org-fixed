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

    console.log('Registration attempt:', {
      userId,
      eventId,
      tokenData: token,
      userIdType: typeof userId,
      userIdLength: userId?.length
    });

    // Convert IDs to ObjectId
    let eventObjectId: ObjectId;
    let userObjectId: ObjectId;
    try {
      eventObjectId = new ObjectId(eventId);
      console.log('Converting user ID to ObjectId:', {
        originalUserId: userId,
        userIdType: typeof userId,
        userIdLength: userId?.length
      });
      userObjectId = new ObjectId(userId);
      console.log('Successfully converted user ID to ObjectId:', userObjectId);
    } catch (error) {
      console.error('Invalid ID format:', error);
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
    }

    // Verify the event exists
    const event = await db.collection('events')
      .findOne({ _id: eventObjectId });
    
    if (!event) {
      console.log('Event not found:', eventId);
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    console.log('Found event:', {
      eventId: event._id,
      title: event.title
    });

    // Verify the user exists
    console.log('Looking for user with ID:', {
      originalUserId: userId,
      userObjectId: userObjectId.toString()
    });
    
    // Try to find the user in the members collection
    const user = await db.collection('members')
      .findOne({ _id: userObjectId });
    
    if (!user) {
      // If not found, try to find by string ID
      console.log('User not found with ObjectId, trying string ID');
      const members = await db.collection('members').find({}).toArray();
      console.log('Available members:', members.map(m => ({
        _id: m._id,
        name: m.name || `${m.firstName} ${m.lastName}`,
        email: m.email
      })));
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    console.log('Found user:', {
      userId: user._id,
      name: user.name || `${user.firstName} ${user.lastName}`,
      email: user.email
    });

    // Check if already registered
    const existingRegistration = await db.collection('eventAttendees')
      .findOne({
        userId: userObjectId,
        eventId: eventObjectId
      });

    if (existingRegistration) {
      console.log('User already registered:', userId);
      return NextResponse.json({ 
        message: 'Already registered',
        isRegistered: true 
      });
    }

    // Create registration
    const registration = {
      userId: userObjectId,
      eventId: eventObjectId,
      registeredAt: new Date()
    };

    console.log('Creating registration:', registration);

    const result = await db.collection('eventAttendees')
      .insertOne(registration);

    if (!result.acknowledged) {
      throw new Error('Failed to create registration');
    }

    // Update event attendee count
    const updateResult = await db.collection('events')
      .updateOne(
        { _id: eventObjectId },
        { $inc: { attendees: 1 } }
      );

    if (!updateResult.acknowledged) {
      // If we fail to update the count, we should remove the registration
      await db.collection('eventAttendees')
        .deleteOne({ _id: result.insertedId });
      throw new Error('Failed to update event attendee count');
    }

    console.log('Registration successful:', {
      registrationId: result.insertedId,
      eventId,
      userId
    });

    return NextResponse.json({ 
      message: 'Successfully registered for event',
      isRegistered: true,
      registrationId: result.insertedId
    });
  } catch (error) {
    console.error('Error in registration:', error);
    return NextResponse.json(
      { error: 'Registration failed', details: error },
      { status: 500 }
    );
  }
} 