'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LogoutPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const performLogout = async () => {
      try {
        // Call logout API
        const response = await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (!response.ok) {
          throw new Error('Logout failed');
        }
        
        // Clear local storage and session storage
        localStorage.removeItem('token');
        sessionStorage.removeItem('user');
        
        // Get response data
        const data = await response.json();
        
        // Use the redirect URL from the response or default to home page
        const redirectUrl = '/'; // Always redirect to main page
        
        // Redirect to home page
        router.push(redirectUrl);
        
        // Add a fallback redirect in case the router push doesn't work
        setTimeout(() => {
          window.location.href = redirectUrl;
        }, 1000);
      } catch (err: any) {
        console.error('Logout error:', err);
        setError(err.message || 'Logout failed. Please try again.');
        
        // Even on error, try to redirect to home page
        setTimeout(() => {
          window.location.href = '/';
        }, 2000);
      }
    };
    
    performLogout();
  }, [router]);
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        {error ? (
          <div>
            <h1 className="text-2xl font-semibold text-red-600">Logout Failed</h1>
            <p className="mt-2 text-gray-600">{error}</p>
            <p className="mt-2 text-gray-600">Redirecting to home page...</p>
            <div className="mt-4">
              <div className="w-16 h-16 border-t-4 border-b-4 border-blue-500 rounded-full animate-spin mx-auto"></div>
            </div>
          </div>
        ) : (
          <div>
            <h1 className="text-2xl font-semibold text-gray-800">Logging out...</h1>
            <p className="mt-2 text-gray-600">Redirecting to home page...</p>
            <div className="mt-4">
              <div className="w-16 h-16 border-t-4 border-b-4 border-blue-500 rounded-full animate-spin mx-auto"></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 