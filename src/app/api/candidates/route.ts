import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import { getTokenData } from '@/lib/auth';
import mongoose from 'mongoose';

export async function GET(req: NextRequest) {
  try {
    console.log('GET /api/candidates: Starting request');
    
    const token = await getTokenData(req as any);
    if (!token) {
      console.log('GET /api/candidates: Unauthorized - No token');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    console.log('GET /api/candidates: Token validated, user ID:', token.userId);

    await dbConnect();
    const db = mongoose.connection.db;
    if (!db) {
      console.log('GET /api/candidates: Database connection failed');
      throw new Error('Database connection failed');
    }
    
    console.log('GET /api/candidates: Database connected successfully');
    const currentDate = new Date();
    
    // Get the candidates collection - first try to get all candidates to see what's in the database
    let candidates = await db.collection('candidates').find({}).toArray();
    console.log('GET /api/candidates: Found', candidates.length, 'total candidates');
    
    // Filter for non-expired candidates if they have timing data
    candidates = candidates.filter((candidate: any) => {
      if (!candidate.timing || !candidate.timing.endDate) {
        return true; // Include candidates without timing data
      }
      const endDate = new Date(candidate.timing.endDate);
      return endDate > currentDate;
    });
    
    console.log('GET /api/candidates: Found', candidates.length, 'non-expired candidates');

    // Calculate days remaining for each candidate
    const updatedCandidates = candidates.map((candidate: any) => {
      let daysLeft = 0;
      if (candidate.timing && candidate.timing.endDate) {
        const endDate = new Date(candidate.timing.endDate);
        const diffTime = endDate.getTime() - currentDate.getTime();
        daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        daysLeft = Math.max(0, daysLeft); // Ensure daysLeft is not negative
      }
      
      return {
        ...candidate,
        daysLeft
      };
    });

    return NextResponse.json(updatedCandidates);
  } catch (error) {
    console.error('Error fetching candidates:', error);
    return NextResponse.json({ error: 'Failed to fetch candidates' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    console.log('POST /api/candidates: Starting candidate creation');
    
    const token = await getTokenData(req as any);
    if (!token) {
      console.log('POST /api/candidates: Unauthorized - Invalid token');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await req.json();
    console.log('POST /api/candidates: Request data:', JSON.stringify(data, null, 2));
    
    const { firstName, lastName, dateOfBirth, livingLocation, profession, notes, timing, idPhotoUrl, lodge, lodgeId } = data;

    if (!firstName || !lastName || !dateOfBirth || !livingLocation || !profession) {
      console.log('POST /api/candidates: Missing required fields', {
        firstName: !!firstName,
        lastName: !!lastName,
        dateOfBirth: !!dateOfBirth,
        livingLocation: !!livingLocation,
        profession: !!profession
      });
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await dbConnect();
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection failed');
    }
    console.log('POST /api/candidates: Connected to database');
    
    // Try to find the user in different collections
    let user = null;
    let submittedBy = 'System';
    let candidateLodgeName = lodge || '';
    let candidateLodgeId = lodgeId;

    try {
      // First try members collection
      user = await db.collection('members').findOne({ _id: new mongoose.Types.ObjectId(token.userId) });
      if (!user) {
        // Then try users collection
        user = await db.collection('users').findOne({ _id: new mongoose.Types.ObjectId(token.userId) });
      }

      if (user) {
        submittedBy = user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'System';
        // Get the lodge name and ID from the user's primary lodge
        if (user.primaryLodge) {
          const userLodgeId = typeof user.primaryLodge === 'string' ? user.primaryLodge : user.primaryLodge._id;
          const lodgeDoc = await db.collection('lodges').findOne({ _id: new mongoose.Types.ObjectId(userLodgeId) });
          if (lodgeDoc) {
            // If no lodge name was provided, use the user's primary lodge name
            if (!candidateLodgeName) {
              candidateLodgeName = lodgeDoc.name;
            }
            // If no lodgeId was provided, use the user's primary lodge
            if (!candidateLodgeId) {
              candidateLodgeId = userLodgeId;
            }
          }
        }
      }
    } catch (error) {
      console.log('POST /api/candidates: Error finding user:', error);
      // Continue with default submittedBy value
    }

    // Calculate default timing for 20 days
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 20);

    const candidate = {
      firstName,
      lastName,
      dateOfBirth,
      livingLocation,
      profession,
      notes: notes || '',
      status: 'pending',
      submittedBy,
      submissionDate: new Date().toISOString(),
      idPhotoUrl: idPhotoUrl || '/default-avatar.png', // Use provided image or default
      daysLeft: 20,
      lodge: candidateLodgeName, // Add the lodge name
      lodgeId: candidateLodgeId, // Add the lodge ID
      timing: timing || {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0]
      }
    };

    console.log('POST /api/candidates: Creating candidate:', JSON.stringify(candidate, null, 2));
    
    const result = await db.collection('candidates').insertOne(candidate);
    console.log('POST /api/candidates: Candidate created successfully');

    // Create notification for lodge members about the new candidate
    if (candidateLodgeId) {
      try {
        console.log('POST /api/candidates: Creating notification for lodge members');
        
        // Get all members of the lodge
        const lodgeMembers = await db.collection('members').find({
          $or: [
            { primaryLodge: candidateLodgeId },
            { lodges: candidateLodgeId }
          ]
        }).toArray();

        console.log(`POST /api/candidates: Found ${lodgeMembers.length} lodge members to notify`);

        if (lodgeMembers.length > 0) {
          const notifications = lodgeMembers.map(member => ({
            userId: member._id,
            type: 'candidate',
            title: 'New Candidate Added',
            message: `A new candidate, ${firstName} ${lastName}, has been added to ${candidateLodgeName || 'your lodge'}.`,
            candidateId: result.insertedId,
            lodgeId: candidateLodgeId,
            createdAt: new Date(),
            read: false
          }));

          console.log('POST /api/candidates: Creating notifications:', JSON.stringify(notifications, null, 2));
          
          await db.collection('notifications').insertMany(notifications);
          console.log('POST /api/candidates: Notifications created successfully');
        }
      } catch (notificationError) {
        console.error('POST /api/candidates: Error creating notifications:', notificationError);
        // Don't fail the candidate creation if notifications fail
      }
    }

    return NextResponse.json({ ...candidate, id: result.insertedId.toString() });
  } catch (error) {
    console.error('POST /api/candidates: Error creating candidate:', error);
    return NextResponse.json({ error: 'Failed to create candidate' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    console.log('DELETE /api/candidates: Starting candidate deletion');
    
    const token = await getTokenData(req as any);
    if (!token) {
      console.log('DELETE /api/candidates: Unauthorized - Invalid token');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const candidateId = url.pathname.split('/').pop();
    
    if (!candidateId) {
      console.log('DELETE /api/candidates: Missing candidate ID');
      return NextResponse.json({ error: 'Candidate ID is required' }, { status: 400 });
    }

    await dbConnect();
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection failed');
    }
    console.log('DELETE /api/candidates: Connected to database');

    // Check if user is authorized to delete the candidate
    const user = await db.collection('users').findOne({ _id: new mongoose.Types.ObjectId(token.userId) });
    if (!user) {
      console.log('DELETE /api/candidates: User not found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only allow super admins, district admins, or lodge admins to delete candidates
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'LODGE_ADMIN' && user.role !== 'DISTRICT_ADMIN') {
      console.log('DELETE /api/candidates: User not authorized');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await db.collection('candidates').deleteOne({ _id: new mongoose.Types.ObjectId(candidateId) });
    
    if (result.deletedCount === 0) {
      console.log('DELETE /api/candidates: Candidate not found');
      return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });
    }

    console.log('DELETE /api/candidates: Candidate deleted successfully');
    return NextResponse.json({ message: 'Candidate deleted successfully' });
  } catch (error) {
    console.error('DELETE /api/candidates: Error deleting candidate:', error);
    return NextResponse.json({ error: 'Failed to delete candidate' }, { status: 500 });
  }
} 