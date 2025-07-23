'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CalendarIcon, UserGroupIcon, BellIcon, DocumentTextIcon, ChatBubbleLeftRightIcon, UserPlusIcon, EnvelopeIcon, UsersIcon, UserCircleIcon, BuildingOfficeIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import CreatePostWidget from '@/components/dashboard/CreatePostWidget';
import PostsList from '@/components/dashboard/PostsList';
import Image from 'next/image';

interface DashboardCardProps {
  title: string;
  value?: string;
  icon: React.ReactNode;
  bgColor?: string;
  onClick?: () => void;
  clickable?: boolean;
  customStyles?: string;
  titleStyles?: string;
  children?: React.ReactNode;
  href?: string;
}

// Smaller, more compact dashboard card
const DashboardCard = ({ 
  title, 
  value, 
  icon, 
  bgColor = 'bg-white', 
  onClick, 
  clickable = false, 
  customStyles, 
  titleStyles, 
  children,
  href
}: DashboardCardProps) => {
  const content = (
    <div
      className={`rounded-lg shadow-sm ${bgColor} p-4 flex items-center space-x-3 ${clickable ? 'cursor-pointer hover:shadow-md transition-shadow duration-200' : ''} ${customStyles || ''}`}
      onClick={clickable && onClick ? onClick : undefined}
    >
      <div className={`rounded-full ${bgColor === 'bg-masonic-blue' ? 'bg-white/20 text-white' : 'bg-blue-50'} p-2 flex-shrink-0`}>
        {icon}
      </div>
      <div>
        <p className={`text-sm font-medium ${titleStyles || 'text-gray-500'}`}>{title}</p>
        <p className={`text-lg font-semibold ${titleStyles ? 'text-white opacity-90' : 'text-gray-900'}`}>{value}</p>
      </div>
      {children}
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  
  return content;
};

const RecentAnnouncements = () => {
  const router = useRouter();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    fetchAnnouncements();
    // Get user role from session storage
    const role = sessionStorage.getItem('userRole');
    setUserRole(role);
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const token = sessionStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch('/api/announcements', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch announcements');
      }

      const data = await response.json();
      setAnnouncements(data.slice(0, 3)); // Show only the 3 most recent announcements
    } catch (err) {
      console.error('Error fetching announcements:', err);
      setError('Failed to load announcements');
    } finally {
      setLoading(false);
    }
  };

  // Get the appropriate announcements link based on user role
  const getAnnouncementsLink = () => {
    switch (userRole) {
      case 'SUPER_ADMIN':
        return '/dashboard/super-admin/announcements';
      case 'DISTRICT_ADMIN':
        return '/dashboard/district-admin/announcements';
      case 'LODGE_ADMIN':
        return '/dashboard/lodge-admin/announcements';
      default:
        return '/dashboard/announcements'; // Fallback for regular members
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Recent Announcements</h2>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Recent Announcements</h2>
        </div>
        <div className="text-red-600">{error}</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Recent Announcements</h2>
        <Link
          href={getAnnouncementsLink()}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          View all
        </Link>
      </div>
      {announcements.length === 0 ? (
        <p className="text-gray-500">No recent announcements</p>
      ) : (
        <div className="space-y-4">
          {announcements.map((announcement: any) => (
            <div key={announcement._id} className="border-b border-gray-200 pb-4 last:border-0 last:pb-0">
              <h3 className="font-medium text-gray-900">{announcement.title}</h3>
              <p className="mt-1 text-sm text-gray-600">{announcement.content}</p>
              <p className="mt-2 text-xs text-gray-500">
                {new Date(announcement.createdAt).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

interface Event {
  _id: string;
  title: string;
  date: string;
  time: string;
  location: string;
}

interface DashboardData {
  candidates: string;
  upcomingEvents: string;
  messages: string;
}

export default function Dashboard() {
  const router = useRouter();
  const [authError, setAuthError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);
  const [dashboardData, setDashboardData] = useState({
    members: '0',
    lodges: '0',
    candidates: '0',
    messages: '0',
    upcomingEvents: '0'
  });
  const [imageError, setImageError] = useState(false);
  const [lodgeName, setLodgeName] = useState('');
  const [events, setEvents] = useState<Event[]>([]);
  const [members, setMembers] = useState([]);
  const [lodges, setLodges] = useState([]);

  // Function to fetch unread messages count
  const fetchUnreadMessages = async () => {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (!token) return;

      const response = await fetch('/api/messages/unread', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setDashboardData(prev => ({
          ...prev,
          messages: data.count.toString()
        }));
      }
    } catch (error) {
      console.error('Error fetching unread messages:', error);
    }
  };

  // Check if user is authenticated and load user data
  useEffect(() => {
    const isAuthenticated = sessionStorage.getItem('isAuthenticated');
    if (!isAuthenticated) {
      router.push('/');
      return;
    }

    let isPolling = true;

    // Initial fetch of unread messages
    fetchUnreadMessages();

    // Set up polling interval for unread messages
    const pollInterval = setInterval(() => {
      if (isPolling) {
        fetchUnreadMessages();
      }
    }, 5000); // Poll every 5 seconds

    // Load user data from session storage
    const userDataStr = sessionStorage.getItem('user');
    
    if (userDataStr) {
      try {
        const parsedUserData = JSON.parse(userDataStr);
        console.log('Loaded user data:', parsedUserData);
        setUserData(parsedUserData);
        
        // Set lodge name if available
        if (parsedUserData.primaryLodge) {
          const lodgeName = typeof parsedUserData.primaryLodge === 'string' 
            ? parsedUserData.primaryLodge 
            : parsedUserData.primaryLodge.name;
          setLodgeName(lodgeName);
        }
      } catch (err) {
        console.error('Error parsing user data:', err);
        setAuthError('Error loading user data');
      }
    }

    // Add event listener for storage changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'user') {
        try {
          const newUserData = JSON.parse(e.newValue || '{}');
          console.log('Storage change - new user data:', newUserData);
          setUserData(newUserData);
        } catch (err) {
          console.error('Error parsing user data from storage change:', err);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    // Fetch dashboard data
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        setAuthError(null);

        const token = sessionStorage.getItem('token');
        if (!token) {
          console.log('No token found in session storage');
          router.push('/login');
          return;
        }

        // Log token details (safely)
        console.log('Token found:', {
          length: token.length,
          hasBearer: token.startsWith('Bearer '),
          preview: `${token.substring(0, 10)}...${token.substring(token.length - 10)}`
        });

        // Ensure token has Bearer prefix
        let authToken = token;
        if (!token.startsWith('Bearer ')) {
          authToken = `Bearer ${token}`;
          console.log('Added Bearer prefix to token');
        }

        // Get user data to determine which lodge's events to fetch
        const userData = sessionStorage.getItem('user');
        if (!userData) {
          console.log('No user data found');
          return;
        }

        const user = JSON.parse(userData);
        console.log('User data:', user);

        // Determine which lodge ID to use
        let lodgeId = null;
        if (user.primaryLodge?._id) {
          lodgeId = user.primaryLodge._id;
        } else if (user.primaryLodge) {
          lodgeId = user.primaryLodge;
        } else if (user.administeredLodges?.length > 0) {
          lodgeId = user.administeredLodges[0];
        }

        console.log('Using lodge ID for events:', lodgeId);

        // Fetch events only if we have a lodge ID
        if (lodgeId) {
          console.log('Fetching events for lodge:', lodgeId);
          const eventsResponse = await fetch(`/api/events?lodgeId=${lodgeId}`, {
            headers: {
              'Authorization': authToken,
              'Content-Type': 'application/json'
            }
          });

          if (eventsResponse.ok) {
            const eventsData = await eventsResponse.json();
            setEvents(eventsData);
            
            // Update dashboard data with events count
            setDashboardData(prev => ({
              ...prev,
              upcomingEvents: eventsData.length.toString()
            }));
          } else {
            const errorText = await eventsResponse.text();
            console.error('Failed to fetch events:', errorText);
            
            // Handle unauthorized response
            if (eventsResponse.status === 401) {
              console.log('Token invalid or expired, redirecting to login');
              sessionStorage.clear();
              router.push('/login');
              return;
            }
          }
        } else {
          console.log('No lodge ID available for fetching events');
          setEvents([]);
          setDashboardData(prev => ({
            ...prev,
            upcomingEvents: '0'
          }));
        }

        // Fetch other dashboard data...
        const [membersResponse, lodgesResponse, candidatesResponse] = await Promise.all([
          fetch('/api/members', {
            headers: {
              'Authorization': authToken,
              'Content-Type': 'application/json'
            }
          }),
          fetch('/api/lodges', {
            headers: {
              'Authorization': authToken,
              'Content-Type': 'application/json'
            }
          }),
          fetch('/api/candidates', {
            headers: {
              'Authorization': authToken,
              'Content-Type': 'application/json'
            }
          })
        ]);

        if (membersResponse.ok && lodgesResponse.ok && candidatesResponse.ok) {
          const [membersData, lodgesData, candidatesData] = await Promise.all([
            membersResponse.json(),
            lodgesResponse.json(),
            candidatesResponse.json()
          ]);
          setMembers(membersData);
          setLodges(lodgesData);
          setDashboardData(prev => ({
            ...prev,
            members: membersData.length.toString(),
            lodges: lodgesData.length.toString(),
            candidates: candidatesData.length.toString()
          }));
        } else {
          throw new Error('Failed to fetch dashboard data');
        }
      } catch (err) {
        console.error('Error in fetchDashboardData:', err);
        setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();

    // Cleanup function
    return () => {
      isPolling = false;
      clearInterval(pollInterval);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [router]);

  // Check user role and redirect if needed
  useEffect(() => {
    if (userData && !isLoading) {
      console.log('Checking user role for navigation:', userData.role);
      const userRole = userData.role;
      
      // Only redirect super admins
      if (userRole === 'SUPER_ADMIN') {
        console.log('Redirecting super admin to super-admin dashboard');
        router.push('/dashboard/super-admin');
        return;
      }
      
      // For lodge admins, ensure we stay on the main dashboard
      if (userRole === 'LODGE_ADMIN') {
        console.log('Lodge admin detected, staying on main dashboard');
      }
    }
  }, [userData, isLoading, router]);

  const handleLogout = () => {
    // Clear session storage
    sessionStorage.clear();
    // Redirect to main page
    router.push('/');
  };

  // Handle card click based on user role
  const handleEventsCardClick = () => {
    const userRole = sessionStorage.getItem('userRole');
    
    // Navigate to the appropriate events page based on role
    if (userRole === 'LODGE_ADMIN' || userRole === 'SUPER_ADMIN') {
      router.push('/dashboard/events/manage'); // Admin can manage events
    } else {
      router.push('/dashboard/events'); // Regular users can only view events
    }
  };

  // Handle members directory card click
  const handleMembersCardClick = () => {
    router.push('/dashboard/members');
  };

  // Handle documents card click
  const handleDocumentsCardClick = () => {
    router.push('/dashboard/documents');
  };

  // Handle messages card click
  const handleMessagesCardClick = () => {
    router.push('/dashboard/inbox');
  };

  // Handle candidates card click
  const handleCandidatesCardClick = () => {
    router.push('/dashboard/candidates');
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-900"></div>
      </div>
    );
  }

  if (authError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
          <svg className="h-16 w-16 text-red-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Authentication Required</h2>
          <p className="mb-4">{authError}</p>
          <button
            onClick={() => router.push('/login')}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  // Add check for userData
  if (!userData) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-900"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-3 py-4 space-y-3">
      {/* User Profile Picture Section */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-4">
          <div className="relative">
            {userData?.profileImage && !imageError ? (
              <Image
                src={userData.profileImage}
                alt="Profile"
                width={40}
                height={40}
                className="rounded-full"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <UserCircleIcon className="h-6 w-6 text-blue-600" />
              </div>
            )}
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-gray-900">{userData?.name}</span>
            {userData?.lodge && userData?.primaryLodgePosition && (
              <span className="text-xs text-gray-500">
                {userData.lodge} - {userData.primaryLodgePosition.replace(/_/g, ' ')}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Link 
            href="/dashboard/candidates"
            className="flex items-center space-x-2 bg-masonic-blue hover:bg-masonic-blue/90 text-white px-4 py-2 rounded-full shadow-md transition-all duration-200"
            onClick={handleCandidatesCardClick}
          >
            <UserGroupIcon className="w-5 h-5" />
            <span className="font-medium">Wall</span>
            {dashboardData.candidates !== '0' && (
              <span className="bg-white/20 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {dashboardData.candidates}
              </span>
            )}
          </Link>
        </div>
      </div>

      {/* Dashboard Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <DashboardCard
          title="Upcoming Events"
          value={dashboardData.upcomingEvents}
          icon={<CalendarIcon className="h-6 w-6 text-blue-600" />}
          bgColor="bg-white"
          clickable={true}
          onClick={handleEventsCardClick}
          href="/dashboard/events"
        />
        <DashboardCard
          title="Messages"
          value={dashboardData.messages}
          icon={<EnvelopeIcon className="h-6 w-6 text-blue-600" />}
          bgColor="bg-white"
          clickable={true}
          onClick={handleMessagesCardClick}
          href="/dashboard/inbox"
        />
        <DashboardCard
          title="Documents"
          value=""
          icon={<DocumentTextIcon className="h-6 w-6 text-blue-600" />}
          bgColor="bg-white"
          clickable={true}
          onClick={handleDocumentsCardClick}
          href="/dashboard/documents"
        />
        <DashboardCard
          title="Members Directory"
          value=""
          icon={<UsersIcon className="h-6 w-6 text-blue-600" />}
          bgColor="bg-white"
          clickable={true}
          onClick={handleMembersCardClick}
          href="/dashboard/members"
        />
        <DashboardCard
          title="Lodges"
          value=""
          icon={<BuildingOfficeIcon className="h-6 w-6 text-blue-600" />}
          bgColor="bg-white"
          clickable={true}
          onClick={() => router.push('/dashboard/lodges')}
          href="/dashboard/lodges"
        />
      </div>
      
      {/* Main content area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Posts column - takes 2/3 of the space */}
        <div className="lg:col-span-2 space-y-3">
          <CreatePostWidget />
          <PostsList />
        </div>
        
        {/* Right sidebar - takes 1/3 of the space */}
        <div className="space-y-3">
          {/* Lodge Admin Section */}
          {userData?.role === 'LODGE_ADMIN' && (
            <div className="bg-masonic-blue rounded-lg shadow-sm p-4">
              <div className="flex flex-col space-y-3">
                <div className="flex items-center space-x-3">
                  <BuildingOfficeIcon className="w-6 h-6 text-white" />
                  <div>
                    <h2 className="text-base font-medium text-white">Lodge Administration</h2>
                    <p className="text-sm text-white/80">You are a Lodge Administrator</p>
                  </div>
                </div>
                <p className="text-sm text-white/90">
                  As a Lodge Administrator, you have special privileges to manage your lodge's members, events, and settings. Click below to access your administrative dashboard.
                </p>
                <button
                  onClick={() => router.push('/dashboard/lodge-admin')}
                  className="w-full bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 flex items-center justify-center space-x-2"
                >
                  <span>Access Lodge Admin Dashboard</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          )}



          {/* Upcoming Events */}
          <div className="bg-white rounded-lg shadow-sm p-3">
            <h2 className="text-base font-medium text-gray-900 mb-2">Upcoming Events</h2>
            <div className="space-y-2">
              {events.length > 0 ? (
                events.map((event) => {
                  const eventDate = new Date(event.date);
                  return (
                    <div 
                      key={event._id} 
                      className="flex items-start space-x-3 p-2 hover:bg-gray-50 rounded-md cursor-pointer"
                      onClick={() => router.push('/dashboard/events')}
                    >
                      <div className="flex-shrink-0 w-12 h-12 bg-blue-50 rounded-md flex flex-col items-center justify-center">
                        <span className="text-sm font-medium text-blue-600">
                          {eventDate.toLocaleString('default', { month: 'short' }).toUpperCase()}
                        </span>
                        <span className="text-lg font-bold text-blue-600">{eventDate.getDate()}</span>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">{event.title}</h3>
                        <p className="text-xs text-gray-500">{event.time}</p>
                        <p className="text-xs text-gray-500">{event.location}</p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-gray-500 text-center py-2">No upcoming events</p>
              )}
              <button 
                className="w-full mt-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
                onClick={() => router.push('/dashboard/events')}
              >
                View All Events
              </button>
            </div>
          </div>

          {/* Recent Announcements */}
          <RecentAnnouncements />
        </div>
      </div>
    </div>
  );
} 