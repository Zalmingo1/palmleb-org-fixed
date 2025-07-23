'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  BuildingLibraryIcon,
  UserGroupIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  UserPlusIcon,
  EyeIcon
} from '@heroicons/react/24/outline';

interface Lodge {
  _id: string;
  name: string;
  location: string;
  members: Member[];
  isActive: boolean;
  memberCount: number;
  activeMemberCount: number;
  logoImage?: string;
  backgroundImage?: string;
}

interface Member {
  _id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  lodge: {
    _id: string;
    name: string;
  } | '';
  memberSince: string;
  profileImage: string;
  bio: string;
  phone: string;
  address: string;
  lodges?: string[];
  primaryLodge?: string;
}

export default function DistrictLodgesManagementPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [lodges, setLodges] = useState<Lodge[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [expandedLodge, setExpandedLodge] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [lodgeToDelete, setLodgeToDelete] = useState<Lodge | null>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // Get user data from session storage
    const userData = sessionStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
    
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Get token from localStorage or sessionStorage
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // Fetch lodges with district filter
      const lodgesResponse = await fetch('/api/lodges?district=true', { headers });
      if (!lodgesResponse.ok) {
        throw new Error('Failed to fetch lodges');
      }
      const lodgesData = await lodgesResponse.json();
      console.log('Raw District Lodges Data:', lodgesData);

      // Fetch members with district filter
      const membersResponse = await fetch('/api/members?district=true', { headers });
      if (!membersResponse.ok) {
        throw new Error('Failed to fetch members');
      }
      const membersData = await membersResponse.json();
      console.log('Raw District Members Data:', membersData);

      // Transform member data to include lodge memberships
      const transformedMembers: Member[] = Array.isArray(membersData) ? membersData.map((member: any) => {
        const primaryLodge = member.primaryLodge;
        const lodge: { _id: string; name: string; } | '' = primaryLodge ? {
          _id: typeof primaryLodge === 'string' ? primaryLodge : (primaryLodge._id || ''),
          name: typeof primaryLodge === 'string' ? '' : (primaryLodge.name || '')
        } : '';

        const memberData: Member = {
          _id: member._id,
          name: member.name || `${member.firstName} ${member.lastName}`,
          email: member.email,
          role: member.role || member.primaryLodgePosition || 'Member',
          status: member.status || 'active',
          lodge,
          lodges: member.lodgeMemberships?.map((m: any) => m.lodge?._id) || [],
          primaryLodge: typeof primaryLodge === 'string' ? primaryLodge : (primaryLodge?._id || ''),
          memberSince: member.memberSince || member.createdAt?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0],
          profileImage: member.profileImage || '/images/default-avatar.png',
          bio: member.bio || '',
          phone: member.phone || '',
          address: member.address || ''
        };

        return memberData;
      }) : [];

      console.log('Transformed District Members Data:', transformedMembers);

      // Set the data
      setLodges(Array.isArray(lodgesData) ? lodgesData : []);
      setMembers(transformedMembers);
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load data');
      setLodges([]);
      setMembers([]);
      setIsLoading(false);
    }
  };

  const getMembersForLodge = (lodgeId: string): Member[] => {
    const lodgeMembers = members.filter(member => {
      const hasLodge = member.lodges?.includes(lodgeId);
      const isPrimary = member.primaryLodge === lodgeId;
      console.log(`Checking member ${member.name} for lodge ${lodgeId}:`, {
        hasLodge,
        isPrimary,
        memberLodges: member.lodges,
        memberPrimaryLodge: member.primaryLodge,
        status: member.status
      });
      return hasLodge || isPrimary;
    });

    // Define position priority order
    const positionPriority: { [key: string]: number } = {
      'Worshipful Master': 1,
      'Senior Warden': 2,
      'Junior Warden': 3,
      'Treasurer': 4,
      'Secretary': 5,
      'Senior Deacon': 6,
      'Junior Deacon': 7,
      'Senior Steward': 8,
      'Junior Steward': 9,
      'Tyler': 10,
      'Chaplain': 11,
      'Marshal': 12,
      'Organist': 13,
      'Member': 999 // Default lowest priority
    };

    // Sort members by position priority
    return lodgeMembers.sort((a, b) => {
      const aPriority = positionPriority[a.role] || positionPriority['Member'];
      const bPriority = positionPriority[b.role] || positionPriority['Member'];
      return aPriority - bPriority;
    });
  };

  const getActiveMembersCount = (lodgeId: string): number => {
    const activeCount = members.filter(member => {
      const hasLodge = member.lodges?.includes(lodgeId);
      const isPrimary = member.primaryLodge === lodgeId;
      const isActive = member.status === 'active';
      console.log(`Checking active count for member ${member.name} in lodge ${lodgeId}:`, {
        hasLodge,
        isPrimary,
        isActive,
        memberLodges: member.lodges,
        memberPrimaryLodge: member.primaryLodge,
        status: member.status
      });
      return (hasLodge || isPrimary) && isActive;
    }).length;
    return activeCount;
  };

  const handleLodgeClick = (lodgeId: string) => {
    setExpandedLodge(expandedLodge === lodgeId ? null : lodgeId);
  };

  const handleViewLodge = (lodgeId: string) => {
    router.push(`/dashboard/lodges/${lodgeId}`);
  };

  const handleEditLodge = (lodgeId: string) => {
    router.push(`/dashboard/district-admin/lodges/${lodgeId}/edit`);
  };

  const handleDeleteLodge = async () => {
    if (!lodgeToDelete) return;
    
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (!token) {
        throw new Error('You are not authenticated. Please log in again.');
      }

      const response = await fetch(`/api/lodges/${lodgeToDelete._id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete lodge');
      }

      // Remove the deleted lodge from the state
      setLodges(prevLodges => prevLodges.filter(lodge => lodge._id !== lodgeToDelete._id));
      setShowDeleteModal(false);
      setLodgeToDelete(null);
    } catch (error) {
      console.error('Error deleting lodge:', error);
      alert(`Error deleting lodge: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error!</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">District Lodges Management</h1>
            <p className="text-sm text-gray-600 mt-1">
              Manage lodges within your district. You can create, edit, and manage all lodges in your district.
            </p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => router.push('/dashboard/district-admin/lodges/add')}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <PlusIcon className="h-5 w-5" />
              <span>Add Lodge</span>
            </button>
            <button
              onClick={() => router.back()}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>

      {/* District Info */}
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6 rounded-md">
        <div className="flex">
          <div className="flex-shrink-0">
            <BuildingLibraryIcon className="h-5 w-5 text-blue-500" />
          </div>
          <div className="ml-3">
            <p className="text-sm text-blue-700">
              <strong>District Admin Access:</strong> You can view, create, edit, and manage lodges within your district. 
              You have full administrative control over lodges in your district.
            </p>
          </div>
        </div>
      </div>

      {/* Lodges List */}
      <div className="space-y-4">
        {lodges.length === 0 ? (
          <div className="text-center py-8">
            <BuildingLibraryIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No lodges found</h3>
            <p className="mt-1 text-sm text-gray-500">
              No lodges are currently available in your district.
            </p>
            <div className="mt-6">
              <button
                onClick={() => router.push('/dashboard/district-admin/lodges/add')}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
                Add First Lodge
              </button>
            </div>
          </div>
        ) : (
          lodges.map((lodge) => {
            const lodgeMembers = getMembersForLodge(lodge._id);
            const activeMembersCount = getActiveMembersCount(lodge._id);
            const isExpanded = expandedLodge === lodge._id;

            return (
              <div key={lodge._id} className="bg-white rounded-lg shadow-sm border border-gray-200">
                {/* Lodge Header */}
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        {lodge.logoImage ? (
                          <img
                            src={lodge.logoImage}
                            alt={`${lodge.name} logo`}
                            className="h-12 w-12 rounded-full object-cover"
                          />
                        ) : (
                          <div className="h-12 w-12 bg-gray-200 rounded-full flex items-center justify-center">
                            <BuildingLibraryIcon className="h-6 w-6 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">{lodge.name}</h3>
                        <p className="text-sm text-gray-500">{lodge.location}</p>
                        <div className="flex items-center space-x-4 mt-1">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {lodge.memberCount} Members
                          </span>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            {lodge.activeMemberCount} Active
                          </span>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            lodge.isActive 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {lodge.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleViewLodge(lodge._id)}
                        className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                        title="View Lodge Details"
                      >
                        <EyeIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleEditLodge(lodge._id)}
                        className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                        title="Edit Lodge"
                      >
                        <PencilSquareIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => {
                          setLodgeToDelete(lodge);
                          setShowDeleteModal(true);
                        }}
                        className="p-2 text-red-400 hover:text-red-600 transition-colors"
                        title="Delete Lodge"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleLodgeClick(lodge._id)}
                        className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                        title={isExpanded ? 'Collapse' : 'Expand'}
                      >
                        {isExpanded ? (
                          <ChevronUpIcon className="h-5 w-5" />
                        ) : (
                          <ChevronDownIcon className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded Lodge Details */}
                {isExpanded && (
                  <div className="border-t border-gray-200 px-6 py-4">
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Lodge Members</h4>
                      {lodgeMembers.length === 0 ? (
                        <p className="text-sm text-gray-500">No members found in this lodge.</p>
                      ) : (
                        <div className="space-y-2">
                          {lodgeMembers.map((member) => (
                            <div key={member._id} className="flex items-center space-x-3 p-2 bg-gray-50 rounded">
                              <div className="flex-shrink-0">
                                {member.profileImage ? (
                                  <img
                                    src={member.profileImage}
                                    alt={member.name}
                                    className="h-8 w-8 rounded-full object-cover"
                                  />
                                ) : (
                                  <div className="h-8 w-8 bg-gray-200 rounded-full flex items-center justify-center">
                                    <UserGroupIcon className="h-4 w-4 text-gray-400" />
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {member.name}
                                </p>
                                <p className="text-xs text-gray-500 truncate">
                                  {member.role} • {member.email}
                                </p>
                              </div>
                              <div className="flex-shrink-0">
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                  member.status === 'active' 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-red-100 text-red-800'
                                }`}>
                                  {member.status}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && lodgeToDelete && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <TrashIcon className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mt-4">Delete Lodge</h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500">
                  Are you sure you want to delete <strong>{lodgeToDelete.name}</strong>? 
                  This action cannot be undone and will remove all associated data.
                </p>
              </div>
              <div className="flex justify-center space-x-4 mt-4">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setLodgeToDelete(null);
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteLodge}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 