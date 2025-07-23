import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function POST(request: NextRequest) {
  try {
    console.log('Delete post API called');
    
    // Get token from Authorization header
    const authHeader = request.headers.get('Authorization');
    console.log('Auth header:', authHeader);
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new NextResponse(
        JSON.stringify({ error: 'Unauthorized', message: 'No valid authentication token provided' }),
        { 
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const token = authHeader.split(' ')[1];
    const authUser = await verifyToken(token);

    if (!authUser) {
      return new NextResponse(
        JSON.stringify({ error: 'Invalid token', message: 'The provided token is invalid or expired' }),
        { 
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Get postId from request body
    const body = await request.json();
    console.log('Request body:', body);
    
    const { postId } = body;
    if (!postId) {
      return new NextResponse(
        JSON.stringify({ error: 'Invalid Request', message: 'Post ID is required' }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const { db } = await connectToDatabase();
    console.log('PostId:', postId);

    // Validate postId
    if (!ObjectId.isValid(postId)) {
      return new NextResponse(
        JSON.stringify({ error: 'Invalid Request', message: 'Invalid post ID' }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Check if post exists and user is the author
    const post = await db.collection('posts').findOne({ 
      _id: new ObjectId(postId),
      authorId: authUser.userId
    });

    if (!post) {
      return new NextResponse(
        JSON.stringify({ error: 'Not Found', message: 'Post not found or you are not authorized to delete it' }),
        { 
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Delete the post
    const result = await db.collection('posts').deleteOne({ _id: new ObjectId(postId) });
    console.log('Delete result:', result);

    if (result.deletedCount === 0) {
      return new NextResponse(
        JSON.stringify({ error: 'Delete Failed', message: 'Failed to delete post' }),
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Delete associated notifications
    await db.collection('notifications').deleteMany({ postId });

    return new NextResponse(
      JSON.stringify({
        message: 'Post deleted successfully'
      }),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error in delete handler:', error);
    return new NextResponse(
      JSON.stringify({ 
        error: 'Internal Server Error', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
} 