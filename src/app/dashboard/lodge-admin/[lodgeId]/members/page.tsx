'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { 
  MagnifyingGlassIcon, 
  UserCircleIcon, 
  ArrowLeftIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import Link from 'next/link';

interface Member {
  _id: string;
  name: string;
  email: string;
  role: string;
  lodges: Array<{
    id: string;
    name: string;
  }>;
  primaryLodge: {
    id: string;
    name: string;
  };
  primaryLodgePosition: string;
  administeredLodges: string[];
  created: Date;
  lastLogin?: Date;
  status: 'active' | 'inactive' | 'pending';
  profileImage?: string;
  memberSince: string;
}

interface ApiResponse {
  members: Member[];
  diagnostic?: {
    totalUsers: number;
    sampleUsers: Array<{
      _id: any;
      name: string;
      primaryLodge: any;
      lodges: any[];
      administeredLodges: string[];
    }>;
    query: any;
    membersFound: number;
    usersWithLodgeInArray?: number;
    usersWithStringPrimaryLodge?: number;
    usersWithLodgeObject?: number;
  };
}

// Add these constants at the top of the file after the imports
const ROLE_CATEGORIES = {
  ELECTED_OFFICERS: 'Elected Officers',
  APPOINTED_OFFICERS: 'Appointed Officers',
  OTHER_POSITIONS: 'Other Positions'
} as const;

const LODGE_POSITIONS = {
  [ROLE_CATEGORIES.ELECTED_OFFICERS]: [
    'WORSHIPFUL_MASTER',
    'SENIOR_WARDEN',
    'JUNIOR_WARDEN',
    'TREASURER',
    'SECRETARY'
  ],
  [ROLE_CATEGORIES.APPOINTED_OFFICERS]: [
    'SENIOR_DEACON',
    'JUNIOR_DEACON',
    'SENIOR_STEWARD',
    'JUNIOR_STEWARD',
    'CHAPLAIN',
    'MARSHAL',
    'TYLER',
    'MUSICIAN'
  ],
  [ROLE_CATEGORIES.OTHER_POSITIONS]: [
    'MASTER_OF_CEREMONIES',
    'HISTORIAN',
    'LODGE_EDUCATION_OFFICER',
    'ALMONER',
    'MEMBER'
  ]
};

// Helper function to format position display name
const formatPositionName = (position: string) => {
  return position
    .split('_')
    .map(word => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ');
};

export default function LodgeMembersPage({ params }: { params: Promise<{ lodgeId: string }> }) {
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lodgeName, setLodgeName] = useState<string>('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [newMember, setNewMember] = useState({
    email: '',
    role: 'LODGE_MEMBER',
    position: '',
    status: 'active'
  });
  const [editMember, setEditMember] = useState({
    position: '',
    role: '',
    status: '',
    resetPassword: false,
    newPassword: ''
  });
  
  const { lodgeId } = use(params);

  const fetchLodgeMembers = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get token from sessionStorage
      const token = sessionStorage.getItem('token');
      const userData = sessionStorage.getItem('user');
      
      if (!token || !userData) {
        router.push('/login');
        return;
      }

      // Verify user is a lodge admin for this lodge
      const user = JSON.parse(userData);
      console.log('User data in members page:', user);
      console.log('Current lodge ID:', lodgeId);
      console.log('User primary lodge:', user.primaryLodge);
      console.log('User primary lodge type:', typeof user.primaryLodge);
      console.log('User primary lodge structure:', JSON.stringify(user.primaryLodge, null, 2));
      
      const administeredLodges = user.administeredLodges || [];
      const primaryLodgeId = typeof user.primaryLodge === 'string' ? user.primaryLodge : user.primaryLodge?._id;
      
      console.log('Administered lodges:', administeredLodges);
      console.log('Primary lodge ID:', primaryLodgeId);
      
      // Allow access if the user is a lodge admin and either:
      // 1. The lodge is in their administeredLodges array, or
      // 2. The lodge is their primary lodge
      if (!administeredLodges.includes(lodgeId) && primaryLodgeId !== lodgeId) {
        console.error('User not authorized for this lodge:', {
          lodgeId,
          administeredLodges,
          primaryLodgeId
        });
        router.push('/dashboard/lodge-admin');
        return;
      }

      // Fetch lodge details
      const lodgeResponse = await fetch(`/api/lodges/${lodgeId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (lodgeResponse.ok) {
        const lodgeData = await lodgeResponse.json();
        console.log('Lodge data:', lodgeData);
        setLodgeName(lodgeData.name);
      }

      // Fetch members for this specific lodge
      console.log('Fetching members for lodge:', lodgeId);
      console.log('Using token:', token ? 'Token present' : 'No token');
      
      const membersUrl = `/api/lodges/${lodgeId}/members`;
      console.log('Request URL:', membersUrl);
      
      const response = await fetch(membersUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        cache: 'no-store'
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
          console.log('Error response data:', errorData);
        } catch (e) {
          console.log('Could not parse error response as JSON');
          errorData = {};
        }
        
        console.error('Failed to fetch members:', {
          status: response.status,
          statusText: response.statusText,
          url: response.url,
          error: errorData
        });
        
        throw new Error(`HTTP error! status: ${response.status} - ${errorData.error || response.statusText}`);
      }

      const data = await response.json() as ApiResponse;
      console.log('Received members data:', data);
      
      if (!data.members) {
        console.error('Invalid response format:', data);
        throw new Error('Invalid response format: expected members array');
      }
      
      // Log diagnostic information if available
      if (data.diagnostic) {
        console.log('API Diagnostic Information:', {
          totalUsers: data.diagnostic.totalUsers,
          sampleUsers: data.diagnostic.sampleUsers,
          query: data.diagnostic.query,
          membersFound: data.diagnostic.membersFound,
          usersWithLodgeInArray: data.diagnostic.usersWithLodgeInArray,
          usersWithStringPrimaryLodge: data.diagnostic.usersWithStringPrimaryLodge,
          usersWithLodgeObject: data.diagnostic.usersWithLodgeObject
        });
      }
      
      const transformedMembers = data.members.map((member: any) => ({
        _id: member._id,
        name: member.name || '',
        email: member.email || '',
        role: member.role || 'LODGE_MEMBER',
        lodges: member.lodges || [],
        primaryLodge: member.primaryLodge || { id: '', name: '' },
        primaryLodgePosition: member.primaryLodgePosition || '',
        administeredLodges: member.administeredLodges || [],
        created: member.created || new Date(),
        lastLogin: member.lastLogin,
        status: member.status || 'active',
        profileImage: member.profileImage || '/images/default-avatar.png',
        memberSince: member.memberSince || new Date().toISOString()
      }));
      
      setMembers(transformedMembers);
    } catch (err) {
      console.error('Error fetching lodge members:', err);
      setError('Failed to load members. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    fetchLodgeMembers();
  }, [lodgeId, router]);

  const handleAddMember = async () => {
    try {
      const token = sessionStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch(`/api/lodges/${lodgeId}/members`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newMember)
      });

      if (!response.ok) {
        throw new Error('Failed to add member');
      }

      setShowAddModal(false);
      setNewMember({
        email: '',
        role: 'LODGE_MEMBER',
        position: '',
        status: 'active'
      });
      fetchLodgeMembers();
    } catch (error) {
      console.error('Error adding member:', error);
      setError('Failed to add member. Please try again.');
    }
  };

  const handleEditMember = async () => {
    if (!selectedMember) return;

    try {
      const token = sessionStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      console.log('Selected member data:', {
        id: selectedMember._id,
        name: selectedMember.name,
        email: selectedMember.email,
        role: selectedMember.role,
        position: selectedMember.primaryLodgePosition
      });

      console.log('Edit member data:', {
        position: editMember.position,
        role: editMember.role,
        status: editMember.status
      });

      const requestUrl = `/api/lodges/${lodgeId}/members`;
      console.log('Making request to:', requestUrl);

      const requestBody = {
        userId: selectedMember._id,
        position: editMember.position,
        role: editMember.role,
        status: editMember.status
      };
      console.log('Request body:', requestBody);

      const response = await fetch(requestUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      let data;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        console.log('Non-JSON response:', text);
        data = { error: 'Invalid response format' };
      }
      
      if (!response.ok) {
        console.error('Error response:', {
          status: response.status,
          statusText: response.statusText,
          data,
          url: requestUrl
        });
        throw new Error(data.error || `Failed to update member: ${response.statusText}`);
      }

      console.log('Update response:', data);

      setShowEditModal(false);
      setSelectedMember(null);
      fetchLodgeMembers();
    } catch (error) {
      console.error('Error updating member:', error);
      setError(error instanceof Error ? error.message : 'Failed to update member. Please try again.');
    }
  };

  const handleChangePassword = async (userId: string, newPassword: string) => {
    try {
      const token = sessionStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      if (!newPassword || newPassword.length < 8) {
        alert('Password must be at least 8 characters long');
        return;
      }

      const response = await fetch(`/api/users/${userId}/change-password`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ newPassword })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        let errorMessage;
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || 'Failed to change password';
        } catch (e) {
          errorMessage = 'Failed to change password. Please try again.';
        }
        throw new Error(errorMessage);
      }

      alert('Password has been changed successfully.');
      setEditMember(prev => ({ ...prev, newPassword: '' }));
    } catch (error) {
      console.error('Error changing password:', error);
      alert(error instanceof Error ? error.message : 'Failed to change password. Please try again.');
    }
  };

  const handleDeleteMember = async () => {
    if (!selectedMember) return;

    try {
      const token = sessionStorage.getItem('token');
      console.log('Token from session storage:', token ? token.substring(0, 10) + '...' : 'Not found');
      
      if (!token) {
        router.push('/login');
        return;
      }

      console.log('Sending delete request with data:', {
        userId: selectedMember._id,
        lodgeId
      });

      const response = await fetch(`/api/lodges/${lodgeId}/members`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: selectedMember._id
        })
      });

      const data = await response.json();
      console.log('Delete response:', data);

      if (!response.ok) {
        // Handle specific error for admin privileges
        if (response.status === 403 && data.error === 'Cannot remove member with administrative privileges from lodge') {
          throw new Error(`${selectedMember.name} cannot be removed. ${data.details}`);
        } else {
          throw new Error(data.error || 'Failed to remove member');
        }
      }

      setShowDeleteModal(false);
      setSelectedMember(null);
      fetchLodgeMembers();
    } catch (error) {
      console.error('Error removing member:', error);
      setError(error instanceof Error ? error.message : 'Failed to remove member. Please try again.');
    }
  };

  const filteredMembers = members.filter(member => {
    const searchLower = searchQuery.toLowerCase();
    return (
      member.name.toLowerCase().includes(searchLower) ||
      member.email.toLowerCase().includes(searchLower) ||
      member.primaryLodgePosition.toLowerCase().includes(searchLower)
    );
  });

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
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error!</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center text-blue-600 hover:text-blue-800"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          Back to Dashboard
        </button>
        
        <div className="flex justify-between items-center mt-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Members Directory</h1>
            <p className="text-gray-600 mt-2">{lodgeName}</p>
          </div>
          <button
            onClick={() => router.push(`/dashboard/lodge-admin/${lodgeId}/members/add`)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Add Member
          </button>
        </div>
      </div>

      <div className="relative w-[600px] mb-8">
        <input
          type="text"
          placeholder="Search members by name, email, or position..."
          className="w-full px-8 py-2 pl-14 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-lg shadow-sm"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <MagnifyingGlassIcon className="h-6 w-6 text-gray-400 absolute left-5 top-1/2 transform -translate-y-1/2" />
      </div>
      
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="grid grid-cols-12 gap-4 p-4 bg-gray-50 border-b border-gray-200 text-sm font-medium text-gray-600">
          <div className="col-span-4">Member</div>
          <div className="col-span-3">Position</div>
          <div className="col-span-3">Email</div>
          <div className="col-span-2 text-right">Actions</div>
        </div>
        
        <div className="divide-y divide-gray-100">
          {filteredMembers.map((member) => (
            <div 
              key={member._id}
              className="grid grid-cols-12 gap-4 p-4 hover:bg-gray-50 transition-colors duration-150"
            >
              <div className="col-span-4 flex items-center space-x-3">
                <div className="flex-shrink-0 h-10 w-10 rounded-full overflow-hidden bg-gray-100">
                  {member.profileImage ? (
                    <img
                      src={member.profileImage}
                      alt={member.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center">
                      <UserCircleIcon className="h-6 w-6 text-gray-400" />
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {member.name}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {member.primaryLodgePosition}
                  </p>
                </div>
              </div>
              
              <div className="col-span-3 flex items-center">
                <p className="text-sm text-gray-900 truncate">
                  {member.primaryLodgePosition}
                </p>
              </div>
              
              <div className="col-span-3 flex items-center">
                <p className="text-sm text-gray-900 truncate">
                  {member.email}
                </p>
              </div>
              
              <div className="col-span-2 flex items-center justify-end space-x-2">
                <button
                  onClick={() => {
                    setSelectedMember(member);
                    setEditMember({
                      position: member.primaryLodgePosition,
                      role: member.role,
                      status: member.status,
                      resetPassword: false,
                      newPassword: ''
                    });
                    setShowEditModal(true);
                  }}
                  className="p-1 text-gray-400 hover:text-gray-500"
                >
                  <PencilIcon className="h-5 w-5" />
                </button>
                <button
                  onClick={() => {
                    setSelectedMember(member);
                    setShowDeleteModal(true);
                  }}
                  className="p-1 text-gray-400 hover:text-red-500"
                >
                  <TrashIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
        
        {filteredMembers.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-2">
              <UserCircleIcon className="h-12 w-12 mx-auto" />
            </div>
            <p className="text-gray-500">No members found matching your search.</p>
          </div>
        )}
      </div>

      {/* Add Member Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Add New Member</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  value={newMember.email}
                  onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
              <div>
                <label htmlFor="position" className="block text-sm font-medium text-gray-700">
                  Position
                </label>
                <input
                  type="text"
                  id="position"
                  value={newMember.position}
                  onChange={(e) => setNewMember({ ...newMember, position: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                  Role
                </label>
                <select
                  id="role"
                  value={newMember.role}
                  onChange={(e) => setNewMember({ ...newMember, role: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="LODGE_MEMBER">Lodge Member</option>
                  <option value="LODGE_ADMIN">Lodge Admin</option>
                </select>
              </div>
              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                  Status
                </label>
                <select
                  id="status"
                  value={newMember.status}
                  onChange={(e) => setNewMember({ ...newMember, status: e.target.value as 'active' | 'inactive' | 'pending' })}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="pending">Pending</option>
                </select>
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                onClick={handleAddMember}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Add Member
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Member Modal */}
      {showEditModal && selectedMember && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Edit Member</h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label htmlFor="edit-position" className="block text-sm font-medium text-gray-700">
                  Position
                </label>
                <select
                  id="edit-position"
                  value={editMember.position}
                  onChange={(e) => setEditMember({ ...editMember, position: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900 bg-white"
                >
                  <option value="">Select a position</option>
                  {Object.entries(LODGE_POSITIONS).map(([category, positions]) => (
                    <optgroup key={category} label={category}>
                      {positions.map((position) => (
                        <option key={position} value={position}>
                          {formatPositionName(position)}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="edit-role" className="block text-sm font-medium text-gray-700">
                  Role
                </label>
                <select
                  id="edit-role"
                  value={editMember.role}
                  onChange={(e) => setEditMember({ ...editMember, role: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900 bg-white"
                >
                  <option value="LODGE_MEMBER">Lodge Member</option>
                  <option value="LODGE_ADMIN">Lodge Admin</option>
                </select>
              </div>
              <div>
                <label htmlFor="edit-status" className="block text-sm font-medium text-gray-700">
                  Status
                </label>
                <select
                  id="edit-status"
                  value={editMember.status}
                  onChange={(e) => setEditMember({ ...editMember, status: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900 bg-white"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="pending">Pending</option>
                </select>
              </div>
              <div className="pt-4 border-t border-gray-200">
                <div className="mb-4">
                  <label htmlFor="new-password" className="block text-sm font-medium text-gray-700">
                    New Password
                  </label>
                  <input
                    type="password"
                    id="new-password"
                    value={editMember.newPassword}
                    onChange={(e) => setEditMember({ ...editMember, newPassword: e.target.value })}
                    placeholder="Enter new password"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Password must be at least 8 characters long
                  </p>
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={() => handleChangePassword(selectedMember._id, editMember.newPassword)}
                    className="flex-1 px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Change Password
                  </button>
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                onClick={handleEditMember}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Member Modal */}
      {showDeleteModal && selectedMember && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Remove Member</h3>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Are you sure you want to remove {selectedMember.name} from this lodge? This action cannot be undone.
            </p>
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteMember}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Remove Member
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 