import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { verifyToken } from '@/lib/auth/auth';
import { ObjectId } from 'mongodb';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized - No token provided' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const decoded = await verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized - Invalid token' }, { status: 401 });
    }

    // Connect to database
    const { db } = await connectToDatabase();
    
    // Find the user in the members collection
    const user = await db.collection('members').findOne({ 
      _id: new ObjectId(decoded.userId) 
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get all lodges for name lookup
    const lodges = await db.collection('lodges').find({}).toArray();
    const lodgeMap = new Map(lodges.map(lodge => [lodge._id.toString(), lodge.name]));

    // Transform the user data
    const userData = {
      _id: user._id.toString(),
      name: user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
      email: user.email,
      role: user.role || 'LODGE_MEMBER',
      status: user.status || 'active',
      primaryLodge: user.primaryLodge?.toString() || null,
      primaryLodgePosition: user.primaryLodgePosition || '',
      lodges: user.lodges?.map((lodge: any) => lodge.toString()) || [],
      lodgePositions: user.lodgePositions || {},
      lodgeRoles: user.lodgeRoles || {},
      profileImage: user.profileImage || '',
      phone: user.phone || '',
      address: user.address || '',
      city: user.city || '',
      state: user.state || '',
      zipCode: user.zipCode || '',
      country: user.country || '',
      occupation: user.occupation || '',
      bio: user.bio || '',
      memberSince: user.memberSince ? new Date(user.memberSince).toISOString() : new Date().toISOString()
    };

    return NextResponse.json(userData);
  } catch (error) {
    console.error('Error fetching user data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user data' },
      { status: 500 }
    );
  }
} 