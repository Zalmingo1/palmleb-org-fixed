import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/auth';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: Request) {
  try {
    console.log('Starting profile image upload...');
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    
    if (!token) {
      console.log('No token found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await verifyToken(token);
    if (!user) {
      console.log('Invalid token');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('image') as File;
    
    if (!file) {
      console.log('No file provided');
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    console.log('File received:', {
      name: file.name,
      type: file.type,
      size: file.size
    });

    // Validate file type
    if (!file.type.startsWith('image/')) {
      console.log('Invalid file type:', file.type);
      return NextResponse.json({ error: 'Invalid file type. Only images are allowed.' }, { status: 400 });
    }

    // Generate unique filename
    const uniqueId = uuidv4();
    const fileExtension = file.name.split('.').pop();
    const fileName = `${uniqueId}.${fileExtension}`;
    
    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Save file to uploads directory
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'profile-images');
    const filePath = join(uploadDir, fileName);
    
    console.log('Saving file to:', filePath);
    await writeFile(filePath, buffer);

    // Return the URL of the uploaded image
    const imageUrl = `/uploads/profile-images/${fileName}`;
    console.log('Image uploaded successfully:', imageUrl);
    return NextResponse.json({ url: imageUrl });
  } catch (error) {
    console.error('Error uploading profile image:', error);
    return NextResponse.json(
      { error: 'Failed to upload profile image' },
      { status: 500 }
    );
  }
} 