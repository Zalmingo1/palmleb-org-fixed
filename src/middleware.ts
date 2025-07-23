// Simple pass-through middleware
import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

// Define protected routes that require authentication
const protectedRoutes = [
  '/dashboard',
  '/profile',
];

// Define district admin-only routes
const districtAdminRoutes = [
  '/dashboard/admin',
  '/dashboard/district-admin',
  '/dashboard/lodges',
];

// Define routes that require at least lodge_admin privileges
const adminRoutes = [
  '/dashboard/members/add',
  '/dashboard/lodge-admin',
];

// Define public API paths (no authentication required)
const publicApiPaths = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/verify', // Include verify path to avoid circular authentication checks
];

// Check if a path starts with any of the protected paths
const isProtectedPath = (path: string) => {
  return protectedRoutes.some(protectedPath => path.startsWith(protectedPath));
};

// Check if a path is a public API path
const isPublicApiPath = (path: string) => {
  return publicApiPaths.some(publicPath => path.startsWith(publicPath));
};

// Lightweight middleware function
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Redirect /login to root since login is now on the homepage
  if (pathname === '/login') {
    return NextResponse.redirect(new URL('/', request.url));
  }
  
  // Always allow public API paths
  if (isPublicApiPath(pathname)) {
    return NextResponse.next();
  }
  
  // Allow public pages (not starting with /api or /dashboard)
  if (!pathname.startsWith('/api') && !pathname.startsWith('/dashboard')) {
    return NextResponse.next();
  }
  
  // Check if the path is a protected route
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));
  
  if (isProtectedRoute) {
    // In development mode, allow all requests to protected paths for easier testing
    if (process.env.NODE_ENV === 'development') {
      return NextResponse.next();
    }
    
    // Get the token from the cookies or Authorization header
    const token = request.cookies.get('token')?.value || 
                  request.headers.get('Authorization')?.replace('Bearer ', '') || 
                  '';
    
    // If no token is present, redirect to home page
    if (!token) {
      const url = new URL('/', request.url);
      url.searchParams.set('callbackUrl', encodeURI(pathname));
      return NextResponse.redirect(url);
    }
    
    try {
      // Verify the token
      const JWT_SECRET = process.env.JWT_SECRET || 'palm-leb-dev-secret-2023';
      const secretKey = new TextEncoder().encode(JWT_SECRET);
      
      const { payload } = await jwtVerify(token, secretKey);
      
      // Check if the route is district-admin-only and the user is not a district_admin
      const isDistrictAdminRoute = districtAdminRoutes.some(route => pathname.startsWith(route));
      if (isDistrictAdminRoute && payload.role !== 'SUPER_ADMIN') {
        // Redirect non-district-admin users to dashboard
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
      
      // Check if the route requires at least lodge_admin privileges
      const isAdminRoute = adminRoutes.some(route => pathname.startsWith(route));
      if (isAdminRoute && payload.role !== 'SUPER_ADMIN' && payload.role !== 'LODGE_ADMIN') {
        // Redirect non-admin users to dashboard
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
      
      // User is authenticated and has appropriate role, proceed
      return NextResponse.next();
    } catch (error) {
      // Token is invalid or expired
      // Clear the invalid token
      const response = NextResponse.redirect(new URL('/', request.url));
      response.cookies.delete('token');
      
      return response;
    }
  }
  
  return NextResponse.next();
}

// Configure middleware to run on specific paths
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/api/:path*',
  ],
}; 