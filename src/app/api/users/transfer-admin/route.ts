import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { verifyToken } from '@/lib/auth/auth';
import { ObjectId } from 'mongodb';

export async function POST(request: Request) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Check if current user is a district admin or super admin
    if (decoded.role !== 'DISTRICT_ADMIN' && decoded.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Only district admins can transfer privileges' }, { status: 403 });
    }

    const { newAdminId } = await request.json();

    if (!newAdminId) {
      return NextResponse.json({ error: 'New admin ID is required' }, { status: 400 });
    }

    const { db } = await connectToDatabase();

    console.log('Transfer admin request:', {
      currentUserId: decoded.userId,
      currentUserRole: decoded.role,
      newAdminId: newAdminId
    });

    // Step 1: Find current admin in both collections
    let currentAdmin = await db.collection('members').findOne({
      _id: new ObjectId(decoded.userId)
    });

    let currentAdminUser = await db.collection('users').findOne({
      _id: new ObjectId(decoded.userId)
    });

    // Step 2: Find new admin candidate in both collections
    let newAdmin = await db.collection('members').findOne({
      _id: new ObjectId(newAdminId)
    });

    let newAdminUser = await db.collection('users').findOne({
      _id: new ObjectId(newAdminId)
    });

    // Step 3: Validate that both users exist
    if (!currentAdmin && !currentAdminUser) {
      return NextResponse.json({ 
        error: 'Current admin not found in database',
        debug: {
          userId: decoded.userId,
          role: decoded.role
        }
      }, { status: 404 });
    }

    if (!newAdmin && !newAdminUser) {
      return NextResponse.json({ 
        error: 'New admin candidate not found in database',
        debug: {
          newAdminId: newAdminId
        }
      }, { status: 404 });
    }

    // Step 4: Ensure both users exist in both collections (without creating duplicates)
    // For current admin
    if (!currentAdmin && currentAdminUser) {
      console.log('Creating missing member record for current admin');
      const newMember = {
        firstName: currentAdminUser.name?.split(' ')[0] || 'Admin',
        lastName: currentAdminUser.name?.split(' ').slice(1).join(' ') || 'User',
        email: currentAdminUser.email,
        role: currentAdminUser.role,
        primaryLodge: currentAdminUser.primaryLodge || '681e751c2b05d4bc4be15dfc',
        lodges: currentAdminUser.lodges || ['681e751c2b05d4bc4be15dfc'],
        status: 'active',
        createdAt: currentAdminUser.createdAt || new Date(),
        updatedAt: new Date()
      };
      const result = await db.collection('members').insertOne(newMember);
      currentAdmin = { ...newMember, _id: result.insertedId };
    }

    if (!currentAdminUser && currentAdmin) {
      console.log('Creating missing user record for current admin');
      const newUser = {
        name: `${currentAdmin.firstName} ${currentAdmin.lastName}`,
        email: currentAdmin.email,
        role: currentAdmin.role,
        primaryLodge: currentAdmin.primaryLodge || '681e751c2b05d4bc4be15dfc',
        lodges: currentAdmin.lodges || ['681e751c2b05d4bc4be15dfc'],
        status: 'active',
        createdAt: currentAdmin.createdAt || new Date(),
        updatedAt: new Date()
      };
      const result = await db.collection('users').insertOne(newUser);
      currentAdminUser = { ...newUser, _id: result.insertedId };
    }

    // For new admin
    if (!newAdmin && newAdminUser) {
      console.log('Creating missing member record for new admin');
      const newMember = {
        firstName: newAdminUser.name?.split(' ')[0] || 'Admin',
        lastName: newAdminUser.name?.split(' ').slice(1).join(' ') || 'User',
        email: newAdminUser.email,
        role: 'LODGE_MEMBER', // Start as regular member
        primaryLodge: newAdminUser.primaryLodge || '681e751c2b05d4bc4be15dfc',
        lodges: newAdminUser.lodges || ['681e751c2b05d4bc4be15dfc'],
        status: 'active',
        createdAt: newAdminUser.createdAt || new Date(),
        updatedAt: new Date()
      };
      const result = await db.collection('members').insertOne(newMember);
      newAdmin = { ...newMember, _id: result.insertedId };
    }

    if (!newAdminUser && newAdmin) {
      console.log('Creating missing user record for new admin');
      const newUser = {
        name: `${newAdmin.firstName} ${newAdmin.lastName}`,
        email: newAdmin.email,
        role: newAdmin.role || 'LODGE_MEMBER',
        primaryLodge: newAdmin.primaryLodge || '681e751c2b05d4bc4be15dfc',
        lodges: newAdmin.lodges || ['681e751c2b05d4bc4be15dfc'],
        status: 'active',
        createdAt: newAdmin.createdAt || new Date(),
        updatedAt: new Date()
      };
      const result = await db.collection('users').insertOne(newUser);
      newAdminUser = { ...newUser, _id: result.insertedId };
    }

    // Step 5: Validate district membership for new admin
    const districtLodgeId = '681e751c2b05d4bc4be15dfc';
    
    console.log('Validating district membership for:', newAdmin?.email);
    
    // Check multiple ways the member could be part of the district
    const primaryLodgeStr = newAdmin?.primaryLodge?.toString();
    const districtLodgeStr = districtLodgeId.toString();
    
    const isPrimaryLodge = primaryLodgeStr === districtLodgeStr;
    const isInLodgesArray = newAdmin?.lodges && newAdmin.lodges.some((lodge: any) => 
      lodge.toString() === districtLodgeStr);
    const isInLodgeMemberships = newAdmin?.lodgeMemberships && newAdmin.lodgeMemberships.some((membership: any) => 
      membership.lodge.toString() === districtLodgeStr);
    
    const isDistrictMember = isPrimaryLodge || isInLodgesArray || isInLodgeMemberships;
    
    console.log('Membership validation:', {
      isPrimaryLodge,
      isInLodgesArray,
      isInLodgeMemberships,
      isDistrictMember,
      primaryLodge: newAdmin?.primaryLodge,
      lodges: newAdmin?.lodges
    });

    if (!isDistrictMember) {
      // Auto-fix: Add district lodge membership
      console.log('Auto-fixing district membership for new admin');
      await db.collection('members').updateOne(
        { _id: new ObjectId(newAdminId) },
        { 
          $set: { 
            primaryLodge: districtLodgeId,
            lodges: [districtLodgeId]
          }
        }
      );
      await db.collection('users').updateOne(
        { _id: new ObjectId(newAdminId) },
        { 
          $set: { 
            primaryLodge: districtLodgeId,
            lodges: [districtLodgeId]
          }
        }
      );
      console.log('✅ Auto-fixed district membership');
    }

    // Step 6: Perform the transfer
    console.log('Performing role transfer...');
    
    // Update current admin to LODGE_MEMBER in both collections
    const currentAdminUpdates = await Promise.all([
      db.collection('members').updateOne(
        { _id: new ObjectId(decoded.userId) },
        { $set: { role: 'LODGE_MEMBER' } }
      ),
      db.collection('users').updateOne(
        { _id: new ObjectId(decoded.userId) },
        { $set: { role: 'LODGE_MEMBER' } }
      )
    ]);

    // Update new admin to DISTRICT_ADMIN in both collections
    const newAdminUpdates = await Promise.all([
      db.collection('members').updateOne(
        { _id: new ObjectId(newAdminId) },
        { $set: { role: 'DISTRICT_ADMIN' } }
      ),
      db.collection('users').updateOne(
        { _id: new ObjectId(newAdminId) },
        { $set: { role: 'DISTRICT_ADMIN' } }
      )
    ]);

    console.log('Transfer results:', {
      currentAdminUpdates: currentAdminUpdates.map(u => u.modifiedCount),
      newAdminUpdates: newAdminUpdates.map(u => u.modifiedCount)
    });

    // Step 7: Verify the transfer
    const verifyCurrentAdmin = await db.collection('members').findOne({
      _id: new ObjectId(decoded.userId)
    });
    const verifyNewAdmin = await db.collection('members').findOne({
      _id: new ObjectId(newAdminId)
    });

    console.log('Transfer verification:', {
      currentAdminRole: verifyCurrentAdmin?.role,
      newAdminRole: verifyNewAdmin?.role
    });

    return NextResponse.json({ 
      message: 'Admin privileges transferred successfully',
      newAdmin: {
        email: newAdmin?.email || 'Unknown',
        name: `${newAdmin?.firstName || ''} ${newAdmin?.lastName || ''}` || newAdmin?.name || 'Unknown',
        role: 'DISTRICT_ADMIN'
      },
      previousAdmin: {
        email: currentAdmin?.email || 'Unknown',
        name: `${currentAdmin?.firstName || ''} ${currentAdmin?.lastName || ''}` || currentAdmin?.name || 'Unknown',
        role: 'LODGE_MEMBER'
      }
    });

  } catch (error) {
    console.error('Error transferring admin privileges:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 