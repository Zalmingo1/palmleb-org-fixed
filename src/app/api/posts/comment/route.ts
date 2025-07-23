import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function POST(request: NextRequest) {
  try {
    console.log('Comment API called');
    
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

    // Get comment content and postId from request body
    const body = await request.json();
    console.log('Request body:', body);
    
    const { content, postId } = body;
    if (!content || typeof content !== 'string' || content.trim() === '') {
      return new NextResponse(
        JSON.stringify({ error: 'Invalid Request', message: 'Comment content is required' }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

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

    // Check if post exists
    const post = await db.collection('posts').findOne({ _id: new ObjectId(postId) });
    if (!post) {
      return new NextResponse(
        JSON.stringify({ error: 'Not Found', message: 'Post not found' }),
        { 
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Get user details for the comment
    console.log('Looking up user with ID:', authUser.userId);
    
    // First try to find user in members collection
    let user = await db.collection('members').findOne(
      { _id: new ObjectId(authUser.userId) },
      { projection: { firstName: 1, lastName: 1, name: 1, _id: 1 } }
    );
    
    // If not found in members, try users collection
    if (!user) {
      user = await db.collection('users').findOne(
        { _id: new ObjectId(authUser.userId) },
        { projection: { firstName: 1, lastName: 1, name: 1, _id: 1 } }
      );
    }
    
    console.log('Found user:', user);

    // Construct full name
    const fullName = user ? (user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim()) : (authUser.name || 'Anonymous User');
    
    const comment = {
      _id: new ObjectId(),
      content: content.trim(),
      authorId: authUser.userId,
      authorName: fullName,
      createdAt: new Date(),
    };
    console.log('Created comment:', comment);

    // Add comment to post
    const result = await db.collection('posts').updateOne(
      { _id: new ObjectId(postId) },
      { 
        $push: { 
          comments: comment 
        },
        $inc: { commentCount: 1 }
      } as any
    );
    console.log('Update result:', result);

    if (result.modifiedCount === 0) {
      return new NextResponse(
        JSON.stringify({ error: 'Update Failed', message: 'Failed to add comment' }),
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Get the updated post
    const updatedPost = await db.collection('posts').findOne({ _id: new ObjectId(postId) });
    if (!updatedPost) {
      return new NextResponse(
        JSON.stringify({ error: 'Update Failed', message: 'Failed to fetch updated post' }),
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Create notification for post author if commenter is not the author
    if (post.authorId !== authUser.userId) {
      const notification = {
        userId: new ObjectId(post.authorId),
        type: 'comment',
        postId: postId,
        fromUserId: authUser.userId,
        fromUserName: fullName,
        message: `${fullName} commented on your post`,
        createdAt: new Date(),
        read: false
      };

      await db.collection('notifications').insertOne(notification);
    }

    return new NextResponse(
      JSON.stringify({
        message: 'Comment added successfully',
        post: updatedPost
      }),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error in comment handler:', error);
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