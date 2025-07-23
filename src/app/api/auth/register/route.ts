import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { hashPassword } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { name, email, password, lodges, primaryLodge, role = 'LODGE_MEMBER' } = await req.json();

    // Validate input
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Name, email, and password are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate password strength (at least 8 characters)
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    // Connect to the database
    await dbConnect();

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { error: 'Email already in use' },
        { status: 409 }
      );
    }

    // Hash the password
    const passwordHash = await hashPassword(password);

    // Create the user
    const newUser = await User.create({
      name,
      email,
      passwordHash,
      role,
      lodges: lodges || [],
      primaryLodge: primaryLodge || '',
      administeredLodges: role === 'LODGE_ADMIN' ? (lodges || []) : [],
      status: 'active',
      memberSince: new Date().getFullYear().toString(),
    });

    // Prepare user data to return (excluding sensitive information)
    const userData = {
      _id: newUser._id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      lodges: newUser.lodges,
      primaryLodge: newUser.primaryLodge,
      administeredLodges: newUser.administeredLodges,
    };

    return NextResponse.json({
      user: userData,
      message: 'User registered successfully',
    });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'An error occurred during registration' },
      { status: 500 }
    );
  }
} 