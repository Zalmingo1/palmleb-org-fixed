import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir, unlink } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { verifyToken } from '@/lib/auth/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function POST(request: NextRequest) {
  try {
    console.log('Starting document upload...');
    
    // Check authentication
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    
    if (!token) {
      console.log('No token found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (!decoded) {
      console.log('Invalid token');
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Check if user has permission to upload documents
    const { role } = decoded;
    if (role !== 'SUPER_ADMIN' && role !== 'LODGE_ADMIN' && role !== 'DISTRICT_ADMIN') {
      console.log('User does not have permission to upload documents');
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const formData = await request.formData();
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const file = formData.get('file') as File;
    
    if (!title || !description || !file) {
      console.log('Missing required fields');
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    console.log('File received:', {
      name: file.name,
      type: file.type,
      size: file.size
    });

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'image/jpeg',
      'image/png'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      console.log('Invalid file type:', file.type);
      return NextResponse.json({ error: 'Invalid file type. Only PDF, DOC, DOCX, TXT, JPG, PNG files are allowed.' }, { status: 400 });
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      console.log('File too large:', file.size);
      return NextResponse.json({ error: 'File size must be less than 10MB' }, { status: 400 });
    }

    // Generate unique filename
    const uniqueId = uuidv4();
    const fileExtension = file.name.split('.').pop();
    const fileName = `${uniqueId}.${fileExtension}`;
    
    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Ensure upload directory exists
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'documents');
    try {
      await mkdir(uploadDir, { recursive: true });
    } catch (error) {
      console.log('Directory already exists or error creating it:', error);
    }

    // Save file to uploads directory
    const filePath = join(uploadDir, fileName);
    console.log('Saving file to:', filePath);
    await writeFile(filePath, buffer);

    // Connect to database
    const { db } = await connectToDatabase();

    // Create document record in database
    const document = {
      title,
      description,
      fileName: file.name,
      filePath: `/uploads/documents/${fileName}`,
      fileSize: file.size,
      fileType: file.type,
      uploadedBy: decoded.userId,
      uploadedByName: decoded.name || 'Unknown',
      uploadDate: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db.collection('documents').insertOne(document);
    console.log('Document saved to database:', result.insertedId);

    // Return success response
    const savedDocument = {
      ...document,
      _id: result.insertedId,
      id: result.insertedId.toString()
    };

    console.log('Document uploaded successfully');
    return NextResponse.json({
      message: 'Document uploaded successfully',
      document: savedDocument
    });

  } catch (error) {
    console.error('Error uploading document:', error);
    return NextResponse.json(
      { error: 'Failed to upload document' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Check authentication
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const decoded = await verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    const { role } = decoded;
    if (role !== 'SUPER_ADMIN' && role !== 'LODGE_ADMIN' && role !== 'DISTRICT_ADMIN') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Parse document ID from query
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('id');
    if (!documentId) {
      return NextResponse.json({ error: 'Document ID is required' }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const document = await db.collection('documents').findOne({ _id: new ObjectId(documentId) });
    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Remove file from disk
    if (document.filePath) {
      const filePath = join(process.cwd(), 'public', document.filePath);
      try {
        await unlink(filePath);
      } catch (err) {
        // File might not exist, log and continue
        console.warn('File not found or already deleted:', filePath);
      }
    }

    // Remove from database
    await db.collection('documents').deleteOne({ _id: new ObjectId(documentId) });

    return NextResponse.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Error deleting document:', error);
    return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 });
  }
} 