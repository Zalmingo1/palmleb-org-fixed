import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { getTokenData } from '@/lib/auth';
import { generateRandomPassword } from '@/lib/utils';
import { sendEmail } from '@/lib/email';
import { ObjectId } from 'mongodb';

export async function POST(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const token = await getTokenData(req);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate user ID
    if (!params.userId || !ObjectId.isValid(params.userId)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    const { db } = await connectToDatabase();

    // First check if user exists
    const user = await db.collection('users').findOne({ _id: new ObjectId(params.userId) });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Generate a new random password
    const newPassword = generateRandomPassword();

    // Update the user's password in the database
    const result = await db.collection('users').updateOne(
      { _id: new ObjectId(params.userId) },
      { 
        $set: { 
          password: newPassword, // Note: In production, this should be hashed
          updatedAt: new Date()
        }
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
    }

    // Send email with new password
    try {
      await sendEmail({
        to: user.email,
        subject: 'Your Password Has Been Reset',
        text: `Your password has been reset. Your new password is: ${newPassword}\n\nPlease log in and change your password immediately.`,
        html: `
          <p>Your password has been reset.</p>
          <p>Your new password is: <strong>${newPassword}</strong></p>
          <p>Please log in and change your password immediately.</p>
        `
      });
    } catch (emailError) {
      console.error('Error sending email:', emailError);
      // Don't fail the request if email fails, but log it
    }

    return NextResponse.json({ message: 'Password reset successful' });
  } catch (error) {
    console.error('Error resetting password:', error);
    return NextResponse.json(
      { error: 'Failed to reset password' },
      { status: 500 }
    );
  }
} 