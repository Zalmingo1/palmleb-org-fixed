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
  HomeIcon,
  CalendarIcon,
  EnvelopeIcon,
  UsersIcon,
  ClipboardDocumentCheckIcon
} from '@heroicons/react/24/outline';
import Link from 'next/link';

// Import components from the regular user dashboard
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
}

// Admin dashboard stat card
const AdminCard = ({ title, value, icon, bgColor = 'bg-white', onClick, clickable = false }: AdminCardProps) => (
  <div 
    className={`rounded-xl shadow-sm ${bgColor} p-6 flex items-center space-x-4 ${clickable ? 'cursor-pointer hover:shadow-md transition-shadow duration-200' : ''}`}
    onClick={onClick}
  >
    <div className="rounded-full bg-blue-50 p-3 flex-shrink-0">
      {icon}
    </div>
    <div>
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <p className="text-2xl font-semibold text-gray-900">{value}</p>
    </div>
  </div>
);

// Admin action card
const AdminActionCard = ({ title, description, icon, href }: AdminActionCardProps) => (
  <a 
    href={href}
    className="block bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow duration-200"
  >
    <div className="flex items-start space-x-4">
      <div className="rounded-full bg-blue-50 p-3 flex-shrink-0">
        {icon}
      </div>
      <div>
        <h3 className="text-lg font-medium text-gray-900">{title}</h3>
        <p className="text-sm text-gray-500 mt-1">{description}</p>
      </div>
    </div>
  </a>
);

// Add a local DashboardCard component
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

// Add interface for activity items
interface ActivityItem {
  icon: React.FC<React.SVGProps<SVGSVGElement>>;
  title: string;
  description: string;
  time: string;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [authError, setAuthError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'user' | 'admin'>('user'); // Default to user tab

  useEffect(() => {
    // Check if user is authenticated using sessionStorage
    const isAuthenticated = sessionStorage.getItem('isAuthenticated') === 'true';
    const userRole = sessionStorage.getItem('userRole');
    
    if (!isAuthenticated) {
      setAuthError('You need to be logged in to view this page');
      setIsLoading(false);
      return;
    }
    
    // Check if user has admin role (LODGE_ADMIN only)
    if (userRole !== 'LODGE_ADMIN') {
      // If user is SUPER_ADMIN, redirect to super admin dashboard
      if (userRole === 'SUPER_ADMIN') {
        router.push('/dashboard/super-admin');
        return;
      }
      
      // Otherwise, show access denied
      setAuthError('You do not have permission to access the admin dashboard');
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
        // Mock admin data if not found in sessionStorage
        setUserData({
          name: 'Admin User',
          role: 'LODGE_ADMIN',
          lodge: 'District Lodge of Beirut',
          memberSince: 'January 2018'
        });
      }
    } catch (error) {
      console.error('Error parsing user data:', error);
      // Mock admin data as fallback
      setUserData({
        name: 'Admin User',
        role: 'LODGE_ADMIN',
        lodge: 'District Lodge of Beirut',
        memberSince: 'January 2018'
      });
    }
    
    setIsLoading(false);
  }, [router]);

  const handleLogout = () => {
    // Clear session storage
    sessionStorage.clear();
    // Redirect to main page
    router.push('/');
  };

  const handleEventsCardClick = () => {
    router.push('/dashboard/events/manage');
  };

  // Handle members directory card click
  const handleMembersCardClick = () => {
    router.push('/dashboard/members');
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

  // Mock data for admin dashboard
  const adminData = {
    totalLodges: '1',
    totalMembers: '245',
    newApplications: '18',
    pendingApprovals: '7',
    recentDocuments: '32'
  };

  // Mock data for recent activity
  const recentActivity: ActivityItem[] = [
    {
      icon: UserPlusIcon,
      title: 'New Member Added',
      description: 'John Smith was added to Palm Lodge #123',
      time: '2 hours ago'
    },
    {
      icon: DocumentTextIcon,
      title: 'Document Uploaded',
      description: 'Meeting minutes for January 2023 were uploaded',
      time: '1 day ago'
    },
    {
      icon: CalendarIcon,
      title: 'Event Created',
      description: 'Annual Charity Gala has been scheduled',
      time: '2 days ago'
    },
    {
      icon: UserGroupIcon,
      title: 'Member Role Updated',
      description: 'Michael Johnson was promoted to Secretary',
      time: '3 days ago'
    }
  ];

  // Admin action cards
  const adminActions = [
    {
      title: 'Manage Lodge',
      description: 'Edit lodge information and settings',
      icon: <BuildingLibraryIcon className="h-6 w-6 text-blue-600" />,
      href: '/dashboard/admin/lodge'
    },
    {
      title: 'Manage Users',
      description: 'Add, edit, or remove regular users',
      icon: <UserGroupIcon className="h-6 w-6 text-green-600" />,
      href: '/dashboard/admin/users'
    },
    {
      title: 'Content Management',
      description: 'Manage posts, events, and announcements',
      icon: <PencilSquareIcon className="h-6 w-6 text-purple-600" />,
      href: '/dashboard/events/manage'
    },
    {
      title: 'Lodge Settings',
      description: 'Configure lodge preferences and settings',
      icon: <Cog6ToothIcon className="h-6 w-6 text-gray-600" />,
      href: '/dashboard/admin/settings'
    },
    {
      title: 'Security Logs',
      description: 'Review login attempts and security events',
      icon: <ShieldCheckIcon className="h-6 w-6 text-red-600" />,
      href: '/dashboard/admin/security'
    },
    {
      title: 'Backup & Restore',
      description: 'Manage lodge data backups',
      icon: <ArrowPathIcon className="h-6 w-6 text-amber-600" />,
      href: '/dashboard/admin/backup'
    }
  ];

  return (
    <div className="max-w-7xl mx-auto">
      {/* Tabs */}
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
            Lodge Admin Dashboard
          </button>
        </div>
      </div>

      {/* Admin Dashboard Content */}
      {activeTab === 'admin' && (
        <div>
          <div className="mb-8 flex justify-between items-center">
            <h1 className="text-2xl font-semibold text-gray-900">Lodge Admin Dashboard</h1>
            <div className="flex space-x-2">
              <button 
                onClick={() => router.push('/dashboard/members?action=add')}
                className="px-4 py-2 bg-masonic-blue text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Add Member
              </button>
              <button 
                onClick={() => router.push('/dashboard/documents/upload')}
                className="px-4 py-2 bg-masonic-blue text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Upload Document
              </button>
            </div>
          </div>
          
          {/* Admin Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
            <AdminCard
              title="My Lodge"
              value={typeof userData?.lodge === 'object' ? userData?.lodge?.name : userData?.lodge || 'Not specified'}
              icon={<HomeIcon className="h-6 w-6 text-blue-500" />}
              clickable={false}
            />
            <AdminCard
              title="Total Members"
              value={adminData.totalMembers}
              icon={<UserGroupIcon className="h-6 w-6 text-blue-600" />}
              onClick={() => router.push('/dashboard/admin/members')}
              clickable={true}
            />
            <AdminCard
              title="New Applications"
              value={adminData.newApplications}
              icon={<ClipboardDocumentCheckIcon className="h-6 w-6 text-green-600" />}
              onClick={() => router.push('/dashboard/admin/applications')}
              clickable={true}
            />
            <AdminCard
              title="Pending Approvals"
              value={adminData.pendingApprovals}
              icon={<UserPlusIcon className="h-6 w-6 text-yellow-600" />}
              onClick={() => router.push('/dashboard/admin/approvals')}
              clickable={true}
            />
            <AdminCard
              title="Recent Documents"
              value={adminData.recentDocuments}
              icon={<DocumentTextIcon className="h-6 w-6 text-purple-600" />}
              onClick={() => router.push('/dashboard/admin/documents')}
              clickable={true}
            />
          </div>
          
          {/* Admin Actions */}
          <div className="mb-8">
            <h2 className="text-xl font-medium text-gray-900 mb-6">Administrative Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {adminActions.map((action, index) => (
                <AdminActionCard
                  key={index}
                  title={action.title}
                  description={action.description}
                  icon={action.icon}
                  href={action.href}
                />
              ))}
            </div>
          </div>

          <hr className="my-8 border-gray-200" />

          {/* Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            {/* Recent Activity */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h2>
                <div className="space-y-4">
                  {recentActivity.map((activity, index) => (
                    <div key={index} className="flex items-start">
                      <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <activity.icon className="h-6 w-6 text-blue-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                        <p className="text-sm text-gray-500">{activity.description}</p>
                        <p className="text-xs text-gray-400 mt-1">{activity.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div>
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h2>
                <div className="space-y-3">
                  <AdminActionCard
                    title="Add New Member"
                    description="Register a new member to your lodge"
                    icon={<UserPlusIcon className="h-6 w-6 text-white" />}
                    href="/dashboard/admin/members/add"
                  />
                  <AdminActionCard
                    title="Upload Document"
                    description="Share a new document with your lodge"
                    icon={<DocumentTextIcon className="h-6 w-6 text-white" />}
                    href="/dashboard/admin/documents/upload"
                  />
                  <AdminActionCard
                    title="Create Announcement"
                    description="Post a new announcement for all members"
                    icon={<PencilSquareIcon className="h-6 w-6 text-white" />}
                    href="/dashboard/admin/announcements/new"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* User Dashboard Content */}
      {activeTab === 'user' && (
        <div>
          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-gray-900 mb-2">My Dashboard</h1>
            <p className="text-gray-600">Welcome back, {userData?.name || 'User'}. Here's your personal dashboard.</p>
          </div>

          {/* Regular User Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
            <DashboardCard
              title="Upcoming Events"
              value="3"
              icon={<CalendarIcon className="h-5 w-5" />}
              bgColor="bg-white"
              clickable={true}
              onClick={() => router.push('/dashboard/events')}
              href="/dashboard/events"
            />
            <DashboardCard
              title="Messages"
              value="7"
              icon={<EnvelopeIcon className="h-5 w-5" />}
              bgColor="bg-white"
              clickable={true}
              onClick={() => router.push('/dashboard/inbox')}
              href="/dashboard/inbox"
            />
            <DashboardCard
              title="Documents"
              value="24"
              icon={<DocumentTextIcon className="h-5 w-5" />}
              bgColor="bg-white"
              clickable={true}
              onClick={() => router.push('/dashboard/documents')}
              href="/dashboard/documents"
            />
            <DashboardCard
              title="Members Directory"
              value=""
              icon={<UsersIcon className="h-5 w-5" />}
              bgColor="bg-white"
              clickable={true}
              onClick={() => router.push('/dashboard/members')}
              href="/dashboard/members"
            />
            <DashboardCard
              title="Candidates"
              value="2"
              icon={<UserGroupIcon className="w-5 h-5 text-white" />}
              bgColor="bg-masonic-blue"
              clickable={true}
              onClick={() => router.push('/dashboard/candidates')}
              href="/dashboard/candidates"
              customStyles="shadow-md relative overflow-hidden h-auto py-3"
              titleStyles="text-white"
            />
          </div>

          {/* Regular User Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            {/* Posts column - takes 2/3 of the space */}
            <div className="lg:col-span-2 space-y-3">
              <CreatePostWidget />
              <PostsList />
            </div>
            
            {/* Right sidebar - takes 1/3 of the space */}
            <div className="space-y-3">
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
                      <UserGroupIcon className="h-5 w-5 mr-2 inline-block" />
                      <span>Member Directory</span>
                    </a>
                  </li>
                  <li>
                    <a href="/dashboard/documents" className="text-sm text-blue-600 hover:text-blue-800">
                      <DocumentTextIcon className="h-5 w-5 mr-2 inline-block" />
                      <span>Document Library</span>
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