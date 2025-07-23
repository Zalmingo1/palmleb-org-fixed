import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/auth';
import { sign } from 'jsonwebtoken';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function POST(req: NextRequest) {
  try {
    // Get the current token from the Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'No token provided' },
        { status: 401 }
      );
    }

    const currentToken = authHeader.substring(7);
    const tokenData = await verifyToken(currentToken);

    if (!tokenData) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    // Connect to database
    const { db } = await connectToDatabase();

    // Get the latest user data
    const user = await db.collection('users').findOne(
      { _id: new ObjectId(tokenData.userId) }
    );

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Generate new token with updated user data
    const newTokenData = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      name: user.name,
      lodgeId: user.primaryLodge?._id || user.lodges?.[0]
    };

    const newToken = sign(newTokenData, process.env.JWT_SECRET!, { expiresIn: '24h' });

    // Return the new token
    return NextResponse.json({
      token: newToken,
      user: {
        _id: user._id.toString(),
        firstName: user.firstName,
        lastName: user.lastName,
        name: user.name,
        email: user.email,
        role: user.role,
        lodges: user.lodges || [],
        primaryLodge: user.primaryLodge,
        position: user.primaryLodgePosition || 'Brother',
        administeredLodges: user.administeredLodges || [],
        profileImage: user.profileImage || null,
        memberSince: user.memberSince || '',
        primaryLodgePosition: user.primaryLodgePosition || 'Brother'
      }
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    return NextResponse.json(
      { error: 'Failed to refresh token' },
      { status: 500 }
    );
  }
} 