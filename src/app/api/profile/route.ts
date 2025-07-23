import { NextResponse } from 'next/server';
import { getTokenData } from '@/lib/auth';
import { findUnifiedUserByEmail, updateUnifiedUser } from '@/lib/auth/unified-auth';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET(request: Request) {
  try {
    const tokenData = await getTokenData(request as any);
    if (!tokenData?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find the user in unified collection
    const user = await findUnifiedUserByEmail(tokenData.email);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get lodge information if primaryLodge exists
    let primaryLodgeData = null;
    if (user.primaryLodge) {
      try {
        const { db } = await connectToDatabase();
        const lodge = await db.collection('lodges').findOne({ 
          _id: new ObjectId(user.primaryLodge.toString()) 
        });
        if (lodge) {
          primaryLodgeData = {
            _id: lodge._id.toString(),
            name: lodge.name
          };
        }
      } catch (error) {
        console.error('Error fetching lodge data:', error);
      }
    }

    // Return user profile data (excluding sensitive information)
    const profileData = {
      _id: user._id.toString(),
      firstName: user.firstName || user.name.split(' ')[0] || '',
      lastName: user.lastName || user.name.split(' ').slice(1).join(' ') || '',
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      phone: user.phone || '',
      address: user.address || '',
      city: user.city || '',
      state: user.state || '',
      zipCode: user.zipCode || '',
      country: user.country || '',
      occupation: user.occupation || '',
      bio: user.bio || '',
      interests: user.interests || [],
      profileImage: user.profileImage || '',
      primaryLodge: primaryLodgeData,
      primaryLodgePosition: user.primaryLodgePosition || 'MEMBER',
      lodges: user.lodges || [],
      lodgeMemberships: user.lodgeMemberships || [],
      administeredLodges: user.administeredLodges || [],
      memberSince: user.memberSince?.toISOString() || '',
      lastLogin: user.lastLogin?.toISOString() || '',
      created: user.created?.toISOString() || ''
    };

    return NextResponse.json(profileData);
  } catch (error) {
    console.error('Profile fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const tokenData = await getTokenData(request as any);
    if (!tokenData?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find the user in unified collection
    const user = await findUnifiedUserByEmail(tokenData.email);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get request body
    const body = await request.json();
    const {
      firstName,
      lastName,
      email,
      phone,
      address,
      city,
      state,
      zipCode,
      country,
      occupation,
      bio,
      profileImage,
      primaryLodgePosition
    } = body;

    // Prepare update data
    const updateData: any = {};
    
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (address !== undefined) updateData.address = address;
    if (city !== undefined) updateData.city = city;
    if (state !== undefined) updateData.state = state;
    if (zipCode !== undefined) updateData.zipCode = zipCode;
    if (country !== undefined) updateData.country = country;
    if (occupation !== undefined) updateData.occupation = occupation;
    if (bio !== undefined) updateData.bio = bio;
    if (profileImage !== undefined) updateData.profileImage = profileImage;
    if (primaryLodgePosition !== undefined) updateData.primaryLodgePosition = primaryLodgePosition;

    // Update the user
    const success = await updateUnifiedUser(user._id.toString(), updateData);

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 500 }
      );
    }

    // Return success response
    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully'
    });

  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 