import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { getTokenData } from '@/lib/auth';
import { verifyToken } from '@/lib/auth/auth';
import { ObjectId } from 'mongodb';
import { UserRole } from '@prisma/client';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log('PUT /api/candidates/[id]: Starting candidate update');
    
    const tokenData = await getTokenData(request as any);
    if (!tokenData) {
      console.log('PUT /api/candidates/[id]: Unauthorized - No token');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user has permission to update candidates
    const allowedRoles = ['SUPER_ADMIN', 'LODGE_ADMIN', 'DISTRICT_ADMIN'];
    if (!allowedRoles.includes(tokenData.role)) {
      console.log('PUT /api/candidates/[id]: Unauthorized - Insufficient permissions');
      return NextResponse.json(
        { error: 'Unauthorized - Insufficient permissions' },
        { status: 401 }
      );
    }

    const candidateData = await request.json();
    console.log('PUT /api/candidates/[id]: Request data:', JSON.stringify(candidateData, null, 2));

    const { db } = await connectToDatabase();
    
    // Extract the fields that can be updated
    const {
      firstName,
      lastName,
      dateOfBirth,
      livingLocation,
      profession,
      notes,
      lodge,
      timing
    } = candidateData;

    // Build update object
    const updateData: any = {};
    
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (dateOfBirth !== undefined) updateData.dateOfBirth = dateOfBirth;
    if (livingLocation !== undefined) updateData.livingLocation = livingLocation;
    if (profession !== undefined) updateData.profession = profession;
    if (notes !== undefined) updateData.notes = notes;
    if (lodge !== undefined) updateData.lodge = lodge;
    
    // Handle timing update if provided
    if (timing && timing.startDate && timing.endDate) {
      const daysLeft = Math.ceil((new Date(timing.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      updateData.timing = {
        ...timing,
        daysLeft: Math.max(0, daysLeft)
      };
    }

    console.log('PUT /api/candidates/[id]: Update data:', JSON.stringify(updateData, null, 2));

    const result = await db.collection('candidates').updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      console.log('PUT /api/candidates/[id]: Candidate not found');
      return NextResponse.json(
        { error: 'Candidate not found' },
        { status: 404 }
      );
    }

    // Get the updated candidate
    const updatedCandidate = await db.collection('candidates').findOne(
      { _id: new ObjectId(id) }
    );

    console.log('PUT /api/candidates/[id]: Candidate updated successfully');
    return NextResponse.json(updatedCandidate);
  } catch (error) {
    console.error('PUT /api/candidates/[id]: Error updating candidate:', error);
    return NextResponse.json(
      { error: 'Failed to update candidate' },
      { status: 500 }
    );
  }
}

// Define the roles that can delete candidates
const ALLOWED_ROLES = ['SUPER_ADMIN', 'LODGE_ADMIN', 'DISTRICT_ADMIN'] as const;
type AllowedRole = typeof ALLOWED_ROLES[number];

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log('DELETE /api/candidates/[id]: Starting candidate deletion');
    
    // Get token from Authorization header
    const authHeader = req.headers.get('Authorization');
    console.log('DELETE /api/candidates/[id]: Auth header:', authHeader ? 'Present' : 'Missing');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('DELETE /api/candidates/[id]: Invalid auth header format');
      return NextResponse.json({ 
        error: 'Unauthorized - No token provided',
        status: 401
      }, { status: 401 });
    }

    const token = authHeader.substring(7);
    console.log('DELETE /api/candidates/[id]: Token received:', token.substring(0, 10) + '...');
    
    const tokenData = await verifyToken(token);
    console.log('DELETE /api/candidates/[id]: Token verification result:', {
      success: !!tokenData,
      tokenData: tokenData ? {
        userId: tokenData.userId,
        role: tokenData.role,
        name: tokenData.name,
        lodge: tokenData.lodge
      } : null
    });
    
    if (!tokenData) {
      console.log('DELETE /api/candidates/[id]: Token verification failed');
      return NextResponse.json({ 
        error: 'Unauthorized - Invalid token',
        status: 401
      }, { status: 401 });
    }

    const candidateId = id;
    console.log('DELETE /api/candidates/[id]: Candidate ID:', candidateId);
    
    if (!candidateId) {
      return NextResponse.json({ 
        error: 'Candidate ID is required',
        status: 400
      }, { status: 400 });
    }

    const { db } = await connectToDatabase();

    // Get user's role from token data
    const userRole = tokenData.role;
    console.log('DELETE /api/candidates/[id]: User role details:', {
      originalRole: userRole,
      roleType: typeof userRole,
      tokenData: {
        userId: tokenData.userId,
        role: tokenData.role,
        name: tokenData.name,
        lodge: tokenData.lodge
      }
    });

    // Normalize the role to uppercase for comparison
    const normalizedRole = typeof userRole === 'string' ? userRole.toUpperCase() : userRole;
    console.log('DELETE /api/candidates/[id]: Role normalization:', {
      originalRole: userRole,
      normalizedRole,
      allowedRoles: ALLOWED_ROLES
    });

    // Check if the role is in the allowed roles array
    const isAllowedRole = ALLOWED_ROLES.some(allowedRole => {
      const matches = allowedRole === normalizedRole || allowedRole === userRole;
      console.log('Role comparison:', {
        allowedRole,
        normalizedRole,
        userRole,
        matches,
        comparison: {
          exactMatch: allowedRole === normalizedRole,
          originalMatch: allowedRole === userRole
        }
      });
      return matches;
    });
    console.log('DELETE /api/candidates/[id]: Role check result:', {
      isAllowedRole,
      userRole,
      normalizedRole,
      allowedRoles: ALLOWED_ROLES
    });

    if (!isAllowedRole) {
      console.log('DELETE /api/candidates/[id]: Role check failed', {
        userRole,
        normalizedRole,
        allowedRoles: ALLOWED_ROLES,
        tokenData: {
          userId: tokenData.userId,
          role: tokenData.role,
          name: tokenData.name,
          lodge: tokenData.lodge
        }
      });
      return NextResponse.json({ 
        error: 'Unauthorized - Insufficient permissions',
        details: {
          userRole,
          normalizedRole,
          allowedRoles: ALLOWED_ROLES
        },
        status: 401
      }, { status: 401 });
    }

    // For LODGE_ADMIN, verify they are deleting a candidate from their own lodge
    if (normalizedRole === 'LODGE_ADMIN') {
      // Get user's lodge information
      const user = await db.collection('users').findOne(
        { _id: new ObjectId(tokenData.userId) },
        { projection: { primaryLodge: 1, administeredLodges: 1, lodges: 1 } }
      );

      if (!user) {
        console.log('DELETE /api/candidates/[id]: User not found');
        return NextResponse.json({ 
          error: 'Unauthorized - User not found',
          status: 401
        }, { status: 401 });
      }

      // Get user's lodge IDs
      const userLodgeIds = new Set<string>();
      
      // Add primary lodge ID
      if (user.primaryLodge) {
        const primaryLodgeId = typeof user.primaryLodge === 'string' 
          ? user.primaryLodge 
          : user.primaryLodge._id;
        userLodgeIds.add(primaryLodgeId.toString());
      }
      
      // Add administered lodges IDs
      if (user.administeredLodges && Array.isArray(user.administeredLodges)) {
        user.administeredLodges.forEach((lodgeId: string) => {
          userLodgeIds.add(lodgeId.toString());
        });
      }

      // Add all lodges the user is a member of
      if (user.lodges && Array.isArray(user.lodges)) {
        user.lodges.forEach((lodgeId: string) => {
          userLodgeIds.add(lodgeId.toString());
        });
      }

      console.log('User lodge IDs:', Array.from(userLodgeIds));

      // Get candidate's lodge information
      const candidate = await db.collection('candidates').findOne(
        { _id: new ObjectId(candidateId) }
      );

      if (!candidate) {
        console.log('DELETE /api/candidates/[id]: Candidate not found');
        return NextResponse.json({ 
          error: 'Candidate not found',
          status: 404
        }, { status: 404 });
      }

      console.log('Candidate data:', JSON.stringify(candidate, null, 2));

      // Get candidate's lodge ID
      let candidateLodgeId = candidate.lodgeId;
      if (!candidateLodgeId && candidate.lodge && candidate.lodge._id) {
        candidateLodgeId = candidate.lodge._id;
      }

      if (!candidateLodgeId) {
        console.log('DELETE /api/candidates/[id]: Candidate has no lodge ID');
        return NextResponse.json({ 
          error: 'Candidate is not associated with any lodge',
          status: 400
        }, { status: 400 });
      }

      const candidateLodgeIdStr = candidateLodgeId.toString();
      console.log('Candidate lodge ID:', candidateLodgeIdStr);

      // Check if user has permission to delete this candidate
      if (!userLodgeIds.has(candidateLodgeIdStr)) {
        console.log('DELETE /api/candidates/[id]: User not authorized - Lodge ID mismatch', {
          userLodgeIds: Array.from(userLodgeIds),
          candidateLodgeId: candidateLodgeIdStr
        });
        return NextResponse.json({ 
          error: 'Unauthorized - Can only delete candidates from your own lodge',
          details: {
            userLodgeIds: Array.from(userLodgeIds),
            candidateLodgeId: candidateLodgeIdStr
          },
          status: 401
        }, { status: 401 });
      }

      console.log('DELETE /api/candidates/[id]: User authorized to delete candidate');
    }

    const result = await db.collection('candidates').deleteOne({ _id: new ObjectId(candidateId) });
    
    if (result.deletedCount === 0) {
      return NextResponse.json({ 
        error: 'Candidate not found',
        status: 404
      }, { status: 404 });
    }

    return NextResponse.json({ 
      message: 'Candidate deleted successfully',
      status: 200
    }, { status: 200 });
  } catch (error) {
    console.error('DELETE /api/candidates/[id]: Error deleting candidate:', error);
    return NextResponse.json({ 
      error: 'Failed to delete candidate',
      details: error instanceof Error ? error.message : 'Unknown error',
      status: 500
    }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log('GET /api/candidates/[id]: Starting candidate fetch');
    console.log('Candidate ID:', id);

    // Get token from Authorization header
    const authHeader = request.headers.get('Authorization');
    console.log('Authorization header:', authHeader);
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('GET /api/candidates/[id]: No valid Authorization header');
      return NextResponse.json({ error: 'Unauthorized - No token provided' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    console.log('Token:', token.substring(0, 10) + '...');

    // Verify token using verifyToken function
    const tokenData = await verifyToken(token);
    console.log('Full token data:', JSON.stringify(tokenData, null, 2));
    
    if (!tokenData) {
      console.log('GET /api/candidates/[id]: Invalid token');
      return NextResponse.json({ error: 'Unauthorized - Invalid token' }, { status: 401 });
    }

    const candidateId = id;
    if (!candidateId) {
      console.log('GET /api/candidates/[id]: Missing candidate ID');
      return NextResponse.json({ error: 'Candidate ID is required' }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    console.log('GET /api/candidates/[id]: Connected to database');

    // Get user's role from token data (already normalized to uppercase in verifyToken)
    const userRole = tokenData.role;
    console.log('GET /api/candidates/[id]: User role:', userRole);

    // For LODGE_ADMIN, verify they are accessing a candidate from their own lodge
    if (userRole === 'LODGE_ADMIN') {
      const user = await db.collection('users').findOne(
        { _id: new ObjectId(tokenData.userId) },
        { projection: { lodgeId: 1 } }
      );

      if (!user || !user.lodgeId) {
        console.log('GET /api/candidates/[id]: User has no lodge ID');
        return NextResponse.json({ error: 'Unauthorized - User is not associated with any lodge' }, { status: 401 });
      }

      const candidate = await db.collection('candidates').findOne(
        { _id: new ObjectId(candidateId) },
        { projection: { lodgeId: 1 } }
      );

      if (!candidate) {
        console.log('GET /api/candidates/[id]: Candidate not found');
        return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });
      }

      if (user.lodgeId.toString() !== candidate.lodgeId.toString()) {
        console.log('GET /api/candidates/[id]: User not authorized - Not from same lodge');
        return NextResponse.json({ error: 'Unauthorized - Can only access candidates from your own lodge' }, { status: 401 });
      }
    }

    // First, get the raw candidate document to check its structure
    const rawCandidate = await db.collection('candidates').findOne(
      { _id: new ObjectId(candidateId) }
    );

    if (!rawCandidate) {
      console.log('GET /api/candidates/[id]: Candidate not found');
      return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });
    }

    console.log('GET /api/candidates/[id]: Raw candidate document:', JSON.stringify(rawCandidate, null, 2));

    // Extract lodgeId from the raw document
    let candidateLodgeId = rawCandidate.lodgeId;
    if (!candidateLodgeId && rawCandidate.lodge && rawCandidate.lodge._id) {
      candidateLodgeId = rawCandidate.lodge._id;
    }

    // If we still don't have a lodgeId, try to find it in the lodges collection
    if (!candidateLodgeId) {
      const lodge = await db.collection('lodges').findOne(
        { candidates: new ObjectId(candidateId) }
      );
      if (lodge) {
        candidateLodgeId = lodge._id;
      }
    }

    // Now fetch the full candidate details with lodge information
    const candidate = await db.collection('candidates').aggregate([
      { $match: { _id: new ObjectId(candidateId) } },
      {
        $lookup: {
          from: 'lodges',
          localField: 'lodgeId',
          foreignField: '_id',
          as: 'lodge'
        }
      },
      {
        $addFields: {
          lodgeId: {
            $cond: {
              if: { $eq: [{ $type: "$lodgeId" }, "objectId"] },
              then: { $toString: "$lodgeId" },
              else: {
                $cond: {
                  if: { $eq: [{ $type: "$lodgeId" }, "string"] },
                  then: "$lodgeId",
                  else: { $toString: { $arrayElemAt: ["$lodge._id", 0] } }
                }
              }
            }
          },
          lodgeName: { $arrayElemAt: ['$lodge.name', 0] }
        }
      },
      {
        $project: {
          lodge: 0
        }
      }
    ]).toArray();

    if (!candidate || candidate.length === 0) {
      console.log('GET /api/candidates/[id]: Candidate not found after aggregation');
      return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });
    }

    const candidateData = candidate[0];
    
    // Ensure lodgeId is included in the response
    if (!candidateData.lodgeId && candidateLodgeId) {
      candidateData.lodgeId = candidateLodgeId.toString();
    }

    console.log('GET /api/candidates/[id]: Final candidate data:', {
      id: candidateData._id,
      lodgeId: candidateData.lodgeId,
      lodgeName: candidateData.lodgeName
    });

    return NextResponse.json(candidateData);
  } catch (error) {
    console.error('GET /api/candidates/[id]: Error fetching candidate:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch candidate',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 