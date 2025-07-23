import { NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { getTokenData } from '@/lib/auth';
import dbConnect from '@/lib/dbConnect';
import Member from '@/models/Member';
import User from '@/models/User';

export async function POST(request: Request) {
  try {
    const tokenData = await getTokenData(request as any);
    if (!tokenData?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Connect to database
    await dbConnect();

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 });
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size must be less than 5MB' }, { status: 400 });
    }

    // Generate unique filename
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const filename = `${Date.now()}-${Math.random().toString(36).substring(2)}.jpg`;
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'profile-images');
    const filepath = join(uploadDir, filename);

    // Ensure upload directory exists
    const fs = require('fs');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Save file
    await writeFile(filepath, buffer);
    const imageUrl = `/uploads/profile-images/${filename}`;

    // Update user profile with new image
    let member = await Member.findOne({ email: tokenData.email });
    let user = await User.findOne({ email: tokenData.email });

    if (member) {
      member.profileImage = imageUrl;
      await member.save();
    }

    if (user) {
      user.profileImage = imageUrl;
      await user.save();
    }

    return NextResponse.json({
      success: true,
      imageUrl,
      message: 'Profile image uploaded successfully'
    });
  } catch (error) {
    console.error('Error uploading profile image:', error);
    return NextResponse.json(
      { error: 'Failed to upload profile image' },
      { status: 500 }
    );
  }
} 