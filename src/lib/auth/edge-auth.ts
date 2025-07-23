import { jwtVerify } from 'jose';
import { UserRole } from '@prisma/client';

export interface TokenPayload {
  userId: string;
  role: UserRole;
  iat: number;
  exp: number;
}

/**
 * Verify a JWT token in an Edge environment
 */
export async function verifyTokenEdge(token: string): Promise<TokenPayload | null> {
  if (!token) {
    return null;
  }

  try {
    const secret = process.env.JWT_SECRET;
    
    if (!secret) {
      console.error('JWT_SECRET is not defined in environment variables');
      return null;
    }

    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(secret)
    );

    return payload as unknown as TokenPayload;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
} 