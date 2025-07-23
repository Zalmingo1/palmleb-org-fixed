import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { verifyToken } from '@/lib/auth/auth';
import LodgeRole from '@/models/LodgeRole';

// GET /api/lodges/[lodgeId]/events
export async function GET(
  request: Request,
  { params }: { params: { lodgeId: string } }
) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      console.error('No token provided');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (!decoded) {
      console.error('Invalid token');
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    console.log('Decoded token:', {
      userId: decoded.userId,
      role: decoded.role
    });
    
    const { db } = await connectToDatabase();
    const { lodgeId } = params;
    console.log('Fetching events for lodge:', lodgeId);

    // First verify the lodge exists
    const lodge = await db.collection('lodges').findOne({ _id: new ObjectId(lodgeId) });
    if (!lodge) {
      console.error('Lodge not found:', lodgeId);
      return NextResponse.json({ error: 'Lodge not found' }, { status: 404 });
    }
    console.log('Found lodge:', {
      id: lodge._id,
      name: lodge.name
    });

    // Check if user has appropriate role for accessing events
    // SUPER_ADMIN and DISTRICT_ADMIN can access all lodges
    // LODGE_ADMIN can only access their assigned lodge
    if (decoded.role === 'SUPER_ADMIN' || decoded.role === 'DISTRICT_ADMIN') {
      console.log('User has system admin privileges');
    } else {
      // For LODGE_ADMIN, verify they have an active role for this specific lodge
      const lodgeRole = await LodgeRole.findOne({
        lodgeId,
        userId: decoded.userId,
        role: 'LODGE_ADMIN',
        isActive: true
      });

      console.log('Lodge role check:', {
        lodgeId,
        userId: decoded.userId,
        foundRole: lodgeRole ? {
          role: lodgeRole.role,
          isActive: lodgeRole.isActive
        } : null
      });

      if (!lodgeRole) {
        console.error('User not authorized for this lodge:', {
          lodgeId,
          userId: decoded.userId,
          userRole: decoded.role,
          query: {
            lodgeId,
            userId: decoded.userId,
            role: 'LODGE_ADMIN',
            isActive: true
          }
        });
        return NextResponse.json({ error: 'Lodge not found or unauthorized' }, { status: 404 });
      }
    }

    console.log('Found lodge:', lodge._id);
    const events = await db.collection('events')
      .find({ lodgeId: new ObjectId(lodgeId) })
      .sort({ date: 1, time: 1 })
      .toArray();

    console.log('Found events:', events.length);
    return NextResponse.json({ events });
  } catch (error) {
    console.error('Error fetching events:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// POST /api/lodges/[lodgeId]/events
export async function POST(
  request: Request,
  { params }: { params: { lodgeId: string } }
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

    console.log('Token verification:', {
      userId: decoded.userId,
      role: decoded.role,
      name: decoded.name,
      lodge: decoded.lodge
    });

    const { db } = await connectToDatabase();
    const { lodgeId } = params;

    // First verify the lodge exists
    const lodge = await db.collection('lodges').findOne({ _id: new ObjectId(lodgeId) });
    if (!lodge) {
      return NextResponse.json({ error: 'Lodge not found' }, { status: 404 });
    }

    console.log('Lodge verification:', {
      lodgeId,
      lodgeFound: !!lodge,
      lodgeDetails: lodge ? {
        id: lodge._id,
        name: lodge.name
      } : null
    });

    // Get user data from database to verify role
    let user = await db.collection('users').findOne({ _id: new ObjectId(decoded.userId) });
    if (!user) {
      // Try finding in members collection if not found in users
      const member = await db.collection('members').findOne({ _id: new ObjectId(decoded.userId) });
      if (!member) {
        console.error('User not found in database:', {
          userId: decoded.userId,
          token: {
            userId: decoded.userId,
            role: decoded.role,
            name: decoded.name,
            lodge: decoded.lodge
          }
        });
        return NextResponse.json({ 
          error: 'User not found',
          details: {
            userId: decoded.userId,
            role: decoded.role,
            name: decoded.name,
            lodge: decoded.lodge
          }
        }, { status: 404 });
      }
      // Use member data if found
      user = member;
    }

    console.log('User lookup result:', {
      userId: decoded.userId,
      userFound: !!user,
      user: user ? {
        id: user._id,
        email: user.email,
        role: user.role
      } : null
    });

    // Check if user has appropriate role for creating events
    const userRole = (user.role || decoded.role)?.toUpperCase();
    if (userRole === 'SUPER_ADMIN' || userRole === 'DISTRICT_ADMIN') {
      // System admins can create events for any lodge
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

      console.log('Authorization check details:', {
        lodgeId,
        userId: decoded.userId,
        userRole,
        tokenRole: decoded.role,
        lodgeRole: lodgeRole ? {
          role: lodgeRole.role,
          isActive: lodgeRole.isActive,
          lodgeId: lodgeRole.lodgeId
        } : null,
        user: {
          id: user._id,
          primaryLodge: user.primaryLodge,
          administeredLodges: user.administeredLodges,
          role: user.role
        }
      });

      const hasLodgeAccess = lodgeRole || 
        (user && (
          (user.primaryLodge && user.primaryLodge.toString() === lodgeId) || 
          (Array.isArray(user.administeredLodges) && user.administeredLodges.some(id => id.toString() === lodgeId))
        ));

      if (!hasLodgeAccess) {
        console.error('User not authorized for this lodge:', {
          lodgeId,
          userId: decoded.userId,
          userRole,
          tokenRole: decoded.role,
          userLodges: {
            primaryLodge: user.primaryLodge,
            administeredLodges: user.administeredLodges
          },
          lodgeRole: lodgeRole ? {
            role: lodgeRole.role,
            isActive: lodgeRole.isActive
          } : null
        });
        return NextResponse.json({ 
          error: 'Not authorized to create events for this lodge',
          details: {
            userRole,
            tokenRole: decoded.role,
            userId: decoded.userId,
            lodgeId,
            hasLodgeRole: !!lodgeRole,
            hasPrimaryLodge: user && user.primaryLodge && user.primaryLodge.toString() === lodgeId,
            hasAdministeredLodge: user && Array.isArray(user.administeredLodges) && user.administeredLodges.some(id => id.toString() === lodgeId)
          }
        }, { status: 403 });
      }
    }

    const body = await request.json();
    const { title, description, date, time, location, type, maxAttendees } = body;

    if (!title || !description || !date || !time || !location || !type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const event = {
      title,
      description,
      date,
      time,
      location,
      type,
      status: 'UPCOMING',
      attendees: 0,
      maxAttendees: maxAttendees || null,
      lodgeId: new ObjectId(lodgeId),
      createdBy: decoded.userId,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db.collection('events').insertOne(event);

    // Notify all members of the lodge about the new event
    try {
      const members = await db.collection('members')
        .find({
          $or: [
            { lodges: new ObjectId(lodgeId) },
            { 'lodgeMemberships.lodge': new ObjectId(lodgeId) }
          ]
        })
        .toArray();

      console.log(`Found ${members.length} members to notify about new event`);

      const notifications = members.map(member => ({
        userId: member._id,
        type: 'event',
        title: 'New Event',
        message: `New event: ${title} on ${date} at ${time}`,
        eventId: result.insertedId,
        lodgeId: new ObjectId(lodgeId),
        createdAt: new Date(),
        read: false
      }));

      if (notifications.length > 0) {
        await db.collection('notifications').insertMany(notifications);
        console.log(`Created ${notifications.length} notifications for new event`);
      }
    } catch (notificationError) {
      console.error('Error creating notifications:', notificationError);
      // Don't fail the event creation if notifications fail
    }

    return NextResponse.json({
      message: 'Event created successfully',
      event: { ...event, _id: result.insertedId }
    });
  } catch (error) {
    console.error('Error creating event:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
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

    // Verify the user is an admin of the lodge
    const lodgeRole = await LodgeRole.findOne({
      lodgeId,
      userId: decoded.userId,
      role: 'LODGE_ADMIN',
      isActive: true
    });

    if (!lodgeRole) {
      return NextResponse.json({ error: 'Lodge not found or unauthorized' }, { status: 404 });
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

    // Verify the user is an admin of the lodge
    const lodgeRole = await LodgeRole.findOne({
      lodgeId,
      userId: decoded.userId,
      role: 'LODGE_ADMIN',
      isActive: true
    });

    if (!lodgeRole) {
      return NextResponse.json({ error: 'Lodge not found or unauthorized' }, { status: 404 });
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