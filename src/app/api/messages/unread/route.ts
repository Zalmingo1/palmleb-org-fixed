import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { getTokenData } from '@/lib/auth';
import { ObjectId } from 'mongodb';

export async function GET(request: NextRequest) {
  try {
    const tokenData = await getTokenData(request);
    
    if (!tokenData) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { db } = await connectToDatabase();

    // Count unread messages for the current user
    const count = await db.collection('messages').countDocuments({
      recipientId: new ObjectId(tokenData.userId),
      isRead: false
    });

    return NextResponse.json({ count });
  } catch (error) {
    console.error('Error in unread messages API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 