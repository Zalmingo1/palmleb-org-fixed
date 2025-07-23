import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import type { Document } from 'mongoose';
import mongoose from 'mongoose';
import { ObjectId } from 'mongodb';
import { verifyToken } from '@/lib/auth/auth';

interface LodgeDocument extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
}

// GET - Get member details
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  
  try {
    const { id } = await params;
    console.log('API: Fetching member with ID:', id);
    
    // Check authentication
    const authHeader = request.headers.get('authorization');
    console.log('API: Auth header present:', !!authHeader);
    if (authHeader) {
      console.log('API: Auth header starts with Bearer:', authHeader.startsWith('Bearer '));
    }
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('API: No valid authorization header');
      return NextResponse.json({ error: 'Unauthorized - No token provided' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const decoded = await verifyToken(token);
    console.log('API: Token verification result:', decoded ? 'Valid' : 'Invalid');
    if (!decoded) {
      console.log('API: Invalid token');
      return NextResponse.json({ error: 'Unauthorized - Invalid token' }, { status: 401 });
    }
    
    console.log('API: Authenticated user:', decoded);
    
    // Connect to database
    const { db } = await connectToDatabase();
    console.log('API: Connected to database:', db.databaseName);
    
    // Search in the current database
    let member = null;
    
    // Search in members collection
    const memberFromMembers = await db.collection('members').findOne({ _id: new ObjectId(id) });
    if (memberFromMembers) {
      console.log('API: Found user in members collection');
      member = memberFromMembers;
    }
    
    if (!member) {
      console.log('API: Member not found in any collection');
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      );
    }
    
    // Get all lodges for name lookup from current database
    const lodges = await db.collection('lodges').find({}).toArray();
    console.log(`API: Found ${lodges.length} lodges in database`);
    const lodgeMap = new Map();
    lodges.forEach(lodge => {
      lodgeMap.set(lodge._id.toString(), lodge.name);
      console.log(`API: Added lodge to map: ${lodge._id.toString()} -> ${lodge.name}`);
    });
    
    console.log('API: Lodge map created:', Array.from(lodgeMap.entries()));
    console.log('API: Member primaryLodge:', member.primaryLodge);
    console.log('API: Member primaryLodge type:', typeof member.primaryLodge);
    console.log('API: Member primaryLodge toString:', member.primaryLodge?.toString());
    console.log('API: Lodge map has primaryLodge?', lodgeMap.has(member.primaryLodge?.toString() || ''));
    console.log('API: Lodge map keys:', Array.from(lodgeMap.keys()));
    console.log('API: Looking for primaryLodge in map:', member.primaryLodge?.toString());
    console.log('API: Found lodge name:', member.primaryLodge ? lodgeMap.get(member.primaryLodge.toString()) : 'No primaryLodge');
    console.log('API: Member lodgeMemberships:', member.lodgeMemberships);
    console.log('API: Member lodgeMemberships type:', typeof member.lodgeMemberships);
    if (member.lodgeMemberships && member.lodgeMemberships.length > 0) {
      console.log('API: First membership lodge type:', typeof member.lodgeMemberships[0].lodge);
      console.log('API: First membership lodge value:', member.lodgeMemberships[0].lodge);
      console.log('API: First membership lodge toString:', member.lodgeMemberships[0].lodge.toString());
    }
    
    // Transform the member data to match the frontend interface
    const transformedMember = {
      _id: member._id.toString(),
      name: member.name,
      email: member.email,
      role: member.role,
      status: member.status || 'active',
      occupation: member.occupation || '',
      phone: member.phone || '',
      address: member.address || '',
      city: member.city || '',
      state: member.state || '',
      zipCode: member.zipCode || '',
      country: member.country || '',
      primaryLodge: member.primaryLodge ? lodgeMap.get(member.primaryLodge.toString()) || 'Unknown Lodge' : 'Unknown Lodge',
      primaryLodgePosition: member.primaryLodgePosition || '',
      lodges: (() => {
        const lodgesArray = member.lodgeMemberships?.map((membership: { lodge: string | ObjectId; position: string }) => {
          const lodgeId = membership.lodge.toString();
          const lodgeName = lodgeMap.get(lodgeId);
          console.log(`API: Adding lodge ID to array: ${lodgeId} (${lodgeName || 'Unknown Lodge'})`);
          return lodgeId;
        }) || [];
        console.log('API: Final lodges array:', lodgesArray);
        return lodgesArray;
      })(),
      lodgePositions: (() => {
        const positions = member.lodgeMemberships?.reduce((acc: { [key: string]: string }, membership: { lodge: string | ObjectId; position: string }) => {
          const lodgeId = membership.lodge.toString();
          const lodgeName = lodgeMap.get(lodgeId);
          if (lodgeName && lodgeName !== 'Unknown Lodge') {
            acc[lodgeId] = membership.position;
          }
          return acc;
        }, {}) || {};
        console.log('API: Created lodgePositions:', positions);
        return positions;
      })(),
      lodgeRoles: member.lodgeRoles || {},
      administeredLodges: [], // This will be populated if needed
      interests: member.interests || [],
      bio: member.bio || '',
      created: member.created || new Date(),
      lastLogin: member.updatedAt || new Date(),
      profileImage: member.profileImage || '',
      memberSince: member.memberSince || new Date()
    };
    
    console.log('API: Returning transformed member data:', transformedMember);
    
    return NextResponse.json(transformedMember);
  } catch (error) {
    console.error('API: Error fetching member:', error);
    
    return NextResponse.json(
      { error: 'Failed to fetch member' },
      { status: 500 }
    );
  }
}

// PUT - Update member details
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
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

    // Check if user has admin privileges (Super Admin and District Admin have same privileges)
    if (decoded.role !== 'SUPER_ADMIN' && decoded.role !== 'DISTRICT_ADMIN') {
      return NextResponse.json({ error: 'Forbidden - Insufficient privileges' }, { status: 403 });
    }

    // Connect to database
    await connectToDatabase();

    const body = await request.json();
    console.log('API: Update request body:', body);
    console.log('API: lodgeRoles in request:', body.lodgeRoles);
    
    const { name, email, status, primaryLodgePosition, occupation, city, state, zipCode, country, lodges, lodgePositions, lodgeRoles, primaryLodge } = body;

    // Find the member in members collection
    const { db } = await connectToDatabase();
    const member = await db.collection('members').findOne({ _id: new ObjectId(id) });

    if (!member) {
      console.log('API: Member not found for update');
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }
    
    // Prepare update data
    const updateData: any = {};
    if (name) {
      updateData.name = name;
    }
    if (email) updateData.email = email;
    if (status) updateData.status = status;
    if (primaryLodgePosition) updateData.primaryLodgePosition = primaryLodgePosition;
    if (occupation !== undefined) updateData.occupation = occupation;
    if (city !== undefined) updateData.city = city;
    if (state !== undefined) updateData.state = state;
    if (zipCode !== undefined) updateData.zipCode = zipCode;
    if (country !== undefined) updateData.country = country;

    // Handle lodge memberships and positions
    if (lodges && lodgePositions) {
      // Convert lodge IDs back to lodge memberships format
      const lodgeMemberships = lodges.map((lodgeId: string) => {
        const position = lodgePositions[lodgeId] || 'LODGE_MEMBER';
        return {
          lodge: lodgeId, // This should be the lodge ID
          position: position
        };
      });
      updateData.lodgeMemberships = lodgeMemberships;
      
      // Also update the lodges array for compatibility with existing APIs
      updateData.lodges = lodges.map((lodgeId: string) => new ObjectId(lodgeId));
    }

    // Handle lodge roles
    if (lodgeRoles) {
      updateData.lodgeRoles = lodgeRoles;
      console.log('API: Updating lodgeRoles:', lodgeRoles);
      
      // Determine the highest privilege level across all lodges
      const roleHierarchy = {
        'SUPER_ADMIN': 4,
        'DISTRICT_ADMIN': 3,
        'LODGE_ADMIN': 2,
        'LODGE_MEMBER': 1
      };
      
      let highestRole = 'LODGE_MEMBER';
      let highestLevel = 1;
      
      // Check all lodge roles to find the highest privilege
      Object.values(lodgeRoles).forEach(role => {
        const roleStr = role as string;
        const level = roleHierarchy[roleStr as keyof typeof roleHierarchy] || 1;
        if (level > highestLevel) {
          highestLevel = level;
          highestRole = roleStr;
        }
      });
      
      console.log('API: Highest role across all lodges:', highestRole);
      updateData.role = highestRole;
      
      // Auto-assign appropriate roles based on highest privilege
      if (highestRole === 'DISTRICT_ADMIN') {
        // Find the District Grand Lodge
        const districtGrandLodge = await db.collection('lodges').findOne({ 
          name: 'District Grand Lodge of Syria-Lebanon' 
        });
        
        if (districtGrandLodge) {
          const districtLodgeId = districtGrandLodge._id.toString();
          
          // Ensure the user is a member of the District Grand Lodge
          if (!lodges.includes(districtLodgeId)) {
            lodges.push(districtLodgeId);
            updateData.lodges = lodges.map((lodgeId: string) => new ObjectId(lodgeId));
          }
          
          // Auto-assign DISTRICT_ADMIN role to District Grand Lodge
          updateData.lodgeRoles = {
            ...updateData.lodgeRoles,
            [districtLodgeId]: 'DISTRICT_ADMIN'
          };
          
          console.log('API: Auto-assigned DISTRICT_ADMIN role to District Grand Lodge for user');
        }
      } else if (highestRole === 'LODGE_ADMIN') {
        // For lodge admins, ensure they have LODGE_ADMIN role in their primary lodge
        const userPrimaryLodge = primaryLodge || member.primaryLodge;
        if (userPrimaryLodge) {
          updateData.lodgeRoles = {
            ...updateData.lodgeRoles,
            [userPrimaryLodge]: 'LODGE_ADMIN'
          };
          console.log('API: Auto-assigned LODGE_ADMIN role to primary lodge for user');
        }
      }
    }

    // Update the member in members collection
    console.log('API: Final updateData:', updateData);
    const result = await db.collection('members').updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );
    
    if (result.modifiedCount === 0) {
      console.log('API: No changes made to member');
    } else {
      console.log('API: Member updated successfully');
    }

    // Fetch the updated member to verify the changes
    const updatedMember = await db.collection('members').findOne({ _id: new ObjectId(id) });
    console.log('API: Updated member data:', updatedMember);
    
    return NextResponse.json({
      message: 'Member updated successfully',
      member: {
        _id: member._id.toString(),
        name: `${member.firstName} ${member.lastName}`,
        email: member.email,
        role: member.role,
        status: member.status,
        primaryLodgePosition: member.primaryLodgePosition,
        occupation: member.occupation,
        city: member.city,
        state: member.state,
        zipCode: member.zipCode,
        country: member.country,
        lodgeRoles: updatedMember?.lodgeRoles || {}
      }
    });
  } catch (error) {
    console.error('API: Error updating member:', error);
    return NextResponse.json(
      { 
        error: 'Failed to update member',
        details: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}

// DELETE - Delete member
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
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

    // Check if user has admin privileges
    if (decoded.role !== 'SUPER_ADMIN' && decoded.role !== 'DISTRICT_ADMIN') {
      return NextResponse.json({ error: 'Forbidden - Insufficient privileges' }, { status: 403 });
    }

    // Connect to database
    await connectToDatabase();

    // Find the member in members collection
    const { db } = await connectToDatabase();
    const member = await db.collection('members').findOne({ _id: new ObjectId(id) });

    if (!member) {
      console.log('API: Member not found for deletion');
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Check if member has administrative privileges
    const adminRoles = ['SUPER_ADMIN', 'DISTRICT_ADMIN', 'LODGE_ADMIN'];
    if (adminRoles.includes(member.role)) {
      console.log(`API: Attempted to delete member with admin role: ${member.role}`);
      return NextResponse.json({ 
        error: 'Cannot delete member with administrative privileges',
        details: `This member has the role '${member.role}'. Please remove their administrative privileges before deleting the member.`
      }, { status: 403 });
    }

    // Delete the member from members collection
    const result = await db.collection('members').deleteOne({ _id: new ObjectId(id) });
    
    if (result.deletedCount === 0) {
      console.log('API: No member was deleted');
      return NextResponse.json({ error: 'Failed to delete member' }, { status: 500 });
    }
    
    console.log('API: Member deleted successfully');

    return NextResponse.json({
      message: 'Member deleted successfully',
      deletedMemberId: member._id.toString()
    });
  } catch (error) {
    console.error('API: Error deleting member:', error);
    return NextResponse.json(
      { 
        error: 'Failed to delete member',
        details: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
} 