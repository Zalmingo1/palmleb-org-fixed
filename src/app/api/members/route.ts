import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Lodge from '@/models/Lodge';
import bcrypt from 'bcryptjs';
import { getTokenData } from '@/lib/auth';
import { ObjectId } from 'mongodb';
import { verifyToken } from '@/lib/auth/auth';
import { Document } from 'mongoose';
import { findUnifiedUserById } from '@/lib/auth/unified-auth';

interface LodgeDocument extends Document {
  _id: string;
  name: string;
}

interface MemberDocument extends Document {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  occupation?: string;
  interests?: string[];
  bio?: string;
  profileImage?: string;
  primaryLodge: string;
  primaryLodgePosition: string;
  lodgeMemberships: Array<{
    lodge: string;
    position: string;
  }>;
  memberSince: Date;
  status: 'active' | 'inactive';
}

// GET handler to fetch all members
export async function GET(request: Request) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Connect to the database
    await connectToDatabase();
    console.log('Connected to database');

    // Get user data from token
    const token = authHeader.split(' ')[1];
    const decodedToken = await verifyToken(token);
    if (!decodedToken) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Parse query parameters
    const url = new URL(request.url);
    const email = url.searchParams.get('email');
    const districtFilter = url.searchParams.get('district');

    // Build query based on role and email filter
    let query: any = {};
    
    // Add email filter if provided
    if (email) {
      query.email = email;
    }

    // Add role-based filtering
    if (decodedToken.role === 'LODGE_ADMIN' && (decodedToken as any).administeredLodges) {
      // For lodge admins, only fetch members from their administered lodges
      query.$or = [
        { 'lodgeMemberships.lodge': { $in: (decodedToken as any).administeredLodges } },
        { primaryLodge: { $in: (decodedToken as any).administeredLodges } },
        { lodges: { $in: (decodedToken as any).administeredLodges } }
      ];
    } else if (decodedToken.role === 'DISTRICT_ADMIN' && districtFilter === 'true') {
      // For district admins, fetch members from all lodges in their district
      const { db } = await connectToDatabase();
      
      // Get the user's lodge to determine the district
      const userLodgeId = decodedToken.lodge;
      if (userLodgeId) {
        const userLodge = await db.collection('lodges').findOne({ _id: new ObjectId(userLodgeId) });
        if (userLodge && userLodge.district) {
          // Get all lodges in the same district
          const districtLodges = await db.collection('lodges')
            .find({ district: userLodge.district })
            .toArray();
          const districtLodgeIds = districtLodges.map(lodge => lodge._id.toString());
          
          // Filter members by district lodges
          query.$or = [
            { 'lodgeMemberships.lodge': { $in: districtLodgeIds.map(id => new ObjectId(id)) } },
            { primaryLodge: { $in: districtLodgeIds.map(id => new ObjectId(id)) } },
            { lodges: { $in: districtLodgeIds.map(id => new ObjectId(id)) } }
          ];
        }
      }
    }

    // Get members from unified collection
    const { db } = await connectToDatabase();
    let members = await db.collection('members').find(query).toArray();
    
    // Update any members with REGULAR_USER role to LODGE_MEMBER
    await db.collection('members').updateMany(
      { role: 'REGULAR_USER' },
      { $set: { role: 'LODGE_MEMBER' } }
    );

    // Fetch all lodges for name lookup
    const lodges = await Lodge.find({}).lean() as any[];
    const lodgeMap = new Map(lodges.map(lodge => [lodge._id.toString(), lodge.name]));
    
    // Transform the data to match the frontend interface
    const transformedMembers = members.map(member => ({
      _id: member._id.toString(),
      name: member.name || `${member.firstName || ''} ${member.lastName || ''}`.trim(),
      email: member.email,
      role: member.role || 'LODGE_MEMBER',
      status: member.status || 'active',
      lodge: member.primaryLodge ? {
        _id: member.primaryLodge.toString(),
        name: lodgeMap.get(member.primaryLodge.toString()) || 'Unknown Lodge'
      } : null,
      memberSince: member.memberSince ? new Date(member.memberSince).toISOString() : new Date().toISOString(),
      phone: member.phone || '',
      profileImage: member.profileImage || '/images/default-avatar.png',
      bio: member.bio || '',
      address: member.address || '',
      city: member.city || '',
      state: member.state || '',
      zipCode: member.zipCode || '',
      country: member.country || '',
      lodges: member.lodges?.map((lodge: any) => lodge.toString()) || [],
      primaryLodge: member.primaryLodge?.toString() || null,
      primaryLodgePosition: member.primaryLodgePosition || 'MEMBER',
      occupation: member.occupation || '',
      lodgeMemberships: member.lodgeMemberships || [],
      lodgeRoles: member.lodgeRoles || {}
    }));
    
    return NextResponse.json(transformedMembers);
  } catch (error) {
    console.error('Error fetching members:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST handler to create a new member
export async function POST(request: Request) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the request body
    const body = await request.json();
    console.log('Creating new member with data:', {
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email,
      hasPassword: !!body.password,
      role: body.role,
      primaryLodge: body.primaryLodge,
      primaryLodgePosition: body.primaryLodgePosition
    });

    // Validate required fields
    if (!body.firstName || !body.lastName || !body.email || !body.password) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Connect to the database
    await connectToDatabase();
    console.log('Connected to database');

    // Check if email already exists in members collection
    const { db } = await connectToDatabase();
    const existingUser = await db.collection('members').findOne({ email: body.email });
    
    if (existingUser) {
      return NextResponse.json(
        { error: 'Email already exists' },
        { status: 400 }
      );
    }

    // Hash the password
    const bcrypt = require('bcryptjs');
    const passwordHash = await bcrypt.hash(body.password, 12);

    // Create new member in members collection
    const newMember = {
      email: body.email.toLowerCase(),
      passwordHash,
      name: `${body.firstName} ${body.lastName}`,
      firstName: body.firstName,
      lastName: body.lastName,
      role: body.role || 'LODGE_MEMBER',
      status: body.status || 'active',
      phone: body.phone || '',
      profileImage: body.profileImage || '',
      bio: body.bio || '',
      address: body.address || '',
      city: body.city || '',
      state: body.state || '',
      zipCode: body.zipCode || '',
      country: body.country || '',
      primaryLodge: body.primaryLodge ? new ObjectId(body.primaryLodge) : null,
      primaryLodgePosition: body.primaryLodgePosition || 'MEMBER',
      lodges: body.lodgeMemberships?.map((membership: any) => new ObjectId(membership.lodge)) || 
              (body.primaryLodge ? [new ObjectId(body.primaryLodge)] : []),
      lodgeMemberships: body.lodgeMemberships || 
                       (body.primaryLodge ? [{
                         lodge: new ObjectId(body.primaryLodge),
                         position: body.primaryLodgePosition || 'MEMBER'
                       }] : []),
      memberSince: new Date(),
      created: new Date(),
      updatedAt: new Date()
    };

    console.log('Saving new member to database...');
    const result = await db.collection('members').insertOne(newMember);
    console.log('Created new member with ID:', result.insertedId);

    // Transform the response to match the frontend interface
    const transformedMember = {
      _id: result.insertedId.toString(),
      name: newMember.name,
      email: newMember.email,
      role: newMember.role,
      status: newMember.status,
      phone: newMember.phone,
      profileImage: newMember.profileImage,
      bio: newMember.bio,
      address: newMember.address,
      city: newMember.city,
      state: newMember.state,
      zipCode: newMember.zipCode,
      country: newMember.country,
      lodges: newMember.lodges?.map((lodge: any) => lodge.toString()) || [],
      primaryLodge: newMember.primaryLodge?.toString() || null,
      primaryLodgePosition: newMember.primaryLodgePosition
    };

    return NextResponse.json(transformedMember);
  } catch (error) {
    console.error('Error creating member:', error);
    
    // Provide more detailed error information
    let errorMessage = 'Failed to create member';
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'object' && error !== null) {
      errorMessage = JSON.stringify(error);
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: error instanceof Error ? error.stack : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Add similar checks for PUT and DELETE handlers to restrict to SUPER_ADMIN and handle password updates and last super admin protection. 