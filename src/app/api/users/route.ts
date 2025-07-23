import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';

// GET all users
export async function GET(req: NextRequest) {
  try {
    // Connect to the database
    await dbConnect();
    
    // Get query parameters for filtering
    const url = new URL(req.url);
    const role = url.searchParams.get('role');
    const lodge = url.searchParams.get('lodge');
    const status = url.searchParams.get('status');
    
    // Build query
    const query: Record<string, any> = {};
    
    if (role) {
      query.role = role;
    }
    
    if (lodge) {
      query.lodges = lodge;
    }
    
    if (status) {
      query.status = status;
    }
    
    // Find users
    const users = await User.find(query)
      .select('-passwordHash')
      .sort({ name: 1 })
      .lean();
    
    return NextResponse.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

// POST to create a new user
export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    
    // Connect to the database
    await dbConnect();
    
    // Check if email already exists
    if (data.email) {
      const existingUser = await User.findOne({ email: data.email });
      if (existingUser) {
        return NextResponse.json(
          { error: 'Email already in use' },
          { status: 409 }
        );
      }
    }
    
    // Create the user
    const newUser = await User.create(data);
    
    // Return the user without password
    const user = await User.findById(newUser._id).select('-passwordHash');
    
    return NextResponse.json(user);
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
} 