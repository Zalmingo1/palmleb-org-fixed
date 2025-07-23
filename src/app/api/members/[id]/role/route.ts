import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { verifyToken } from '@/lib/auth/auth';
import { ObjectId } from 'mongodb';
import Member from '@/models/Member';
import User from '@/models/User';

// Helper function to handle admin role transfers
async function handleAdminRoleTransfer(
  newRole: string, 
  targetUserId: string, 
  targetMember: any, 
  isInUserCollection: boolean
) {
  const { db } = await connectToDatabase();
  
  console.log('Handling admin role transfer:', {
    newRole,
    targetUserId,
    targetMemberPrimaryLodge: targetMember.primaryLodge,
    isInUserCollection
  });
  
  // Find and demote the previous admin of the same type
  const previousAdminQuery: any = { role: newRole };
  
  // For lodge admin, also check if they're in the same lodge
  if (newRole === 'LODGE_ADMIN' && targetMember.primaryLodge) {
    previousAdminQuery.primaryLodge = targetMember.primaryLodge;
  }
  
  // For district admin, check if they're in the same district (same primary lodge)
  if (newRole === 'DISTRICT_ADMIN' && targetMember.primaryLodge) {
    previousAdminQuery.primaryLodge = targetMember.primaryLodge;
  }
  
        // Find previous admin in all collections
      const previousAdminMember = await Member.findOne(previousAdminQuery);
      const previousAdminUser = await User.findOne(previousAdminQuery);
      const previousAdminUnified = await db.collection('unifiedusers').findOne(previousAdminQuery);
  
  if (previousAdminMember && previousAdminMember._id.toString() !== targetUserId) {
    console.log('Demoting previous admin member:', {
      id: previousAdminMember._id,
      name: previousAdminMember.firstName + ' ' + previousAdminMember.lastName,
      role: previousAdminMember.role
    });
    
    // Demote previous admin to LODGE_MEMBER
    await Member.findByIdAndUpdate(previousAdminMember._id, { 
      role: 'LODGE_MEMBER',
      administeredLodges: [] // Clear administered lodges
    });
    
    // Also update in users collection if they exist there
    const previousAdminUserRecord = await User.findOne({ _id: previousAdminMember._id });
    if (previousAdminUserRecord) {
      await User.findByIdAndUpdate(previousAdminMember._id, { 
        role: 'LODGE_MEMBER',
        administeredLodges: [] // Clear administered lodges
      });
    }
  }
  
  if (previousAdminUser && previousAdminUser._id.toString() !== targetUserId && !previousAdminMember) {
    console.log('Demoting previous admin user:', {
      id: previousAdminUser._id,
      name: previousAdminUser.name,
      role: previousAdminUser.role
    });
    
    // Demote previous admin to LODGE_MEMBER
    await User.findByIdAndUpdate(previousAdminUser._id, { 
      role: 'LODGE_MEMBER',
      administeredLodges: [] // Clear administered lodges
    });
  }
  
  if (previousAdminUnified && previousAdminUnified._id.toString() !== targetUserId && !previousAdminMember && !previousAdminUser) {
    console.log('Demoting previous admin unified user:', {
      id: previousAdminUnified._id,
      name: previousAdminUnified.name,
      role: previousAdminUnified.role
    });
    
    // Demote previous admin to LODGE_MEMBER
    await db.collection('unifiedusers').updateOne(
      { _id: previousAdminUnified._id },
      { 
        $set: { 
          role: 'LODGE_MEMBER',
          administeredLodges: [] // Clear administered lodges
        }
      }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('Role API error: No token provided');
      return NextResponse.json({ error: 'Unauthorized - No token provided' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const authUser = await verifyToken(token);
    if (!authUser) {
      console.error('Role API error: Invalid token');
      return NextResponse.json({ error: 'Unauthorized - Invalid token' }, { status: 401 });
    }

    // Only SUPER_ADMIN and DISTRICT_ADMIN can change roles
    if (authUser.role !== 'SUPER_ADMIN' && authUser.role !== 'DISTRICT_ADMIN') {
      console.error('Role API error: Forbidden - Only super admins and district admins can change roles', { role: authUser.role });
      return NextResponse.json({ error: 'Forbidden - Only super admins and district admins can change roles' }, { status: 403 });
    }

    const { db } = await connectToDatabase();
    const body = await request.json();
    const { newRole, targetUserId, lodgeId } = body;

    if (!newRole || !targetUserId) {
      console.error('Role API error: Missing required fields: newRole and targetUserId');
      return NextResponse.json({ error: 'Missing required fields: newRole and targetUserId' }, { status: 400 });
    }

    // Validate role
    const validRoles = ['SUPER_ADMIN', 'DISTRICT_ADMIN', 'LODGE_ADMIN', 'LODGE_MEMBER'];
    if (!validRoles.includes(newRole)) {
      console.error('Role API error: Invalid role');
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    // Find the target member
    let targetMember = await Member.findOne({ _id: new ObjectId(targetUserId) });
    let isInUserCollection = false;
    let isInUnifiedCollection = false;

    if (!targetMember) {
      // Check if they're in the users collection
      targetMember = await User.findOne({ _id: new ObjectId(targetUserId) });
      isInUserCollection = true;
    }

    if (!targetMember) {
      // Check if they're in the unifiedusers collection
      const { db: dbConnection } = await connectToDatabase();
      targetMember = await dbConnection.collection('unifiedusers').findOne({ _id: new ObjectId(targetUserId) });
      isInUnifiedCollection = true;
    }

    if (!targetMember) {
      // Try to find the member in the unifiedusers collection
      targetMember = await db.collection('unifiedusers').findOne({ _id: new ObjectId(targetUserId) });

    if (!targetMember) {
      console.error('Role API error: Target member not found', { targetUserId });
      return NextResponse.json({ error: 'Target member not found' }, { status: 404 });
      }
      
      // If member is found in unifiedusers but not in Member/User collections,
      // create a basic structure for them
      targetMember.role = targetMember.role || 'LODGE_MEMBER';
      targetMember.name = targetMember.name || 'Unknown Member';
      targetMember.email = targetMember.email || '';
      isInUnifiedCollection = true;
    }

    // District admin restrictions and permissions
    if (authUser.role === 'DISTRICT_ADMIN') {
      // District admins cannot promote to SUPER_ADMIN
      if (newRole === 'SUPER_ADMIN') {
        console.error('Role API error: Forbidden - District admins cannot promote to super admin', { newRole, targetUserId });
        return NextResponse.json({ error: 'Forbidden - District admins cannot promote to super admin' }, { status: 403 });
      }

      // District admins cannot demote SUPER_ADMIN users
      if (targetMember.role === 'SUPER_ADMIN') {
        console.error('Role API error: Forbidden - District admins cannot modify super admin roles', { newRole, targetUserId });
        return NextResponse.json({ error: 'Forbidden - District admins cannot modify super admin roles' }, { status: 403 });
      }

      // District admins can promote members to LODGE_ADMIN and DISTRICT_ADMIN
      // District admins can transfer their combined district admin + lodge admin role
      if (newRole === 'DISTRICT_ADMIN' && targetMember.role !== 'DISTRICT_ADMIN') {
        // District admins can promote members from any lodge in the district
        // For now, allow district admins to access any member for testing
        // TODO: Implement proper district-based access control based on lodge hierarchy
        console.log('District admin promoting member to district admin:', {
          targetMemberPrimaryLodge: targetMember.primaryLodge,
          districtAdminLodge: authUser.lodge
        });
      }

      // Special handling for district admin role transfer
      // The district admin is also the lodge admin of the district lodge, so they transfer together
      if (newRole === 'LODGE_ADMIN' && targetMember.role === 'DISTRICT_ADMIN' && targetUserId === authUser.userId) {
        // This is a valid transfer - district admin is transferring their combined role
        console.log('District admin transferring combined district admin + lodge admin role to another member');
        
        // When transferring district admin role, we need to:
        // 1. Update the current district admin to LODGE_ADMIN
        // 2. Update the target member to DISTRICT_ADMIN
        // 3. Update the district lodge's administered lodges for both users
        
        // First, update the current district admin
        const updateData = { role: newRole };
        if (isInUserCollection) {
          await User.findByIdAndUpdate(targetUserId, updateData);
        } else {
          await Member.findByIdAndUpdate(targetUserId, updateData);
        }
        
        // Find the target member to promote to district admin
        const { db } = await connectToDatabase();
        const targetMemberToPromote = await db.collection('members').findOne({ 
          role: { $ne: 'DISTRICT_ADMIN' }
        });
        
        if (targetMemberToPromote) {
          // Promote the target member to district admin
          await db.collection('members').updateOne(
            { _id: targetMemberToPromote._id },
            { $set: { role: 'DISTRICT_ADMIN' } }
          );
          
          // Also update in users collection if they exist there
          const targetUser = await User.findOne({ _id: targetMemberToPromote._id });
          if (targetUser) {
            await User.findByIdAndUpdate(targetMemberToPromote._id, { role: 'DISTRICT_ADMIN' });
          } else {
            // Create user record for the new district admin
            const memberName = targetMemberToPromote.firstName && targetMemberToPromote.lastName 
              ? `${targetMemberToPromote.firstName} ${targetMemberToPromote.lastName}`.trim()
              : targetMemberToPromote.name || 'Unknown Member';
              
            const newUser = new User({
              _id: targetMemberToPromote._id,
              name: memberName,
              email: targetMemberToPromote.email,
              passwordHash: targetMemberToPromote.password,
              role: 'DISTRICT_ADMIN',
              status: 'active',
              primaryLodge: targetMemberToPromote.primaryLodge,
              lodges: targetMemberToPromote.lodgeMemberships?.map((m: any) => m.lodge.toString()) || [],
              administeredLodges: targetMemberToPromote.administeredLodges || [],
              profileImage: targetMemberToPromote.profileImage,
              created: targetMemberToPromote.created || new Date(),
              lastLogin: targetMemberToPromote.lastLogin || new Date(),
              memberSince: targetMemberToPromote.memberSince?.toISOString() || new Date().toISOString()
            });
            await newUser.save();
          }
          
          console.log('Role transfer completed:', {
            from: authUser.userId,
            to: targetMemberToPromote._id.toString(),
            newDistrictAdmin: targetMemberToPromote.name
          });
          
          return NextResponse.json({ 
            success: true, 
            message: `District admin role transferred successfully to ${targetMemberToPromote.name}`,
            transferDetails: {
              from: authUser.userId,
              to: targetMemberToPromote._id.toString(),
              newDistrictAdmin: targetMemberToPromote.name
            }
          });
        } else {
          return NextResponse.json({ 
            error: 'No suitable member found in the district to transfer the role to' 
          }, { status: 400 });
        }
      } else if (newRole === 'LODGE_ADMIN' && targetMember.role === 'DISTRICT_ADMIN' && targetUserId !== authUser.userId) {
        // District admin is demoting another district admin - this should be restricted
        console.error('Role API error: Forbidden - Cannot demote another district admin', { newRole, targetUserId });
        return NextResponse.json({ error: 'Forbidden - Cannot demote another district admin' }, { status: 403 });
      }

      console.log('District admin access check (PUT):', {
        districtAdminId: authUser.userId,
        targetMemberId: targetUserId,
        targetMemberRole: targetMember.role,
        targetMemberLodges: targetMember.lodges || targetMember.lodgeMemberships?.map((m: any) => m.lodge.toString()) || [],
        targetMemberPrimaryLodge: targetMember.primaryLodge,
        newRole,
        isSelfTransfer: targetUserId === authUser.userId
      });
    }

    // Prevent removing the last SUPER_ADMIN (only for super admins)
    if (authUser.role === 'SUPER_ADMIN' && newRole !== 'SUPER_ADMIN' && targetMember.role === 'SUPER_ADMIN') {
      const superAdminCount = await User.countDocuments({ role: 'SUPER_ADMIN' });
      if (superAdminCount <= 1) {
        console.error('Role API error: Cannot demote the last super admin. Please promote another member to super admin first.', { superAdminCount });
        return NextResponse.json({ 
          error: 'Cannot demote the last super admin. Please promote another member to super admin first.' 
        }, { status: 400 });
      }
    }

    // Handle admin role transfers - demote previous admin if promoting to admin role
    if (['DISTRICT_ADMIN', 'LODGE_ADMIN'].includes(newRole)) {
      console.log('Promoting to admin role - checking for previous admin to demote');
      
      await handleAdminRoleTransfer(newRole, targetUserId, targetMember, isInUserCollection);
      
      // If a specific lodge is being assigned, handle lodge-specific admin transfer
      if (lodgeId && newRole === 'LODGE_ADMIN') {
        console.log('Assigning lodge admin to specific lodge:', lodgeId);
        
        // Find any existing admin for this specific lodge
        const existingLodgeAdmin = await User.findOne({
          role: 'LODGE_ADMIN',
          administeredLodges: { $in: [lodgeId] }
        });
        
        if (existingLodgeAdmin && existingLodgeAdmin._id.toString() !== targetUserId) {
          console.log('Removing previous lodge admin from specific lodge:', {
            id: existingLodgeAdmin._id,
            name: existingLodgeAdmin.name,
            administeredLodges: existingLodgeAdmin.administeredLodges
          });
          
          // Remove the lodge from the previous admin's administered lodges
          const updatedAdministeredLodges = existingLodgeAdmin.administeredLodges.filter(
            (lodge: string) => lodge !== lodgeId
          );
          
          await User.findByIdAndUpdate(existingLodgeAdmin._id, {
            administeredLodges: updatedAdministeredLodges
          });
          
          // If no more administered lodges, demote to member
          if (updatedAdministeredLodges.length === 0) {
            await User.findByIdAndUpdate(existingLodgeAdmin._id, { role: 'LODGE_MEMBER' });
          }
        }
      }
    }
    
    // Update the member's role and handle administered lodges
    const updateData: any = { role: newRole };
    
    // If promoting to lodge admin and a specific lodge is assigned
    if (newRole === 'LODGE_ADMIN' && lodgeId) {
      updateData.administeredLodges = [lodgeId];
    }
    
    // Update the primary collection where the user was found
    if (isInUserCollection) {
      await User.findByIdAndUpdate(targetUserId, updateData);
    } else if (isInUnifiedCollection) {
      const { db } = await connectToDatabase();
      await db.collection('unifiedusers').updateOne(
        { _id: new ObjectId(targetUserId) },
        { $set: updateData }
      );
    } else {
      await Member.findByIdAndUpdate(targetUserId, updateData);
    }

    // Also update other collections to ensure consistency
    try {
      // Update users collection if it exists
      const userRecord = await User.findOne({ _id: new ObjectId(targetUserId) });
      if (userRecord) {
        await User.findByIdAndUpdate(targetUserId, updateData);
      }

      // Update members collection if it exists
      const memberRecord = await Member.findOne({ _id: new ObjectId(targetUserId) });
      if (memberRecord) {
        await Member.findByIdAndUpdate(targetUserId, updateData);
      }

      // Update unifiedusers collection if it exists
      const { db } = await connectToDatabase();
      const unifiedRecord = await db.collection('unifiedusers').findOne({ _id: new ObjectId(targetUserId) });
      if (unifiedRecord) {
        await db.collection('unifiedusers').updateOne(
          { _id: new ObjectId(targetUserId) },
          { $set: updateData }
        );
      }
    } catch (error) {
      console.error('Error updating additional collections:', error);
      // Don't fail the main operation if additional collection updates fail
    }

    // If promoting to admin role, ensure they're in the users collection
    if (['SUPER_ADMIN', 'DISTRICT_ADMIN', 'LODGE_ADMIN'].includes(newRole) && !isInUserCollection) {
      // Create user record for the new admin
      const memberName = targetMember.firstName && targetMember.lastName 
        ? `${targetMember.firstName} ${targetMember.lastName}`.trim()
        : targetMember.name || 'Unknown Member';
        
      const administeredLodges = newRole === 'LODGE_ADMIN' && lodgeId 
        ? [lodgeId] 
        : targetMember.administeredLodges || [];
        
      const newUser = new User({
        _id: targetMember._id,
        name: memberName,
        email: targetMember.email,
        passwordHash: targetMember.password, // Use existing password
        role: newRole,
        status: 'active',
        primaryLodge: targetMember.primaryLodge,
        lodges: targetMember.lodgeMemberships?.map((m: any) => m.lodge.toString()) || [],
        administeredLodges: administeredLodges,
        profileImage: targetMember.profileImage,
        created: targetMember.created || new Date(),
        lastLogin: targetMember.lastLogin || new Date(),
        memberSince: targetMember.memberSince?.toISOString() || new Date().toISOString()
      });
      await newUser.save();
    }

    // If demoting from admin role, remove from users collection
    if (newRole === 'LODGE_MEMBER' && isInUserCollection) {
      // Additional safety check: prevent deleting the last super admin
      if (targetMember.role === 'SUPER_ADMIN') {
        const superAdminCount = await User.countDocuments({ role: 'SUPER_ADMIN' });
        if (superAdminCount <= 1) {
          console.error('Role API error: Cannot delete the last super admin user record. Please promote another member to super admin first.', { superAdminCount });
          return NextResponse.json({ 
            error: 'Cannot delete the last super admin user record. Please promote another member to super admin first.' 
          }, { status: 400 });
        }
      }
      await User.findByIdAndDelete(targetUserId);
    }

    console.log('Role updated successfully:', { newRole, targetUserId });
    return NextResponse.json({ 
      success: true, 
      message: `Role updated successfully to ${newRole}`,
      member: {
        _id: targetMember._id.toString(),
        name: targetMember.firstName && targetMember.lastName 
          ? `${targetMember.firstName} ${targetMember.lastName}`.trim()
          : targetMember.name || 'Unknown Member',
        email: targetMember.email,
        role: newRole
      }
    });

  } catch (error) {
    console.error('Error updating member role:', error);
    return NextResponse.json({ 
      error: 'Failed to update member role',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// GET - Get available roles and current member role
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('Role API error: No token provided');
      return NextResponse.json({ error: 'Unauthorized - No token provided' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const authUser = await verifyToken(token);
    if (!authUser) {
      console.error('Role API error: Invalid token');
      return NextResponse.json({ error: 'Unauthorized - Invalid token' }, { status: 401 });
    }

    // Only SUPER_ADMIN and DISTRICT_ADMIN can view role information
    if (authUser.role !== 'SUPER_ADMIN' && authUser.role !== 'DISTRICT_ADMIN') {
      console.error('Role API error: Forbidden - Only super admins and district admins can view role information', { role: authUser.role });
      return NextResponse.json({ error: 'Forbidden - Only super admins and district admins can view role information' }, { status: 403 });
    }

    const { db } = await connectToDatabase();

    // Find the member
    let member = await Member.findOne({ _id: new ObjectId(id) });
    let isInUserCollection = false;

    if (!member) {
      member = await User.findOne({ _id: new ObjectId(id) });
      isInUserCollection = true;
    }

    if (!member) {
      // Try to find the member in the unifiedusers collection
      member = await db.collection('unifiedusers').findOne({ _id: new ObjectId(id) });

    if (!member) {
      console.error('Role API error: Member not found', { id });
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
      }
      
      // If member is found in unifiedusers but not in Member/User collections,
      // create a basic role structure for them
      member.role = member.role || 'LODGE_MEMBER';
      member.name = member.name || 'Unknown Member';
      member.email = member.email || '';
    }

    // District admin restrictions and permissions
    if (authUser.role === 'DISTRICT_ADMIN') {
      if (member.role === 'SUPER_ADMIN') {
        console.error('Role API error: Forbidden - Cannot view super admin role information', { id });
        return NextResponse.json({ error: 'Forbidden - Cannot view super admin role information' }, { status: 403 });
      }

      // District admins can manage members from any lodge in the district
      // The district admin's lodge is the district lodge, but they can manage members from all lodges
      // For now, allow district admins to access any member for testing
      // TODO: Implement proper district-based access control based on lodge hierarchy
      console.log('District admin access check:', {
        districtAdminId: authUser.userId,
        targetMemberId: id,
        targetMemberRole: member.role,
        targetMemberLodges: member.lodges || member.lodgeMemberships?.map((m: any) => m.lodge.toString()) || [],
        targetMemberPrimaryLodge: member.primaryLodge,
        districtAdminLodge: authUser.lodge,
        isSelf: id === authUser.userId
      });
    }

    // Get available roles based on current role and user permissions
    let availableRoles = ['LODGE_MEMBER', 'LODGE_ADMIN', 'DISTRICT_ADMIN', 'SUPER_ADMIN'];
    
    // District admins can manage roles within their district
    if (authUser.role === 'DISTRICT_ADMIN') {
      availableRoles = availableRoles.filter(role => role !== 'SUPER_ADMIN');
      
      // If viewing their own role, they can transfer district admin to another member
      if (id === authUser.userId) {
        // District admin can transfer their role to another member
        availableRoles = ['LODGE_ADMIN']; // Can only transfer to lodge admin
      } else if (member.role === 'DISTRICT_ADMIN') {
        // Cannot modify another district admin's role
        availableRoles = [];
      } else {
        // Can promote regular members to lodge admin or district admin
        availableRoles = ['LODGE_MEMBER', 'LODGE_ADMIN', 'DISTRICT_ADMIN'];
      }
    }

    // Get admin counts for safety checks
    const superAdminCount = await User.countDocuments({ role: 'SUPER_ADMIN' });
    const districtAdminCount = await User.countDocuments({ role: 'DISTRICT_ADMIN' });

    console.log('Successfully retrieved member role info:', { id });
    return NextResponse.json({
      member: {
        _id: member._id.toString(),
        name: member.firstName && member.lastName 
          ? `${member.firstName} ${member.lastName}`.trim()
          : member.name || 'Unknown Member',
        email: member.email,
        currentRole: member.role,
        isInUserCollection
      },
      availableRoles,
      adminCounts: {
        superAdmins: superAdminCount,
        districtAdmins: districtAdminCount
      }
    });

  } catch (error) {
    console.error('Error getting member role info:', error);
    return NextResponse.json({ 
      error: 'Failed to get member role information',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 