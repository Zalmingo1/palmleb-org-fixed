'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  UserGroupIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  FunnelIcon,
  ArrowPathIcon,
  EnvelopeIcon,
  PhoneIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import Link from 'next/link';

interface Member {
  _id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  lodge: {
    _id: string;
    name: string;
    number?: string;
  } | string | null;
  memberSince: string;
  phone?: string;
  profileImage?: string;
  bio?: string;
  address?: string;
  lodges?: string[];
  primaryLodge?: string;
  lodgeRoles?: { [key: string]: string };
  lodgeMemberships?: Array<{
    lodge: string;
    position: string;
    startDate?: string;
    isActive?: boolean;
  }>;
}

interface Lodge {
  _id: string;
  name: string;
  number: string;
}

export default function DistrictMembersManagementPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [members, setMembers] = useState<Member[]>([]);
  const [lodges, setLodges] = useState<Lodge[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<Member[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [lodgeFilter, setLodgeFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [membersPerPage] = useState(10);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<Member | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    filterMembers();
  }, [members, searchTerm, statusFilter, roleFilter, lodgeFilter]);

  const fetchData = async () => {
    try {
      // Get token from localStorage or sessionStorage
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // Fetch district members (filtered by district)
      const membersResponse = await fetch('/api/members?district=true', { headers });
      if (!membersResponse.ok) {
        throw new Error('Failed to fetch district members');
      }
      const membersData = await membersResponse.json();

      // Fetch district lodges
      const lodgesResponse = await fetch('/api/lodges?district=true', { headers });
      if (!lodgesResponse.ok) {
        throw new Error('Failed to fetch district lodges');
      }
      const lodgesData = await lodgesResponse.json();

      // Check if data is an array, if not, use an empty array
      setMembers(Array.isArray(membersData) ? membersData : []);
      setLodges(Array.isArray(lodgesData) ? lodgesData : []);
      setFilteredMembers(Array.isArray(membersData) ? membersData : []);
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load district data');
      setMembers([]);
      setLodges([]);
      setFilteredMembers([]);
      setIsLoading(false);
    }
  };

  const filterMembers = () => {
    console.log('filterMembers called with:', {
      searchTerm,
      statusFilter,
      roleFilter,
      lodgeFilter,
      membersCount: members.length
    });
    let filtered = [...members];

    // Apply search term filter
    if (searchTerm) {
      console.log('Searching for term:', searchTerm);
      filtered = filtered.filter(
        member => {
          const memberRole = formatRole(member);
          const nameMatch = member.name.toLowerCase().includes(searchTerm.toLowerCase());
          const emailMatch = member.email.toLowerCase().includes(searchTerm.toLowerCase());
          const roleMatch = memberRole.toLowerCase().includes(searchTerm.toLowerCase());
          
          console.log('Member search results:', {
            name: member.name,
            role: memberRole,
            nameMatch,
            emailMatch,
            roleMatch,
            searchTerm: searchTerm.toLowerCase(),
            roleLower: memberRole.toLowerCase()
          });
          
          return nameMatch || emailMatch || roleMatch;
        }
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(member => member.status === statusFilter);
    }

    // Apply role filter
    if (roleFilter !== 'all') {
      filtered = filtered.filter(member => {
        // Check main role first
        if (member.role === roleFilter) {
          return true;
        }
        
        // Check lodgeRoles if main role doesn't match
        if (member.lodgeRoles && Object.keys(member.lodgeRoles).length > 0) {
          return Object.values(member.lodgeRoles).includes(roleFilter);
        }
        
        return false;
      });
    }

    // Apply lodge filter
    if (lodgeFilter !== 'all') {
      filtered = filtered.filter(member => {
        const memberLodge = member.lodge;
        if (!memberLodge) return false;
        if (typeof memberLodge === 'object') {
          return memberLodge._id === lodgeFilter;
        }
        return member.primaryLodge === lodgeFilter;
      });
    }

    setFilteredMembers(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleStatusFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value);
  };

  const handleRoleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setRoleFilter(e.target.value);
  };

  const handleLodgeFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setLodgeFilter(e.target.value);
  };

  const handleAddMember = () => {
    router.push('/dashboard/district-admin/members/add');
  };

  const handleEditMember = (userId: string) => {
    router.push(`/dashboard/district-admin/members/${userId}/edit`);
  };



  const handleDeleteMember = (member: Member) => {
    setMemberToDelete(member);
    setShowDeleteModal(true);
  };

  const confirmDeleteMember = async () => {
    if (!memberToDelete) return;

    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const response = await fetch(`/api/members/${memberToDelete._id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle specific error for admin privileges
        if (response.status === 403 && data.error === 'Cannot delete member with administrative privileges') {
          alert(`Cannot delete ${memberToDelete.name}. ${data.details}`);
        } else {
          alert(`Failed to delete member: ${data.error || 'Unknown error'}`);
        }
        return;
      }

      // Remove the member from the list
      setMembers(members.filter(m => m._id !== memberToDelete._id));
      setShowDeleteModal(false);
      setMemberToDelete(null);
      alert(`${memberToDelete.name} has been deleted successfully.`);
    } catch (error) {
      console.error('Error deleting member:', error);
      alert('Failed to delete member. Please try again.');
    }
  };

  const getLodgeName = (lodge: { _id: string; name: string; number?: string } | string | null) => {
    if (!lodge) return 'No Lodge';
    if (typeof lodge === 'object') {
      return lodge.name || 'Unknown Lodge';
    }
    const lodgeObj = lodges.find(l => l._id === lodge);
    return lodgeObj ? lodgeObj.name : 'Unknown Lodge';
  };

  const formatRole = (member: Member) => {
    const roleMap: { [key: string]: string } = {
      'SUPER_ADMIN': 'Super Admin',
      'DISTRICT_ADMIN': 'District Admin',
      'LODGE_ADMIN': 'Lodge Admin',
      'LODGE_MEMBER': 'Lodge Member',
      'REGULAR_USER': 'Regular User'
    };

    // If member has lodgeRoles, show all lodge memberships
    if (member.lodgeRoles && Object.keys(member.lodgeRoles).length > 0) {
      const allRoles: string[] = [];
      
      // Check all lodge roles for all positions
      Object.entries(member.lodgeRoles).forEach(([lodgeId, role]) => {
        const lodgeName = getLodgeName(lodgeId);
        const roleDisplay = roleMap[role] || role;
        allRoles.push(`${roleDisplay} (${lodgeName})`);
      });
      
      return allRoles.join(', ');
    }
    
    // If member has an admin role but no lodgeRoles, show the admin role with primary lodge
    if (member.role === 'LODGE_ADMIN' || member.role === 'DISTRICT_ADMIN' || member.role === 'SUPER_ADMIN') {
      const roleDisplay = roleMap[member.role] || member.role;
      if (member.primaryLodge) {
        const lodgeName = getLodgeName(member.primaryLodge);
        return `${roleDisplay} (${lodgeName})`;
      } else {
        return roleDisplay;
      }
    }
    
    // If no lodgeRoles but has lodges array, show basic membership
    if (member.lodges && member.lodges.length > 0) {
      const lodgeMemberships: string[] = [];
      // Use Set to deduplicate lodge IDs
      const uniqueLodgeIds = Array.from(new Set(member.lodges));
      uniqueLodgeIds.forEach((lodgeId: string) => {
        const lodgeName = getLodgeName(lodgeId);
        lodgeMemberships.push(`Lodge Member (${lodgeName})`);
      });
      return lodgeMemberships.join(', ');
    }
    
    // If no lodges array but has lodgeMemberships, show basic membership
    if (member.lodgeMemberships && member.lodgeMemberships.length > 0) {
      const lodgeMemberships: string[] = [];
      // Use Set to deduplicate lodge IDs
      const uniqueLodgeIds = Array.from(new Set(member.lodgeMemberships.map((membership: any) => membership.lodge)));
      uniqueLodgeIds.forEach((lodgeId: unknown) => {
        const lodgeName = getLodgeName(lodgeId as string);
        lodgeMemberships.push(`Lodge Member (${lodgeName})`);
      });
      return lodgeMemberships.join(', ');
    }
    
    // Fall back to the main role field
    return roleMap[member.role] || member.role;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return 'Invalid Date';
    }
  };

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  // Calculate pagination
  const indexOfLastMember = currentPage * membersPerPage;
  const indexOfFirstMember = indexOfLastMember - membersPerPage;
  const currentMembers = filteredMembers.slice(indexOfFirstMember, indexOfLastMember);
  const totalPages = Math.ceil(filteredMembers.length / membersPerPage);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">District Members Management</h1>
          <p className="text-gray-600">Manage members within your district</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={handleAddMember}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <PlusIcon className="h-5 w-5" />
            <span>Add Member</span>
          </button>
          <button
            onClick={fetchData}
            className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors flex items-center space-x-2"
          >
            <ArrowPathIcon className="h-5 w-5" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <XMarkIcon className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">{error}</div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search members..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={handleStatusFilterChange}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="pending">Pending</option>
          </select>

          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={handleRoleFilterChange}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
          >
            <option value="all">All Roles</option>
            <option value="DISTRICT_ADMIN">District Admin</option>
            <option value="LODGE_ADMIN">Lodge Admin</option>
            <option value="LODGE_MEMBER">Lodge Member</option>
            <option value="REGULAR_USER">Regular User</option>
          </select>

          {/* Lodge Filter */}
          <select
            value={lodgeFilter}
            onChange={handleLodgeFilterChange}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
          >
            <option value="all">All Lodges</option>
            {lodges.map(lodge => (
              <option key={lodge._id} value={lodge._id}>
                {lodge.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Members Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Member
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Lodge
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Member Since
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentMembers.map(member => (
                <tr key={member._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        {member.profileImage ? (
                          <img
                            className="h-10 w-10 rounded-full"
                            src={member.profileImage}
                            alt={member.name}
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                            <UserGroupIcon className="h-6 w-6 text-gray-600" />
                          </div>
                        )}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{member.name}</div>
                        <div className="text-sm text-gray-500">{member.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {formatRole(member).split(', ').map((role, index) => {
                        let badgeClass = "inline-flex px-2 py-1 text-xs font-semibold rounded-full";
                        
                        if (role.includes('District Admin')) {
                          badgeClass += " bg-purple-100 text-purple-800";
                        } else if (role.includes('Lodge Admin')) {
                          badgeClass += " bg-blue-100 text-blue-800";
                        } else if (role.includes('Super Admin')) {
                          badgeClass += " bg-red-100 text-red-800";
                        } else {
                          badgeClass += " bg-gray-100 text-gray-800";
                        }
                        
                        return (
                          <span key={index} className={badgeClass}>
                            {role}
                          </span>
                        );
                      })}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {getLodgeName(member.lodge)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      member.status === 'active' ? 'bg-green-100 text-green-800' :
                      member.status === 'inactive' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {member.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(member.memberSince)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEditMember(member._id)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <PencilSquareIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteMember(member)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => paginate(currentPage - 1)}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => paginate(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing <span className="font-medium">{indexOfFirstMember + 1}</span> to{' '}
                  <span className="font-medium">
                    {Math.min(indexOfLastMember, filteredMembers.length)}
                  </span>{' '}
                  of <span className="font-medium">{filteredMembers.length}</span> results
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button
                    onClick={() => paginate(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeftIcon className="h-5 w-5" />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNumber => (
                    <button
                      key={pageNumber}
                      onClick={() => paginate(pageNumber)}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                        pageNumber === currentPage
                          ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                          : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {pageNumber}
                    </button>
                  ))}
                  <button
                    onClick={() => paginate(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRightIcon className="h-5 w-5" />
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && memberToDelete && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Delete Member</h3>
              <p className="text-sm text-gray-500 mb-6">
                Are you sure you want to delete {memberToDelete.name}? This action cannot be undone.
              </p>
              <div className="flex justify-center space-x-4">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteMember}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
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