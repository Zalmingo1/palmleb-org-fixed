import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { ObjectId } from 'mongodb';

// Define UserRole enum
enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  DISTRICT_ADMIN = 'DISTRICT_ADMIN',
  LODGE_MEMBER = 'LODGE_MEMBER'
}

interface FileData {
  name: string;
  type: string;
  size: number;
  url: string;
}

interface Post {
  _id: string;
  authorId: string;
  authorName: string;
  authorLodge: string;
  content: string;
  files: FileData[];
  createdAt: string;
  status: 'pending' | 'approved' | 'rejected';
  likes: number;
  comments: any[];
}

// Mock posts data
const mockPosts = [
  {
    id: '1',
    author: {
      name: 'John Smith',
      avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
      role: 'Worshipful Master'
    },
    content: 'Reminder to all brothers: Our annual charity event is scheduled for next month. Please mark your calendars and prepare to contribute to this noble cause.',
    createdAt: '2 hours ago',
    likes: 15,
    comments: 3,
    liked: false
  },
  {
    id: '2',
    author: {
      name: 'David Wilson',
      avatar: 'https://randomuser.me/api/portraits/men/41.jpg',
      role: 'Secretary'
    },
    content: 'The minutes from our last meeting have been uploaded to the document library. Please review them before our next gathering.',
    createdAt: '5 hours ago',
    likes: 8,
    comments: 1,
    liked: true
  },
  {
    id: '3',
    author: {
      name: 'Michael Brown',
      avatar: 'https://randomuser.me/api/portraits/men/55.jpg',
      role: 'Treasurer'
    },
    content: 'Annual dues reminder: Please ensure your membership dues are paid by the end of this month. Contact me if you have any questions about your status.',
    createdAt: '1 day ago',
    likes: 12,
    comments: 5,
    liked: false
  },
  {
    id: '4',
    author: {
      name: 'Robert Johnson',
      avatar: 'https://randomuser.me/api/portraits/men/22.jpg',
      role: 'Senior Warden'
    },
    content: 'I\'m pleased to announce that our lodge renovation project is now complete. Thanks to everyone who volunteered their time and skills!',
    createdAt: '2 days ago',
    likes: 24,
    comments: 7,
    liked: false
  }
];

// Mock function to get user name from userId
const getUserName = (userId: string): string => {
  // In a real app, you would fetch this from a database
  return "User " + userId.substring(0, 5);
};

export async function GET(request: NextRequest) {
  try {
    console.log('GET /api/posts - Fetching posts');
    
    // Get token from Authorization header
    const authHeader = request.headers.get('Authorization');
    let currentUserId = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const authUser = await verifyToken(token);
      if (authUser) {
        currentUserId = authUser.userId;
      }
    }
    
    const { db } = await connectToDatabase();
    console.log('Connected to database');

    // First, check if the collection exists
    const collections = await db.listCollections().toArray();
    console.log('Available collections:', collections.map(c => c.name));
    
    if (!collections.some(c => c.name === 'posts')) {
      console.log('Posts collection does not exist, creating it');
      await db.createCollection('posts');
    }

    // Check if this is an admin request (for posts management)
    const url = new URL(request.url);
    const isAdminRequest = url.searchParams.get('admin') === 'true';
    
    // Build query - show all posts since we're no longer managing status
    const query = {};
    
    console.log('Query:', query);
    console.log('Is admin request:', isAdminRequest);

    const posts = await db.collection('posts')
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    // Add isAuthor flag to each post
    const postsWithAuthorFlag = posts.map(post => ({
      ...post,
      isAuthor: post.authorId === currentUserId
    }));

    console.log('Fetched posts:', postsWithAuthorFlag.length);
    console.log('Posts data:', JSON.stringify(postsWithAuthorFlag, null, 2));
    
    return NextResponse.json({ 
      posts: postsWithAuthorFlag,
      currentUserId 
    });
  } catch (error) {
    console.error('Error fetching posts:', error);
    return NextResponse.json({ 
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('POST /api/posts - Request received');
    
    // Get token from Authorization header
    const authHeader = request.headers.get('Authorization');
    console.log('Authorization header:', authHeader);

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('No valid Authorization header found');
      return NextResponse.json(
        { error: 'Unauthorized', message: 'No valid authentication token provided' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    console.log('Token from Authorization header:', token.substring(0, 10) + '...');

    // Verify token and get user data
    console.log('Verifying token...');
    const authUser = await verifyToken(token);
    console.log('Auth user after verification:', authUser);

    if (!authUser) {
      console.log('Token verification failed');
      return NextResponse.json(
        { error: 'Invalid token', message: 'The provided token is invalid or expired' },
        { status: 401 }
      );
    }

    // Connect to database
    console.log('Connecting to database...');
    const { db } = await connectToDatabase();
    console.log('Connected to database');

    // Ensure posts collection exists
    const collections = await db.listCollections().toArray();
    if (!collections.some(c => c.name === 'posts')) {
      console.log('Creating posts collection');
      await db.createCollection('posts');
    }

    // Parse form data
    const formData = await request.formData();
    const content = formData.get('content') as string;
    const files = formData.getAll('files') as File[];

    if (!content && files.length === 0) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Post must have content or files' },
        { status: 400 }
      );
    }

    // Process files if any
    const processedFiles: FileData[] = [];
    if (files.length > 0) {
      for (const file of files) {
        try {
          const bytes = await file.arrayBuffer();
          const buffer = Buffer.from(bytes);

          // Generate unique filename
          const uniqueId = uuidv4();
          const fileExtension = file.name.split('.').pop();
          const fileName = `${uniqueId}.${fileExtension}`;

          // Save file to public directory
          const publicDir = join(process.cwd(), 'public', 'uploads');
          const filePath = join(publicDir, fileName);
          await writeFile(filePath, buffer);

          processedFiles.push({
            name: file.name,
            type: file.type,
            size: file.size,
            url: `/uploads/${fileName}`
          });
        } catch (error) {
          console.error('Error processing file:', error);
          return NextResponse.json(
            { error: 'File Processing Error', message: 'Failed to process uploaded file' },
            { status: 500 }
          );
        }
      }
    }

    // Create post document
    const post = {
      authorId: authUser.userId,
      authorName: authUser.name || 'Anonymous',
      authorLodge: 'Unknown Lodge', // Default value
      content: content || '',
      files: processedFiles,
      createdAt: new Date().toISOString(),
      status: 'approved',
      likes: 0,
      comments: []
    };

    // Fetch lodge information if available
    if (authUser.lodge) {
      const lodge = await db.collection('lodges').findOne({ _id: new ObjectId(authUser.lodge) });
      if (lodge) {
        post.authorLodge = lodge.name;
      }
    }

    // Insert post into database
    const result = await db.collection('posts').insertOne(post);
    console.log('Post inserted:', result.insertedId);

    return NextResponse.json({
      message: 'Post created successfully',
      post: {
        ...post,
        _id: result.insertedId
      }
    });
  } catch (error) {
    console.error('Error creating post:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 