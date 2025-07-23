import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { verifyToken } from '@/lib/auth/auth';
import { ObjectId } from 'mongodb';
import mongoose from 'mongoose';
import { Event } from '@/models/Event';
import { findUnifiedUserById } from '@/lib/auth/unified-auth';

// Clear mongoose model cache to ensure updated schema is used
delete mongoose.models.Event;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const lodgeId = searchParams.get('lodgeId');
    const district = searchParams.get('district');

    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { db } = await connectToDatabase();

    // If district query is requested, fetch events from all lodges in the district
    if (district === 'true') {
      console.log('Fetching district events for user:', decoded.userId);
      
          // Get user data from unified collection
    const user = await findUnifiedUserById(decoded.userId);
    
    if (!user) {
      console.error('User not found in unified collection:', decoded.userId);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

      // Get all lodges in the district (including the district lodge itself and sub-lodges)
      const lodges = await db.collection('lodges')
        .find({
          $or: [
            { _id: new ObjectId(user.primaryLodge) },
            { district: user.primaryLodge },
            { parentLodge: user.primaryLodge }
          ]
        })
        .toArray();

      const lodgeIds = lodges.map(lodge => new ObjectId(lodge._id));
      console.log('District lodge IDs:', lodgeIds);

      // Find all events for lodges in the district AND district-wide events
      const events = await db.collection('events')
        .find({
          $or: [
            { lodgeId: { $in: lodgeIds } },
            { 
              lodgeId: null, 
              districtId: user.primaryLodge,
              isDistrictWide: true 
            },
            { isDistrictWide: true }
          ]
        })
        .sort({ date: 1, time: 1 })
        .toArray();

      console.log('Found district events:', events.length);

      // Transform the events to include string IDs and lodge names
      const transformedEvents = await Promise.all(events.map(async (event) => {
        const lodge = event.lodgeId ? lodges.find(l => l._id.toString() === event.lodgeId.toString()) : null;
        return {
          ...event,
          _id: event._id.toString(),
          id: event._id.toString(),
          lodgeId: event.lodgeId ? event.lodgeId.toString() : null,
          lodgeName: lodge?.name || (event.isDistrictWide ? 'District-wide Event' : 'Unknown Lodge'),
          isDistrictWide: event.isDistrictWide || false
        };
      }));

      console.log('Transformed district events:', transformedEvents);
      return NextResponse.json(transformedEvents);
    }

    // Original single lodge logic - but now also include district-wide events
    if (!lodgeId) {
      return NextResponse.json({ error: 'Lodge ID is required' }, { status: 400 });
    }

    console.log('Fetching events for lodge:', lodgeId);
    console.log('Querying with ObjectId:', new ObjectId(lodgeId));

    // Get user data from unified collection
    const user = await findUnifiedUserById(decoded.userId);
    
    if (!user) {
      console.error('User not found in unified collection:', decoded.userId);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // If user is SUPER_ADMIN, show all events
    if (user.role === 'SUPER_ADMIN') {
      console.log('Super admin detected - fetching all events');
      const allEvents = await db.collection('events')
        .find({})
        .sort({ date: 1, time: 1 })
        .toArray();

      console.log('Found all events for super admin:', allEvents.length);

      // Transform the events to include string IDs
      const transformedEvents = allEvents.map((event: any) => ({
        ...event,
        _id: event._id.toString(),
        id: event._id.toString(),
        lodgeId: event.lodgeId ? event.lodgeId.toString() : null,
        isDistrictWide: event.isDistrictWide || false
      }));

      console.log('Transformed events for super admin:', transformedEvents);
      return NextResponse.json(transformedEvents);
    }

    // Find all events for the lodge AND district-wide events for the user's district
    const events = await db.collection('events')
      .find({
        $or: [
          { lodgeId: new ObjectId(lodgeId) },
          {
            isDistrictWide: true
            // Remove the districtId restriction - show all district-wide events to everyone
          }
        ]
      })
      .sort({ date: 1, time: 1 })
      .toArray();

    console.log('Found events:', events.length);
    console.log('Raw events data:', events);

    // Transform the events to include string IDs
    const transformedEvents = events.map((event: any) => ({
      ...event,
      _id: event._id.toString(),
      id: event._id.toString(), // Add id field for frontend compatibility
      lodgeId: event.lodgeId ? event.lodgeId.toString() : null,
      isDistrictWide: event.isDistrictWide || false
    }));

    console.log('Transformed events:', transformedEvents);

    return NextResponse.json(transformedEvents);
  } catch (error) {
    console.error('Error fetching events:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    console.log('Starting POST /api/events');
    
    const authHeader = request.headers.get('authorization');
    console.log('Auth header:', authHeader);
    
    const token = authHeader?.split(' ')[1];
    if (!token) {
      console.log('No token found in request');
      return NextResponse.json({ error: 'Unauthorized - No token provided' }, { status: 401 });
    }

    console.log('Verifying token...');
    const decoded = await verifyToken(token);
    console.log('Token verification result:', decoded);
    
    if (!decoded) {
      console.log('Token verification failed');
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { role, userId } = decoded;
    console.log('User details from token:', { role, userId });

    // Get user data from database to verify role
    console.log('Connecting to database...');
    await connectToDatabase();
    console.log('Database connected successfully');

    console.log('Looking up user with ID:', userId);
    
    // Convert string ID to ObjectId
    let userObjectId;
    try {
      userObjectId = new mongoose.Types.ObjectId(userId);
    } catch (error) {
      console.error('Invalid user ID format:', error);
      return NextResponse.json({ 
        error: 'Invalid user ID format',
        details: { userId: userId }
      }, { status: 400 });
    }

    // Get user from unified collection
    const user = await findUnifiedUserById(userId);
    
    if (!user) {
      console.log('User not found in unified collection:', userId);
      return NextResponse.json({ 
        error: 'User not found',
        details: { userId: userId }
      }, { status: 404 });
    }

    // Use the role from the database instead of the token
    const userRole = user.role?.toUpperCase();
    console.log('User role from database:', userRole);

    if (userRole !== 'LODGE_ADMIN' && userRole !== 'SUPER_ADMIN' && userRole !== 'DISTRICT_ADMIN') {
      console.log('Role check failed:', {
        userRole,
        allowedRoles: ['LODGE_ADMIN', 'SUPER_ADMIN', 'DISTRICT_ADMIN']
      });
      return NextResponse.json({ 
        error: 'Insufficient permissions',
        details: {
          userRole,
          allowedRoles: ['LODGE_ADMIN', 'SUPER_ADMIN', 'DISTRICT_ADMIN']
        }
      }, { status: 403 });
    }

    const body = await request.json();
    console.log('Request body:', body);
    
    const { title, date, time, location, description, lodgeId, isDistrictWide } = body;

    // For district-wide events, we don't need lodge access check
    if (!isDistrictWide) {
      // Verify lodge access for lodge-specific events
      const hasLodgeAccess = user.administeredLodges?.includes(lodgeId) || 
                            user.primaryLodge?._id === lodgeId ||
                            user.primaryLodge === lodgeId;
      
      console.log('Lodge access check:', {
        userLodges: {
          administered: user.administeredLodges,
          primary: user.primaryLodge
        },
        requestedLodge: lodgeId,
        hasAccess: hasLodgeAccess
      });

      if (!hasLodgeAccess) {
        return NextResponse.json({ 
          error: 'No access to this lodge',
          details: {
            userLodges: {
              administered: user.administeredLodges,
              primary: user.primaryLodge
            },
            requestedLodge: lodgeId
          }
        }, { status: 403 });
      }
    }

    if (!title || !date || !time || !location || !description) {
      console.log('Missing required fields:', {
        title: !title,
        date: !date,
        time: !time,
        location: !location,
        description: !description
      });
      return NextResponse.json({ 
        error: 'All fields are required',
        missingFields: {
          title: !title,
          date: !date,
          time: !time,
          location: !location,
          description: !description
        }
      }, { status: 400 });
    }

    // For district-wide events, lodgeId is not required
    if (!isDistrictWide && !lodgeId) {
      return NextResponse.json({ 
        error: 'Lodge ID is required for lodge-specific events',
        missingFields: {
          lodgeId: !lodgeId
        }
      }, { status: 400 });
    }

    console.log('Creating new event...');
    console.log('Event data to save:', {
      title,
      date,
      time,
      location,
      description,
      lodgeId: isDistrictWide ? null : new ObjectId(lodgeId),
      districtId: isDistrictWide ? user.primaryLodge : null,
      isDistrictWide: isDistrictWide || false
    });
    
    const event = new Event({
      title,
      date,
      time,
      location,
      description,
      lodgeId: isDistrictWide ? null : new ObjectId(lodgeId),
      districtId: isDistrictWide ? user.primaryLodge : null,
      isDistrictWide: isDistrictWide || false
    });

    console.log('Saving event...');
    await event.save();
    console.log('Event saved successfully');
    
    // Notify members about the new event
    try {
      const { db } = await connectToDatabase();
      
      if (isDistrictWide) {
        // For district-wide events, notify all district members
        // Get all lodges in the district
        const districtLodges = await db.collection('lodges')
          .find({ district: user.primaryLodge })
          .toArray();

        const lodgeIds = districtLodges.map(lodge => new ObjectId(lodge._id));
        
        const members = await db.collection('members')
          .find({
            $or: [
              { lodges: { $in: lodgeIds } },
              { 'lodgeMemberships.lodge': { $in: lodgeIds } }
            ]
          })
          .toArray();

        console.log(`Found ${members.length} district members to notify about new district-wide event`);

        const notifications = members.map(member => ({
          userId: member._id,
          type: 'event',
          title: 'New District Event',
          message: `New district-wide event: ${title} on ${date} at ${time}`,
          eventId: event._id,
          districtId: user.primaryLodge,
          createdAt: new Date(),
          read: false
        }));

        if (notifications.length > 0) {
          await db.collection('notifications').insertMany(notifications);
          console.log(`Created ${notifications.length} notifications for new district-wide event`);
        }
      } else {
        // For lodge-specific events, notify lodge members
        // Check both lodges field and lodgeMemberships field
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
          eventId: event._id,
          lodgeId: new ObjectId(lodgeId),
          createdAt: new Date(),
          read: false
        }));

        if (notifications.length > 0) {
          await db.collection('notifications').insertMany(notifications);
          console.log(`Created ${notifications.length} notifications for new event`);
        }
      }
    } catch (notificationError) {
      console.error('Error creating notifications:', notificationError);
      // Don't fail the event creation if notifications fail
    }
    
    // Transform the saved event to include id field
    const savedEvent = {
      ...event.toObject(),
      _id: (event as any)._id.toString(),
      id: (event as any)._id.toString(),
      lodgeId: event.lodgeId ? event.lodgeId.toString() : null
    };
    
    return NextResponse.json(savedEvent);
  } catch (error) {
    console.error('Error in POST /api/events:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 