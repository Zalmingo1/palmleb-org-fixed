import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const { postId } = await params;
    
    // Connect to database
    const { db } = await connectToDatabase();

    // Fetch the post
    const post = await db.collection('posts').findOne({ _id: new ObjectId(postId) });
    
    if (!post) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(post);
  } catch (error) {
    console.error('Error fetching post:', error);
    return NextResponse.json(
      { error: 'Failed to fetch post' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const { postId } = await params;
    console.log('PUT /api/posts/[postId] - Editing post');
    
    // Get token from Authorization header
    const authHeader = request.headers.get('Authorization');
    console.log('Authorization header:', authHeader);

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'No valid authentication token provided' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    const authUser = await verifyToken(token);
    console.log('Auth user:', authUser);

    if (!authUser) {
      return NextResponse.json(
        { error: 'Invalid token', message: 'The provided token is invalid or expired' },
        { status: 401 }
      );
    }

    const { db } = await connectToDatabase();
    console.log('Post ID:', postId);

    // Get the post to verify ownership
    const post = await db.collection('posts').findOne({ _id: new ObjectId(postId) });
    console.log('Found post:', post);
    
    if (!post) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Post not found' },
        { status: 404 }
      );
    }

    // Check if the user is the author of the post
    if (post.authorId !== authUser.userId) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'You can only edit your own posts' },
        { status: 403 }
      );
    }

    const { content } = await request.json();
    console.log('New content:', content);
    
    if (!content) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Content is required' },
        { status: 400 }
      );
    }

    // Update the post
    const result = await db.collection('posts').updateOne(
      { _id: new ObjectId(postId) },
      { $set: { content } }
    );
    console.log('Update result:', result);

    if (result.modifiedCount === 0) {
      return NextResponse.json(
        { error: 'Not Modified', message: 'Post was not modified' },
        { status: 304 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error editing post:', error);
    return NextResponse.json({ 
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const { postId } = await params;
    console.log('DELETE /api/posts/[postId] - Deleting post');
    
    // Get token from Authorization header
    const authHeader = request.headers.get('Authorization');
    console.log('Authorization header:', authHeader);

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'No valid authentication token provided' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    const authUser = await verifyToken(token);
    console.log('Auth user:', authUser);

    if (!authUser) {
      return NextResponse.json(
        { error: 'Invalid token', message: 'The provided token is invalid or expired' },
        { status: 401 }
      );
    }

    const { db } = await connectToDatabase();
    console.log('Post ID:', postId);

    // Get the post to verify ownership
    const post = await db.collection('posts').findOne({ _id: new ObjectId(postId) });
    console.log('Found post:', post);
    
    if (!post) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Post not found' },
        { status: 404 }
      );
    }

    // Check if the user is the author of the post
    if (post.authorId !== authUser.userId) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'You can only delete your own posts' },
        { status: 403 }
      );
    }

    // Delete the post
    const result = await db.collection('posts').deleteOne({ _id: new ObjectId(postId) });
    console.log('Delete result:', result);

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Post was not deleted' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting post:', error);
    return NextResponse.json({ 
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 