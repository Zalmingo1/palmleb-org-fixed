import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { getTokenData } from '@/lib/auth';
import { ObjectId } from 'mongodb';

export async function POST(
  req: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const eventId = params.eventId;
    const logs: string[] = [];
    const addLog = (message: string, data?: any) => {
      const logEntry = data ? `${message}: ${JSON.stringify(data, null, 2)}` : message;
      logs.push(logEntry);
      console.log(logEntry);
    };

    addLog('=== CLEANUP START ===');
    addLog('Event ID:', eventId);
    
    const token = await getTokenData(req);
    if (!token) {
      addLog('❌ Unauthorized access attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { db } = await connectToDatabase();

    // Verify the event exists
    const event = await db.collection('events')
      .findOne({ _id: new ObjectId(eventId) });
    
    if (!event) {
      addLog('❌ Event not found:', eventId);
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    addLog('\n📅 Event Details:', {
      _id: event._id.toString(),
      title: event.title,
      attendees: event.attendees
    });

    // Get all registrations for this event
    const registrations = await db.collection('eventAttendees')
      .find({ eventId: new ObjectId(eventId) })
      .toArray();
    
    addLog('\n📝 Event Registrations:', registrations.map(r => ({
      _id: r._id.toString(),
      userId: r.userId.toString(),
      eventId: r.eventId.toString()
    })));

    // Get all user IDs in the database
    const users = await db.collection('users')
      .find({})
      .project({ _id: 1, name: 1, email: 1 })
      .toArray();
    
    addLog('\n👥 Users in Database:', users.map(u => ({
      _id: u._id.toString(),
      name: u.name,
      email: u.email
    })));

    const validUserIds = new Set(users.map(u => u._id.toString()));
    addLog('\n✅ Valid User IDs:', Array.from(validUserIds));

    // Find registrations with invalid user IDs
    const invalidRegistrations = registrations.filter(
      reg => !validUserIds.has(reg.userId.toString())
    );
    
    addLog('\n❌ Invalid Registrations:', invalidRegistrations.map(r => ({
      _id: r._id.toString(),
      userId: r.userId.toString(),
      eventId: r.eventId.toString()
    })));

    let deletedCount = 0;
    // Delete invalid registrations
    if (invalidRegistrations.length > 0) {
      addLog('\n🗑️ Deleting invalid registrations...');
      const result = await db.collection('eventAttendees')
        .deleteMany({
          _id: { $in: invalidRegistrations.map(reg => reg._id) }
        });
      
      addLog('Delete Result:', {
        deletedCount: result.deletedCount,
        acknowledged: result.acknowledged
      });
      
      deletedCount = result.deletedCount || 0;

      // Update the event's attendee count
      if (event) {
        const newAttendeeCount = Math.max(0, event.attendees - deletedCount);
        addLog('\n📊 Updating Event Attendee Count:', {
          oldCount: event.attendees,
          deletedCount,
          newCount: newAttendeeCount
        });

        const updateResult = await db.collection('events')
          .updateOne(
            { _id: new ObjectId(eventId) },
            { $set: { attendees: newAttendeeCount } }
          );
        
        addLog('Update Result:', {
          matchedCount: updateResult.matchedCount,
          modifiedCount: updateResult.modifiedCount,
          acknowledged: updateResult.acknowledged
        });
      }
    }

    const response = {
      message: 'Cleanup completed',
      debug: {
        eventId,
        eventTitle: event.title,
        totalRegistrations: registrations.length,
        invalidRegistrations: invalidRegistrations.length,
        deletedCount,
        validUserIds: Array.from(validUserIds),
        oldAttendeeCount: event.attendees,
        newAttendeeCount: Math.max(0, event.attendees - deletedCount)
      },
      logs
    };

    addLog('\n✅ Cleanup Summary:', response);
    addLog('\n=== CLEANUP END ===\n');

    return NextResponse.json(response);
  } catch (error) {
    console.error('\n❌ Error in cleanup endpoint:', error);
    return NextResponse.json(
      { 
        error: 'Cleanup failed', 
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
} 