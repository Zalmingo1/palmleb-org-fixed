'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

export default function HomePage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      console.log('Attempting login with email:', email);
      
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Login failed: Invalid JSON response', {
          status: response.status,
          responseText
        });
        throw new Error('Login failed. Server returned an invalid response.');
      }
      
      // If data is empty or not an object, log the raw response text
      if (!data || typeof data !== 'object' || (Object.keys(data).length === 0 && data.constructor === Object)) {
        console.error('Login failed: Empty JSON response', {
          status: response.status,
          responseText
        });
        throw new Error('Login failed. Server returned an empty response.');
      }
      
      console.log('Login response:', {
        status: response.status,
        ok: response.ok,
        data: data
      });

      if (!response.ok) {
        // Log the full data object for debugging
        console.log('Login failed - DEBUG INFO:', {
          status: response.status,
          data,
          dataType: typeof data,
          dataKeys: Object.keys(data || {}),
          dataStringified: JSON.stringify(data),
          responseText: responseText
        });
        // Use a fallback error message if data.error is missing
        throw new Error(data.error || 'Login failed. Please check your credentials and try again.');
      }

      // Check if we have the expected data structure
      if (!data.user || !data.token) {
        console.error('Invalid response structure:', data);
        throw new Error('Invalid response from server');
      }

      // Store token and user data in session storage
      console.log('Storing token in sessionStorage:', data.token);
      sessionStorage.setItem('token', data.token);
      sessionStorage.setItem('user', JSON.stringify(data.user));
      sessionStorage.setItem('isAuthenticated', 'true');
      sessionStorage.setItem('userRole', data.user.role);

      // Log session storage after setting
      console.log('Session storage after login:', {
        token: sessionStorage.getItem('token'),
        user: sessionStorage.getItem('user'),
        isAuthenticated: sessionStorage.getItem('isAuthenticated'),
        userRole: sessionStorage.getItem('userRole')
      });

      // Redirect based on user role
      if (data.user.role === 'SUPER_ADMIN') {
        router.push('/dashboard/super-admin');
      } else if (data.user.role === 'LODGE_ADMIN') {
        router.push('/dashboard/lodge-admin');
      } else {
        router.push('/dashboard');
      }
    } catch (err) {
      console.error('Login error:', err);
      console.error('Login error details:', {
        message: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : undefined
      });
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <style jsx global>{`
        @keyframes horizontalSpin {
          0% {
            transform: rotateY(0deg);
          }
          100% {
            transform: rotateY(360deg);
          }
        }
        
        .logo-spin {
          animation: horizontalSpin 1.5s ease-in-out;
          transform-style: preserve-3d;
          backface-visibility: visible;
        }
      `}</style>
      
      <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-blue-50 to-white">
        {/* Content */}
        <div className="relative min-h-screen flex flex-col">
          {/* Main Content */}
          <main className="flex-grow flex items-center py-16">
            <div className="max-w-7xl mx-auto w-full px-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
                {/* Welcome Section with Logo */}
                <div className="space-y-8 relative">
                  {/* Logo with subtle glow */}
                  <div className="flex justify-center mb-10">
                    <div className="relative">
                      <div className="relative bg-white p-5 rounded-full shadow-sm">
                        <Image 
                          src="/images/Palm Logo.png" 
                          alt="Palm Logo" 
                          width={140} 
                          height={140} 
                          className="h-36 w-auto logo-spin"
                          priority
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white/80 backdrop-blur-sm p-8 rounded-2xl shadow-sm border border-gray-100">
                    <h2 className="text-4xl font-light text-gray-900 tracking-tight text-center mb-4">
                      Your Community Portal
                    </h2>
                    <p className="text-sm text-gray-600 font-light text-center max-w-md mx-auto leading-relaxed">
                      Your central hub for community management and member connections.
                      Access your dashboard to view upcoming events, connect with members,
                      manage documents, and stay updated with the latest announcements.
                    </p>
                  </div>
                </div>

                {/* Login Form */}
                <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-lg relative z-10">
                  <div className="mb-8">
                    <h3 className="text-2xl font-light text-gray-900">Sign in</h3>
                  </div>

                  <form className="space-y-6" onSubmit={handleSubmit}>
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="email-address" className="block text-sm font-medium text-gray-700">
                          Email address
                        </label>
                        <input
                          id="email-address"
                          name="email"
                          type="email"
                          autoComplete="email"
                          required
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-700 focus:border-blue-700 sm:text-sm text-gray-900"
                          placeholder="Email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                        />
                      </div>
                      <div>
                        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                          Password
                        </label>
                        <input
                          id="password"
                          name="password"
                          type="password"
                          autoComplete="current-password"
                          required
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-700 focus:border-blue-700 sm:text-sm text-gray-900"
                          placeholder="Password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                        />
                      </div>
                    </div>

                    {error && (
                      <div className="text-red-500 text-sm text-center">{error}</div>
                    )}

                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <input
                          id="remember-me"
                          name="remember-me"
                          type="checkbox"
                          className="h-4 w-4 text-blue-700 focus:ring-blue-700 border-gray-300 rounded"
                        />
                        <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                          Remember me
                        </label>
                      </div>

                      <div className="text-sm">
                        <Link href="/forgot-password" className="font-medium text-blue-700 hover:text-blue-600">
                          Forgot your password?
                        </Link>
                      </div>
                    </div>

                    <div>
                      <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-800 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-700"
                      >
                        {isLoading ? (
                          <span className="flex items-center">
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Signing in...
                          </span>
                        ) : (
                          'Sign in'
                        )}
                      </button>
                    </div>
                  </form>


                </div>
              </div>
            </div>
          </main>

          {/* Footer */}
          <footer className="py-4 px-8 border-t border-gray-200 bg-white/80 backdrop-blur-sm relative z-10">
            <div className="max-w-7xl mx-auto">
              <p className="text-center text-gray-400 text-xs">
                &copy; {new Date().getFullYear()} Palm Lebanon. All rights reserved.
              </p>
            </div>
          </footer>
        </div>
      </div>
    </>
  );
}
