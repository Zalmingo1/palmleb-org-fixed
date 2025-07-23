import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function POST(request: NextRequest) {
  try {
    console.log('Like request received');
    
    // Get token from Authorization header
    const authHeader = request.headers.get('Authorization');
    console.log('Auth header:', authHeader ? 'Present' : 'Missing');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'No valid authentication token provided' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    console.log('Token:', token.substring(0, 10) + '...');
    
    const authUser = await verifyToken(token);
    console.log('Auth user:', authUser ? 'Verified' : 'Invalid');

    if (!authUser) {
      return NextResponse.json(
        { error: 'Invalid token', message: 'The provided token is invalid or expired' },
        { status: 401 }
      );
    }

    // Get postId from request body
    const body = await request.json();
    console.log('Request body:', body);
    
    const { postId } = body;
    if (!postId || !ObjectId.isValid(postId)) {
      console.error('Invalid postId:', postId);
      return NextResponse.json(
        { error: 'Invalid Request', message: 'Valid post ID is required' },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    console.log('Connected to database');

    // Check if post exists
    const post = await db.collection('posts').findOne({ _id: new ObjectId(postId) });
    console.log('Post found:', post ? 'Yes' : 'No');
    console.log('Post data:', {
      _id: post?._id,
      authorId: post?.authorId,
      likes: post?.likes,
      likedBy: post?.likedBy
    });
    
    if (!post) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Post not found' },
        { status: 404 }
      );
    }

    // Initialize likedBy array if it doesn't exist
    if (!post.likedBy) {
      console.log('Initializing likedBy array');
      await db.collection('posts').updateOne(
        { _id: new ObjectId(postId) },
        { $set: { likedBy: [] } }
      );
    }

    // Check if user has already liked the post
    const hasLiked = post.likedBy?.includes(authUser.userId);
    console.log('User has liked:', hasLiked);
    console.log('User ID:', authUser.userId);
    console.log('Current likedBy array:', post.likedBy);

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

    console.log('Update operation:', updateOperation);

    const result = await db.collection('posts').updateOne(
      { _id: new ObjectId(postId) },
      updateOperation as any
    );
    console.log('Update result:', {
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
      upsertedCount: result.upsertedCount
    });

    if (result.modifiedCount === 0) {
      console.error('Failed to update post:', {
        postId,
        userId: authUser.userId,
        hasLiked,
        updateOperation
      });
      return NextResponse.json(
        { error: 'Update Failed', message: 'Failed to update post' },
        { status: 500 }
      );
    }

    // Get the updated post
    const updatedPost = await db.collection('posts').findOne({ _id: new ObjectId(postId) });
    console.log('Updated post:', {
      _id: updatedPost?._id,
      authorId: updatedPost?.authorId,
      likes: updatedPost?.likes,
      likedBy: updatedPost?.likedBy
    });
    
    if (!updatedPost) {
      return NextResponse.json(
        { error: 'Update Failed', message: 'Failed to fetch updated post' },
        { status: 500 }
      );
    }

    // Create notification if the post was liked (not unliked)
    if (!hasLiked && post.authorId !== authUser.userId) {
      console.log('Creating notification');
      // Get the user's information from members collection
      const user = await db.collection('members').findOne(
        { _id: new ObjectId(authUser.userId) },
        { projection: { firstName: 1, lastName: 1, name: 1 } }
      );
      console.log('User found:', user ? 'Yes' : 'No');

      if (!user) {
        console.error('User not found in database:', authUser.userId);
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      // Construct full name from firstName and lastName, or use name if available
      const fullName = user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim();

      const notification = {
        userId: new ObjectId(post.authorId),
        type: 'like',
        postId: postId,
        fromUserId: authUser.userId,
        fromUserName: fullName,
        message: `${fullName} liked your post`,
        createdAt: new Date(),
        read: false
      };

      await db.collection('notifications').insertOne(notification);
      console.log('Notification created');
    }

    return NextResponse.json({
      message: hasLiked ? 'Post unliked' : 'Post liked',
      post: updatedPost
    });
  } catch (error) {
    console.error('Error in like handler:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 