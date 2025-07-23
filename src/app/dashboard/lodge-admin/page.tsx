'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { 
  UserGroupIcon, 
  BuildingLibraryIcon, 
  DocumentTextIcon, 
  CalendarIcon,
  CogIcon,
  UserIcon,
  EnvelopeIcon,
  ClipboardDocumentListIcon,
  UserPlusIcon,
  BellIcon,
  DocumentCheckIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';

interface AdminCard {
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
  color: string;
}

interface Activity {
  id: string;
  type: string;
  description: string;
  timestamp: string;
  user: string;
}

interface UpcomingEvent {
  id: string;
  title: string;
  date: string;
  location: string;
  description?: string;
}

interface LodgeDetails {
  _id: string;
  name: string;
  number?: string;
  location?: string;
}

interface LodgeMember {
  _id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  position: string;
  profileImage?: string;
}

export default function LodgeAdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState<Activity[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);
  const [lodgeDetails, setLodgeDetails] = useState<LodgeDetails | null>(null);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferMessage, setTransferMessage] = useState('');
  const [lodgeMembers, setLodgeMembers] = useState<LodgeMember[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [currentLodgeId, setCurrentLodgeId] = useState<string>('');
  
  const fetchLodgeMembers = async (lodgeId: string) => {
    try {
      setIsLoadingMembers(true);
      const token = sessionStorage.getItem('token');
      if (!token) {
        console.error('No token found in session storage');
        return;
      }

      const response = await fetch(`/api/lodges/${lodgeId}/members`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache'
        }
      });

      if (response.ok) {
        const data = await response.json();
        // Filter out the current admin and only show LODGE_MEMBER role members
        const eligibleMembers = data.filter((member: LodgeMember) => 
          member.role === 'LODGE_MEMBER' && member._id !== user?._id
        );
        setLodgeMembers(eligibleMembers);
      } else {
        console.error('Failed to fetch lodge members:', response.status);
      }
    } catch (error) {
      console.error('Error fetching lodge members:', error);
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
      const response = await fetch('/api/users/transfer-lodge-admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          newAdminId: selectedMemberId,
          lodgeId: currentLodgeId
        })
      });

      const data = await response.json();

      if (response.ok) {
        setTransferMessage('✅ Lodge admin privileges transferred successfully! You will be logged out.');
        setTimeout(() => {
          // Clear session storage and redirect to login
          sessionStorage.clear();
          router.push('/login');
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

  const fetchLodgeDetails = async (lodgeId: string) => {
    try {
      const token = sessionStorage.getItem('token');
      if (!token) {
        console.error('No token found in session storage');
        return;
      }

      const response = await fetch(`/api/lodges/${lodgeId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setLodgeDetails(data);
      } else {
        console.error('Failed to fetch lodge details:', response.status);
      }
    } catch (error) {
      console.error('Error fetching lodge details:', error);
    }
  };

  const fetchRecentActivity = async (lodgeId: string) => {
    console.log('Starting fetchRecentActivity with lodgeId:', lodgeId);
    try {
      const token = sessionStorage.getItem('token');
      if (!token) {
        console.error('No token found in session storage');
        return;
      }

      const url = `/api/lodges/${lodgeId}/activity`;
      console.log('Making request to:', url);

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache'
        }
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const text = await response.text();
        console.error('Error response text:', text);
        throw new Error(`Failed to fetch recent activity: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Received activity data:', data);
      setRecentActivity(data.activities || []);
    } catch (error) {
      console.error('Error in fetchRecentActivity:', error);
    }
  };

  useEffect(() => {
    console.log('=== Starting useEffect ===');
    
    const fetchUserData = async () => {
      try {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        if (!token) {
          console.log('No token found, redirecting to login');
          router.push('/login');
          return;
        }

        // Fetch user data from API to get lodgeRoles
        const response = await fetch('/api/members/me', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          console.log('Failed to fetch user data, redirecting to dashboard');
          router.push('/dashboard');
          return;
        }

        const parsedUser = await response.json();
        console.log('Fetched user data:', {
          id: parsedUser._id,
          name: parsedUser.name,
          role: parsedUser.role,
          primaryLodge: parsedUser.primaryLodge,
          administeredLodges: parsedUser.administeredLodges,
          lodgeRoles: parsedUser.lodgeRoles
        });

        // Verify user is a lodge admin (check main role or lodgeRoles)
        const hasLodgeAdminRole = parsedUser.role === 'LODGE_ADMIN' ||
                                 (parsedUser.lodgeRoles && Object.values(parsedUser.lodgeRoles).includes('LODGE_ADMIN'));
        
        if (!hasLodgeAdminRole) {
          console.log('User is not a lodge admin, redirecting to dashboard');
          router.push('/dashboard');
          return;
        }
        setUser(parsedUser);
        
        // Fetch dashboard data
        let lodgeId;
        if (parsedUser.administeredLodges && parsedUser.administeredLodges.length > 0) {
          lodgeId = parsedUser.administeredLodges[0];
          console.log('Using administered lodge ID:', lodgeId);
        } else if (parsedUser.primaryLodge) {
          // Handle both string and object formats of primaryLodge
          if (typeof parsedUser.primaryLodge === 'string') {
            lodgeId = parsedUser.primaryLodge;
            console.log('Using string primary lodge ID:', lodgeId);
          } else if (parsedUser.primaryLodge._id) {
            lodgeId = parsedUser.primaryLodge._id;
            console.log('Using object primary lodge ID:', lodgeId);
          } else {
            console.error('Invalid primaryLodge format:', parsedUser.primaryLodge);
          }
        } else if (parsedUser.lodgeRoles) {
          // Find the first lodge where user has LODGE_ADMIN role
          const lodgeAdminEntry = Object.entries(parsedUser.lodgeRoles).find(([lodgeId, role]) => role === 'LODGE_ADMIN');
          if (lodgeAdminEntry) {
            lodgeId = lodgeAdminEntry[0];
            console.log('Using lodge ID from lodgeRoles:', lodgeId);
          }
        }
        
        if (lodgeId) {
          console.log('Final lodge ID being used:', lodgeId);
          setCurrentLodgeId(lodgeId);
          fetchLodgeDetails(lodgeId);
          fetchRecentActivity(lodgeId);
          fetchUpcomingEvents(lodgeId);
        } else {
          console.error('No valid lodge ID found in user data');
          console.log('Debug info:', {
            administeredLodges: parsedUser.administeredLodges,
            primaryLodge: parsedUser.primaryLodge,
            lodgeRoles: parsedUser.lodgeRoles
          });
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        router.push('/dashboard');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [router]);

  const fetchUpcomingEvents = async (lodgeId: string) => {
    try {
      const response = await fetch(`/api/lodges/${lodgeId}/events/upcoming`);
      if (response.ok) {
        const data = await response.json();
        setUpcomingEvents(data);
      }
    } catch (error) {
      console.error('Error fetching upcoming events:', error);
    }
  };

  const handleAddNewEvent = () => {
    console.log('handleAddNewEvent called');
    console.log('Current user:', user);
    
    if (!user) {
      console.error('No user data available');
      return;
    }

    // Get the lodge ID from either administeredLodges or primaryLodge
    let lodgeId;
    if (user.administeredLodges && user.administeredLodges.length > 0) {
      lodgeId = user.administeredLodges[0];
      console.log('Using first administered lodge ID:', lodgeId);
    } else if (user.primaryLodge) {
      // Handle both string and object formats of primaryLodge
      lodgeId = user.primaryLodge._id || user.primaryLodge;
      console.log('Using primary lodge ID:', lodgeId);
    }

    if (lodgeId) {
      const path = `/dashboard/events/manage?lodgeId=${lodgeId}`;
      console.log('Navigating to:', path);
      window.location.href = path;
    } else {
      console.error('No lodge ID found in user data');
      alert('Unable to find lodge information. Please contact support.');
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
  
  // Dashboard cards for lodge admin functions
  const adminCards: AdminCard[] = [
    {
      title: 'Edit Lodge',
      description: 'Edit lodge information and settings',
      icon: <BuildingLibraryIcon className="h-8 w-8 text-blue-500" />,
      onClick: () => {
        // Get the lodge ID from either administeredLodges or primaryLodge
        let lodgeId;
        if (user.administeredLodges && user.administeredLodges.length > 0) {
          lodgeId = user.administeredLodges[0];
        } else if (user.primaryLodge) {
          lodgeId = typeof user.primaryLodge === 'string' ? user.primaryLodge : user.primaryLodge._id;
        }

        if (lodgeId) {
          router.push(`/dashboard/lodge-admin/${lodgeId}/edit`);
        } else {
          alert('Unable to find lodge information. Please contact support.');
        }
      },
      color: 'bg-blue-50'
    },
    {
      title: 'Manage Members',
      description: 'View and manage members in your lodge',
      icon: <UserGroupIcon className="h-8 w-8 text-indigo-500" />,
      onClick: () => {
        console.log('Manage Members clicked');
        console.log('Full user data:', JSON.stringify(user, null, 2));
        console.log('Administered lodges:', user.administeredLodges);
        console.log('Primary lodge:', user.primaryLodge);
        
        // Get the lodge ID from either administeredLodges or primaryLodge
        let lodgeId;
        if (user.administeredLodges && user.administeredLodges.length > 0) {
          lodgeId = user.administeredLodges[0];
          console.log('Using first administered lodge ID:', lodgeId);
        } else if (user.primaryLodge) {
          // If no administered lodges, use primary lodge
          lodgeId = typeof user.primaryLodge === 'string' ? user.primaryLodge : user.primaryLodge._id;
          console.log('Using primary lodge ID:', lodgeId);
        }

        if (lodgeId) {
          const path = `/dashboard/lodge-admin/${lodgeId}/members`;
          console.log('Navigating to:', path);
          router.replace(path);
        } else {
          console.error('No lodge ID found in user data');
          // Show an error message to the user
          alert('Unable to find lodge information. Please contact support.');
        }
      },
      color: 'bg-indigo-50'
    },
    {
      title: 'Manage Candidates',
      description: 'View and manage candidates for your lodge',
      icon: <UserPlusIcon className="h-8 w-8 text-green-500" />,
      onClick: () => {
        // Get the lodge ID from either administeredLodges or primaryLodge
        let lodgeId;
        if (user.administeredLodges && user.administeredLodges.length > 0) {
          lodgeId = user.administeredLodges[0];
        } else if (user.primaryLodge) {
          lodgeId = typeof user.primaryLodge === 'string' ? user.primaryLodge : user.primaryLodge._id;
        }

        if (lodgeId) {
          router.push(`/dashboard/lodge-admin/${lodgeId}/candidates`);
        } else {
          alert('Unable to find lodge information. Please contact support.');
        }
      },
      color: 'bg-green-50'
    },
    {
      title: 'Add New Event',
      description: 'Create and manage events for your lodge',
      icon: <CalendarIcon className="h-8 w-8 text-purple-500" />,
      onClick: () => {
        // Get the lodge ID from either administeredLodges or primaryLodge
        let lodgeId;
        if (user.administeredLodges && user.administeredLodges.length > 0) {
          lodgeId = user.administeredLodges[0];
        } else if (user.primaryLodge) {
          lodgeId = user.primaryLodge._id || user.primaryLodge;
        }

        if (lodgeId) {
          const path = `/dashboard/lodge-admin/${lodgeId}/events/manage`;
          console.log('Navigating to:', path);
          router.push(path);
        } else {
          alert('Unable to find lodge information. Please contact support.');
        }
      },
      color: 'bg-purple-50'
    }
  ];
  
  // Get the lodge name from the fetched lodge details or fallback to user data
  const lodgeName = lodgeDetails?.name || 
                   (user.primaryLodge?.name && typeof user.primaryLodge === 'object' ? user.primaryLodge.name : null) || 
                   'Your Lodge';
  
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Lodge Admin header with notification */}
      <div className="mb-8">
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <ShieldCheckIcon className="h-5 w-5 text-blue-500" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-700">
                You are logged in as a Lodge Admin with lodge-level access. Changes made here will affect your lodge.
              </p>
            </div>
          </div>
        </div>
        
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Welcome, {user.name}</h1>
            <p className="text-gray-600 mt-2">Lodge Admin Dashboard • {lodgeName}</p>
          </div>
          <div className="space-x-4 flex">
            <button
              onClick={() => {
                setShowTransferModal(true);
                fetchLodgeMembers(currentLodgeId);
              }}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors font-medium shadow-sm border border-red-700"
            >
              ⚠️ Transfer Admin Privileges
            </button>
            <button
              onClick={() => {
                sessionStorage.clear();
                router.push('/');
              }}
              className="px-4 py-2 bg-red-50 text-red-600 rounded-md hover:bg-red-100 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Admin Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {adminCards.map((card, index) => (
          <button
            key={index}
            onClick={card.onClick}
            className={`${card.color} rounded-lg shadow-sm p-6 cursor-pointer hover:shadow-md transition-shadow duration-200 w-full text-left`}
          >
            <div className="flex items-center space-x-4">
              {card.icon}
              <div>
                <h3 className="text-lg font-medium text-gray-900">{card.title}</h3>
                <p className="mt-1 text-sm text-gray-500">{card.description}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Transfer Admin Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Transfer Lodge Admin Privileges</h3>
            
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
                Select New Lodge Admin
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
                  {lodgeMembers.map((member, index) => (
                    <option key={`member-${member._id}-${index}`} value={member._id} className="text-gray-900">
                      {member.name || 'Unknown Member'}
                    </option>
                  ))}
                </select>
              )}
              {lodgeMembers.length === 0 && !isLoadingMembers && (
                <p className="text-sm text-gray-500 mt-2">
                  No eligible members found. Only lodge members can become lodge admins.
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
  );
} 