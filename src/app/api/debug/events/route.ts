import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { verifyToken } from '@/lib/auth/auth';

export async function GET(request: Request) {
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

    // Get all events without any filters
    const allEvents = await db.collection('events').find({}).sort({ date: 1, time: 1 }).toArray();

    // Get user's lodge information
    let user = null;
    
    // Try to find user in both users and members collections
    const mongoose = require('mongoose');
    const User = mongoose.models.User;
    if (User) {
      user = await User.findById(decoded.userId);
    }
    
    if (!user) {
      const { ObjectId } = require('mongodb');
      user = await db.collection('members').findOne({ _id: new ObjectId(decoded.userId) });
    }

    console.log('Debug - All events in database:', allEvents);
    console.log('Debug - User data:', user);

    return NextResponse.json({
      allEvents: allEvents.map(event => ({
        ...event,
        _id: event._id.toString(),
        lodgeId: event.lodgeId ? event.lodgeId.toString() : null
      })),
      user: user ? {
        _id: user._id.toString(),
        name: user.name || `${user.firstName} ${user.lastName}`,
        primaryLodge: user.primaryLodge,
        administeredLodges: user.administeredLodges,
        role: user.role
      } : null,
      currentDate: new Date().toISOString(),
      todayStart: new Date().setHours(0, 0, 0, 0)
    });
  } catch (error) {
    console.error('Error in debug events endpoint:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 