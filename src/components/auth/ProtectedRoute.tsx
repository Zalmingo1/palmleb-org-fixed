'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string;
}

export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasRequiredRole, setHasRequiredRole] = useState(false);
  const [pathname, setPathname] = useState('');

  useEffect(() => {
    const checkAuth = async () => {
      const isAuthenticated = sessionStorage.getItem('isAuthenticated') === 'true';
      const userRole = sessionStorage.getItem('userRole');
      const userData = sessionStorage.getItem('user');
      let parsedUserRole = userRole;

      // If we have user data in session storage, use that for role
      if (userData) {
        try {
          const user = JSON.parse(userData);
          parsedUserRole = user.role;
        } catch (error) {
          console.error('Error parsing user data:', error);
        }
      }

      console.log('ProtectedRoute - Authentication check:', {
        authStatus: isAuthenticated,
        userRole: parsedUserRole,
        requiredRole,
        path: window.location.pathname
      });

      setIsAuthenticated(isAuthenticated);

      // If no specific role is required, or user has the required role, allow access
      if (isAuthenticated) {
        if (!requiredRole) {
          setHasRequiredRole(true);
        } else {
          // Handle the case where DISTRICT_ADMIN and SUPER_ADMIN are used interchangeably
          if (requiredRole === 'DISTRICT_ADMIN' && parsedUserRole === 'SUPER_ADMIN') {
            console.log('ProtectedRoute - Allowing SUPER_ADMIN for DISTRICT_ADMIN role requirement');
            setHasRequiredRole(true);
          } 
          // Handle the case where SUPER_ADMIN is required but user has DISTRICT_ADMIN
          else if (requiredRole === 'SUPER_ADMIN' && parsedUserRole === 'DISTRICT_ADMIN') {
            console.log('ProtectedRoute - Allowing DISTRICT_ADMIN for SUPER_ADMIN role requirement');
            setHasRequiredRole(true);
          }
          // Normal role check
          else {
            setHasRequiredRole(parsedUserRole === requiredRole);
          }
        }
      }

      setIsLoading(false);

      // Redirect logic
      if (!isAuthenticated) {
        console.log('ProtectedRoute - Not authenticated, redirecting to login page');
        router.push('/login');
      } else if (requiredRole && parsedUserRole !== requiredRole) {
        // Only redirect if user doesn't have the required role
        // and the special cases above don't apply
        if (!(requiredRole === 'DISTRICT_ADMIN' && parsedUserRole === 'SUPER_ADMIN') && 
            !(requiredRole === 'SUPER_ADMIN' && parsedUserRole === 'DISTRICT_ADMIN')) {
          console.log(`ProtectedRoute - User role ${parsedUserRole} doesn't match required role ${requiredRole}, redirecting to dashboard`);
          
          // Redirect based on user's actual role
          if (parsedUserRole === 'LODGE_ADMIN') {
            router.push('/dashboard/admin');
          } else if (parsedUserRole === 'SUPER_ADMIN' || parsedUserRole === 'DISTRICT_ADMIN') {
            router.push('/dashboard/super-admin');
          } else {
            router.push('/dashboard');
          }
        }
      }

      // Check if the current path requires a specific role
      if (window.location.pathname.startsWith('/dashboard/events/manage')) {
        if (parsedUserRole !== 'LODGE_ADMIN' && parsedUserRole !== 'SUPER_ADMIN') {
          router.push('/dashboard');
          return;
        }
      }

      // Add other role-based path checks here
      if (window.location.pathname.startsWith('/dashboard/super-admin')) {
        if (parsedUserRole !== 'SUPER_ADMIN') {
          router.push('/dashboard');
          return;
        }
      }

      if (window.location.pathname.startsWith('/dashboard/lodge-admin')) {
        if (parsedUserRole !== 'LODGE_ADMIN') {
          router.push('/dashboard');
          return;
        }
      }

      console.log('ProtectedRoute - Access granted, rendering children');
    };

    checkAuth();
  }, [router, requiredRole]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-900"></div>
      </div>
    );
  }

  // Only render children if user is authenticated and has the required role
  if (isAuthenticated && (hasRequiredRole || !requiredRole)) {
    return <>{children}</>;
  }

  // This should not be visible as we redirect in the useEffect
  return (
    <div className="flex justify-center items-center min-h-screen">
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
        <strong className="font-bold">Access Denied!</strong>
        <span className="block sm:inline"> You don't have permission to view this page.</span>
      </div>
    </div>
  );
} 