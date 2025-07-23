import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { findUnifiedUserByEmail } from '@/lib/auth/unified-auth';
import { generateRandomPassword } from '@/lib/utils';
import { sendEmail } from '@/lib/email';
import bcrypt from 'bcryptjs';
import { ObjectId } from 'mongodb';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();

    // Find user in unified collection
    const user = await findUnifiedUserByEmail(email);
    
    if (!user) {
      // Don't reveal if user exists or not for security
      return NextResponse.json({ 
        message: 'If an account with that email exists, a password reset link has been sent.' 
      });
    }

    // Check if user is active
    if (user.status !== 'active') {
      return NextResponse.json({ 
        message: 'If an account with that email exists, a password reset link has been sent.' 
      });
    }

    // Generate a new random password
    const newPassword = generateRandomPassword();

    // Hash the new password
    const passwordHash = await bcrypt.hash(newPassword, 12);

    // Update the user's password in the database
    const result = await db.collection('unifiedusers').updateOne(
      { _id: new ObjectId(user._id) },
      { 
        $set: { 
          passwordHash: passwordHash,
          updatedAt: new Date()
        }
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ 
        message: 'If an account with that email exists, a password reset link has been sent.' 
      });
    }

    // Send email with new password
    try {
      await sendEmail({
        to: user.email,
        subject: 'Your Password Has Been Reset - PalmLeb.org',
        text: `Hello ${user.name || 'there'},

Your password has been reset for your PalmLeb.org account.

Your new password is: ${newPassword}

Please log in with this password and change it immediately for security reasons.

If you did not request this password reset, please contact your administrator immediately.

Best regards,
The PalmLeb.org Team`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1c3c6d;">Password Reset - PalmLeb.org</h2>
            <p>Hello ${user.name || 'there'},</p>
            <p>Your password has been reset for your PalmLeb.org account.</p>
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p style="margin: 0;"><strong>Your new password is:</strong> <span style="font-family: monospace; background-color: #e9ecef; padding: 2px 6px; border-radius: 3px;">${newPassword}</span></p>
            </div>
            <p><strong>Important:</strong> Please log in with this password and change it immediately for security reasons.</p>
            <p>If you did not request this password reset, please contact your administrator immediately.</p>
            <hr style="border: none; border-top: 1px solid #dee2e6; margin: 20px 0;">
            <p style="color: #6c757d; font-size: 14px;">Best regards,<br>The PalmLeb.org Team</p>
          </div>
        `
      });
    } catch (emailError) {
      console.error('Error sending password reset email:', emailError);
      // Don't fail the request if email fails, but log it
      return NextResponse.json(
        { error: 'Failed to send password reset email. Please contact your administrator.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      message: 'If an account with that email exists, a password reset link has been sent.' 
    });
  } catch (error) {
    console.error('Error in forgot password:', error);
    return NextResponse.json(
      { error: 'An error occurred. Please try again.' },
      { status: 500 }
    );
  }
} 