import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { verifyToken } from '@/lib/auth';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Add OPTIONS handler for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: { lodgeId: string } }
) {
  console.log('=== Starting activity API route ===');
  console.log('Request URL:', request.url);
  console.log('Request method:', request.method);
  console.log('Request headers:', Object.fromEntries(request.headers.entries()));
  console.log('Route params:', params);

  try {
    // Get authorization token
    const authHeader = request.headers.get('authorization');
    console.log('Auth header present:', !!authHeader);

    if (!authHeader?.startsWith('Bearer ')) {
      console.error('Invalid or missing authorization header');
      return new NextResponse(JSON.stringify({
        error: 'Unauthorized',
        details: 'Missing or invalid authorization header'
      }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store'
        }
      });
    }

    const token = authHeader.split(' ')[1];
    console.log('Token extracted:', token.substring(0, 10) + '...');

    const decoded = await verifyToken(token);
    if (!decoded) {
      console.error('Token verification failed');
      return new NextResponse(JSON.stringify({
        error: 'Invalid token',
        details: 'Token verification failed'
      }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store'
        }
      });
    }

    console.log('Token verified successfully:', {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role
    });

    const { lodgeId } = params;
    console.log('Lodge ID from params:', lodgeId);

    if (!lodgeId) {
      console.error('No lodge ID provided in params');
      return new NextResponse(JSON.stringify({
        error: 'Lodge ID is required',
        details: 'No lodge ID provided in route parameters'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store'
        }
      });
    }

    // Validate lodge ID format
    if (!/^[0-9a-fA-F]{24}$/.test(lodgeId)) {
      console.error('Invalid lodge ID format:', lodgeId);
      return new NextResponse(JSON.stringify({
        error: 'Invalid lodge ID format',
        details: 'Lodge ID must be a valid MongoDB ObjectId'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store'
        }
      });
    }

    // Connect to database
    console.log('Connecting to database...');
    const { db } = await connectToDatabase();
    console.log('Connected to database');

    // Find the lodge
    const lodge = await db.collection('lodges').findOne({ _id: new ObjectId(lodgeId) });
    if (!lodge) {
      console.error('Lodge not found:', lodgeId);
      return new NextResponse(JSON.stringify({
        error: 'Failed to fetch lodge',
        details: 'Lodge not found'
      }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store'
        }
      });
    }

    // Fetch recent activities
    const activities = await db.collection('activities')
      .find({ lodgeId: new ObjectId(lodgeId) })
      .sort({ timestamp: -1 })
      .limit(10)
      .toArray();

    console.log('Found activities:', activities.length);

    return new NextResponse(JSON.stringify({
      activities,
      lodge: {
        id: lodge._id,
        name: lodge.name
      }
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (error) {
    console.error('Error in lodge activity route:', error);
    return new NextResponse(JSON.stringify({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } finally {
    console.log('=== Completed activity API route ===');
  }
} 