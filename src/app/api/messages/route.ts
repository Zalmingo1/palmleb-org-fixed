import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { getTokenData } from '@/lib/auth';
import { ObjectId } from 'mongodb';

// GET handler to retrieve messages
export async function GET(request: NextRequest) {
  console.log('Messages API route called - GET');
  
  try {
    const url = new URL(request.url);
    const tokenData = await getTokenData(request);
    
    if (!tokenData) {
      console.log('Authentication failed');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contactId = url.searchParams.get('contactId');
    console.log('Contact ID:', contactId);
    
    // Connect to database
    const { db } = await connectToDatabase();

    if (contactId) {
      console.log('Fetching messages for contact:', contactId);
      // Get messages between the user and the specified contact
      const messages = await db.collection('messages').find({
        $or: [
          { 
            senderId: new ObjectId(tokenData.userId),
            recipientId: new ObjectId(contactId)
          },
          {
            senderId: new ObjectId(contactId),
            recipientId: new ObjectId(tokenData.userId)
          }
        ]
      }).sort({ timestamp: -1 }).toArray();

      console.log('Found messages:', messages.length);

      // Mark messages as read
      const updateResult = await db.collection('messages').updateMany(
        {
          senderId: new ObjectId(contactId),
          recipientId: new ObjectId(tokenData.userId),
          isRead: false
        },
        { $set: { isRead: true } }
      );
      console.log('Updated read status:', updateResult);

      return NextResponse.json({ messages });
    }

    // Get all messages for the user
    console.log('Fetching all messages for user:', tokenData.userId);
    const messages = await db.collection('messages').find({
      $or: [
        { senderId: new ObjectId(tokenData.userId) },
        { recipientId: new ObjectId(tokenData.userId) }
      ]
    }).sort({ timestamp: -1 }).toArray();

    console.log('Found messages:', messages.length);
    return NextResponse.json({ messages });
  } catch (error) {
    console.error('Error in messages API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST handler to send a message
export async function POST(request: NextRequest) {
  console.log('Messages API route called - POST');
  
  try {
    const tokenData = await getTokenData(request);
    
    if (!tokenData) {
      console.log('No token data found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!tokenData.userId) {
      console.log('No user ID in token data');
      return NextResponse.json({ 
        error: 'Invalid token',
        details: 'Token does not contain user ID'
      }, { status: 401 });
    }
    
    // Get message data from request body
    const { recipientId, subject, content } = await request.json();
    console.log('Message data:', { recipientId, subject, content });
    
    if (!recipientId || !subject || !content) {
      console.log('Missing required fields:', { recipientId, subject, content });
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // Connect to database
    const { db } = await connectToDatabase();
    
    // Get sender and recipient details
    let senderId;
    try {
      senderId = new ObjectId(tokenData.userId);
      console.log('Sender ID:', senderId.toString());
    } catch (error) {
      console.error('Invalid sender ID:', error);
      return NextResponse.json({ 
        error: 'Invalid sender ID',
        details: 'Sender ID is not a valid MongoDB ObjectId'
      }, { status: 400 });
    }

    let recipientIdObj;
    try {
      recipientIdObj = new ObjectId(recipientId);
      console.log('Recipient ID:', recipientIdObj.toString());
    } catch (error) {
      console.error('Invalid recipient ID:', error);
      return NextResponse.json({ 
        error: 'Invalid recipient ID',
        details: 'Recipient ID is not a valid MongoDB ObjectId'
      }, { status: 400 });
    }
    
    // Look up sender and recipient
    const [sender, recipient] = await Promise.all([
      db.collection('members').findOne({ _id: senderId }),
      db.collection('members').findOne({ _id: recipientIdObj })
    ]);
    
    console.log('Sender:', sender);
    console.log('Recipient:', recipient);
    
    if (!sender) {
      console.log('Sender not found:', senderId.toString());
      return NextResponse.json({ 
        error: 'Sender not found',
        details: `No member found with ID: ${senderId.toString()}`
      }, { status: 404 });
    }
    
    if (!recipient) {
      console.log('Recipient not found:', recipientIdObj.toString());
      return NextResponse.json({ 
        error: 'Recipient not found',
        details: `No member found with ID: ${recipientIdObj.toString()}`
      }, { status: 404 });
    }
    
    // Create new message
    const newMessage = {
      id: new ObjectId().toString(),
      senderId: senderId,
      senderName: `${sender.firstName} ${sender.lastName}`,
      senderRole: sender.role,
      senderProfileImage: sender.profileImage || null,
      recipientId: recipientIdObj,
      recipientName: `${recipient.firstName} ${recipient.lastName}`,
      recipientProfileImage: recipient.profileImage || null,
      subject,
      content,
      timestamp: new Date().toISOString(),
      isRead: false
    };
    
    console.log('Creating new message:', newMessage);
    
    // Add message to database
    const result = await db.collection('messages').insertOne(newMessage);
    console.log('Message inserted:', result);

    // Create notification for the recipient
    const notification = {
      userId: recipientIdObj,
      type: 'message',
      title: 'New Message',
      message: `You have a new message from ${sender.firstName} ${sender.lastName}: ${subject}`,
      fromUserId: senderId,
      fromUserName: `${sender.firstName} ${sender.lastName}`,
      messageId: result.insertedId,
      createdAt: new Date(),
      read: false
    };
    
    const notificationResult = await db.collection('notifications').insertOne(notification);
    console.log('Notification created:', notificationResult.insertedId);
    
    return NextResponse.json({ message: newMessage });
  } catch (error) {
    console.error('Error in messages API:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 