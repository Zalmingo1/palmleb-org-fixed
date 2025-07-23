'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  UserGroupIcon, 
  BuildingLibraryIcon, 
  DocumentCheckIcon,
  Cog6ToothIcon,
  ShieldCheckIcon,
  ArrowPathIcon,
  UserPlusIcon,
  DocumentTextIcon,
  PencilSquareIcon,
  GlobeAltIcon,
  CalendarIcon,
  EnvelopeIcon,
  UsersIcon,
  ClipboardDocumentCheckIcon,
  HomeIcon,
  BuildingOfficeIcon,
  UserCircleIcon
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import Image from 'next/image';

// Import components needed for the user view
import CreatePostWidget from '@/components/dashboard/CreatePostWidget';
import PostsList from '@/components/dashboard/PostsList';

interface AdminCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  bgColor?: string;
  onClick?: () => void;
  clickable?: boolean;
}

interface AdminActionCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  badge?: number | null;
}

// New smaller dashboard card component for regular user view
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
  customStyles = '',
  titleStyles = '',
  children,
  href
}: DashboardCardProps) => (
  <div
    className={`rounded-lg shadow-sm ${bgColor} p-3 flex items-center space-x-4 ${
      clickable ? 'cursor-pointer hover:shadow-md transition-shadow duration-200' : ''
    } ${customStyles}`}
    onClick={onClick}
  >
    <div className={`rounded-full ${bgColor === 'bg-masonic-blue' ? 'bg-white/20' : 'bg-blue-50'} p-2 flex-shrink-0`}>
      {icon}
    </div>
    <div>
      <p className={`text-sm font-medium ${titleStyles || 'text-gray-500'}`}>{title}</p>
      {value && <p className={`text-xl font-semibold ${titleStyles ? titleStyles : 'text-gray-900'}`}>{value}</p>}
      {children}
    </div>
    {href && (
      <div className="ml-auto">
        <Link href={href}>
          <ArrowPathIcon className={`h-4 w-4 ${titleStyles ? 'text-white/70' : 'text-gray-400'}`} />
        </Link>
      </div>
    )}
  </div>
);

// Super Admin dashboard stat card
const AdminCard = ({ title, value, icon, bgColor = 'bg-white', onClick, clickable = false }: AdminCardProps) => (
  <div 
    className={`rounded-xl shadow-sm ${bgColor} p-6 flex items-center space-x-4 ${clickable ? 'cursor-pointer hover:shadow-md transition-shadow duration-200' : ''}`}
    onClick={onClick}
  >
    <div className="rounded-full bg-purple-50 p-3 flex-shrink-0">
      {icon}
    </div>
    <div>
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <p className="text-2xl font-semibold text-gray-900">{value}</p>
    </div>
  </div>
);

// Super Admin action card
const AdminActionCard = ({ title, description, icon, href, badge }: AdminActionCardProps) => (
  <a 
    href={href}
    className="block bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow duration-200 relative"
  >
    {badge && (
      <div className="absolute top-4 right-4 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
        {badge}
      </div>
    )}
    <div className="flex items-start space-x-4">
      <div className="rounded-full bg-purple-50 p-3 flex-shrink-0">
        {icon}
      </div>
      <div>
        <h3 className="text-lg font-medium text-gray-900">{title}</h3>
        <p className="text-sm text-gray-500 mt-1">{description}</p>
      </div>
    </div>
  </a>
);

// Activity item interface
interface ActivityItem {
  icon: React.ElementType;
  title: string;
  description: string;
  time: string;
}

export default function SuperAdminDashboard() {
  const router = useRouter();
  const [authError, setAuthError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [lodges, setLodges] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'user' | 'admin'>('admin');
  const [districtStats, setDistrictStats] = useState({
    totalMembers: 0,
    activeMembers: 0,
    inactiveMembers: 0,
    lodges: 0
  });
  const [currentView, setCurrentView] = useState<'district_admin' | 'regular_user'>('regular_user');
  const [pendingPosts, setPendingPosts] = useState(3); // State to track pending posts count
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);

  useEffect(() => {
    // Check if user is authenticated using sessionStorage
    const isAuthenticated = sessionStorage.getItem('isAuthenticated') === 'true';
    const userRole = sessionStorage.getItem('userRole');
    
    if (!isAuthenticated) {
      setAuthError('You need to be logged in to view this page');
      setIsLoading(false);
      return;
    }
    
    // Check if user has super admin role
    if (userRole !== 'SUPER_ADMIN') {
      setAuthError('You do not have permission to access the super admin dashboard');
      setIsLoading(false);
      return;
    }
    
    // Get user data from sessionStorage
    try {
      const userDataString = sessionStorage.getItem('user');
      if (userDataString) {
        const parsedUserData = JSON.parse(userDataString);
        setUserData(parsedUserData);
      } else {
        // Mock super admin data if not found in sessionStorage
        setUserData({
          name: 'Super Admin',
          role: 'SUPER_ADMIN',
          lodge: 'Grand Lodge of Lebanon',
          memberSince: 'January 2015'
        });
      }

      // Fetch district statistics
      fetchDistrictStats();
      // Fetch recent activity
      fetchRecentActivity();
    } catch (error) {
      console.error('Error parsing user data:', error);
      // Mock super admin data as fallback
      setUserData({
        name: 'Super Admin',
        role: 'SUPER_ADMIN',
        lodge: 'Grand Lodge of Lebanon',
        memberSince: 'January 2015'
      });
      // Fetch district statistics even if user data parsing fails
      fetchDistrictStats();
      fetchRecentActivity();
    }
    
    setIsLoading(false);
  }, [router]);

  const fetchDistrictStats = async () => {
    try {
      // Get token from localStorage or sessionStorage
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // Fetch lodges data
      const lodgesResponse = await fetch('/api/lodges', { headers });
      if (!lodgesResponse.ok) {
        throw new Error(`Failed to fetch lodges: ${lodgesResponse.statusText}`);
      }
      const lodgesData = await lodgesResponse.json();
      console.log('Lodges data:', lodgesData);
      setLodges(Array.isArray(lodgesData) ? lodgesData : []);

      // Fetch members data
      const membersResponse = await fetch('/api/members', { headers });
      if (!membersResponse.ok) {
        throw new Error(`Failed to fetch members: ${membersResponse.statusText}`);
      }
      const membersData = await membersResponse.json();
      console.log('Members data:', membersData);

      // Handle both array and object response formats
      const membersArray = Array.isArray(membersData) ? membersData : membersData.members || [];
      console.log('Processed members array:', membersArray);

      // Calculate statistics
      const activeMembers = membersArray.filter((member: any) => member.status === 'active').length;
      const inactiveMembers = membersArray.filter((member: any) => member.status === 'inactive').length;

      setDistrictStats({
        totalMembers: membersArray.length,
        activeMembers: activeMembers,
        inactiveMembers: inactiveMembers,
        lodges: Array.isArray(lodgesData) ? lodgesData.length : 0
      });

      // In a real implementation, this would fetch pending posts count from an API
      // For now, we'll use a mock value
      setPendingPosts(3);

      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching district stats:', error);
      setIsLoading(false);
      
      // Set default values in case of error
      setDistrictStats({
        totalMembers: 0,
        activeMembers: 0,
        inactiveMembers: 0,
        lodges: 0
      });
    }
  };

  const fetchRecentActivity = async () => {
    try {
      setActivityLoading(true);
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('/api/activity?limit=10', { headers });
      if (!response.ok) {
        throw new Error(`Failed to fetch activity: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Activity data:', data);
      setRecentActivity(data.activities || []);
    } catch (error) {
      console.error('Error fetching recent activity:', error);
      // Fallback to empty array if API fails
      setRecentActivity([]);
    } finally {
      setActivityLoading(false);
    }
  };

  const handleLogout = () => {
    // Clear session storage
    sessionStorage.clear();
    // Redirect to main page
    router.push('/');
  };

  const handleTransferSuperAdmin = () => {
    // This would open a modal to transfer super admin status
    alert('This would open a modal to transfer super admin status to another admin user.');
  };

  const handleEventsCardClick = () => {
    router.push('/dashboard/events/manage');
  };

  // Handle members directory card click
  const handleMembersCardClick = () => {
    router.push('/dashboard/members');
  };

  // Handle lodges management card click
  const handleLodgesCardClick = () => {
    router.push('/dashboard/super-admin/lodges');
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-900"></div>
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
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
          <p className="mb-4">{authError}</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Mock data for super admin dashboard
  const adminData = {
    totalLodges: '24',
    totalMembers: '1,245',
    totalAdmins: '36',
    newApplications: '18',
    systemHealth: '98%'
  };

  // Super Admin action cards
  const adminActions = [
    {
      title: 'Posts Management',
      description: 'Review and approve member posts',
      icon: <DocumentTextIcon className="h-6 w-6 text-blue-600" />,
      href: '/dashboard/super-admin/posts',
      badge: pendingPosts > 0 ? pendingPosts : null
    },
    {
      title: 'Manage Members',
      description: 'View, edit, and create members with all details',
      icon: <UserGroupIcon className="h-6 w-6 text-purple-600" />,
      href: '/dashboard/super-admin/members'
    },
    {
      title: 'Manage Candidates',
      description: 'View and manage candidate applications',
      icon: <UserPlusIcon className="h-6 w-6 text-green-600" />,
      href: '/dashboard/super-admin/candidates'
    },
    {
      title: 'Manage Lodges',
      description: 'Create, edit, or manage lodge information',
      icon: <BuildingLibraryIcon className="h-6 w-6 text-purple-600" />,
      href: '/dashboard/super-admin/lodges'
    },
    {
      title: 'Manage Admins',
      description: 'Create and manage lodge admin accounts',
      icon: <UserGroupIcon className="h-6 w-6 text-green-600" />,
      href: '/dashboard/super-admin/admins'
    },
    {
      title: 'Manage Events',
      description: 'Create and manage organization events',
      icon: <PencilSquareIcon className="h-6 w-6 text-purple-600" />,
      href: '/dashboard/events/manage'
    },
    {
      title: 'Manage Announcements',
      description: 'Create and manage organization-wide announcements',
      icon: <DocumentTextIcon className="h-6 w-6 text-orange-600" />,
      href: '/dashboard/super-admin/announcements'
    },
    {
      title: 'Upload Documents',
      description: 'Share new documents with all members',
      icon: <DocumentTextIcon className="h-6 w-6 text-indigo-600" />,
      href: '/dashboard/documents/upload'
    }
  ];

  // Helper function to get icon component based on icon name
  const getIconComponent = (iconName: string) => {
    switch (iconName) {
      case 'UserPlusIcon':
        return UserPlusIcon;
      case 'DocumentTextIcon':
        return DocumentTextIcon;
      case 'CalendarIcon':
        return CalendarIcon;
      case 'UserGroupIcon':
        return UserGroupIcon;
      default:
        return DocumentTextIcon;
    }
  };

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Super Admin header with notification and role switcher */}
      <div className="mb-8">
        <div className="bg-purple-50 border-l-4 border-purple-500 p-4 mb-6 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-purple-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-purple-700">
                You are logged in as a Super Admin with full system access. Changes made here will affect the entire organization.
              </p>
            </div>
          </div>
        </div>
        
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Super Admin Dashboard</h1>
          </div>
          <div className="space-x-4 flex">
            <button
              onClick={handleTransferSuperAdmin}
              className="px-4 py-2 bg-purple-50 text-purple-600 rounded-md hover:bg-purple-100 transition-colors"
            >
              Transfer Admin Status
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-50 text-red-600 rounded-md hover:bg-red-100 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Tabs for switching between Admin and User views */}
      <div className="mb-6 border-b border-gray-200">
        <div className="flex space-x-8">
          <button
            onClick={() => setActiveTab('user')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'user'
                ? 'border-masonic-blue text-masonic-blue'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            My Dashboard
          </button>
          <button
            onClick={() => setActiveTab('admin')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'admin'
                ? 'border-masonic-blue text-masonic-blue'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Super Admin
          </button>
        </div>
      </div>

      {/* District Admin Content */}
      {activeTab === 'admin' && (
        <div>
          {/* First row: Stats overview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6 mb-8">
            <AdminCard
              title="Total Members"
              value={districtStats.totalMembers.toString()}
              icon={<UserGroupIcon className="h-8 w-8 text-blue-600" />}
              bgColor="bg-blue-50"
              clickable={false}
            />
            <AdminCard
              title="Total Lodges"
              value={(districtStats.lodges !== undefined ? districtStats.lodges : 0).toString()}
              icon={<BuildingLibraryIcon className="h-8 w-8 text-purple-600" />}
              bgColor="bg-purple-50"
              clickable={false}
            />
          </div>
          
          {/* Second row: Actions */}
          <div className="mb-8">
            <h2 className="text-xl font-medium text-gray-900 mb-6">Administrative Actions</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {adminActions.map((action, index) => (
                <AdminActionCard
                  key={index}
                  title={action.title}
                  description={action.description}
                  icon={action.icon}
                  href={action.href}
                  badge={action.badge}
                />
              ))}
            </div>
          </div>

          <hr className="my-8 border-gray-200" />

          {/* Third row: Recent activity */}
          <div className="mb-8">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-medium text-gray-900">Recent Activity</h2>
                <button
                  onClick={fetchRecentActivity}
                  disabled={activityLoading}
                  className="text-sm text-blue-600 hover:text-blue-800 disabled:text-gray-400"
                >
                  {activityLoading ? 'Refreshing...' : 'Refresh'}
                </button>
              </div>
              {activityLoading ? (
                <div className="flex justify-center items-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-900"></div>
                </div>
              ) : (
              <div className="space-y-4">
                  {recentActivity.length === 0 ? (
                    <p className="text-gray-500 text-center">No recent activity found.</p>
                  ) : (
                    recentActivity.map((activity, index) => {
                      const IconComponent = getIconComponent(activity.icon);
                      return (
                  <div key={index} className="flex items-start">
                    <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <IconComponent className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                      <p className="text-sm text-gray-500">{activity.description}</p>
                            <p className="text-xs text-gray-400 mt-1">{activity.timeAgo}</p>
                    </div>
                  </div>
                      );
                    })
                  )}
              </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* User Dashboard Content */}
      {activeTab === 'user' && (
        <div className="container mx-auto px-3 py-4 space-y-3">
          {/* User Profile Picture Section */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <div className="relative">
                {userData?.profileImage ? (
                  <Image
                    src={userData.profileImage}
                    alt="Profile"
                    width={40}
                    height={40}
                    className="rounded-full"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <UserCircleIcon className="h-6 w-6 text-blue-600" />
                  </div>
                )}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-gray-900">{userData?.name || 'Super Admin'}</span>
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
              >
                <UserGroupIcon className="w-5 h-5" />
                <span className="font-medium">Wall</span>
              </Link>
            </div>
          </div>

          {/* Dashboard Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
            <DashboardCard
              title="Upcoming Events"
              value="3"
              icon={<CalendarIcon className="h-6 w-6 text-blue-600" />}
              bgColor="bg-white"
              clickable={true}
              onClick={() => router.push('/dashboard/events')}
              href="/dashboard/events"
            />
            <DashboardCard
              title="Messages"
              value="7"
              icon={<EnvelopeIcon className="h-6 w-6 text-blue-600" />}
              bgColor="bg-white"
              clickable={true}
              onClick={() => router.push('/dashboard/inbox')}
              href="/dashboard/inbox"
            />
            <DashboardCard
              title="Documents"
              value="24"
              icon={<DocumentTextIcon className="h-6 w-6 text-blue-600" />}
              bgColor="bg-white"
              clickable={true}
              onClick={() => router.push('/dashboard/documents')}
              href="/dashboard/documents"
            />
            <DashboardCard
              title="Members Directory"
              value=""
              icon={<UsersIcon className="h-6 w-6 text-blue-600" />}
              bgColor="bg-white"
              clickable={true}
              onClick={() => router.push('/dashboard/members')}
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
              {/* Super Admin Section */}
              <div className="bg-purple-600 rounded-lg shadow-sm p-4">
                <div className="flex flex-col space-y-3">
                  <div className="flex items-center space-x-3">
                    <UserCircleIcon className="w-6 h-6 text-white" />
                    <div>
                      <h2 className="text-base font-medium text-white">Super Administration</h2>
                      <p className="text-sm text-white/80">You are a Super Administrator</p>
                    </div>
                  </div>
                  <p className="text-sm text-white/90">
                    As a Super Administrator, you have full system access to manage all lodges, members, and system settings. Click below to access your administrative dashboard.
                  </p>
                  <button
                    onClick={() => setActiveTab('admin')}
                    className="w-full bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 flex items-center justify-center space-x-2"
                  >
                    <span>Access Super Admin Dashboard</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Upcoming Events */}
              <div className="bg-white rounded-lg shadow-sm p-3">
                <h2 className="text-base font-medium text-gray-900 mb-2">Upcoming Events</h2>
                <div className="space-y-2">
                  <p className="text-sm text-gray-500 text-center py-2">No upcoming events</p>
                  <button 
                    className="w-full mt-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
                    onClick={() => router.push('/dashboard/events')}
                  >
                    View All Events
                  </button>
                </div>
              </div>

              {/* Recent Announcements */}
              <div className="bg-white rounded-lg shadow-sm p-3">
                <h2 className="text-base font-medium text-gray-900 mb-2">Recent Announcements</h2>
                <div className="space-y-2">
                  <p className="text-sm text-gray-500 text-center py-2">No recent announcements</p>
                  <button 
                    className="w-full mt-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
                    onClick={() => router.push('/dashboard/super-admin/announcements')}
                  >
                    View All Announcements
                  </button>
                </div>
              </div>

              {/* User profile card */}
              <div className="bg-white rounded-lg shadow-sm p-3">
                <h2 className="text-base font-medium text-gray-900 mb-2">Your Profile</h2>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Lodge:</span>
                    <span className="text-gray-900 font-medium">
                      {typeof userData?.lodge === 'object'
                        ? userData?.lodge?.name
                        : userData?.lodge || 'Not specified'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Role:</span>
                    <span className="text-gray-900 font-medium">
                      {userData?.role === 'LODGE_MEMBER'
                        ? 'Regular Member'
                        : userData?.role === 'DISTRICT_ADMIN'
                          ? 'District Admin'
                          : userData?.role === 'SUPER_ADMIN'
                            ? 'Super Admin'
                          : userData?.role || 'Member'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Member Since:</span>
                    <span className="text-gray-900 font-medium">{userData?.memberSince || 'Not specified'}</span>
                  </div>
                </div>
              </div>
              
              {/* Quick links */}
              <div className="bg-white rounded-lg shadow-sm p-3">
                <h2 className="text-base font-medium text-gray-900 mb-2">Quick Links</h2>
                <ul className="space-y-1">
                  <li>
                    <a href="/dashboard/events" className="text-sm text-blue-600 hover:text-blue-800">
                      <CalendarIcon className="h-5 w-5 mr-2 inline-block" />
                      <span>View All Events</span>
                    </a>
                  </li>
                  <li>
                    <a href="/dashboard/members" className="text-sm text-blue-600 hover:text-blue-800">
                      <UsersIcon className="h-5 w-5 mr-2 inline-block" />
                      <span>Members Directory</span>
                    </a>
                  </li>
                  <li>
                    <a href="/dashboard/documents" className="text-sm text-blue-600 hover:text-blue-800">
                      <DocumentTextIcon className="h-5 w-5 mr-2 inline-block" />
                      <span>Document Library</span>
                    </a>
                  </li>
                  <li>
                    <a href="/dashboard/profile" className="text-sm text-blue-600 hover:text-blue-800">
                      <UserGroupIcon className="h-5 w-5 mr-2 inline-block" />
                      <span>Edit Your Profile</span>
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 