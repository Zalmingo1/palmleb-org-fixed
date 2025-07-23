'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeftIcon, ShieldCheckIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface Member {
  _id: string;
  name: string;
  email: string;
  currentRole: string;
  isInUserCollection: boolean;
}

interface RoleData {
  member: Member;
  availableRoles: string[];
  adminCounts: {
    superAdmins: number;
    districtAdmins: number;
  };
}

export default function ManageRolePage({ params }: { params: Promise<{ userId: string }> }) {
  const router = useRouter();
  const { userId } = use(params);
  const [roleData, setRoleData] = useState<RoleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    fetchRoleInfo();
  }, [userId]);

  const fetchRoleInfo = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = sessionStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch(`/api/members/${userId}/role`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          sessionStorage.removeItem('token');
          sessionStorage.removeItem('user');
          router.push('/login');
          return;
        }
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch role information');
      }

      const data = await response.json();
      setRoleData(data);
      setSelectedRole(data.member.currentRole);
    } catch (err) {
      console.error('Error fetching role info:', err);
      setError(err instanceof Error ? err.message : 'Failed to load role information');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async () => {
    if (!roleData || selectedRole === roleData.member.currentRole) {
      return;
    }

    try {
      setIsUpdating(true);
      setError(null);
      setSuccess(null);

      const token = sessionStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch(`/api/members/${userId}/role`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          newRole: selectedRole,
          targetUserId: userId
        })
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          sessionStorage.removeItem('token');
          sessionStorage.removeItem('user');
          router.push('/login');
          return;
        }
        throw new Error(data.error || 'Failed to update role');
      }

      setSuccess(`Role updated successfully to ${selectedRole}`);
      setRoleData(prev => prev ? {
        ...prev,
        member: {
          ...prev.member,
          currentRole: selectedRole
        }
      } : null);
    } catch (err) {
      console.error('Error updating role:', err);
      setError(err instanceof Error ? err.message : 'Failed to update role');
    } finally {
      setIsUpdating(false);
    }
  };

  const getRoleDescription = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'Full system access, can manage all members, lodges, and system settings';
      case 'DISTRICT_ADMIN':
        return 'Can manage district lodges and members within their district';
      case 'LODGE_ADMIN':
        return 'Can manage their specific lodge and its members';
      case 'LODGE_MEMBER':
        return 'Regular member with basic access to lodge features';
      default:
        return '';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'DISTRICT_ADMIN':
        return 'text-purple-600 bg-purple-50 border-purple-200';
      case 'LODGE_ADMIN':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'LODGE_MEMBER':
        return 'text-gray-600 bg-gray-50 border-gray-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  if (loading) {
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

  if (!roleData) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-gray-500">No role data available</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-1" />
            Back to Members
          </button>
          
          <div className="flex items-center mb-6">
            <ShieldCheckIcon className="h-8 w-8 text-purple-600 mr-3" />
            <div>
              <h1 className="text-3xl font-semibold text-gray-900">Manage Member Role</h1>
              <p className="text-gray-600 mt-1">Update administrative privileges and access levels</p>
            </div>
          </div>
        </div>

        {/* Member Information */}
        <div className="bg-white shadow rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Member Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Name</label>
              <p className="mt-1 text-sm text-gray-900">{roleData.member.name}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <p className="mt-1 text-sm text-gray-900">{roleData.member.email}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Current Role</label>
              <div className={`mt-1 inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getRoleColor(roleData.member.currentRole)}`}>
                {roleData.member.currentRole.replace('_', ' ')}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Account Type</label>
              <p className="mt-1 text-sm text-gray-900">
                {roleData.member.isInUserCollection ? 'User Account' : 'Member Account'}
              </p>
            </div>
          </div>
        </div>

        {/* Role Management */}
        <div className="bg-white shadow rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Role Management</h2>
          
          {success && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md">
              <div className="flex">
                <div className="flex-shrink-0">
                  <ShieldCheckIcon className="h-5 w-5 text-green-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-green-800">{success}</p>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <div className="flex">
                <div className="flex-shrink-0">
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-6">
            <div>
              <label htmlFor="role-select" className="block text-sm font-medium text-gray-700 mb-2">
                Select New Role
              </label>
              <select
                id="role-select"
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="block w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900 bg-white"
              >
                {roleData.availableRoles.map((role) => (
                  <option key={role} value={role}>
                    {role.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>

            {selectedRole && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-900 mb-2">Role Description</h3>
                <p className="text-sm text-gray-600">{getRoleDescription(selectedRole)}</p>
              </div>
            )}

            {/* Admin Counts Warning */}
            {roleData.adminCounts.superAdmins <= 1 && roleData.member.currentRole === 'SUPER_ADMIN' && selectedRole !== 'SUPER_ADMIN' && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">Warning</h3>
                    <p className="text-sm text-yellow-700 mt-1">
                      This is currently the only Super Admin account. Demoting this account may result in loss of administrative access.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => router.back()}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                onClick={handleRoleChange}
                disabled={isUpdating || selectedRole === roleData.member.currentRole}
                className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                  isUpdating || selectedRole === roleData.member.currentRole
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {isUpdating ? 'Updating...' : 'Update Role'}
              </button>
            </div>
          </div>
        </div>

        {/* System Information */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">System Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Super Admins</label>
              <p className="mt-1 text-sm text-gray-900">{roleData.adminCounts.superAdmins}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">District Admins</label>
              <p className="mt-1 text-sm text-gray-900">{roleData.adminCounts.districtAdmins}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 