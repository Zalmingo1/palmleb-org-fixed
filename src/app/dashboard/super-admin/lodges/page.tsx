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
  UserPlusIcon
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

export default function LodgesManagementPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [lodges, setLodges] = useState<Lodge[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [expandedLodge, setExpandedLodge] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [lodgeToDelete, setLodgeToDelete] = useState<Lodge | null>(null);

  useEffect(() => {
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

      // Fetch lodges
      const lodgesResponse = await fetch('/api/lodges', { headers });
      if (!lodgesResponse.ok) {
        throw new Error('Failed to fetch lodges');
      }
      const lodgesData = await lodgesResponse.json();
      console.log('Raw Lodges Data:', lodgesData);

      // Fetch members
      const membersResponse = await fetch('/api/members', { headers });
      if (!membersResponse.ok) {
        throw new Error('Failed to fetch members');
      }
      const membersData = await membersResponse.json();
      console.log('Raw Members Data:', membersData);

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

      console.log('Transformed Members Data:', transformedMembers);

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
        throw new Error(errorData.error || 'Failed to delete lodge');
      }

      // Remove the deleted lodge from the state
      setLodges(lodges.filter(lodge => lodge._id !== lodgeToDelete._id));
      setShowDeleteModal(false);
      setLodgeToDelete(null);
    } catch (err) {
      console.error('Error deleting lodge:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-gray-900">Lodge Management</h1>
        <p className="mt-2 text-gray-600">Manage all lodges and their members in the district.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <BuildingLibraryIcon className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Lodges</p>
              <p className="text-2xl font-semibold text-gray-900">{lodges.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <UserGroupIcon className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Members</p>
              <p className="text-2xl font-semibold text-gray-900">{members.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <UserGroupIcon className="h-8 w-8 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Active Members</p>
              <p className="text-2xl font-semibold text-gray-900">
                {members.filter(member => member.status === 'active').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Add Lodge Button */}
      <div className="mb-6">
        <button
          onClick={() => router.push('/dashboard/super-admin/lodges/add')}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Add New Lodge
        </button>
      </div>

      {/* Lodges List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {lodges.map((lodge) => (
          <div
            key={lodge._id}
            className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-200"
          >
            <div className="p-6">
                  <div className="flex items-center space-x-4">
                {/* Lodge Logo */}
                <div className="flex-shrink-0">
                  {lodge.logoImage ? (
                    <img
                      src={lodge.logoImage}
                      alt={`${lodge.name} logo`}
                      className="h-16 w-16 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center">
                      <BuildingLibraryIcon className="h-8 w-8 text-gray-400" />
                    </div>
                  )}
                  </div>
                
                {/* Lodge Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-gray-900 truncate">
                    {lodge.name}
                  </h3>
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

              {/* Action Buttons */}
              <div className="mt-4 flex justify-end space-x-2">
                  <button
                    onClick={() => router.push(`/dashboard/super-admin/lodges/${lodge._id}/edit`)}
                  className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                  <PencilSquareIcon className="h-4 w-4 mr-1" />
                  Edit
                  </button>
                  <button
                    onClick={() => {
                      setLodgeToDelete(lodge);
                      setShowDeleteModal(true);
                    }}
                  className="inline-flex items-center px-3 py-1.5 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  <TrashIcon className="h-4 w-4 mr-1" />
                  Delete
                                </button>
              </div>
            </div>
        </div>
        ))}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && lodgeToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Confirm Deletion</h3>
            </div>
            <div className="px-6 py-4">
              <p className="text-gray-700">
                Are you sure you want to delete <span className="font-medium">{lodgeToDelete.name}</span>? This action cannot be undone.
              </p>
              {getActiveMembersCount(lodgeToDelete._id) > 0 && (
                <div className="mt-4 bg-red-50 border-l-4 border-red-400 p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-red-700">
                        Warning: This lodge has {getActiveMembersCount(lodgeToDelete._id)} active members. Deleting it will remove lodge affiliations from these members.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setLodgeToDelete(null);
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md mr-2 hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteLodge}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Delete Lodge
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 