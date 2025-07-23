import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Lodge from '@/models/Lodge';
import User from '@/models/User';
import Member from '@/models/Member';
import { ObjectId } from 'mongodb';
import { getTokenData } from '@/lib/auth';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import type { Document } from 'mongoose';

interface LeanLodgeDocument {
  _id: ObjectId;
  name: string;
  number: string;
  location: string;
  description?: string;
  foundedYear?: string;
  isActive: boolean;
  logoImage?: string;
  backgroundImage?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  officers?: Array<{
    position: string;
    member: {
      _id: ObjectId;
      firstName: string;
      lastName: string;
    };
  }>;
  events?: Array<{
    title: string;
    date: string;
    description?: string;
    location?: string;
  }>;
}

type MongooseLodgeDocument = LeanLodgeDocument;

// GET lodge by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ lodgeId: string }> }
) {
  try {
    // Connect to database
    await connectToDatabase();

    // Get and validate the lodgeId parameter
    const { lodgeId } = await params;

    // Log the incoming request
    console.log('GET /api/lodges/[lodgeId] - Request params:', {
      lodgeId,
      rawParams: JSON.stringify(params)
    });

    // Validate the ID parameter
    if (!lodgeId || typeof lodgeId !== 'string') {
      console.error('Invalid lodge ID:', lodgeId);
      return NextResponse.json(
        { error: 'Invalid lodge ID' },
        { status: 400 }
      );
    }

    try {
      // Convert string ID to ObjectId
      const objectId = new ObjectId(lodgeId);
      console.log('Converted lodge ID to ObjectId:', {
        originalId: lodgeId,
        objectId: objectId.toString()
      });
      
      // Fetch the lodge with populated officers
      const lodge = await Lodge.findById(objectId)
        .populate('officers.member', 'firstName lastName')
        .lean() as unknown as LeanLodgeDocument;

      if (!lodge) {
        console.error('Lodge not found:', {
          id: lodgeId,
          objectId: objectId.toString()
        });
        return NextResponse.json(
          { error: 'Lodge not found' },
          { status: 404 }
        );
      }

      // Log raw database data
      console.log('Raw database lodge data:', {
        id: lodge._id,
        name: lodge.name,
        logoImage: lodge.logoImage,
        backgroundImage: lodge.backgroundImage
      });

      // Special logging for Suleyman Lodge
      if (lodge.name.includes('Suleyman')) {
        console.log('Suleyman Lodge data:', {
          id: lodge._id,
          name: lodge.name,
          originalLogoImage: lodge.logoImage,
          backgroundImage: lodge.backgroundImage,
          fullData: JSON.stringify(lodge, null, 2)
        });
      }

      // Count members in this lodge
      const [userCount, memberCount] = await Promise.all([
        User.countDocuments({ 
          $or: [
            { lodges: objectId },
            { primaryLodge: objectId }
          ]
        }),
        Member.countDocuments({ 
          $or: [
            { lodgeMemberships: { $elemMatch: { lodge: objectId } } },
            { primaryLodge: objectId }
          ]
        })
      ]);
      
      const totalMemberCount = userCount + memberCount;
      
      // Construct full image paths
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
      console.log('API Route - Lodge data:', {
        id: lodge._id,
        name: lodge.name,
        originalLogoImage: lodge.logoImage,
        originalBackgroundImage: lodge.backgroundImage,
        fullData: JSON.stringify(lodge, null, 2)
      });

      const backgroundImagePath = lodge.backgroundImage 
        ? (lodge.backgroundImage.startsWith('http') 
            ? lodge.backgroundImage 
            : lodge.backgroundImage.startsWith('/') 
              ? lodge.backgroundImage 
              : `/uploads/${lodge.backgroundImage}`)
        : null;
      
      const logoImagePath = lodge.logoImage 
        ? (lodge.logoImage.startsWith('http') 
            ? lodge.logoImage 
            : lodge.logoImage.startsWith('/') 
              ? lodge.logoImage 
              : `/uploads/${lodge.logoImage}`)
        : null;

      console.log('API Route - Processed image paths:', {
        logoImage: logoImagePath,
        backgroundImage: backgroundImagePath,
        baseUrl
      });

      // Get database connection for unifiedusers query
      const { db } = await connectToDatabase();
      
      // Fetch members for this lodge
      const [users, members, unifiedUsers] = await Promise.all([
        User.find({ 
          $or: [
            { lodges: objectId },
            { primaryLodge: objectId }
          ]
        }).select('name email role status primaryLodgePosition profileImage').lean(),
        Member.find({ 
          $or: [
            { lodgeMemberships: { $elemMatch: { lodge: objectId } } },
            { primaryLodge: objectId },
            { lodges: objectId }
          ]
        }).select('firstName lastName email role status primaryLodgePosition profileImage lodgeMemberships').lean(),
        db.collection('unifiedusers').find({ 
          $or: [
            { lodges: { $elemMatch: { $eq: objectId } } },
            { primaryLodge: objectId },
            { lodgeMemberships: { $elemMatch: { lodge: objectId } } }
          ]
        }).toArray()
      ]);

      // Combine and format member data
      const formattedMembers = [
        ...users.map(user => ({
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status,
          position: user.primaryLodgePosition || 'Member',
          profileImage: user.profileImage ? (
            user.profileImage.startsWith('http') 
              ? user.profileImage 
              : user.profileImage.startsWith('/') 
                ? user.profileImage 
                : `/uploads/${user.profileImage}`
          ) : null
        })),
        ...members.map(member => {
          // Find the position for this specific lodge
          let position = member.primaryLodgePosition || 'Member';
          if (member.lodgeMemberships) {
            const membership = member.lodgeMemberships.find((ms: any) => 
              ms.lodge.toString() === objectId.toString()
            );
            if (membership) {
              position = membership.position || 'Member';
            }
          }
          
          return {
            id: member._id,
            name: `${member.firstName} ${member.lastName}`,
            email: member.email,
            role: member.role,
            status: member.status,
            position: position,
            profileImage: member.profileImage ? (
              member.profileImage.startsWith('http') 
                ? member.profileImage 
                : member.profileImage.startsWith('/') 
                  ? member.profileImage 
                  : `/uploads/${member.profileImage}`
            ) : null
          };
        }),
        ...unifiedUsers.map(unifiedUser => ({
          id: unifiedUser._id,
          name: unifiedUser.name || `${unifiedUser.firstName || ''} ${unifiedUser.lastName || ''}`.trim(),
          email: unifiedUser.email,
          role: unifiedUser.role || 'LODGE_MEMBER',
          status: unifiedUser.status || 'active',
          position: unifiedUser.primaryLodgePosition || 'Member',
          profileImage: unifiedUser.profileImage ? (
            unifiedUser.profileImage.startsWith('http') 
              ? unifiedUser.profileImage 
              : unifiedUser.profileImage.startsWith('/') 
                ? unifiedUser.profileImage 
                : `/uploads/${unifiedUser.profileImage}`
          ) : null
        }))
      ];

      // Remove duplicates based on email address
      const emailMap = new Map();
      const uniqueFormattedMembers = [];
      
      for (const member of formattedMembers) {
        if (!member.email) continue;
        
        if (!emailMap.has(member.email)) {
          emailMap.set(member.email, member);
          uniqueFormattedMembers.push(member);
        }
      }

      // Return lodge with member count, member details, and full image paths
      const lodgeWithCounts = {
        ...lodge,
        members: totalMemberCount,
        memberDetails: uniqueFormattedMembers,
        backgroundImage: backgroundImagePath,
        logoImage: logoImagePath,
        coordinates: lodge.coordinates || {
          lat: 33.8938, // Default to Beirut coordinates
          lng: 35.5018
        }
      };

      console.log('API Response - Final lodge data:', {
        id: lodge._id,
        name: lodge.name,
        originalLogoImage: lodge.logoImage,
        processedLogoImage: logoImagePath,
        originalBackgroundImage: lodge.backgroundImage,
        processedBackgroundImage: backgroundImagePath
      });
      
      return NextResponse.json(lodgeWithCounts);
    } catch (error: any) {
      console.error('Error fetching lodge:', error);
      if (error.name === 'BSONTypeError') {
        return NextResponse.json(
          { error: 'Invalid lodge ID format' },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: 'Failed to fetch lodge' },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Error fetching lodge:', error);
    return NextResponse.json(
      { error: 'Failed to fetch lodge' },
      { status: 500 }
    );
  }
}

// PUT to update lodge
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ lodgeId: string }> }
) {
  try {
    // Connect to database
    await connectToDatabase();

    // Get and validate the lodgeId parameter
    const { lodgeId } = await params;

    // Validate the ID parameter
    if (!lodgeId || typeof lodgeId !== 'string') {
      return NextResponse.json(
        { error: 'Invalid lodge ID' },
        { status: 400 }
      );
    }

    // Check authentication
    const tokenData = await getTokenData(req);
    if (!tokenData) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Check if user is a super admin or district admin
    if (tokenData.role !== 'SUPER_ADMIN' && tokenData.role !== 'DISTRICT_ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden: Only super admins and district admins can update lodges' },
        { status: 403 }
      );
    }
    
    // Check if lodge exists
    const existingLodge = await Lodge.findById(lodgeId) as unknown as MongooseLodgeDocument;
    if (!existingLodge) {
      return NextResponse.json(
        { error: 'Lodge not found' },
        { status: 404 }
      );
    }
    
    // Parse form data
    const formData = await req.formData();
    const name = formData.get('name') as string;
    const location = formData.get('location') as string;
    const description = formData.get('description') as string;
    const foundedYear = formData.get('foundedYear') as string;
    const isActive = formData.get('isActive') === 'true';
    const lat = parseFloat(formData.get('coordinates.lat') as string);
    const lng = parseFloat(formData.get('coordinates.lng') as string);

    // Validate required fields
    if (!name || !location) {
      return NextResponse.json(
        { error: 'Name and location are required' },
        { status: 400 }
      );
    }

    // Prepare update data
    const updateData: any = {
      name,
      location,
      description,
      foundedYear,
      isActive,
      coordinates: {
        lat: isNaN(lat) ? 33.8938 : lat,
        lng: isNaN(lng) ? 35.5018 : lng
      }
    };
    
    // Handle logo image upload
    const logoImage = formData.get('logoImage') as File;
    if (logoImage) {
      const bytes = await logoImage.arrayBuffer();
      const buffer = Buffer.from(bytes);
      
      // Generate unique filename
      const uniqueId = uuidv4();
      const extension = logoImage.name.split('.').pop();
      const filename = `logo-${uniqueId}.${extension}`;
      
      // Save file to public/uploads directory
      const uploadDir = join(process.cwd(), 'public', 'uploads');
      const filepath = join(uploadDir, filename);
      await writeFile(filepath, buffer);
      
      updateData.logoImage = `/uploads/${filename}`;
      console.log('Logo image saved:', {
        originalName: logoImage.name,
        savedPath: updateData.logoImage,
        filepath
      });
    }
    
    // Handle background image upload
    const backgroundImage = formData.get('backgroundImage') as File;
    if (backgroundImage) {
      console.log('Processing background image:', {
        name: backgroundImage.name,
        type: backgroundImage.type,
        size: backgroundImage.size
      });

      const bytes = await backgroundImage.arrayBuffer();
      const buffer = Buffer.from(bytes);
      
      // Generate unique filename
      const uniqueId = uuidv4();
      const extension = backgroundImage.name.split('.').pop();
      const filename = `background-${uniqueId}.${extension}`;
      
      // Save file to public/uploads directory
      const uploadDir = join(process.cwd(), 'public', 'uploads');
      const filepath = join(uploadDir, filename);
      await writeFile(filepath, buffer);
      
      updateData.backgroundImage = `/uploads/${filename}`;
      console.log('Background image saved:', {
        originalName: backgroundImage.name,
        savedPath: updateData.backgroundImage,
        filepath
      });
    }
    
    // Update the lodge
    const updatedLodge = await Lodge.findByIdAndUpdate(
      lodgeId,
      { $set: updateData },
      { new: true }
    ).lean();

    if (!updatedLodge) {
      throw new Error('Failed to update lodge');
    }

    console.log('Lodge updated successfully:', {
      id: updatedLodge._id,
      name: updatedLodge.name,
      logoImage: updatedLodge.logoImage,
      backgroundImage: updatedLodge.backgroundImage
    });
    
    return NextResponse.json(updatedLodge);
  } catch (error: any) {
    console.error('Error updating lodge:', error);
    return NextResponse.json(
      { error: 'Failed to update lodge' },
      { status: 500 }
    );
  }
}

// DELETE lodge
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ lodgeId: string }> }
) {
  try {
    // Connect to database
    await connectToDatabase();

    // Get and validate the lodgeId parameter
    const { lodgeId } = await params;

    // Validate the ID parameter
    if (!lodgeId || typeof lodgeId !== 'string') {
      return NextResponse.json(
        { error: 'Invalid lodge ID' },
        { status: 400 }
      );
    }

    // Check authentication
    const tokenData = await getTokenData(req);
    if (!tokenData) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Check if user is a super admin or district admin
    if (tokenData.role !== 'SUPER_ADMIN' && tokenData.role !== 'DISTRICT_ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden: Only super admins and district admins can delete lodges' },
        { status: 403 }
      );
    }
    
    // Connect to the database
    await connectToDatabase();
    
    // Check if lodge exists
    const existingLodge = await Lodge.findById(lodgeId);
    
    if (!existingLodge) {
      return NextResponse.json(
        { error: 'Lodge not found' },
        { status: 404 }
      );
    }
    
    // Check if there are members in this lodge
    const membersWithLodge = await Member.find({
      $or: [
        { 'lodgeMemberships.lodge': lodgeId },
        { primaryLodge: lodgeId }
      ]
    });
    
    if (membersWithLodge.length > 0) {
      return NextResponse.json(
        { 
          error: 'Cannot delete lodge with existing members',
          memberCount: membersWithLodge.length
        },
        { status: 400 }
      );
    }
    
    // Delete the lodge
    await Lodge.findByIdAndDelete(lodgeId);
    
    return NextResponse.json(
      { message: 'Lodge deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting lodge:', error);
    return NextResponse.json(
      { error: 'Failed to delete lodge' },
      { status: 500 }
    );
  }
} 