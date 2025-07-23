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
  BuildingLibraryIcon,
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

export default function MembersManagementPage() {
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

      // Fetch members
      const membersResponse = await fetch('/api/members', { headers });
      if (!membersResponse.ok) {
        throw new Error('Failed to fetch members');
      }
      const membersData = await membersResponse.json();

      // Fetch lodges
      const lodgesResponse = await fetch('/api/lodges', { headers });
      if (!lodgesResponse.ok) {
        throw new Error('Failed to fetch lodges');
      }
      const lodgesData = await lodgesResponse.json();

      // Check if data is an array, if not, use an empty array
      setMembers(Array.isArray(membersData) ? membersData : []);
      setLodges(Array.isArray(lodgesData) ? lodgesData : []);
      setFilteredMembers(Array.isArray(membersData) ? membersData : []);
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load data');
      setMembers([]);
      setLodges([]);
      setFilteredMembers([]);
      setIsLoading(false);
    }
  };

  const filterMembers = () => {
    let filtered = [...members];

    // Apply search term filter
    if (searchTerm) {
      filtered = filtered.filter(
        member => {
          const memberRole = formatRole(member);
          const nameMatch = member.name.toLowerCase().includes(searchTerm.toLowerCase());
          const emailMatch = member.email.toLowerCase().includes(searchTerm.toLowerCase());
          const roleMatch = memberRole.toLowerCase().includes(searchTerm.toLowerCase());
          
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
    router.push('/dashboard/super-admin/members/add');
  };

  const handleEditMember = (userId: string) => {
    router.push(`/dashboard/super-admin/members/${userId}/edit`);
  };

  const handleManageRole = (userId: string) => {
    router.push(`/dashboard/super-admin/members/${userId}/role`);
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
          throw new Error(data.error || 'Failed to delete member');
        }
        return;
      }

      // Close modal and refresh the members list
      setShowDeleteModal(false);
      setMemberToDelete(null);
      fetchData();
    } catch (error) {
      console.error('Error deleting member:', error);
      alert('Failed to delete member');
    }
  };

  const getLodgeName = (lodge: { _id: string; name: string; number?: string } | string | null) => {
    if (!lodge) {
      return 'No Lodge';
    }
    if (typeof lodge === 'object') {
      return lodge.name || 'Unknown Lodge';
    }
    const foundLodge = lodges.find(l => l._id === lodge);
    return foundLodge ? foundLodge.name : 'Unknown Lodge';
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
    return new Date(dateString).toLocaleDateString();
  };

  // Calculate pagination
  const indexOfLastMember = currentPage * membersPerPage;
  const indexOfFirstMember = indexOfLastMember - membersPerPage;
  const currentMembers = filteredMembers.slice(indexOfFirstMember, indexOfLastMember);
  const totalPages = Math.ceil(filteredMembers.length / membersPerPage);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
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
      {/* Header with Add Button */}
      <div className="flex justify-between items-start mb-8">
        <div>
        <h1 className="text-3xl font-semibold text-gray-900">Member Management</h1>
        <p className="mt-2 text-gray-600">View, edit, and create members with lodge memberships and administrative roles.</p>
        </div>
        <div className="flex flex-col items-end">
          <button
            onClick={handleAddMember}
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
          >
            <PlusIcon className="h-6 w-6 mr-2" />
            Add New Member
          </button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <UserGroupIcon className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Members</p>
              <p className="text-2xl font-semibold text-gray-900">{members.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <UserGroupIcon className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Active Members</p>
              <p className="text-2xl font-semibold text-gray-900">
                {members.filter(member => member.status === 'active').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <UserGroupIcon className="h-8 w-8 text-red-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Inactive Members</p>
              <p className="text-2xl font-semibold text-gray-900">
                {members.filter(member => member.status === 'inactive').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <BuildingLibraryIcon className="h-8 w-8 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Lodges</p>
              <p className="text-2xl font-semibold text-gray-900">{lodges.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white shadow rounded-lg p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Search */}
          <div className="md:col-span-2">
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
              Search Members
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                id="search"
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Search by name, email, or role"
                value={searchTerm}
                onChange={handleSearchChange}
              />
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              id="status-filter"
              className="block w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900 bg-white"
              value={statusFilter}
              onChange={handleStatusFilterChange}
            >
              <option value="all" className="text-gray-900">All Statuses</option>
              <option value="active" className="text-gray-900">Active</option>
              <option value="inactive" className="text-gray-900">Inactive</option>
            </select>
          </div>

          {/* Role Filter */}
          <div>
            <label htmlFor="role-filter" className="block text-sm font-medium text-gray-700 mb-1">
              Role
            </label>
            <select
              id="role-filter"
              className="block w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900 bg-white"
              value={roleFilter}
              onChange={handleRoleFilterChange}
            >
              <option value="all" className="text-gray-900">All Roles</option>
              <option value="SUPER_ADMIN" className="text-gray-900">Super Admin</option>
              <option value="DISTRICT_ADMIN" className="text-gray-900">District Admin</option>
              <option value="LODGE_ADMIN" className="text-gray-900">Lodge Admin</option>
              <option value="LODGE_MEMBER" className="text-gray-900">Lodge Member</option>
            </select>
          </div>

          {/* Lodge Filter */}
          <div>
            <label htmlFor="lodge-filter" className="block text-sm font-medium text-gray-700 mb-1">
              Lodge
            </label>
            <select
              id="lodge-filter"
              className="block w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900 bg-white"
              value={lodgeFilter}
              onChange={handleLodgeFilterChange}
            >
              <option value="all" className="text-gray-900">All Lodges</option>
              {lodges.map(lodge => (
                <option key={lodge._id} value={lodge._id} className="text-gray-900">
                  {lodge.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Members Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden mb-8">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Member
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Primary Lodge
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Roles & Memberships
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>

                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentMembers.length > 0 ? (
                currentMembers.map(member => (
                  <tr key={member._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          {member.profileImage ? (
                            <img
                              className="h-10 w-10 rounded-full object-cover"
                              src={member.profileImage}
                              alt={member.name}
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                              <UserGroupIcon className="h-6 w-6 text-gray-400" />
                            </div>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{member.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 flex items-center">
                        <EnvelopeIcon className="h-4 w-4 mr-1 text-gray-400" />
                        {member.email}
                      </div>
                      {member.phone && (
                        <div className="text-sm text-gray-500 flex items-center mt-1">
                          <PhoneIcon className="h-4 w-4 mr-1 text-gray-400" />
                          {member.phone}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {member.primaryLodge ? getLodgeName(member.primaryLodge) : getLodgeName(member.lodge)}
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
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          member.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : member.status === 'inactive'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {member.status}
                      </span>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleEditMember(member._id)}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                        title="Edit Member Details"
                      >
                        <PencilSquareIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleManageRole(member._id)}
                        className="text-purple-600 hover:text-purple-900 mr-4"
                        title="Manage Role & Permissions"
                      >
                        <BuildingLibraryIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteMember(member)}
                        className="text-red-600 hover:text-red-900"
                        title="Delete Member"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    No members found matching your criteria
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {filteredMembers.length > membersPerPage && (
        <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 rounded-lg shadow">
          <div className="flex flex-1 justify-between sm:hidden">
            <button
              onClick={() => paginate(currentPage > 1 ? currentPage - 1 : 1)}
              disabled={currentPage === 1}
              className={`relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium ${
                currentPage === 1 ? 'text-gray-300' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              Previous
            </button>
            <button
              onClick={() => paginate(currentPage < totalPages ? currentPage + 1 : totalPages)}
              disabled={currentPage === totalPages}
              className={`relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium ${
                currentPage === totalPages ? 'text-gray-300' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
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
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button
                  onClick={() => paginate(currentPage > 1 ? currentPage - 1 : 1)}
                  disabled={currentPage === 1}
                  className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium ${
                    currentPage === 1 ? 'text-gray-300' : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span className="sr-only">Previous</span>
                  <ChevronLeftIcon className="h-5 w-5" aria-hidden="true" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(number => (
                  <button
                    key={number}
                    onClick={() => paginate(number)}
                    className={`relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium ${
                      currentPage === number
                        ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                        : 'text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    {number}
                  </button>
                ))}
                <button
                  onClick={() => paginate(currentPage < totalPages ? currentPage + 1 : totalPages)}
                  disabled={currentPage === totalPages}
                  className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${
                    currentPage === totalPages ? 'text-gray-300' : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span className="sr-only">Next</span>
                  <ChevronRightIcon className="h-5 w-5" aria-hidden="true" />
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && memberToDelete && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Delete Member</h3>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setMemberToDelete(null);
                }}
                className="text-gray-400 hover:text-gray-500"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Are you sure you want to permanently delete <strong>{memberToDelete.name}</strong>? This action cannot be undone and will remove all associated data.
            </p>
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setMemberToDelete(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteMember}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Delete Member
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 