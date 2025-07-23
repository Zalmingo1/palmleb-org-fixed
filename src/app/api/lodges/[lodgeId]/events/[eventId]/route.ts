import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { verifyToken } from '@/lib/auth';
import LodgeRole from '@/models/LodgeRole';

// GET /api/lodges/[lodgeId]/events/[eventId]
export async function GET(
  request: Request,
  { params }: { params: { lodgeId: string; eventId: string } }
) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    const { lodgeId, eventId } = params;

    // Verify the user is a member of the lodge
    const lodge = await db.collection('lodges').findOne({
      _id: new ObjectId(lodgeId),
      members: decoded.userId
    });

    if (!lodge) {
      return NextResponse.json({ error: 'Lodge not found or unauthorized' }, { status: 404 });
    }

    const event = await db.collection('events').findOne({
      _id: new ObjectId(eventId),
      lodgeId: new ObjectId(lodgeId)
    });

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    return NextResponse.json({ event });
  } catch (error) {
    console.error('Error fetching event:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/lodges/[lodgeId]/events/[eventId]
export async function PUT(
  request: Request,
  { params }: { params: { lodgeId: string; eventId: string } }
) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    const { lodgeId, eventId } = params;

    // Get user data from database to verify role
    let user = await db.collection('users').findOne({ _id: new ObjectId(decoded.userId) });
    if (!user) {
      // Try finding in members collection if not found in users
      const member = await db.collection('members').findOne({ _id: new ObjectId(decoded.userId) });
      if (!member) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      user = member;
    }

    // Check if user has appropriate role for updating events
    const userRole = (user.role || decoded.role)?.toUpperCase();
    if (userRole === 'SUPER_ADMIN' || userRole === 'DISTRICT_ADMIN') {
      // System admins can update events for any lodge
      console.log('User has system admin privileges:', {
        role: userRole,
        userId: decoded.userId
      });
    } else {
      // For LODGE_ADMIN, check both LodgeRole and user's primary/administered lodges
      const [lodgeRole] = await Promise.all([
        LodgeRole.findOne({
          lodgeId,
          userId: decoded.userId,
          role: 'LODGE_ADMIN',
          isActive: true
        })
      ]);

      const hasLodgeAccess = lodgeRole || 
        (user && (
          (user.primaryLodge && user.primaryLodge.toString() === lodgeId) || 
          (Array.isArray(user.administeredLodges) && user.administeredLodges.some(id => id.toString() === lodgeId))
        ));

      if (!hasLodgeAccess) {
        return NextResponse.json({ error: 'Lodge not found or unauthorized' }, { status: 404 });
      }

      // For LODGE_ADMIN, check if they created the event
      const event = await db.collection('events').findOne({
        _id: new ObjectId(eventId),
        lodgeId: new ObjectId(lodgeId)
      });

      if (!event) {
        return NextResponse.json({ error: 'Event not found' }, { status: 404 });
      }

      // Check if the lodge admin created this event
      if (event.createdBy && event.createdBy.toString() !== decoded.userId) {
        return NextResponse.json({ 
          error: 'You can only edit events that you created. Only district admins and super admins can edit events created by others.' 
        }, { status: 403 });
      }
    }

    // Verify the lodge exists
    const lodge = await db.collection('lodges').findOne({ _id: new ObjectId(lodgeId) });
    if (!lodge) {
      return NextResponse.json({ error: 'Lodge not found' }, { status: 404 });
    }

    const body = await request.json();
    const { title, description, date, time, location, type, status, maxAttendees } = body;

    if (!title || !description || !date || !time || !location || !type || !status) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const update = {
      title,
      description,
      date,
      time,
      location,
      type,
      status,
      maxAttendees: maxAttendees || null,
      updatedAt: new Date()
    };

    const result = await db.collection('events').updateOne(
      {
        _id: new ObjectId(eventId),
        lodgeId: new ObjectId(lodgeId)
      },
      { $set: update }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    return NextResponse.json({
      message: 'Event updated successfully',
      event: { ...update, _id: eventId }
    });
  } catch (error) {
    console.error('Error updating event:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/lodges/[lodgeId]/events/[eventId]
export async function DELETE(
  request: Request,
  { params }: { params: { lodgeId: string; eventId: string } }
) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    const { lodgeId, eventId } = params;

    // Get user data from database to verify role
    let user = await db.collection('users').findOne({ _id: new ObjectId(decoded.userId) });
    if (!user) {
      // Try finding in members collection if not found in users
      const member = await db.collection('members').findOne({ _id: new ObjectId(decoded.userId) });
      if (!member) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      user = member;
    }

    // Check if user has appropriate role for deleting events
    const userRole = (user.role || decoded.role)?.toUpperCase();
    if (userRole === 'SUPER_ADMIN' || userRole === 'DISTRICT_ADMIN') {
      // System admins can delete events for any lodge
      console.log('User has system admin privileges:', {
        role: userRole,
        userId: decoded.userId
      });
    } else {
      // For LODGE_ADMIN, check both LodgeRole and user's primary/administered lodges
      const [lodgeRole] = await Promise.all([
        LodgeRole.findOne({
          lodgeId,
          userId: decoded.userId,
          role: 'LODGE_ADMIN',
          isActive: true
        })
      ]);

      const hasLodgeAccess = lodgeRole || 
        (user && (
          (user.primaryLodge && user.primaryLodge.toString() === lodgeId) || 
          (Array.isArray(user.administeredLodges) && user.administeredLodges.some(id => id.toString() === lodgeId))
        ));

      if (!hasLodgeAccess) {
        return NextResponse.json({ error: 'Lodge not found or unauthorized' }, { status: 404 });
      }

      // For LODGE_ADMIN, check if they created the event
      const event = await db.collection('events').findOne({
        _id: new ObjectId(eventId),
        lodgeId: new ObjectId(lodgeId)
      });

      if (!event) {
        return NextResponse.json({ error: 'Event not found' }, { status: 404 });
      }

      // Check if the lodge admin created this event
      if (event.createdBy && event.createdBy.toString() !== decoded.userId) {
        return NextResponse.json({ 
          error: 'You can only delete events that you created. Only district admins and super admins can delete events created by others.' 
        }, { status: 403 });
      }
    }

    // Verify the lodge exists
    const lodge = await db.collection('lodges').findOne({ _id: new ObjectId(lodgeId) });
    if (!lodge) {
      return NextResponse.json({ error: 'Lodge not found' }, { status: 404 });
    }

    const result = await db.collection('events').deleteOne({
      _id: new ObjectId(eventId),
      lodgeId: new ObjectId(lodgeId)
    });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Error deleting event:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 