import { NextRequest, NextResponse } from 'next/server';
import { createUnifiedUser, findUnifiedUserByEmail } from '@/lib/auth/unified-auth';

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

    // Check if email already exists
    const existingUser = await findUnifiedUserByEmail(email);
    if (existingUser) {
      return NextResponse.json(
        { error: 'Email already in use' },
        { status: 409 }
      );
    }

    // Create the user using unified auth
    const newUser = await createUnifiedUser({
      email,
      password,
      name,
      role,
      lodges: lodges || [],
      primaryLodge: primaryLodge || '',
    });

    if (!newUser) {
      return NextResponse.json(
        { error: 'Failed to create user' },
        { status: 500 }
      );
    }

    // Prepare user data to return (excluding sensitive information)
    const userData = {
      _id: newUser._id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      lodges: newUser.lodges || [],
      primaryLodge: newUser.primaryLodge,
      administeredLodges: newUser.administeredLodges || [],
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