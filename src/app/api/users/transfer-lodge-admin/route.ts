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

    // Check if current user is a lodge admin
    if (decoded.role !== 'LODGE_ADMIN') {
      return NextResponse.json({ error: 'Only lodge admins can transfer privileges' }, { status: 403 });
    }

    const { newAdminId, lodgeId } = await request.json();

    if (!newAdminId) {
      return NextResponse.json({ error: 'New admin ID is required' }, { status: 400 });
    }

    if (!lodgeId) {
      return NextResponse.json({ error: 'Lodge ID is required' }, { status: 400 });
    }

    const { db } = await connectToDatabase();

    console.log('Transfer lodge admin request:', {
      currentUserId: decoded.userId,
      currentUserRole: decoded.role,
      newAdminId: newAdminId,
      lodgeId: lodgeId
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
        primaryLodge: currentAdminUser.primaryLodge || lodgeId,
        lodges: currentAdminUser.lodges || [lodgeId],
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
        primaryLodge: currentAdmin.primaryLodge || lodgeId,
        lodges: currentAdmin.lodges || [lodgeId],
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
        primaryLodge: newAdminUser.primaryLodge || lodgeId,
        lodges: newAdminUser.lodges || [lodgeId],
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
        primaryLodge: newAdmin.primaryLodge || lodgeId,
        lodges: newAdmin.lodges || [lodgeId],
        status: 'active',
        createdAt: newAdmin.createdAt || new Date(),
        updatedAt: new Date()
      };
      const result = await db.collection('users').insertOne(newUser);
      newAdminUser = { ...newUser, _id: result.insertedId };
    }

    // Step 5: Validate lodge membership for new admin
    console.log('Validating lodge membership for:', newAdmin?.email);
    
    // Check multiple ways the member could be part of the lodge
    const primaryLodgeStr = newAdmin?.primaryLodge?.toString();
    const lodgeIdStr = lodgeId.toString();
    
    const isPrimaryLodge = primaryLodgeStr === lodgeIdStr;
    const isInLodgesArray = newAdmin?.lodges && newAdmin.lodges.some((lodge: any) => 
      lodge.toString() === lodgeIdStr);
    const isInLodgeMemberships = newAdmin?.lodgeMemberships && newAdmin.lodgeMemberships.some((membership: any) => 
      membership.lodge.toString() === lodgeIdStr);
    
    const isLodgeMember = isPrimaryLodge || isInLodgesArray || isInLodgeMemberships;
    
    console.log('Membership validation:', {
      isPrimaryLodge,
      isInLodgesArray,
      isInLodgeMemberships,
      isLodgeMember,
      primaryLodge: newAdmin?.primaryLodge,
      lodges: newAdmin?.lodges
    });

    if (!isLodgeMember) {
      // Auto-fix: Add lodge membership
      console.log('Auto-fixing lodge membership for new admin');
      await db.collection('members').updateOne(
        { _id: new ObjectId(newAdminId) },
        { 
          $set: { 
            primaryLodge: lodgeId,
            lodges: [lodgeId]
          }
        }
      );
      await db.collection('users').updateOne(
        { _id: new ObjectId(newAdminId) },
        { 
          $set: { 
            primaryLodge: lodgeId,
            lodges: [lodgeId]
          }
        }
      );
      console.log('✅ Auto-fixed lodge membership');
    }

    // Step 6: Perform the transfer
    console.log('Performing lodge admin role transfer...');
    
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

    // Update new admin to LODGE_ADMIN in both collections
    const newAdminUpdates = await Promise.all([
      db.collection('members').updateOne(
        { _id: new ObjectId(newAdminId) },
        { $set: { role: 'LODGE_ADMIN' } }
      ),
      db.collection('users').updateOne(
        { _id: new ObjectId(newAdminId) },
        { $set: { role: 'LODGE_ADMIN' } }
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
      message: 'Lodge admin privileges transferred successfully',
      newAdmin: {
        email: newAdmin?.email || 'Unknown',
        name: `${newAdmin?.firstName || ''} ${newAdmin?.lastName || ''}` || newAdmin?.name || 'Unknown',
        role: 'LODGE_ADMIN'
      },
      previousAdmin: {
        email: currentAdmin?.email || 'Unknown',
        name: `${currentAdmin?.firstName || ''} ${currentAdmin?.lastName || ''}` || currentAdmin?.name || 'Unknown',
        role: 'LODGE_MEMBER'
      }
    });

  } catch (error) {
    console.error('Error transferring lodge admin privileges:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 