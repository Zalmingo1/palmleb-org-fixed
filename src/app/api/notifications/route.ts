import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { getTokenData } from '@/lib/auth';
import { ObjectId } from 'mongodb';

// GET: Fetch notifications for the current user
export async function GET(req: NextRequest) {
  try {
    const token = await getTokenData(req);
    if (!token) {
      console.log('No token found in request');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Fetching notifications for user:', token.userId);
    const { db } = await connectToDatabase();
    
    const notifications = await db.collection('notifications')
      .find({ userId: new ObjectId(token.userId) })
      .sort({ createdAt: -1 })
      .toArray();

    const unreadCount = notifications.filter(n => !n.read).length;

    // Convert ObjectIds to strings
    const formattedNotifications = notifications.map(notification => ({
      ...notification,
      _id: notification._id.toString(),
      userId: notification.userId.toString(),
      fromUserId: notification.fromUserId?.toString(),
      messageId: notification.messageId?.toString()
    }));

    console.log('Found notifications:', notifications.length);
    console.log('Unread count:', unreadCount);

    return NextResponse.json({
      notifications: formattedNotifications,
      unreadCount
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
  }
}

// POST: Create a new notification
export async function POST(req: NextRequest) {
  try {
    const token = await getTokenData(req);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const data = await req.json();
    const { userId, type, title, message, fromUserId, fromUserName, messageId } = data;
    
    if (!userId || !type || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const notification = {
      userId: new ObjectId(userId),
      type,
      title,
      message,
      fromUserId: fromUserId ? new ObjectId(fromUserId) : null,
      fromUserName,
      messageId: messageId ? new ObjectId(messageId) : null,
      createdAt: new Date(),
      read: false
    };

    const result = await db.collection('notifications').insertOne(notification);
    console.log('Created notification:', result.insertedId);
    
    return NextResponse.json({ ...notification, _id: result.insertedId });
  } catch (error) {
    console.error('Error creating notification:', error);
    return NextResponse.json({ error: 'Failed to create notification' }, { status: 500 });
  }
}

// PUT: Mark a notification as read
export async function PUT(req: NextRequest) {
  try {
    const token = await getTokenData(req);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await req.json();
    const { notificationId } = data;
    
    if (!notificationId) {
      return NextResponse.json({ error: 'Notification ID is required' }, { status: 400 });
    }

    if (!ObjectId.isValid(notificationId)) {
      return NextResponse.json({ error: 'Invalid notification ID format' }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const result = await db.collection('notifications').updateOne(
      { 
        _id: new ObjectId(notificationId),
        userId: new ObjectId(token.userId)
      },
      { $set: { read: true } }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return NextResponse.json({ error: 'Failed to mark notification as read' }, { status: 500 });
  }
} 