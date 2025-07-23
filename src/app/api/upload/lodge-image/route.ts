import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { getTokenData } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    console.log('Starting lodge image upload...');
    
    // Check authentication
    const tokenData = await getTokenData(request);
    if (!tokenData) {
      console.log('No token found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is a super admin
    if (tokenData.role !== 'SUPER_ADMIN') {
      console.log('User is not a super admin');
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('image') as File;
    const type = formData.get('type') as string; // 'logo' or 'background'
    
    if (!file) {
      console.log('No file provided');
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!type || !['logo', 'background'].includes(type)) {
      console.log('Invalid image type:', type);
      return NextResponse.json({ error: 'Invalid image type' }, { status: 400 });
    }

    console.log('File received:', {
      name: file.name,
      type: file.type,
      size: file.size,
      imageType: type
    });

    // Validate file type
    if (!file.type.startsWith('image/')) {
      console.log('Invalid file type:', file.type);
      return NextResponse.json({ error: 'Invalid file type. Only images are allowed.' }, { status: 400 });
    }

    // Generate unique filename
    const uniqueId = uuidv4();
    const fileExtension = file.name.split('.').pop();
    const fileName = `${type}-${uniqueId}.${fileExtension}`;
    
    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Ensure upload directory exists
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'lodge-images');
    try {
      await mkdir(uploadDir, { recursive: true });
    } catch (error) {
      console.log('Directory already exists or error creating it:', error);
    }

    // Save file to uploads directory
    const filePath = join(uploadDir, fileName);
    console.log('Saving file to:', filePath);
    await writeFile(filePath, buffer);

    // Return the URL of the uploaded image
    const imageUrl = `/uploads/lodge-images/${fileName}`;
    console.log('Image uploaded successfully:', imageUrl);
    return NextResponse.json({ url: imageUrl });
  } catch (error) {
    console.error('Error uploading lodge image:', error);
    return NextResponse.json(
      { error: 'Failed to upload lodge image' },
      { status: 500 }
    );
  }
} 