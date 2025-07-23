import { NextRequest } from 'next/server';
import { compare, hash } from 'bcryptjs';
import { sign, verify } from 'jsonwebtoken';
import { JwtPayload } from 'jsonwebtoken';

interface TokenData {
  id: string;
  userId: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

// Salt rounds for bcrypt
const SALT_ROUNDS = 10;

// JWT secret key
const JWT_SECRET = process.env.JWT_SECRET || 'palm-leb-dev-secret-2023';

// Token expiration time (1 day)
const TOKEN_EXPIRATION = '1d';

/**
 * Get token data from request
 */
export async function getTokenData(req: NextRequest): Promise<TokenData | null> {
  try {
    const token = req.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      console.log('No token found in request headers');
      return null;
    }

    console.log('Decoding token:', token);
    const decoded = verify(token, JWT_SECRET) as JwtPayload;
    console.log('Decoded token data:', decoded);

    return {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role
    };
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
}

/**
 * Check if user has required role
 */
export function hasRole(tokenData: TokenData | null, roles: string[]): boolean {
  if (!tokenData) {
    return false;
  }
  
  return roles.includes(tokenData.role);
}

/**
 * Check if user is a district admin
 */
export function isDistrictAdmin(tokenData: TokenData | null): boolean {
  return hasRole(tokenData, ['SUPER_ADMIN']);
}

/**
 * Check if user is a lodge admin
 */
export function isLodgeAdmin(tokenData: TokenData | null): boolean {
  return hasRole(tokenData, ['SUPER_ADMIN', 'LODGE_ADMIN']);
}

/**
 * Check if user is a member of a specific lodge
 */
export async function isMemberOfLodge(tokenData: TokenData | null, lodge: string): Promise<boolean> {
  if (!tokenData) {
    return false;
  }
  
  // District admin can access all lodges
  if (tokenData.role === 'SUPER_ADMIN') {
    return true;
  }
  
  // For lodge admin and regular members, check their lodges
  const Member = (await import('@/models/Member')).default;
  const user = await Member.findById(tokenData.userId).lean();
  
  if (!user) {
    return false;
  }
  
  // Check if the lodge is in the user's lodges array
  return user.lodges && Array.isArray(user.lodges) && user.lodges.includes(lodge);
}

/**
 * Check if user can administer a specific lodge
 */
export async function canAdministerLodge(tokenData: TokenData | null, lodge: string): Promise<boolean> {
  if (!tokenData) {
    return false;
  }
  
  // District admin can administer all lodges
  if (tokenData.role === 'SUPER_ADMIN') {
    return true;
  }
  
  // Only lodge admins can administer lodges
  if (tokenData.role !== 'LODGE_ADMIN') {
    return false;
  }
  
  // Check if the lodge is in the admin's administered lodges
  const Member = (await import('@/models/Member')).default;
  const admin = await Member.findById(tokenData.userId).lean();
  
  if (!admin) {
    return false;
  }
  
  return admin.administeredLodges && 
         Array.isArray(admin.administeredLodges) && 
         admin.administeredLodges.includes(lodge);
}

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return hash(password, SALT_ROUNDS);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return compare(password, hashedPassword);
}

/**
 * Generate a JWT token for a user
 */
export function generateToken(user: { id?: string; _id?: string; email: string; role: string; name?: string | null; lodgeId?: string | null }): string {
  return sign(
    {
      userId: user.id || user._id,
      email: user.email,
      role: user.role,
      name: user.name || undefined,
      lodgeId: user.lodgeId || undefined
    },
    JWT_SECRET,
    { expiresIn: TOKEN_EXPIRATION }
  );
}

/**
 * Verify a JWT token
 */
export function verifyToken(token: string): { userId: string; email: string; role: string } | null {
  try {
    return verify(token, JWT_SECRET) as { userId: string; email: string; role: string };
  } catch (error) {
    return null;
  }
}

/**
 * Check if a user has permission to access a resource
 */
export function hasPermission(
  userRole: string, 
  requiredRoles: string[]
): boolean {
  return requiredRoles.includes(userRole);
} 