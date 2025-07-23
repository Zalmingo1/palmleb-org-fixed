import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { verifyToken } from '@/lib/auth/auth';
import { ObjectId } from 'mongodb';

interface ActivityItem {
  id: string;
  type: string;
  title: string;
  description: string;
  time: Date;
  icon: string;
  userId?: string;
  userName?: string;
  eventId?: string;
  eventTitle?: string;
  postId?: string;
  postContent?: string;
  documentId?: string;
  documentTitle?: string;
  userRole?: string;
}

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized - No token provided' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const decoded = await verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized - Invalid token' }, { status: 401 });
    }

    // Only SUPER_ADMIN and DISTRICT_ADMIN can view activity data
    if (decoded.role !== 'SUPER_ADMIN' && decoded.role !== 'DISTRICT_ADMIN') {
      return NextResponse.json({ error: 'Forbidden - Only super admins and district admins can view activity data' }, { status: 403 });
    }

    const { db } = await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');

    // For district admin, filter by district lodges
    let districtLodgeIds: string[] = [];
    if (decoded.role === 'DISTRICT_ADMIN') {
      const userLodgeId = decoded.lodge;
      const userLodge = await db.collection('lodges').findOne({ _id: new ObjectId(userLodgeId) });
      if (userLodge && userLodge.district) {
        const districtLodges = await db.collection('lodges').find({ district: userLodge.district }).toArray();
        districtLodgeIds = districtLodges.map(lodge => lodge._id.toString());
      }
    }

    // Get recent activities from multiple collections
    const activities: ActivityItem[] = [];

    // 1. Recent member additions
    let recentMembers = [];
    if (decoded.role === 'DISTRICT_ADMIN' && districtLodgeIds.length > 0) {
      // Try members_backup first, then members, then users
      recentMembers = await db.collection('members_backup')
        .find({
          $or: [
            { primaryLodge: { $in: districtLodgeIds.map(id => new ObjectId(id)) } },
            { lodges: { $elemMatch: { $in: districtLodgeIds.map(id => new ObjectId(id)) } } }
          ]
        })
        .sort({ createdAt: -1 })
        .limit(5)
        .toArray();
      
      if (recentMembers.length === 0) {
        recentMembers = await db.collection('members')
          .find({
            $or: [
              { primaryLodge: { $in: districtLodgeIds.map(id => new ObjectId(id)) } },
              { lodges: { $elemMatch: { $in: districtLodgeIds.map(id => new ObjectId(id)) } } }
            ]
          })
          .sort({ createdAt: -1 })
          .limit(5)
          .toArray();
      }
    } else {
      // Try members_backup first, then members, then users
      recentMembers = await db.collection('members_backup')
        .find({})
        .sort({ createdAt: -1 })
        .limit(5)
        .toArray();
      
      if (recentMembers.length === 0) {
        recentMembers = await db.collection('members')
          .find({})
          .sort({ createdAt: -1 })
          .limit(5)
          .toArray();
      }
    }

    recentMembers.forEach(member => {
      activities.push({
        id: member._id.toString(),
        type: 'member_added',
        title: 'New Member Added',
        description: `${member.firstName || member.name} was added to the system`,
        time: member.createdAt || member.updatedAt || new Date(),
        icon: 'UserPlusIcon',
        userId: member._id.toString(),
        userName: member.firstName || member.name
      });
    });

    // 2. Recent events created
    let recentEvents = [];
    if (decoded.role === 'DISTRICT_ADMIN' && districtLodgeIds.length > 0) {
      recentEvents = await db.collection('events')
        .find({ lodgeId: { $in: districtLodgeIds.map(id => new ObjectId(id)) } })
        .sort({ createdAt: -1 })
        .limit(5)
        .toArray();
    } else {
      recentEvents = await db.collection('events')
        .find({})
        .sort({ createdAt: -1 })
        .limit(5)
        .toArray();
    }

    recentEvents.forEach(event => {
      activities.push({
        id: event._id.toString(),
        type: 'event_created',
        title: 'Event Created',
        description: `"${event.title}" has been scheduled`,
        time: event.createdAt || event.updatedAt || new Date(),
        icon: 'CalendarIcon',
        eventId: event._id.toString(),
        eventTitle: event.title
      });
    });

    // 3. Recent posts created
    let recentPosts = [];
    if (decoded.role === 'DISTRICT_ADMIN' && districtLodgeIds.length > 0) {
      recentPosts = await db.collection('posts')
        .find({ lodgeId: { $in: districtLodgeIds.map(id => new ObjectId(id)) } })
        .sort({ createdAt: -1 })
        .limit(5)
        .toArray();
    } else {
      recentPosts = await db.collection('posts')
        .find({})
        .sort({ createdAt: -1 })
        .limit(5)
        .toArray();
    }

    recentPosts.forEach(post => {
      activities.push({
        id: post._id.toString(),
        type: 'post_created',
        title: 'Post Created',
        description: `New post: "${post.content.substring(0, 50)}${post.content.length > 50 ? '...' : ''}"`,
        time: post.createdAt || post.updatedAt || new Date(),
        icon: 'DocumentTextIcon',
        postId: post._id.toString(),
        postContent: post.content
      });
    });

    // 4. Recent role changes
    let recentRoleChanges = [];
    if (decoded.role === 'DISTRICT_ADMIN' && districtLodgeIds.length > 0) {
      recentRoleChanges = await db.collection('users')
        .find({ lodgeId: { $in: districtLodgeIds.map(id => new ObjectId(id)) } })
        .sort({ updatedAt: -1 })
        .limit(5)
        .toArray();
    } else {
      recentRoleChanges = await db.collection('users')
        .find({})
        .sort({ updatedAt: -1 })
        .limit(5)
        .toArray();
    }

    recentRoleChanges.forEach(user => {
      if (user.role && user.updatedAt) {
        activities.push({
          id: user._id.toString(),
          type: 'role_updated',
          title: 'Member Role Updated',
          description: `${user.name || user.email} role updated to ${user.role}`,
          time: user.updatedAt,
          icon: 'UserGroupIcon',
          userId: user._id.toString(),
          userName: user.name || user.email,
          userRole: user.role
        });
      }
    });

    // 5. Recent document uploads (if you have a documents collection)
    try {
      let recentDocuments = [];
      if (decoded.role === 'DISTRICT_ADMIN' && districtLodgeIds.length > 0) {
        recentDocuments = await db.collection('documents')
          .find({ lodgeId: { $in: districtLodgeIds.map(id => new ObjectId(id)) } })
          .sort({ createdAt: -1 })
          .limit(5)
          .toArray();
      } else {
        recentDocuments = await db.collection('documents')
          .find({})
          .sort({ createdAt: -1 })
          .limit(5)
          .toArray();
      }
      recentDocuments.forEach(doc => {
        activities.push({
          id: doc._id.toString(),
          type: 'document_uploaded',
          title: 'Document Uploaded',
          description: `${doc.title || doc.filename} was uploaded`,
          time: doc.createdAt || doc.updatedAt || new Date(),
          icon: 'DocumentTextIcon',
          documentId: doc._id.toString(),
          documentTitle: doc.title || doc.filename
        });
      });
    } catch (error) {
      // Documents collection might not exist yet
      console.log('Documents collection not found, skipping document activities');
    }

    // Sort all activities by time (most recent first)
    activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

    // Limit the total number of activities
    const limitedActivities = activities.slice(0, limit);

    // Format timestamps for display
    const formatTimeAgo = (date: Date) => {
      const now = new Date();
      const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
      
      if (diffInSeconds < 60) return `${diffInSeconds} seconds ago`;
      if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
      if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
      if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} days ago`;
      return `${Math.floor(diffInSeconds / 2592000)} months ago`;
    };

    const formattedActivities = limitedActivities.map(activity => ({
      ...activity,
      timeAgo: formatTimeAgo(new Date(activity.time))
    }));

    return NextResponse.json({
      activities: formattedActivities,
      total: activities.length
    });

  } catch (error) {
    console.error('Error fetching activity data:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 