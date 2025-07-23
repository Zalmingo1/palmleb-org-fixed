'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getCurrentUser, User } from '@/lib/auth/client';
import NotificationBadge from './NotificationBadge';
import { 
  HomeIcon, 
  UserIcon as ProfileIcon, 
  Cog6ToothIcon as SettingsIcon,
  DocumentTextIcon,
  CalendarIcon,
  EnvelopeIcon,
  BuildingLibraryIcon,
  UserGroupIcon,
  BuildingOfficeIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';

// Icons (simplified for now)
const EventsIcon = () => <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd"></path></svg>;
const CandidatesIcon = () => <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"></path></svg>;
const NewsIcon = () => <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M2 5a2 2 0 012-2h8a2 2 0 012 2v10a2 2 0 002 2H4a2 2 0 01-2-2V5zm3 1h6v4H5V6zm6 6H5v2h6v-2z" clipRule="evenodd"></path><path d="M15 7h1a2 2 0 012 2v5.5a1.5 1.5 0 01-3 0V7z"></path></svg>;
const MembersIcon = () => <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v1h8v-1zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z"></path></svg>;
const AdminIcon = () => <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd"></path></svg>;
const MessagesIcon = () => <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd"></path></svg>;

type NavItem = {
  name: string;
  href: string;
  icon: React.FC;
};

  // Define navigation items based on user role and lodge roles
  const getNavigationItems = (role: string, lodgeRoles: { [key: string]: string }) => {
    // Common navigation items for all users
    const commonItems = [
      { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
      { name: 'Profile', href: '/dashboard/profile', icon: ProfileIcon },
    ];
    
    // Role-specific navigation items
    const normalizedRole = role?.toUpperCase() || '';
    
    // Count how many lodges the user has LODGE_ADMIN roles in (for Multi-Lodge Dashboard)
    const lodgeAdminCount = Object.values(lodgeRoles).filter(role => 
      role === 'LODGE_ADMIN'
    ).length;
    
    // Check if user has both district admin and lodge admin roles
    const hasDistrictAdminRole = Object.values(lodgeRoles).includes('DISTRICT_ADMIN');
    const hasLodgeAdminRole = Object.values(lodgeRoles).includes('LODGE_ADMIN');
    const hasMultipleRoles = hasDistrictAdminRole && hasLodgeAdminRole;
    
    console.log('Sidebar: Navigation debug:', {
      mainRole: normalizedRole,
      lodgeRoles,
      hasDistrictAdminRole,
      hasLodgeAdminRole,
      hasMultipleRoles,
      lodgeAdminCount
    });
    
    if (normalizedRole === 'SUPER_ADMIN') {
      return [
        { name: 'Super Admin Dashboard', href: '/dashboard/super-admin', icon: HomeIcon },
        { name: 'Profile', href: '/dashboard/profile', icon: ProfileIcon },
      ];
    } else if (normalizedRole === 'DISTRICT_ADMIN') {
      const items = [
        { name: 'My Dashboard', href: '/dashboard', icon: HomeIcon },
        { name: 'District Admin', href: '/dashboard/district-admin', icon: BuildingLibraryIcon },
        { name: 'Profile', href: '/dashboard/profile', icon: ProfileIcon },
      ];
      
      // If user has LODGE_ADMIN roles, add Lodge Admin option
      if (hasLodgeAdminRole) {
        if (lodgeAdminCount > 1) {
          items.splice(1, 0, { name: 'Multi-Lodge Dashboard', href: '/dashboard/multi-lodge', icon: BuildingLibraryIcon });
        } else {
          // For single lodge admin, we need to determine the lodge ID
          // This will be handled by the lodge-admin page itself
          items.splice(1, 0, { name: 'Lodge Admin', href: '/dashboard/lodge-admin', icon: BuildingLibraryIcon });
        }
      }
      
      return items;
    } else if (normalizedRole === 'LODGE_ADMIN') {
      const items = [
        { name: 'My Dashboard', href: '/dashboard', icon: HomeIcon },
        { name: 'Profile', href: '/dashboard/profile', icon: ProfileIcon },
      ];
      
      // If user has multiple LODGE_ADMIN roles, show Multi-Lodge Dashboard instead of individual admin options
      if (lodgeAdminCount > 1) {
        items.splice(1, 0, { name: 'Multi-Lodge Dashboard', href: '/dashboard/multi-lodge', icon: BuildingLibraryIcon });
      } else {
        // Only show individual Lodge Admin option if user has single lodge admin role
        items.splice(1, 0, { name: 'Lodge Admin', href: '/dashboard/lodge-admin', icon: BuildingLibraryIcon });
      }
      
      // If user has both district admin and lodge admin roles, add district admin option
      if (hasMultipleRoles) {
        items.splice(2, 0, { name: 'District Admin', href: '/dashboard/district-admin', icon: BuildingLibraryIcon });
      }
      
      return items;
    } else {
      return commonItems;
    }
  };

export default function Sidebar() {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [isOpen, setIsOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [userLodgeRoles, setUserLodgeRoles] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    const fetchUserData = async () => {
      setIsLoading(true);
      try {
        const currentUser = getCurrentUser();
        if (currentUser) {
          console.log("Sidebar: Current user:", currentUser);
          console.log("Sidebar: Profile image available:", !!currentUser.profileImage);
          setUser(currentUser);
          
          // Fetch user's lodge roles to determine navigation
          const token = localStorage.getItem('token') || sessionStorage.getItem('token');
          if (token) {
            try {
              const response = await fetch('/api/members/me', {
                headers: {
                  'Authorization': `Bearer ${token}`
                }
              });
              
              if (response.ok) {
                const userData = await response.json();
                console.log('Sidebar: User lodge roles:', userData.lodgeRoles);
                setUserLodgeRoles(userData.lodgeRoles || {});
              }
            } catch (error) {
              console.error('Error fetching user lodge roles:', error);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    // Initial fetch
    fetchUserData();

    // Listen for sessionStorage changes
    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'user') {
        const updatedUser = getCurrentUser();
        setUser(updatedUser);
      }
    };

    // Also listen for custom event that might be dispatched after login
    const handleUserUpdate = () => {
      const updatedUser = getCurrentUser();
      setUser(updatedUser);
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('userUpdated', handleUserUpdate);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('userUpdated', handleUserUpdate);
    };
  }, []);

  // Get user initials for avatar
  const getInitials = (firstName?: string, lastName?: string) => {
    if (!firstName && !lastName) return '?';
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
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

  // Get user role display name
  const getRoleDisplay = (role: string) => {
    switch (role) {
      case 'DISTRICT_ADMIN':
        return 'District Admin';
      
      case 'LODGE_MEMBER':
        return 'Lodge Member';
      default:
        return role;
    }
  };

  return (
    <div className={`bg-gradient-to-b from-masonic-blue to-masonic-blue-800 text-white h-screen ${isOpen ? 'w-64' : 'w-20'} transition-all duration-300 ease-in-out relative overflow-hidden shadow-lg`}>
      {/* Subtle grid pattern */}
      <div className="absolute inset-0 bg-[url('/images/pattern.svg')] bg-[length:20px_20px] opacity-[0.05]"></div>
      
      {/* Blue accent circles */}
      <div className="absolute -top-20 -left-20 w-40 h-40 rounded-full bg-blue-400/5 blur-2xl"></div>
      <div className="absolute bottom-1/3 -right-20 w-40 h-40 rounded-full bg-blue-400/5 blur-2xl"></div>
      
      {/* Logo and toggle section */}
      <div className="relative flex items-center justify-between p-4 border-b border-white/10">
        <div className="flex items-center">
          {/* Logo with white background */}
          <div className="bg-white rounded-full p-1.5 shadow-md mr-2">
            <div className="w-8 h-8 flex items-center justify-center">
              <img src="/images/Palm Logo.png" alt="Palm Logo" className="w-6 h-6" />
            </div>
          </div>
          
          {isOpen && (
            <h1 className="text-xl font-montserrat font-light tracking-wider text-white ml-1">PALM</h1>
          )}
        </div>
        
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="p-1 rounded-md hover:bg-white/10 transition-colors"
          aria-label={isOpen ? "Collapse sidebar" : "Expand sidebar"}
        >
          {isOpen ? (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd"></path>
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"></path>
            </svg>
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="relative mt-5 px-3">
        {isLoading ? (
          <div className="flex justify-center items-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-white"></div>
          </div>
        ) : (
          <div className="space-y-1.5">
                            {getNavigationItems(user?.role || '', userLodgeRoles).map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`
                    group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200
                    ${isActive 
                      ? 'bg-white/15 text-white shadow-sm' 
                      : 'text-white/80 hover:bg-white/10 hover:text-white'}
                  `}
                >
                  <span className={`${isActive ? 'text-white' : 'text-white/70 group-hover:text-white'}`}>
                    <item.icon />
                  </span>
                  {isOpen && (
                    <span className="ml-3 flex items-center">
                      {item.name}
                      {<NotificationBadge route={item.href} />}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </nav>

      {/* User profile section */}
      <div className="absolute bottom-0 w-full border-t border-white/10 backdrop-blur-sm bg-masonic-blue-900/30">
        <div className="p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="h-10 w-10 rounded-full overflow-hidden shadow-md">
                {validateProfileImage(user?.profileImage) ? (
                  <img
                    src={validateProfileImage(user?.profileImage) || '/images/default-avatar.png'}
                    alt={user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : 'User'}
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      // Silently handle the error by hiding the image
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : null}
                {/* Fallback initials - always present but only visible when image fails or doesn't exist */}
                <div className="h-10 w-10 rounded-full bg-white text-masonic-blue flex items-center justify-center shadow-md absolute inset-0" style={{ display: validateProfileImage(user?.profileImage) ? 'none' : 'flex' }}>
                  <span className="text-sm font-bold">{getInitials(user?.firstName, user?.lastName)}</span>
                </div>
              </div>
            </div>
            {isOpen && user && (
              <div className="ml-3">
                <p className="text-sm font-medium text-white">{user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : 'User'}</p>
                <p className="text-xs text-gray-300/80">{getRoleDisplay(user.role)}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}