import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import Member from '@/models/Member';
import User from '@/models/User';

// GET occupied positions for a lodge
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ lodgeId: string }> }
) {
  try {
    const { lodgeId } = await params;
    
    if (!lodgeId) {
      return NextResponse.json({ error: 'Lodge ID is required' }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const objectId = new ObjectId(lodgeId);

    // Get all members who have this lodge as their primary lodge or in their lodge memberships
    const [primaryLodgeMembers, lodgeMembershipMembers, unifiedUsers] = await Promise.all([
      // Members with this lodge as primary lodge
      Member.find({ primaryLodge: objectId }).select('primaryLodgePosition').lean(),
      
      // Members with this lodge in their lodge memberships
      Member.find({ 
        'lodgeMemberships.lodge': objectId 
      }).select('lodgeMemberships').lean(),
      
      // Users with this lodge as primary lodge
      User.find({ primaryLodge: objectId }).select('primaryLodgePosition').lean(),
      
      // Users with this lodge in their lodges array
      User.find({ lodges: objectId }).select('lodgePositions').lean(),
      
      // Unified users with this lodge
      db.collection('members').find({ 
        $or: [
          { primaryLodge: objectId },
          { 'lodgeMemberships.lodge': objectId }
        ]
      }).toArray()
    ]);

    // Collect all occupied positions
    const occupiedPositions = new Set<string>();

    // Add positions from primary lodge members
    primaryLodgeMembers.forEach(member => {
      if (member.primaryLodgePosition) {
        occupiedPositions.add(member.primaryLodgePosition);
      }
    });

    // Add positions from lodge membership members
    lodgeMembershipMembers.forEach(member => {
      if (member.lodgeMemberships) {
        member.lodgeMemberships.forEach((membership: any) => {
          if (membership.lodge.toString() === lodgeId && membership.position) {
            occupiedPositions.add(membership.position);
          }
        });
      }
    });

    // Add positions from users
    const usersWithPrimaryLodge = await User.find({ primaryLodge: objectId }).select('primaryLodgePosition').lean();
    usersWithPrimaryLodge.forEach(user => {
      if (user.primaryLodgePosition) {
        occupiedPositions.add(user.primaryLodgePosition);
      }
    });

    // Add positions from users with lodge in their lodges array
    const usersWithLodgeInArray = await User.find({ lodges: objectId }).select('lodgePositions').lean();
    usersWithLodgeInArray.forEach(user => {
      if (user.lodgePositions && user.lodgePositions[lodgeId]) {
        occupiedPositions.add(user.lodgePositions[lodgeId]);
      }
    });

    // Add positions from unified users
    unifiedUsers.forEach(user => {
      if (user.primaryLodgePosition) {
        occupiedPositions.add(user.primaryLodgePosition);
      }
      if (user.lodgeMemberships) {
        user.lodgeMemberships.forEach((membership: any) => {
          if (membership.lodge.toString() === lodgeId && membership.position) {
            occupiedPositions.add(membership.position);
          }
        });
      }
    });

    // Remove "MEMBER" from occupied positions since multiple members can have this role
    occupiedPositions.delete('MEMBER');
    
    console.log('Occupied positions for lodge:', lodgeId, Array.from(occupiedPositions));

    return NextResponse.json({
      lodgeId,
      occupiedPositions: Array.from(occupiedPositions)
    });

  } catch (error: any) {
    console.error('Error fetching occupied positions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch occupied positions' },
      { status: 500 }
    );
  }
} 