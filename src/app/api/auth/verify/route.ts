import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/auth';

export async function GET() {
  console.log('Verify route called');
  
  try {
    // Fix cookie access by correctly handling Promise
    const cookieStore = cookies();
    const cookiesList = await cookieStore.getAll();
    const tokenCookie = cookiesList.find(cookie => cookie.name === 'token');
    const token = tokenCookie?.value;
    
    console.log('Token from cookies:', token ? 'Found token' : 'No token found');
    
    if (!token) {
      console.log('No token in cookies');
      return NextResponse.json(
        { message: 'Not logged in. Please log in to continue.' },
        { status: 401 }
      );
    }
    
    // Verify token and get user data
    const userData = verifyToken(token);
    console.log('Token verification result:', userData ? 'Valid' : 'Invalid');
    
    if (!userData) {
      console.log('Token verification failed');
      return NextResponse.json(
        { message: 'Not Logged In. Your session has expired. Please log in again.' },
        { status: 401 }
      );
    }
    
    // Successfully verified
    console.log('Token verified successfully for user ID:', userData.userId);
    return NextResponse.json({ 
      authenticated: true, 
      user: userData,
      message: 'User is authenticated' 
    });
  } catch (error) {
    console.error('Error verifying token:', error);
    return NextResponse.json(
      { message: 'Authentication error. Please log in again.' },
      { status: 401 }
    );
  }
} 