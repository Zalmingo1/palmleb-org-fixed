import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { getTokenData } from '@/lib/auth';
import { ObjectId } from 'mongodb';

// GET: Fetch all announcements
export async function GET(req: NextRequest) {
  try {
    const token = await getTokenData(req);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    
    // Get all announcements, sorted by creation date (newest first)
    const announcements = await db.collection('announcements')
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json(announcements);
  } catch (error) {
    console.error('Error fetching announcements:', error);
    return NextResponse.json({ error: 'Failed to fetch announcements' }, { status: 500 });
  }
}

// POST: Create a new announcement
export async function POST(req: NextRequest) {
  try {
    const token = await getTokenData(req);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has permission to create announcements (SUPER_ADMIN or DISTRICT_ADMIN only)
    if (!['SUPER_ADMIN', 'DISTRICT_ADMIN'].includes(token.role)) {
      return NextResponse.json({ 
        error: 'Insufficient permissions. Only Super Admins and District Admins can create announcements.' 
      }, { status: 403 });
    }

    const data = await req.json();
    console.log('Received announcement data:', data);
    
    const { title, content, lodgeId } = data;

    // Check each field individually and log which ones are missing
    const missingFields = [];
    if (!title) missingFields.push('title');
    if (!content) missingFields.push('content');

    if (missingFields.length > 0) {
      console.log('Missing required fields:', missingFields);
      return NextResponse.json({ 
        error: 'Missing required fields',
        missingFields: missingFields
      }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const now = new Date();

    const announcement = {
      title,
      content,
      lodgeId: lodgeId ? new ObjectId(lodgeId) : null, // Allow null for organization-wide announcements
      createdBy: token.userId,
      createdAt: now,
      updatedAt: now
    };

    console.log('Creating announcement with data:', announcement);

    const result = await db.collection('announcements').insertOne(announcement);

    // Notify members about the new announcement
    let members = [];
    if (lodgeId) {
      // Lodge-specific announcement - notify lodge members
      members = await db.collection('members')
        .find({ lodges: new ObjectId(lodgeId) })
        .toArray();
    } else {
      // Organization-wide announcement - notify all members
      members = await db.collection('members').find({}).toArray();
    }

    const notifications = members.map(member => ({
      userId: member._id,
      type: 'announcement',
      title: 'New Announcement',
      message: `New announcement: ${title}`,
      announcementId: result.insertedId,
      createdAt: now,
      read: false
    }));

    if (notifications.length > 0) {
      await db.collection('notifications').insertMany(notifications);
    }

    return NextResponse.json({ ...announcement, _id: result.insertedId });
  } catch (error) {
    console.error('Error creating announcement:', error);
    return NextResponse.json({ error: 'Failed to create announcement' }, { status: 500 });
  }
} 