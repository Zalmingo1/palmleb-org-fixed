import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Member from '@/models/Member';
import User from '@/models/User';
import { getTokenData } from '@/lib/auth';

export async function PUT(request: Request) {
  try {
    // Get the token and verify authentication
    const token = await getTokenData(request as any);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Connect to database
    await dbConnect();

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
      country,
      occupation,
      bio,
      profileImage,
      interests
    } = body;

    // Find the user/member by email - first check User model
    let user = await User.findOne({ email: token.email });
    let isMember = false;

    // If not found in User model, try Member model
    if (!user) {
      console.log('User not found in User model, checking Member model');
      user = await Member.findOne({ email: token.email });
      isMember = true;
    }

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (isMember) {
    // Update member fields
      user.firstName = firstName || user.firstName;
      user.lastName = lastName || user.lastName;
      user.email = email || user.email;
      user.phone = phone || user.phone;
      user.address = address || user.address;
      user.city = city || user.city;
      user.state = state || user.state;
      user.country = country || user.country;
      user.occupation = occupation || user.occupation;
      user.bio = bio || user.bio;
      user.profileImage = profileImage || user.profileImage;
      user.interests = interests || user.interests;

    // Save the updated member
      await user.save();

    // Return the updated member data
    return NextResponse.json({
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        phone: user.phone,
        address: user.address,
        city: user.city,
        state: user.state,
        country: user.country,
        occupation: user.occupation,
        bio: user.bio,
        profileImage: user.profileImage,
        primaryLodge: user.primaryLodge,
        primaryLodgePosition: user.primaryLodgePosition,
        lodgeMemberships: user.lodgeMemberships,
        interests: user.interests
      });
    } else {
      // Update user fields (User model has limited fields)
      user.name = `${firstName || ''} ${lastName || ''}`.trim();
      user.email = email || user.email;
      user.profileImage = profileImage || user.profileImage;

      // Save the updated user
      await user.save();

      // Return the updated user data
      return NextResponse.json({
        id: user._id,
        firstName: user.name?.split(' ')[0] || '',
        lastName: user.name?.split(' ').slice(1).join(' ') || '',
        email: user.email,
        role: user.role,
        phone: '', // User model doesn't have phone
        address: '', // User model doesn't have address
        city: '', // User model doesn't have city
        state: '', // User model doesn't have state
        country: '', // User model doesn't have country
        occupation: '', // User model doesn't have occupation
        bio: '', // User model doesn't have bio
        profileImage: user.profileImage,
        primaryLodge: user.primaryLodge,
        primaryLodgePosition: '', // User model doesn't have primaryLodgePosition
        lodgeMemberships: [], // User model doesn't have lodgeMemberships
        interests: [] // User model doesn't have interests
      });
    }
  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
} 