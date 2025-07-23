import jwt from 'jsonwebtoken';
import { compare, hash } from 'bcryptjs';
import { ObjectId } from 'mongodb';
import { connectToDatabase } from '@/lib/mongodb';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  DISTRICT_ADMIN = 'DISTRICT_ADMIN',
  LODGE_ADMIN = 'LODGE_ADMIN',
  LODGE_MEMBER = 'LODGE_MEMBER',
  LODGE_SECRETARY = 'LODGE_SECRETARY'
}

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  password: string;
  createdAt: Date;
  updatedAt: Date;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  primaryLodge?: string;
  primaryLodgePosition?: string;
  lodgeMemberships?: Array<{
    lodgeId: string;
    position: string;
    startDate: Date;
    endDate?: Date;
  }>;
}

interface JwtPayload {
  userId: string;
  email: string;
  role: string;
  name?: string;
  lodgeId?: string;
  iat?: number;
  exp?: number;
}

export interface AuthUser {
  userId: string;
  role: string;
  name?: string;
  lodge?: string;
}

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  try {
    const saltRounds = 12;
    return await hash(password, saltRounds);
  } catch (error) {
    throw new Error('Failed to hash password');
  }
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  try {
    return await compare(password, hashedPassword);
  } catch (error) {
    return false;
  }
}

/**
 * Generate a JWT token for a user
 */
export function generateToken(user: { id?: string; _id?: string; email: string; role: string; name?: string | null; lodgeId?: string | null }): string {
  const userId = user.id || user._id;
  
  if (!userId) {
    throw new Error('User ID is required for token generation');
  }

  // Ensure role is a string
  if (typeof user.role !== 'string') {
    throw new Error('Invalid role format in generateToken');
  }

  const payload: JwtPayload = {
    userId,
    email: user.email,
    role: user.role.toUpperCase(),
    name: user.name || undefined,
    lodgeId: user.lodgeId || undefined
  };

  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
  return token;
}

/**
 * Verify and decode a JWT token
 */
export async function verifyToken(token: string): Promise<AuthUser | null> {
  try {
    if (!token || typeof token !== 'string') {
      return null;
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;

      // Extract user data from token
      const userId = decoded.userId;
      const role = decoded.role;
      const name = decoded.name;
      const lodgeId = decoded.lodgeId;

      if (!userId || !role) {
        return null;
      }

      // Normalize role to uppercase and ensure it's a string
      let normalizedRole: string;
      if (typeof role === 'string') {
        normalizedRole = role.toUpperCase();
      } else if (role && typeof role === 'object') {
        // If role is an object, try to get the string value
        normalizedRole = String(role).toUpperCase();
      } else {
        return null;
      }

      // Connect to database to get lodge information
      const { db } = await connectToDatabase();
      const user = await db.collection('members').findOne(
        { _id: new ObjectId(userId) },
        { projection: { lodgeId: 1, lodge: 1 } }
      );

      // Fetch lodge information if available
      let lodgeName = undefined;
      if (user?.lodgeId) {
        const lodge = await db.collection('lodges').findOne(
          { _id: new ObjectId(user.lodgeId) },
          { projection: { name: 1 } }
        );
        if (lodge) {
          lodgeName = lodge.name;
        }
      }

      const authUser = {
        userId,
        role: normalizedRole,
        name: name || undefined,
        lodge: lodgeName || user?.lodge || lodgeId || undefined
      };

      return authUser;
    } catch (jwtError) {
      return null;
    }
  } catch (error) {
    return null;
  }
}

// Mock users for testing
const mockUsers: User[] = [
  {
    id: '1',
    email: 'user@palmleb.org',
    // This is the hashed version of 'User123!'
    password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewYpfQN2YFqUsvOK',
    name: 'Test User',
    role: UserRole.LODGE_MEMBER,
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

/**
 * Get a user by email
 */
export async function getUserByEmail(email: string): Promise<User | null> {
  try {
    const { db } = await connectToDatabase();
    const user = await db.collection('members').findOne({ email });
    return user as User | null;
  } catch (error) {
    return null;
  }
}

/**
 * Create a new user
 */
export async function createUser(data: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
  try {
    const { db } = await connectToDatabase();
    const now = new Date();
    const userData = {
      ...data,
      createdAt: now,
      updatedAt: now
    };
    
    const result = await db.collection('members').insertOne(userData);
    return { ...userData, id: result.insertedId.toString() };
  } catch (error) {
    throw new Error('Failed to create user');
  }
} 