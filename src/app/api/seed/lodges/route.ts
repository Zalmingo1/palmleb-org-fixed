import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Lodge from '@/models/Lodge';
import { getTokenData } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    // Check authentication
    const tokenData = await getTokenData(req);
    if (!tokenData || tokenData.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Connect to database
    await dbConnect();

    // Define the lodges to seed
    const lodges = [
      {
        name: 'Suleyman Lodge',
        number: 'SL',
        location: 'Beirut',
        foundedYear: '1920',
        meetingSchedule: 'First Monday of each month',
        description: 'Suleyman Lodge in Beirut',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'El Berdawni Lodge',
        number: 'EBL',
        location: 'Tripoli',
        foundedYear: '1925',
        meetingSchedule: 'Second Monday of each month',
        description: 'El Berdawni Lodge in Tripoli',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'El Merj Lodge',
        number: 'EML',
        location: 'Beirut',
        foundedYear: '1930',
        meetingSchedule: 'Third Monday of each month',
        description: 'El Merj Lodge in Beirut',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    // Clear existing lodges
    await Lodge.deleteMany({});

    // Insert new lodges
    const savedLodges = await Lodge.insertMany(lodges);

    return NextResponse.json({
      message: 'Lodges seeded successfully',
      count: savedLodges.length,
      lodges: savedLodges.map(lodge => ({
        ...lodge.toObject(),
        _id: lodge._id.toString()
      }))
    });
  } catch (error) {
    console.error('Error seeding lodges:', error);
    return NextResponse.json(
      { message: 'Failed to seed lodges' },
      { status: 500 }
    );
  }
} 