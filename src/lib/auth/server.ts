import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

interface Token {
  userId: string;
  email: string;
  role: string;
  name?: string;
  lodgeId?: string;
  iat: number;
  exp: number;
}

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('Please define the JWT_SECRET environment variable inside .env.local');
}

export async function getToken() {
  try {
    // Get the token from cookies
    const cookieStore = await cookies();
    const tokenCookie = cookieStore.get('token');
    const token = tokenCookie?.value;
    
    if (!token) {
      console.log('No token found in cookies');
      return null;
    }

    // Verify the token
    const decoded = jwt.verify(token, JWT_SECRET!);
    console.log('Token decoded from cookies:', decoded);
    return decoded as Token;
  } catch (error) {
    console.error('Error retrieving or verifying token from cookies:', error);
    return null;
  }
}

export async function verifyToken(token: string) {
  try {
    console.log('Starting token verification...');
    
    // Remove 'Bearer ' prefix if present
    const cleanToken = token.startsWith('Bearer ') ? token.slice(7) : token;
    console.log('Token details:', {
      originalLength: token.length,
      cleanedLength: cleanToken.length,
      startsWithBearer: token.startsWith('Bearer '),
      firstChars: cleanToken.substring(0, 10) + '...',
      lastChars: '...' + cleanToken.substring(cleanToken.length - 10)
    });
    
    if (!cleanToken) {
      console.log('No token provided after cleaning');
      return null;
    }

    console.log('Verifying token with JWT_SECRET...');
    const decoded = jwt.verify(cleanToken, JWT_SECRET!) as Token;
    console.log('Token decoded successfully:', {
      decoded,
      type: typeof decoded,
      hasUserId: 'userId' in decoded,
      hasRole: 'role' in decoded
    });
    
    // Ensure we have the required fields
    if (!decoded || typeof decoded !== 'object') {
      console.log('Token is not an object:', decoded);
      return null;
    }

    // Check for required fields
    const userId = decoded.userId;
    const role = decoded.role;

    if (!userId || !role) {
      console.log('Token missing required fields:', { userId, role, decoded });
      return null;
    }

    console.log('Token verification successful:', { userId, role });
    return { id: userId, role };
  } catch (error) {
    console.error('Error verifying token:', error);
    if (error instanceof jwt.JsonWebTokenError) {
      console.error('JWT Error details:', {
        name: error.name,
        message: error.message
      });
    }
    return null;
  }
} 