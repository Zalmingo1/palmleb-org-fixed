import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Lodge from '@/models/Lodge';
import User from '@/models/User';
import Member from '@/models/Member';
import { getTokenData } from '@/lib/auth';
import { ObjectId } from 'mongodb';

interface LeanLodgeDocument {
  _id: string;
  name: string;
  number: string;
  location: string;
  logoImage?: string;
  backgroundImage?: string;
  description?: string;
  foundedYear?: string;
  isActive: boolean;
}

// GET all lodges
export async function GET(request: NextRequest) {
  try {
    // Connect to database
    await dbConnect();

    console.log('Fetching lodges...');

    // Parse query parameters
    const url = new URL(request.url);
    const districtFilter = url.searchParams.get('district');

    // Get authentication token
    const authHeader = request.headers.get('authorization');
    let decodedToken = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const { verifyToken } = await import('@/lib/auth/auth');
      const token = authHeader.split(' ')[1];
      decodedToken = await verifyToken(token);
    }

    // Build query based on role and district filter
    let query: any = {};
    
    if (decodedToken?.role === 'DISTRICT_ADMIN' && districtFilter === 'true') {
      // For district admins, only fetch lodges in their district
      const { connectToDatabase } = await import('@/lib/mongodb');
      const { ObjectId } = await import('mongodb');
      const { db } = await connectToDatabase();
      
      const userLodgeId = decodedToken.lodge;
      if (userLodgeId) {
        const userLodge = await db.collection('lodges').findOne({ _id: new ObjectId(userLodgeId) });
        if (userLodge && userLodge.district) {
          query.district = userLodge.district;
        }
      }
    }

    // Fetch lodges with the constructed query
    const lodges = await Lodge.find(query)
      .select('_id name location logoImage backgroundImage description foundedYear isActive')
      .lean();

    console.log(`Found ${lodges.length} lodges:`, lodges);

    // Calculate member counts for each lodge
    const lodgesWithMemberCounts = await Promise.all(
      lodges.map(async (lodge: any) => {
        const lodgeId = new ObjectId(lodge._id);
        
        // Count members in this lodge
        const [userCount, memberCount] = await Promise.all([
          User.countDocuments({ 
            $or: [
              { lodges: lodgeId },
              { primaryLodge: lodgeId }
            ]
          }),
          Member.countDocuments({ 
            $or: [
              { lodgeMemberships: { $elemMatch: { lodge: lodgeId } } },
              { primaryLodge: lodgeId },
              { lodges: lodgeId }
            ]
          })
        ]);
        
        console.log(`Lodge ${lodge.name} (${lodge._id}): User count: ${userCount}, Member count: ${memberCount}`);
        
        const totalMemberCount = userCount + memberCount;
        
        return {
          _id: lodge._id.toString(),
          name: lodge.name,
          location: lodge.location,
          logoImage: lodge.logoImage,
          backgroundImage: lodge.backgroundImage,
          description: lodge.description,
          foundedYear: lodge.foundedYear,
          isActive: lodge.isActive,
          memberCount: totalMemberCount,
          activeMemberCount: totalMemberCount // For now, assume all members are active
        };
      })
    );

    console.log('Returning lodges with member counts:', lodgesWithMemberCounts);

    return NextResponse.json(lodgesWithMemberCounts);
  } catch (error: any) {
    console.error('Error fetching lodges:', error);
    return NextResponse.json(
      { error: 'Failed to fetch lodges' },
      { status: 500 }
    );
  }
}

// POST to create a new lodge
export async function POST(req: NextRequest) {
  try {
    // Check authentication using custom auth method
    const tokenData = await getTokenData(req);
    
    if (!tokenData) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Check if user is a super admin or district admin
    if (tokenData.role !== 'SUPER_ADMIN' && tokenData.role !== 'DISTRICT_ADMIN') {
      return NextResponse.json(
        { message: 'Forbidden: Only super admins and district admins can create lodges' },
        { status: 403 }
      );
    }
    
    // Get form data
    const formData = await req.formData();
    
    // Parse coordinates if provided
    let coordinates;
    const coordinatesStr = formData.get('coordinates') as string;
    if (coordinatesStr) {
      try {
        coordinates = JSON.parse(coordinatesStr);
      } catch (error) {
        console.error('Error parsing coordinates:', error);
      }
    }

    // Handle logo image
    const logoFile = formData.get('logo') as File;
    let logoImagePath;
    if (logoFile && logoFile.size > 0) {
      const logoBuffer = await logoFile.arrayBuffer();
      const logoBase64 = Buffer.from(logoBuffer).toString('base64');
      logoImagePath = `data:${logoFile.type};base64,${logoBase64}`;
    }
    
    // Handle background image
    const backgroundFile = formData.get('background') as File;
    let backgroundImagePath;
    if (backgroundFile && backgroundFile.size > 0) {
      const backgroundBuffer = await backgroundFile.arrayBuffer();
      const backgroundBase64 = Buffer.from(backgroundBuffer).toString('base64');
      backgroundImagePath = `data:${backgroundFile.type};base64,${backgroundBase64}`;
    }
    
    // Create new lodge with default number
    const lodge = new Lodge({
      name: formData.get('name'),
      number: 'N/A', // Set default value
      location: formData.get('location'),
      description: formData.get('description'),
      foundedYear: formData.get('foundedYear'),
      isActive: formData.get('isActive') === 'true',
      coordinates: coordinates || {
        lat: 33.8938,
        lng: 35.5018
      },
      logoImage: logoImagePath,
      backgroundImage: backgroundImagePath
    });
    
    // Save lodge to database
    const savedLodge = await lodge.save();
    
    // Return success response
    return NextResponse.json(
      { 
        message: 'Lodge created successfully',
        lodge: {
          ...savedLodge.toObject(),
          _id: savedLodge._id.toString()
        }
      },
      { status: 201 }
    );
    
  } catch (error: any) {
    console.error('Error creating lodge:', error);
    return NextResponse.json(
      { message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
} 