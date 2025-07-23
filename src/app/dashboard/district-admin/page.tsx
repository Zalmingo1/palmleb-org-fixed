'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  UserGroupIcon, 
  BuildingLibraryIcon, 
  DocumentTextIcon, 
  CalendarIcon,
  ChartBarIcon,
  CogIcon,
  UserIcon,
  DocumentCheckIcon,
  PencilSquareIcon,
  GlobeAltIcon,
  EnvelopeIcon,
  UsersIcon,
  ClipboardDocumentCheckIcon,
  HomeIcon,
  BuildingOfficeIcon,
  ArrowPathIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';
import Link from 'next/link';

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



// District Admin dashboard stat card
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

// District Admin action card
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

export default function DistrictAdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'admin'>('admin');
  const [districtStats, setDistrictStats] = useState({
    totalMembers: 0,
    activeMembers: 0,
    inactiveMembers: 0,
    lodges: 0
  });
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferMessage, setTransferMessage] = useState('');
  const [districtMembers, setDistrictMembers] = useState<any[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  
  useEffect(() => {
    // Get user data from session storage
    const userData = sessionStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
    
    // Fetch district statistics
    fetchDistrictStats();
    
    setIsLoading(false);
  }, []);

  const fetchDistrictStats = async () => {
    try {
      const token = sessionStorage.getItem('token');
      const response = await fetch('/api/stats', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setDistrictStats({
          totalMembers: data.totalMembers || 0,
          activeMembers: data.activeMembers || 0,
          inactiveMembers: data.inactiveMembers || 0,
          lodges: data.totalLodges || 0
        });
      }
    } catch (error) {
      console.error('Error fetching district stats:', error);
    }
  };



  const handleLogout = () => {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('isAuthenticated');
    sessionStorage.removeItem('userRole');
    router.replace('/');
  };

  const fetchDistrictMembers = async () => {
    setIsLoadingMembers(true);
    try {
      const token = sessionStorage.getItem('token');
      const response = await fetch('/api/lodges/681e751c2b05d4bc4be15dfc/members', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        // The API returns { members: [...] }, so we need to access data.members
        const members = data.members || [];
        
        // Remove duplicates based on email and prioritize unified user records
        const uniqueMembers = members.reduce((acc: any[], member: any) => {
          const existingIndex = acc.findIndex(m => m.email === member.email);
          if (existingIndex === -1) {
            acc.push(member);
          } else {
            // If this member has more complete data, replace the existing one
            const existing = acc[existingIndex];
            if (member.name && !existing.name) {
              acc[existingIndex] = member;
            }
          }
          return acc;
        }, []);

        // Show all eligible members (all members of the District Grand Lodge of Syria-Lebanon)
        const eligibleMembers = uniqueMembers;
        
        setDistrictMembers(eligibleMembers);
      } else {
        console.error('Failed to fetch district members');
      }
    } catch (error) {
      console.error('Error fetching district members:', error);
    } finally {
      setIsLoadingMembers(false);
    }
  };

  const handleTransferAdmin = async () => {
    if (!selectedMemberId) {
      setTransferMessage('Please select a member');
      return;
    }

    setIsTransferring(true);
    setTransferMessage('');

    try {
      const token = sessionStorage.getItem('token');
      const response = await fetch('/api/users/transfer-admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          newAdminId: selectedMemberId
        })
      });

      const data = await response.json();

      if (response.ok) {
        setTransferMessage('✅ Admin privileges transferred successfully! You will be logged out.');
        setTimeout(() => {
          handleLogout();
        }, 2000);
      } else {
        console.error('Transfer error response:', data);
        setTransferMessage(`❌ Error: ${data.error || 'Failed to transfer admin privileges'}`);
        if (data.debug) {
          console.log('Debug info:', data.debug);
        }
      }
    } catch (error) {
      setTransferMessage('❌ Error: Failed to transfer admin privileges');
    } finally {
      setIsTransferring(false);
    }
  };

  // District admin actions
  const adminActions = [
    {
      title: 'Manage Members',
      description: 'View and manage all district members',
      icon: <UsersIcon className="h-6 w-6 text-blue-600" />,
      href: '/dashboard/district-admin/members'
    },
    {
      title: 'Manage Lodges',
      description: 'Create and manage district lodges',
      icon: <BuildingOfficeIcon className="h-6 w-6 text-purple-600" />,
      href: '/dashboard/district-admin/lodges'
    },
    {
      title: 'Posts Management',
      description: 'Review and approve member posts',
      icon: <DocumentCheckIcon className="h-6 w-6 text-green-600" />,
      href: '/dashboard/district-admin/posts'
    },
    {
      title: 'Manage Events',
      description: 'Create and manage district events',
      icon: <CalendarIcon className="h-6 w-6 text-orange-600" />,
      href: '/dashboard/district-admin/events'
    },
    {
      title: 'Manage Announcements',
      description: 'Create and manage district announcements',
      icon: <DocumentTextIcon className="h-6 w-6 text-indigo-600" />,
      href: '/dashboard/district-admin/announcements'
    },
    {
      title: 'Upload Documents',
      description: 'Share documents with district members',
      icon: <DocumentTextIcon className="h-6 w-6 text-red-600" />,
      href: '/dashboard/documents/upload'
    }
  ];

  // Helper function to get icon component based on icon name
  const getIconComponent = (iconName: string) => {
    switch (iconName) {
      case 'UserPlusIcon':
        return UserGroupIcon;
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
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  if (!user) {
    router.push('/login');
    return null;
  }
  
  return (
    <div className="container mx-auto px-4 py-6">
      {/* District Admin header with notification */}
      <div className="mb-8">
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <ShieldCheckIcon className="h-5 w-5 text-blue-500" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-700">
                You are logged in as a District Admin with district-level access. Changes made here will affect your district.
        </p>
      </div>
          </div>
        </div>
        
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">District Admin Dashboard</h1>
          </div>
          <div className="space-x-4 flex">
            <button
              onClick={() => {
                setShowTransferModal(true);
                fetchDistrictMembers();
              }}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors font-medium shadow-sm border border-red-700"
            >
              ⚠️ Transfer Admin Privileges
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

      {/* District Admin Header */}
      <div className="mb-6">
        <h2 className="text-lg font-medium text-gray-900">District Administration</h2>
      </div>
      
      {/* District Admin Content */}
      <div>
        {/* First row: Stats overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6 mb-8">
          <AdminCard
            title="District Members"
            value={districtStats.totalMembers.toString()}
            icon={<UserGroupIcon className="h-8 w-8 text-blue-600" />}
            bgColor="bg-blue-50"
            clickable={false}
          />
          <AdminCard
            title="District Lodges"
            value={districtStats.lodges.toString()}
            icon={<BuildingLibraryIcon className="h-8 w-8 text-purple-600" />}
            bgColor="bg-purple-50"
            clickable={false}
          />
        </div>
        
        {/* Second row: Actions */}
        <div className="mb-8">
          <h2 className="text-xl font-medium text-gray-900 mb-6">District Administrative Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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

        {/* Transfer Admin Modal */}
        {showTransferModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Transfer Admin Privileges</h3>
              
              {/* Warning Notification */}
              <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-4 rounded-md">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">⚠️ DANGER: Admin Transfer</h3>
                    <div className="mt-2 text-sm text-red-700">
                      <p>• You will lose all admin privileges immediately</p>
                      <p>• You will be logged out automatically</p>
                      <p>• This action cannot be undone</p>
                      <p>• Only transfer to a trusted member</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select New District Admin
                </label>
                {isLoadingMembers ? (
                  <div className="flex justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-600"></div>
                  </div>
                ) : (
                  <select
                    value={selectedMemberId}
                    onChange={(e) => setSelectedMemberId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                  >
                    <option value="" className="text-gray-900">Select a member...</option>
                    {districtMembers.map((member, index) => {
                      // Handle different name formats
                      let displayName = member.name;
                      if (!displayName && (member.firstName || member.lastName)) {
                        displayName = `${member.firstName || ''} ${member.lastName || ''}`.trim();
                      }
                      if (!displayName) {
                        displayName = member.email || 'Unknown Member';
                      }
                      
                      return (
                        <option key={`member-${member._id}-${index}`} value={member._id} className="text-gray-900">
                          {displayName}
                        </option>
                      );
                    })}
                  </select>
                )}
                {districtMembers.length === 0 && !isLoadingMembers && (
                  <p className="text-sm text-gray-500 mt-2">
                    No eligible members found. Only district members can become district admins.
                  </p>
                )}
              </div>

              {transferMessage && (
                <div className={`mb-4 p-3 rounded-md ${
                  transferMessage.includes('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                }`}>
                  {transferMessage}
                </div>
              )}

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowTransferModal(false);
                    setSelectedMemberId('');
                    setTransferMessage('');
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  disabled={isTransferring}
                >
                  Cancel
                </button>
                <button
                  onClick={handleTransferAdmin}
                  disabled={isTransferring || !selectedMemberId}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 font-medium border border-red-700"
                >
                  {isTransferring ? 'Transferring...' : '⚠️ Transfer Admin'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 