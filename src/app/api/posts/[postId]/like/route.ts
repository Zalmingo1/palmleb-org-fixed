import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function POST(
  request: NextRequest,
  { params }: { params: { postId: string } }
) {
  try {
    // Basic validation
    if (!params.postId) {
      return new NextResponse(
        JSON.stringify({ error: 'Invalid Request', message: 'Post ID is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get token from Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new NextResponse(
        JSON.stringify({ error: 'Unauthorized', message: 'No valid authentication token provided' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.split(' ')[1];
    const authUser = await verifyToken(token);

    if (!authUser) {
      return new NextResponse(
        JSON.stringify({ error: 'Invalid token', message: 'The provided token is invalid or expired' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { db } = await connectToDatabase();
    
    // Validate postId format
    if (!ObjectId.isValid(params.postId)) {
      return new NextResponse(
        JSON.stringify({ error: 'Invalid Request', message: 'Invalid post ID format' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check if post exists
    const post = await db.collection('posts').findOne({ _id: new ObjectId(params.postId) });
    if (!post) {
      return new NextResponse(
        JSON.stringify({ error: 'Not Found', message: 'Post not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Initialize likedBy array if it doesn't exist
    if (!post.likedBy) {
      await db.collection('posts').updateOne(
        { _id: new ObjectId(params.postId) },
        { $set: { likedBy: [] } }
      );
    }

    // Check if user has already liked the post
    const hasLiked = post.likedBy?.includes(authUser.userId);

    // Update the post
    const updateOperation = hasLiked
      ? {
          $inc: { likes: -1 },
          $pull: { likedBy: authUser.userId }
        }
      : {
          $inc: { likes: 1 },
          $addToSet: { likedBy: authUser.userId }
        };

    const result = await db.collection('posts').updateOne(
      { _id: new ObjectId(params.postId) },
      updateOperation as any
    );

    if (result.modifiedCount === 0) {
      return new NextResponse(
        JSON.stringify({ error: 'Update Failed', message: 'Failed to update post' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get the updated post
    const updatedPost = await db.collection('posts').findOne({ _id: new ObjectId(params.postId) });
    if (!updatedPost) {
      return new NextResponse(
        JSON.stringify({ error: 'Update Failed', message: 'Failed to fetch updated post' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create notification if the post was liked (not unliked) and the liker is not the post author
    if (!hasLiked && post.authorId !== authUser.userId) {
      console.log('Creating like notification:', {
        postAuthorId: post.authorId,
        likerId: authUser.userId,
        postId: params.postId
      });

      // Get the user's information from members collection
      const user = await db.collection('members').findOne(
        { _id: new ObjectId(authUser.userId) },
        { projection: { firstName: 1, lastName: 1, name: 1 } }
      );

      console.log('Found user for notification:', user);

      if (user) {
        // Construct full name from firstName and lastName, or use name if available
        const fullName = user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim();
        
        const notification = {
          userId: new ObjectId(post.authorId),
          type: 'like',
          postId: params.postId,
          fromUserId: authUser.userId,
          fromUserName: fullName,
          message: `${fullName} liked your post`,
          createdAt: new Date(),
          read: false
        };

        console.log('Creating notification:', notification);

        try {
          const notificationResult = await db.collection('notifications').insertOne(notification);
          console.log('Notification created successfully:', notificationResult);
        } catch (error) {
          console.error('Error creating notification:', error);
        }
      } else {
        console.error('User not found for notification:', authUser.userId);
      }
    } else {
      console.log('Skipping notification creation:', {
        hasLiked,
        postAuthorId: post.authorId,
        likerId: authUser.userId,
        isAuthor: post.authorId === authUser.userId
      });
    }

    const responseData = {
      message: hasLiked ? 'Post unliked' : 'Post liked',
      post: updatedPost
    };

    return new NextResponse(
      JSON.stringify(responseData),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in like handler:', error);
    return new NextResponse(
      JSON.stringify({ 
        error: 'Internal Server Error', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
} 