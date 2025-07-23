import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET(request: NextRequest) {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'No valid authentication token provided' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    const authUser = await verifyToken(token);

    if (!authUser) {
      return NextResponse.json(
        { error: 'Invalid token', message: 'The provided token is invalid or expired' },
        { status: 401 }
      );
    }

    // Connect to database
    const { db } = await connectToDatabase();

    if (authUser.role === 'DISTRICT_ADMIN') {
      // For district admins, get district-level statistics
      const userLodgeId = authUser.lodge;
      if (!userLodgeId) {
        return NextResponse.json(
          { error: 'No lodge associated with user' },
          { status: 400 }
        );
      }

      // Get the user's lodge to determine the district
      const userLodge = await db.collection('lodges').findOne({ _id: new ObjectId(userLodgeId) });
      if (!userLodge || !userLodge.district) {
        return NextResponse.json(
          { error: 'User lodge does not have a district' },
          { status: 400 }
        );
      }

      // Get all lodges in the same district
      const districtLodges = await db.collection('lodges')
        .find({ district: userLodge.district })
        .toArray();
      const districtLodgeIds = districtLodges.map(lodge => lodge._id.toString());

      // Get all members whose primaryLodge or lodges array includes any of the district lodge IDs
      let districtMembers = await db.collection('members').find({
        $or: [
          { primaryLodge: { $in: districtLodgeIds.map(id => new ObjectId(id)) } },
          { lodgeMemberships: { $elemMatch: { lodge: { $in: districtLodgeIds.map(id => new ObjectId(id)) } } } },
          { lodges: { $in: districtLodgeIds.map(id => new ObjectId(id)) } }
        ]
      }).toArray();

      // Get all posts for the district lodges
      const districtPosts = await db.collection('posts').find({
        lodgeId: { $in: districtLodgeIds.map(id => new ObjectId(id)) }
      }).toArray();

      // Get all events for the district lodges
      const districtEvents = await db.collection('events').find({
        lodgeId: { $in: districtLodgeIds.map(id => new ObjectId(id)) }
      }).toArray();

      // Optionally, get documents for the district lodges (if documents are linked to lodges)
      let districtDocuments = [];
      try {
        districtDocuments = await db.collection('documents').find({
          lodgeId: { $in: districtLodgeIds.map(id => new ObjectId(id)) }
        }).toArray();
      } catch (e) {
        // If documents are not linked to lodges, skip
      }

      return NextResponse.json({
        totalMembers: districtMembers.length,
        activeMembers: districtMembers.filter(member => member.status !== 'inactive').length,
        inactiveMembers: districtMembers.filter(member => member.status === 'inactive').length,
        totalLodges: districtLodges.length,
        totalPosts: districtPosts.length,
        totalEvents: districtEvents.length,
        totalDocuments: districtDocuments.length
      });
    } else if (authUser.role === 'SUPER_ADMIN') {
      // For super admins, get system-wide statistics from all collections
      const [totalPosts, totalLodges, totalEvents, totalDocuments] = await Promise.all([
        db.collection('posts').countDocuments(),
        db.collection('lodges').countDocuments(),
        db.collection('events').countDocuments(),
        db.collection('documents').countDocuments().catch(() => 0)
      ]);

      // Get members from members collection
      const allMembers = await db.collection('members').find({}).toArray();
      const totalMembers = allMembers.length;
      const activeMembers = allMembers.filter(member => member.status !== 'inactive').length;
      const inactiveMembers = allMembers.filter(member => member.status === 'inactive').length;

      return NextResponse.json({
        totalMembers: totalMembers,
        activeMembers: activeMembers,
        inactiveMembers: inactiveMembers,
        totalLodges: totalLodges,
        totalPosts: totalPosts,
        totalEvents: totalEvents,
        totalDocuments: totalDocuments
      });
    } else {
      // For other roles, return basic stats
      const totalPosts = await db.collection('posts').countDocuments();
      return NextResponse.json({
        totalMembers: 0,
        activeMembers: 0,
        inactiveMembers: 0,
        totalLodges: 0,
        totalPosts: totalPosts,
        totalEvents: 0,
        totalDocuments: 0
      });
    }
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 