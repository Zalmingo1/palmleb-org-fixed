import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Lodge from '@/models/Lodge';
import { verifyToken } from '@/lib/auth/auth';

// GET all lodges for the list endpoint
export async function GET(request: NextRequest) {
  try {
    // Connect to database
    await dbConnect();

    console.log('Fetching lodges for list...');

    // Get authentication token
    const authHeader = request.headers.get('authorization');
    let decodedToken = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      decodedToken = await verifyToken(token);
    }

    // Build query based on role
    let query: any = {};
    
    if (decodedToken?.role === 'DISTRICT_ADMIN') {
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

    // Return simple lodge list
    const simpleLodges = lodges.map((lodge: any) => ({
      _id: lodge._id.toString(),
      name: lodge.name,
      location: lodge.location,
      logoImage: lodge.logoImage,
      backgroundImage: lodge.backgroundImage,
      description: lodge.description,
      foundedYear: lodge.foundedYear,
      isActive: lodge.isActive
    }));

    console.log('Returning simple lodges list:', simpleLodges);

    return NextResponse.json({ lodges: simpleLodges });
  } catch (error: any) {
    console.error('Error fetching lodges:', error);
    return NextResponse.json(
      { error: 'Failed to fetch lodges' },
      { status: 500 }
    );
  }
} 