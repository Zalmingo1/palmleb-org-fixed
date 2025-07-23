import { NextResponse } from 'next/server';
import { createUser } from '@/lib/auth/auth';

export async function GET() {
  try {
    // Create a regular user
    const user = await createUser({
      email: 'user@palmleb.org',
      password: 'User123!',
      name: 'Regular User',
      role: 'LODGE_MEMBER'
    });

    // Create an admin user
    const admin = await createUser({
      email: 'admin@palmleb.org',
      password: 'Admin123!',
      name: 'Admin User',
      role: 'DISTRICT_ADMIN'
    });

    return NextResponse.json({
      message: 'Test users created successfully',
      users: [user, admin]
    });
  } catch (error) {
    console.error('Seed error:', error);
    return NextResponse.json(
      { message: 'Failed to create test users' },
      { status: 500 }
    );
  }
} 