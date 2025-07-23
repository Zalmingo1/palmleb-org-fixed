'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getCurrentUser, logout, User } from '@/lib/auth/client';
import { useRouter } from 'next/navigation';
import Notifications from '@/components/dashboard/Notifications';
import { UserCircleIcon } from '@heroicons/react/24/outline';

export default function Header() {
  const router = useRouter();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
    }
  }, []);

  // Log user data outside useEffect to avoid triggering re-renders
  useEffect(() => {
    if (user) {
      console.log("Header: Profile image available:", !!user.profileImage);
    }
  }, [user]);

  // Get user initials for avatar
  const getInitials = (name?: string) => {
    if (!name || name.trim() === '') return '';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase();
  };

  // Validate profile image URL with a more robust approach
  const validateProfileImage = (url?: string): string | null => {
    // If no URL provided, return default avatar
    if (!url || url.trim() === '') return '/images/default-avatar.png';
    
    // If URL already starts with http, it's an external URL, use it
    if (url.startsWith('http')) return url;
    
    // If it's a relative URL, ensure it starts with /
    if (!url.startsWith('/')) {
      url = '/' + url;
    }
    
    // Return the validated URL
    return url;
  };

  const handleLogout = async () => {
    try {
      // Clear user data
      sessionStorage.removeItem('user');
      localStorage.removeItem('token');
      
      // Call logout API
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      // Redirect to home page
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
      
      // Even on error, redirect to home page
      router.push('/');
    }
  };

  return (
    <header className="bg-white shadow-sm h-16 flex items-center justify-between px-6">
      <div className="flex items-center">
        <h1 className="text-xl font-medium text-gray-800">Dashboard</h1>
      </div>

      <div className="flex items-center space-x-4">
        {/* Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search..."
            className="w-64 pl-10 pr-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-masonic-blue focus:border-transparent"
          />
          <div className="absolute left-3 top-2.5">
            <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd"></path>
            </svg>
          </div>
        </div>

        {/* Notifications dropdown */}
        <div className="relative">
          <Notifications />
        </div>

        {/* Profile dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setIsProfileOpen(!isProfileOpen);
              if (isNotificationsOpen) setIsNotificationsOpen(false);
            }}
            className="flex items-center"
          >
            {validateProfileImage(user?.profileImage) ? (
              <div className="h-8 w-8 rounded-full overflow-hidden">
                <img
                  src={validateProfileImage(user?.profileImage) || '/images/default-avatar.png'}
                  alt={user?.name || 'User'}
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    // Silently handle the error without logging to console
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.parentElement!.innerHTML = `<div class="h-8 w-8 rounded-full bg-masonic-blue text-white flex items-center justify-center"><span class="text-sm font-medium">${getInitials(user?.name)}</span></div>`;
                  }}
                />
              </div>
            ) : (
              <div className="h-8 w-8 rounded-full bg-masonic-blue text-white flex items-center justify-center">
                {getInitials(user?.name) ? (
                  <span className="text-sm font-medium">{getInitials(user?.name)}</span>
                ) : (
                  <UserCircleIcon className="h-5 w-5 text-white" />
                )}
              </div>
            )}
          </button>

          {isProfileOpen && (
            <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
              <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
                {user?.role === 'DISTRICT_ADMIN' && (
                  <Link
                    href="/dashboard/profile"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    role="menuitem"
                  >
                    Your Profile
                  </Link>
                )}
                <button
                  onClick={handleLogout}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  role="menuitem"
                >
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
} 