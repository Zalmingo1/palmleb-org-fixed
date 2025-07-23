import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { 
  findUnifiedUserByEmail, 
  verifyUnifiedUserPassword, 
  generateUnifiedUserToken, 
  updateUnifiedUserLastLogin 
} from '@/lib/auth/unified-auth';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    console.log('Unified login attempt for email:', email);

    // Validate input
    if (!email || !password) {
      console.log('Login attempt failed: Missing email or password');
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Check if JWT_SECRET is available
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is not set in environment variables');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Find user in unified collection
    const user = await findUnifiedUserByEmail(email);
    
    if (!user) {
      console.log(`Login attempt failed: No user found with email ${email}`);
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    console.log('Found unified user:', {
      userId: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    });

    // Check if user is active
    if (user.status !== 'active') {
      console.log(`Login attempt failed: User account not active for ${email}`);
      return NextResponse.json(
        { error: 'Account is not active' },
        { status: 403 }
      );
    }

    // Verify password
    const isPasswordValid = await verifyUnifiedUserPassword(password, user.passwordHash);
    
    if (!isPasswordValid) {
      console.log(`Login attempt failed: Invalid password for ${email}`);
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Update last login time
    await updateUnifiedUserLastLogin(user._id.toString());

    // Generate JWT token
    const token = generateUnifiedUserToken(user);
    console.log('Generated token successfully');

    // Prepare user data to return (excluding sensitive information)
    const responseData = {
      _id: user._id.toString(),
      firstName: user.firstName || user.name.split(' ')[0] || '',
      lastName: user.lastName || user.name.split(' ').slice(1).join(' ') || '',
      name: user.name,
      email: user.email,
      role: user.role.toUpperCase(),
      lodges: user.lodges || [],
      primaryLodge: user.primaryLodge?.toString(),
      position: user.primaryLodgePosition || 'Brother',
      administeredLodges: user.administeredLodges || [],
      profileImage: user.profileImage || null,
      memberSince: user.memberSince?.toISOString() || '',
      primaryLodgePosition: user.primaryLodgePosition || 'Brother',
      phone: user.phone || '',
      address: user.address || '',
      city: user.city || '',
      state: user.state || '',
      zipCode: user.zipCode || '',
      country: user.country || '',
      occupation: user.occupation || '',
      bio: user.bio || '',
      interests: user.interests || []
    };

    console.log(`Unified login successful for ${email}`);
    console.log('Response data:', {
      user: {
        ...responseData,
        lodges: responseData.lodges.length,
        administeredLodges: responseData.administeredLodges.length
      },
      token: token.substring(0, 10) + '...'
    });
    
    // Set the token as an HTTP-only cookie
    const cookieStore = await cookies();
    await cookieStore.set({
      name: 'token',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
    });

    return NextResponse.json({
      success: true,
      user: responseData,
      token: token
    });

  } catch (error) {
    console.error('Unified login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 