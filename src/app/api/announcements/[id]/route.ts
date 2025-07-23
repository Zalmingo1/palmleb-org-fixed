import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { getTokenData } from '@/lib/auth';
import { ObjectId } from 'mongodb';
import { getToken } from 'next-auth/jwt';

// PUT: Update an announcement
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const token = await getTokenData(request);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has permission to update announcements (SUPER_ADMIN or DISTRICT_ADMIN only)
    if (!['SUPER_ADMIN', 'DISTRICT_ADMIN'].includes(token.role)) {
      return NextResponse.json({ 
        error: 'Insufficient permissions. Only Super Admins and District Admins can update announcements.' 
      }, { status: 403 });
    }

    const { db } = await connectToDatabase();
    const data = await request.json();
    const { title, content } = data;

    if (!title || !content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const update = {
      title,
      content,
      updatedAt: new Date()
    };

    const result = await db.collection('announcements').updateOne(
      { _id: new ObjectId(id) },
      { $set: update }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Announcement not found' }, { status: 404 });
    }

    return NextResponse.json({ ...update, _id: id });
  } catch (error) {
    console.error('Error updating announcement:', error);
    return NextResponse.json({ error: 'Failed to update announcement' }, { status: 500 });
  }
}

// DELETE: Delete an announcement
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const token = await getTokenData(request);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has permission to delete announcements (SUPER_ADMIN or DISTRICT_ADMIN only)
    if (!['SUPER_ADMIN', 'DISTRICT_ADMIN'].includes(token.role)) {
      return NextResponse.json({ 
        error: 'Insufficient permissions. Only Super Admins and District Admins can delete announcements.' 
      }, { status: 403 });
    }

    const { db } = await connectToDatabase();

    const result = await db.collection('announcements').deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Announcement not found' }, { status: 404 });
    }

    // Delete associated notifications
    await db.collection('notifications').deleteMany({ announcementId: new ObjectId(id) });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting announcement:', error);
    return NextResponse.json({ error: 'Failed to delete announcement' }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const token = await getTokenData(request);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    const announcement = await db.collection('announcements').findOne({
      _id: new ObjectId(id)
    });

    if (!announcement) {
      return NextResponse.json({ error: 'Announcement not found' }, { status: 404 });
    }

    return NextResponse.json(announcement);
  } catch (error) {
    console.error('Error fetching announcement:', error);
    return NextResponse.json(
      { error: 'Failed to fetch announcement' },
      { status: 500 }
    );
  }
} 