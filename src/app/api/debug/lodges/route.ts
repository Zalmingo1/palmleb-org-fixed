import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Lodge from '@/models/Lodge';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    
    const lodges = await Lodge.find({}).lean();
    
    // Log raw data for debugging
    console.log('Raw lodges data:', JSON.stringify(lodges, null, 2));
    
    // Transform ObjectId to string
    const transformedLodges = lodges.map(lodge => ({
      ...lodge,
      _id: lodge._id.toString()
    }));

    return NextResponse.json({
      message: 'Debug: All lodges in database',
      count: lodges.length,
      lodges: transformedLodges
    });
  } catch (error) {
    console.error('Error in debug endpoint:', error);
    return NextResponse.json(
      { message: 'Internal server error', error: String(error) },
      { status: 500 }
    );
  }
} 