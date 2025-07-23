import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

const JWT_SECRET = process.env.JWT_SECRET || 'palm-leb-dev-secret-2023';

export interface UnifiedUser {
  _id: string;
  email: string;
  passwordHash: string;
  name: string;
  firstName?: string;
  lastName?: string;
  role: string;
  status: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  occupation?: string;
  bio?: string;
  interests?: string[];
  profileImage?: string;
  primaryLodge?: string;
  primaryLodgePosition?: string;
  lodges?: string[];
  lodgeMemberships?: Array<{
    lodge: string;
    position: string;
    startDate: Date;
    endDate?: Date;
    isActive: boolean;
  }>;
  administeredLodges?: string[];
  memberSince?: Date;
  lastLogin?: Date;
  created?: Date;
  updatedAt?: Date;
}

export interface AuthUser {
  userId: string;
  email: string;
  role: string;
  name: string;
  lodgeId?: string;
}

/**
 * Find user by email in unified users collection
 */
export async function findUnifiedUserByEmail(email: string): Promise<UnifiedUser | null> {
  try {
    const { db } = await connectToDatabase();
    const user = await db.collection('members').findOne({ 
      email: email.toLowerCase() 
    });
    return user as UnifiedUser | null;
  } catch (error) {
    console.error('Error finding unified user by email:', error);
    return null;
  }
}

/**
 * Find user by ID in unified users collection
 */
export async function findUnifiedUserById(userId: string): Promise<UnifiedUser | null> {
  try {
    const { db } = await connectToDatabase();
    const user = await db.collection('members').findOne({ 
      _id: new ObjectId(userId) 
    });
    return user as UnifiedUser | null;
  } catch (error) {
    console.error('Error finding unified user by ID:', error);
    return null;
  }
}

/**
 * Verify password for unified user
 */
export async function verifyUnifiedUserPassword(password: string, passwordHash: any): Promise<boolean> {
  try {
    console.log('verifyUnifiedUserPassword called with:');
    console.log('- password type:', typeof password);
    console.log('- passwordHash type:', typeof passwordHash);
    console.log('- passwordHash value:', passwordHash ? String(passwordHash).substring(0, 20) + '...' : 'null/undefined');
    
    // Handle case where passwordHash might be an object
    let hashString = passwordHash;
    if (passwordHash && typeof passwordHash === 'object') {
      console.log('- Converting passwordHash object to string');
      hashString = String(passwordHash);
    }
    
    if (!hashString || typeof hashString !== 'string') {
      console.log('- Invalid passwordHash, returning false');
      return false;
    }
    
    const result = await bcrypt.compare(password, hashString);
    console.log('- bcrypt.compare result:', result);
    return result;
  } catch (error) {
    console.error('Error verifying password:', error);
    return false;
  }
}

/**
 * Hash password for unified user
 */
export async function hashPassword(password: string): Promise<string> {
  try {
    return await bcrypt.hash(password, 12);
  } catch (error) {
    console.error('Error hashing password:', error);
    throw error;
  }
}

/**
 * Generate JWT token for unified user
 */
export function generateUnifiedUserToken(user: UnifiedUser): string {
  const tokenData = {
    userId: user._id.toString(),
    email: user.email,
    role: user.role.toUpperCase(),
    name: user.name,
    lodgeId: user.primaryLodge?.toString()
  };

  return jwt.sign(tokenData, JWT_SECRET, { expiresIn: '24h' });
}

/**
 * Verify JWT token and return user data
 */
export async function verifyUnifiedUserToken(token: string): Promise<AuthUser | null> {
  try {
    if (!token || typeof token !== 'string') {
      return null;
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    if (!decoded.userId || !decoded.role) {
      return null;
    }

    // Normalize role to uppercase
    const normalizedRole = typeof decoded.role === 'string' 
      ? decoded.role.toUpperCase() 
      : String(decoded.role).toUpperCase();

    return {
      userId: decoded.userId,
      email: decoded.email,
      role: normalizedRole,
      name: decoded.name,
      lodgeId: decoded.lodgeId
    };
  } catch (error) {
    console.error('Error verifying unified user token:', error);
    return null;
  }
}

/**
 * Update last login time for unified user
 */
export async function updateUnifiedUserLastLogin(userId: string): Promise<void> {
  try {
    const { db } = await connectToDatabase();
    await db.collection('members').updateOne(
      { _id: new ObjectId(userId) },
      { $set: { lastLogin: new Date() } }
    );
  } catch (error) {
    console.error('Error updating last login:', error);
  }
}

/**
 * Create new unified user
 */
export async function createUnifiedUser(userData: {
  email: string;
  password: string;
  name: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  primaryLodge?: string;
  lodges?: string[];
}): Promise<UnifiedUser | null> {
  try {
    const { db } = await connectToDatabase();
    
    const passwordHash = await hashPassword(userData.password);
    
    const newUser = {
      email: userData.email.toLowerCase(),
      passwordHash,
      name: userData.name,
      firstName: userData.firstName || userData.name.split(' ')[0] || '',
      lastName: userData.lastName || userData.name.split(' ').slice(1).join(' ') || '',
      role: userData.role || 'LODGE_MEMBER',
      status: 'active',
      primaryLodge: userData.primaryLodge ? new ObjectId(userData.primaryLodge) : null,
      lodges: userData.lodges ? userData.lodges.map(id => new ObjectId(id)) : [],
      memberSince: new Date(),
      created: new Date(),
      updatedAt: new Date()
    };

    const result = await db.collection('members').insertOne(newUser);
    
    if (result.insertedId) {
      return { ...newUser, _id: result.insertedId.toString() } as unknown as UnifiedUser;
    }
    
    return null;
  } catch (error) {
    console.error('Error creating unified user:', error);
    return null;
  }
}

/**
 * Update unified user
 */
export async function updateUnifiedUser(userId: string, updateData: Partial<UnifiedUser>): Promise<boolean> {
  try {
    const { db } = await connectToDatabase();
    
    // Remove fields that shouldn't be updated
    const { _id, email, passwordHash, ...safeUpdateData } = updateData;
    
    const result = await db.collection('members').updateOne(
      { _id: new ObjectId(userId) },
      { 
        $set: {
          ...safeUpdateData,
          updatedAt: new Date()
        }
      }
    );
    
    return result.modifiedCount > 0;
  } catch (error) {
    console.error('Error updating unified user:', error);
    return false;
  }
}

/**
 * Check if user has access to a specific lodge
 */
export async function hasLodgeAccess(userId: string, lodgeId: string): Promise<boolean> {
  try {
    const user = await findUnifiedUserById(userId);
    if (!user) return false;
    
    // Super admins and district admins have access to all lodges
    if (user.role === 'SUPER_ADMIN' || user.role === 'DISTRICT_ADMIN') {
      return true;
    }
    
    // Check if user is a member of the lodge
    return user.lodges?.some(lodge => lodge.toString() === lodgeId) || false;
  } catch (error) {
    console.error('Error checking lodge access:', error);
    return false;
  }
}

/**
 * Check if user is admin of a specific lodge
 */
export async function isLodgeAdmin(userId: string, lodgeId: string): Promise<boolean> {
  try {
    const user = await findUnifiedUserById(userId);
    if (!user) return false;
    
    // Super admins and district admins are admins of all lodges
    if (user.role === 'SUPER_ADMIN' || user.role === 'DISTRICT_ADMIN') {
      return true;
    }
    
    // Check if user is a lodge admin of the specific lodge
    if (user.role === 'LODGE_ADMIN') {
      return user.administeredLodges?.some(lodge => lodge.toString() === lodgeId) || false;
    }
    
    return false;
  } catch (error) {
    console.error('Error checking lodge admin status:', error);
    return false;
  }
} 