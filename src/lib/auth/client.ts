import Cookies from 'js-cookie';

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  role: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  primaryLodge?: string;
  primaryLodgePosition?: string;
  lodgeMemberships?: Array<{
    lodge: string;
    position: string;
  }>;
  lodge?: {
    name: string;
    number: string;
  };
  position?: string;
  profileImage?: string;
  occupation?: string;
  bio?: string;
}

/**
 * Get the current user from localStorage or sessionStorage
 */
export function getCurrentUser(): User | null {
  if (typeof window === 'undefined') {
    return null;
  }
  
  // First try sessionStorage (used by the new login flow)
  let userJson = sessionStorage.getItem('user');
  
  // If not found, try localStorage (used by the old login flow)
  if (!userJson) {
    userJson = localStorage.getItem('user');
  }
  
  if (!userJson) {
    return null;
  }
  
  try {
    const userData = JSON.parse(userJson);
    console.log("getCurrentUser: Profile image available:", !!userData.profileImage);
    return userData;
  } catch (error) {
    console.error('Error parsing user data:', error);
    return null;
  }
}

/**
 * Check if the user is authenticated
 * 
 * Note: Since we're using HTTP-only cookies for the token,
 * we can't directly check for the token's existence.
 * Instead, we rely on the user data in localStorage.
 */
export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  
  // Check if user data exists in localStorage
  return !!getCurrentUser();
}

/**
 * Get the authentication token from client-side cookie
 * Note: This will only work for non-HTTP-only cookies
 */
export function getToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  
  return Cookies.get('token') || null;
}

/**
 * Check if the current user has a specific role
 */
export function hasRole(role: 'SUPER_ADMIN' | 'DISTRICT_ADMIN' | 'LODGE_ADMIN'): boolean {
  const user = getCurrentUser();
  if (!user) {
    return false;
  }
  
  return user.role === role;
}

/**
 * Check if the current user has admin privileges
 */
export function isAdmin(): boolean {
  const user = getCurrentUser();
  if (!user) {
    return false;
  }
  
  return ['SUPER_ADMIN', 'DISTRICT_ADMIN', 'LODGE_ADMIN'].includes(user.role);
}

/**
 * Check if the current user has super admin privileges
 */
export function isSuperAdmin(): boolean {
  return hasRole('SUPER_ADMIN');
}

/**
 * Check if the current user has district admin privileges
 */
export function isDistrictAdmin(): boolean {
  return hasRole('DISTRICT_ADMIN');
}

/**
 * Check if the current user has lodge admin privileges
 */
export function isLodgeAdmin(): boolean {
  return hasRole('LODGE_ADMIN');
}

/**
 * Logout the current user
 */
export async function logout(): Promise<void> {
  if (typeof window === 'undefined') {
    return;
  }
  
  try {
    // Call the logout API to clear the HTTP-only cookie
    await fetch('/api/auth/logout', { 
      method: 'POST',
      credentials: 'include'
    });
  } catch (error) {
    console.error('Error during logout:', error);
  } finally {
    // Clear user data from storage
    sessionStorage.removeItem('user');
    localStorage.removeItem('user');
    
    // Redirect to login page
    window.location.href = '/login';
  }
}

export async function updateUserProfile(data: Partial<User>): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('/api/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.error || 'Failed to update profile' };
    }

    const updatedUser = await response.json();
    // Update session storage with new user data
    sessionStorage.setItem('user', JSON.stringify(updatedUser));
    
    return { success: true };
  } catch (error) {
    console.error('Error updating profile:', error);
    return { success: false, error: 'An error occurred while updating your profile' };
  }
}

/**
 * Refresh the authentication token
 */
export async function refreshToken(): Promise<boolean> {
  try {
    const currentToken = getToken();
    if (!currentToken) {
      return false;
    }

    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${currentToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    
    // Update session storage with new token and user data
    sessionStorage.setItem('token', data.token);
    sessionStorage.setItem('user', JSON.stringify(data.user));
    sessionStorage.setItem('isAuthenticated', 'true');

    return true;
  } catch (error) {
    console.error('Error refreshing token:', error);
    return false;
  }
}

/**
 * Get the current user from session storage
 */
export function getCurrentUserFromSessionStorage() {
  if (typeof window === 'undefined') {
    return null;
  }
  
  const userData = sessionStorage.getItem('user');
  return userData ? JSON.parse(userData) : null;
} 