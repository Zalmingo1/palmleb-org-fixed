import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { verifyToken } from '@/lib/auth/auth';
import mongoose from 'mongoose';
import User from '@/models/User';
import Member from '@/models/Member';
import jwt, { JwtPayload } from 'jsonwebtoken';

interface Member {
  _id: string;
  name: string;
  email: string;
  role: string;
  lodges: Array<{
    id: string;
    name: string;
  }>;
  primaryLodge: {
    _id: string;
    name: string;
  };
  primaryLodgePosition: string;
  administeredLodges: string[];
  created: Date;
  lastLogin?: Date;
  status: 'active' | 'inactive' | 'pending';
  profileImage?: string;
  memberSince: string;
}

interface DiagnosticInfo {
  currentUser: {
    _id: any;
    name: string;
    primaryLodge: any;
    lodges: any[];
    administeredLodges: string[];
  };
  totalUsers: number;
  sampleUsers: Array<{
    _id: any;
    name: string;
    primaryLodge: any;
    lodges: any[];
    administeredLodges: string[];
  }>;
  query: any;
  membersFound: number;
  usersWithLodgeInArray?: number;
  usersWithStringPrimaryLodge?: number;
  usersWithLodgeObject?: number;
}

// GET members
export async function GET(
  request: Request,
  { params }: { params: Promise<{ lodgeId: string }> }
) {
  try {
    // Verify authentication
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized', details: 'No token provided' }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token', details: 'Token verification failed' }, { status: 401 });
    }

    // Connect to database
    const { db } = await connectToDatabase();

    // Get lodge ID from params - await the params
    const { lodgeId } = await params;
    if (!lodgeId) {
      return NextResponse.json({ error: 'Lodge ID is required', details: 'Missing lodgeId parameter' }, { status: 400 });
    }

    // First verify the lodge exists
    const lodge = await db.collection('lodges').findOne({
      _id: new ObjectId(lodgeId)
    });

    if (!lodge) {
      return NextResponse.json({ 
        error: 'Lodge not found',
        details: `No lodge found with ID: ${lodgeId}`
      }, { status: 404 });
    }

    // Fetch members for this lodge from all collections
    const lodgeIdStr = lodgeId.toString();
    
    if (!db) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }
    
    const [users, members, unifiedUsers] = await Promise.all([
      User.find({ 
        $or: [
          { lodges: { $elemMatch: { $eq: lodgeId } } },
          { lodges: { $elemMatch: { $eq: new ObjectId(lodgeId) } } },
          { primaryLodge: lodgeId },
          { primaryLodge: new ObjectId(lodgeId) }
        ]
      }).select('name email role status primaryLodgePosition profileImage').lean(),
      // Use raw MongoDB query for members to handle both string and ObjectId lodge IDs
      db.collection('members').find({ 
        $or: [
          { lodgeMemberships: { $elemMatch: { lodge: lodgeIdStr } } },
          { lodgeMemberships: { $elemMatch: { lodge: new ObjectId(lodgeId) } } },
          { primaryLodge: lodgeIdStr },
          { primaryLodge: new ObjectId(lodgeId) }
        ]
      }).project({
        name: 1,
        email: 1,
        role: 1,
        status: 1,
        primaryLodgePosition: 1,
        profileImage: 1,
        source: 'members'
      }).toArray(),
      db.collection('unifiedusers').find({ 
        $or: [
          { lodges: { $elemMatch: { $eq: lodgeId } } },
          { lodges: { $elemMatch: { $eq: new ObjectId(lodgeId) } } },
          { primaryLodge: lodgeId },
          { primaryLodge: new ObjectId(lodgeId) }
        ]
      }).project({
        name: 1,
        email: 1,
        role: 1,
        status: 1,
        primaryLodgePosition: 1,
        profileImage: 1,
        source: 'unifiedusers'
      }).toArray()
    ]);

    // Combine all results and remove duplicates based on email
    const allMembers = [...users, ...members, ...unifiedUsers];
    const uniqueMembers = allMembers.reduce((acc: any[], member: any) => {
      const existingIndex = acc.findIndex(m => m.email === member.email);
      if (existingIndex === -1) {
        acc.push(member);
      } else {
        // Prioritize unified user records and records with more complete data
        const existing = acc[existingIndex];
        if (member.source === 'unifiedusers' || (member.name && !existing.name)) {
          acc[existingIndex] = member;
        }
      }
      return acc;
    }, []);

    // Return the unique members
    return NextResponse.json({ 
      members: uniqueMembers,
      diagnostic: {
        totalUsers: users.length,
        usersFound: users.length,
        membersFound: members.length,
        unifiedUsersFound: unifiedUsers.length,
        lodgeId: lodgeId,
        lodgeName: lodge.name
      }
    });
  } catch (error) {
    console.error('Error in API route:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}

// POST - Add a new member to the lodge
export async function POST(
  request: Request,
  { params }: { params: Promise<{ lodgeId: string }> }
) {
  try {
    // Verify authentication
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Connect to database
    const { db } = await connectToDatabase();

    const { lodgeId } = await params;
    const body = await request.json();
    const { email, role, position, status = 'active' } = body;

    // Verify the lodge exists
    const lodge = await db.collection('lodges').findOne({
      _id: new ObjectId(lodgeId)
    });

    if (!lodge) {
      return NextResponse.json({ error: 'Lodge not found' }, { status: 404 });
    }

    // Check if user exists
    let user = await User.findOne({ email });
    if (!user) {
      // Create new user
      user = await User.create({
        email,
        role: role || 'LODGE_MEMBER',
        status,
        lodges: [lodgeId],
        primaryLodge: lodgeId,
        primaryLodgePosition: position || 'Member'
      });
    } else {
      // Add lodge to user's lodges if not already present
      if (!user.lodges.includes(lodgeId)) {
        user.lodges.push(lodgeId);
      }
      // Update position if provided
      if (position) {
        user.primaryLodgePosition = position;
      }
      await user.save();
    }

    return NextResponse.json({ 
      message: 'Member added successfully',
      member: {
        _id: user._id,
        email: user.email,
        role: user.role,
        status: user.status,
        primaryLodgePosition: user.primaryLodgePosition
      }
    });
  } catch (error) {
    console.error('Error adding member:', error);
    return NextResponse.json({ 
      error: 'Failed to add member',
      details: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}

// PUT - Update a member's details
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ lodgeId: string }> }
) {
  try {
    // Verify authentication
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Connect to database
    await connectToDatabase();

    const { userId, position, role, status } = await request.json();
    const { lodgeId } = await params;
    
    console.log('PUT request data:', {
      userId,
      position,
      role,
      status,
      lodgeId
    });
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Verify the lodge exists
    const db = mongoose.connection.db;
    if (!db) {
      return NextResponse.json({ error: 'Database connection error' }, { status: 500 });
    }

    const lodge = await db.collection('lodges').findOne({
      _id: new ObjectId(lodgeId)
    });

    if (!lodge) {
      return NextResponse.json({ error: 'Lodge not found' }, { status: 404 });
    }

    // Find the user to update
    console.log('Looking up user with ID:', userId);
    const user = await User.findById(userId);
    console.log('User lookup result:', user ? {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      lodges: user.lodges,
      primaryLodge: user.primaryLodge
    } : 'Not found');

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if the requesting user has admin privileges
    const adminRoles = ['SUPER_ADMIN', 'DISTRICT_ADMIN', 'LODGE_ADMIN'];
    const isAdmin = adminRoles.includes(decoded.role);
    
    // Only admins can change lodge positions and roles
    if (position && !isAdmin) {
      return NextResponse.json({ 
        error: 'Forbidden - Only administrators can change lodge positions' 
      }, { status: 403 });
    }
    
    if (role && !isAdmin) {
      return NextResponse.json({ 
        error: 'Forbidden - Only administrators can change member roles' 
      }, { status: 403 });
    }

    // Update user fields if provided and user has permission
    if (position && isAdmin) {
      user.primaryLodgePosition = position;
    }
    if (role && isAdmin) {
      user.role = role;
    }
    if (status) {
      user.status = status;
    }

    // Save the updated user
    await user.save();

    return NextResponse.json({ 
      message: 'Member updated successfully',
      member: {
        _id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        primaryLodgePosition: user.primaryLodgePosition
      }
    });
  } catch (error) {
    console.error('Error updating member:', error);
    return NextResponse.json(
      { 
        error: 'Failed to update member',
        details: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}

// DELETE - Remove a member from the lodge
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ lodgeId: string }> }
) {
  try {
    const { userId } = await request.json();
    const { lodgeId } = await params;
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      console.log('No token provided in request');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('Token received:', token.substring(0, 10) + '...');
    
    const decoded = await verifyToken(token);
    console.log('Token verification result:', decoded);
    
    if (!decoded) {
      console.log('Token verification failed');
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    console.log('Looking up admin user with ID:', decoded.userId);
    const adminUser = await User.findOne({ _id: decoded.userId });
    console.log('Admin user lookup result:', adminUser ? {
      id: adminUser._id,
      email: adminUser.email,
      role: adminUser.role,
      administeredLodges: adminUser.administeredLodges,
      primaryLodge: adminUser.primaryLodge
    } : 'Not found');

    if (!adminUser) {
      console.log('Admin user not found in database');
      return NextResponse.json(
        { error: 'Admin user not found' },
        { status: 404 }
      );
    }

    // Verify admin has permission for this lodge
    const isLodgeAdmin = adminUser.administeredLodges.includes(lodgeId);
    const isPrimaryLodge = adminUser.primaryLodge === lodgeId;

    if (!isLodgeAdmin && !isPrimaryLodge) {
      return NextResponse.json(
        { error: 'Unauthorized to manage this lodge' },
        { status: 403 }
      );
    }

    // Remove member from lodge
    const member = await User.findById(userId);
    if (!member) {
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      );
    }

    // Check if member has administrative privileges
    const adminRoles = ['SUPER_ADMIN', 'DISTRICT_ADMIN', 'LODGE_ADMIN'];
    if (adminRoles.includes(member.role)) {
      console.log(`API: Attempted to remove member with admin role from lodge: ${member.role}`);
      return NextResponse.json({ 
        error: 'Cannot remove member with administrative privileges from lodge',
        details: `This member has the role '${member.role}'. Please remove their administrative privileges before removing them from the lodge.`
      }, { status: 403 });
    }

    // Remove lodge from member's lodges array
    member.lodges = member.lodges.filter(
      (lodgeId: string) => lodgeId !== lodgeId
    );

    // If this was their primary lodge, clear it
    if (member.primaryLodge === lodgeId) {
      member.primaryLodge = null;
      member.primaryLodgePosition = null;
    }

    await member.save();

    return NextResponse.json({ message: 'Member removed from lodge successfully' });
  } catch (error) {
    console.error('Error removing member from lodge:', error);
    return NextResponse.json(
      { error: 'Failed to remove member from lodge' },
      { status: 500 }
    );
  }
} 