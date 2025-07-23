"use client";
import { useEffect, useState } from 'react';

interface Admin {
  _id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  lodgeId?: string;
  lodge?: Lodge;
  lodges?: string[];
  primaryLodge?: string;
  administeredLodges?: string[];
  lodgeRoles?: { [key: string]: string };
  lodgeMemberships?: Array<{
    lodge: string;
    position: string;
    startDate?: string;
    isActive?: boolean;
  }>;
}

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
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
  location: string;
}

export default function ManageAdminsPage() {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [lodges, setLodges] = useState<Lodge[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [currentAdmin, setCurrentAdmin] = useState<Admin | null>(null);
  const [adminToRemove, setAdminToRemove] = useState<Admin | null>(null);
  const [form, setForm] = useState<Partial<Admin & { password?: string }>>({ name: '', email: '', role: 'LODGE_ADMIN', status: 'active', password: '' });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAdmins();
    fetchUsers();
    fetchLodges();
  }, []);

  const fetchAdmins = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (!token) {
        console.error('No token found');
        setError('Authentication required');
        return;
      }

      const timestamp = Date.now();
      const res = await fetch(`/api/members?t=${timestamp}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        console.error('Failed to fetch members:', errorData);
        setError(errorData.error || 'Failed to fetch members');
        return;
      }
      
      const data = await res.json();
      console.log('Fetched members:', data);
      
      if (Array.isArray(data)) {
        const adminUsers = data.filter((u: Admin) => ["SUPER_ADMIN", "DISTRICT_ADMIN", "LODGE_ADMIN"].includes(u.role));
        console.log('Filtered admin users:', adminUsers);
        console.log('Admin users count:', adminUsers.length);
        setAdmins(adminUsers);
      } else {
        console.error('Expected array but got:', typeof data, data);
        setError('Invalid data format received');
      }
    } catch (error) {
      console.error('Error fetching admins:', error);
      setError('Failed to fetch admins');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (!token) {
        console.error('No token found');
        return;
      }

      const timestamp = Date.now();
      const res = await fetch(`/api/members?t=${timestamp}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      if (!res.ok) {
        console.error('Failed to fetch users');
        return;
      }
      
      const data = await res.json();
      console.log('Fetched users data:', data);
      if (Array.isArray(data)) {
        // Filter out users who are already admins
        const nonAdminUsers = data.filter((u: User) => !["SUPER_ADMIN", "DISTRICT_ADMIN", "LODGE_ADMIN"].includes(u.role));
        console.log('Filtered non-admin users:', nonAdminUsers);
        setUsers(nonAdminUsers);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const fetchLodges = async () => {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (!token) {
        console.error('No token found');
        return;
      }

      const res = await fetch('/api/lodges', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!res.ok) {
        console.error('Failed to fetch lodges');
        return;
      }
      
      const data = await res.json();
      if (Array.isArray(data)) {
        setLodges(data);
      }
    } catch (error) {
      console.error('Failed to fetch lodges:', error);
    }
  };

  const handleUserSelect = (userId: string) => {
    const selectedUser = users.find(u => u._id === userId);
    if (selectedUser) {
      setForm({
        _id: selectedUser._id,
        name: selectedUser.name,
        email: selectedUser.email,
        role: 'LODGE_ADMIN',
        status: 'active'
      });
    }
  };

  const getLodgeName = (lodge: { _id: string; name: string; location?: string } | string | null) => {
    if (!lodge) return 'No Lodge';
    if (typeof lodge === 'object') {
      return lodge.name || 'Unknown Lodge';
    }
    const lodgeObj = lodges.find(l => l._id === lodge);
    return lodgeObj ? lodgeObj.name : 'Unknown Lodge';
  };

  const formatRole = (admin: Admin) => {
    const roleMap: { [key: string]: string } = {
      'SUPER_ADMIN': 'Super Admin',
      'DISTRICT_ADMIN': 'District Admin',
      'LODGE_ADMIN': 'Lodge Admin',
      'LODGE_MEMBER': 'Lodge Member',
      'REGULAR_USER': 'Regular User'
    };

    // If admin has lodgeRoles, show all lodge memberships
    if (admin.lodgeRoles && Object.keys(admin.lodgeRoles).length > 0) {
      const allRoles: string[] = [];
      
      // Check all lodge roles for all positions
      Object.entries(admin.lodgeRoles).forEach(([lodgeId, role]) => {
        const lodgeName = getLodgeName(lodgeId);
        const roleDisplay = roleMap[role] || role;
        allRoles.push(`${roleDisplay} (${lodgeName})`);
      });
      
      return allRoles.join(', ');
    }
    
    // If admin has an admin role but no lodgeRoles, show the admin role with primary lodge
    if (admin.role === 'LODGE_ADMIN' || admin.role === 'DISTRICT_ADMIN' || admin.role === 'SUPER_ADMIN') {
      const roleDisplay = roleMap[admin.role] || admin.role;
      if (admin.primaryLodge) {
        const lodgeName = getLodgeName(admin.primaryLodge);
        return `${roleDisplay} (${lodgeName})`;
      } else {
        return roleDisplay;
      }
    }
    
    // If no lodgeRoles but has lodges array, show basic membership
    if (admin.lodges && admin.lodges.length > 0) {
      const lodgeMemberships: string[] = [];
      // Use Set to deduplicate lodge IDs
      const uniqueLodgeIds = Array.from(new Set(admin.lodges));
      uniqueLodgeIds.forEach((lodgeId: string) => {
        const lodgeName = getLodgeName(lodgeId);
        lodgeMemberships.push(`Lodge Member (${lodgeName})`);
      });
      return lodgeMemberships.join(', ');
    }
    
    // If no lodges array but has lodgeMemberships, show basic membership
    if (admin.lodgeMemberships && admin.lodgeMemberships.length > 0) {
      const lodgeMemberships: string[] = [];
      // Use Set to deduplicate lodge IDs
      const uniqueLodgeIds = Array.from(new Set(admin.lodgeMemberships.map((membership: any) => membership.lodge)));
      uniqueLodgeIds.forEach((lodgeId: unknown) => {
        const lodgeName = getLodgeName(lodgeId as string);
        lodgeMemberships.push(`Lodge Member (${lodgeName})`);
      });
      return lodgeMemberships.join(', ');
    }
    
    // Fall back to the main role field
    return roleMap[admin.role] || admin.role;
  };

  const getUserAvailableLodges = (user: Admin | User | null): Lodge[] => {
    if (!user) return [];
    
    console.log('Getting available lodges for user:', user);
    console.log('User lodges:', user.lodges);
    console.log('User primary lodge:', user.primaryLodge);
    
    const userLodgeIds = [
      ...(user.lodges || []),
      ...(user.primaryLodge ? [user.primaryLodge] : [])
    ];
    
    console.log('Combined lodge IDs:', userLodgeIds);
    
    // Remove duplicates using filter
    const uniqueLodgeIds = userLodgeIds.filter((id, index, array) => array.indexOf(id) === index);
    
    console.log('Unique lodge IDs:', uniqueLodgeIds);
    console.log('Available lodges:', lodges);
    
    const availableLodges = lodges.filter(lodge => uniqueLodgeIds.includes(lodge._id));
    console.log('Filtered available lodges:', availableLodges);
    
    return availableLodges;
  };

  const getAvailableRolesForLodge = (selectedLodge: string | undefined): string[] => {
    if (!selectedLodge) return ['SUPER_ADMIN', 'DISTRICT_ADMIN', 'LODGE_ADMIN', 'LODGE_MEMBER'];
    
    // If a specific lodge is selected, limit role options
    const lodge = lodges.find(l => l._id === selectedLodge);
    if (!lodge) return ['SUPER_ADMIN', 'DISTRICT_ADMIN', 'LODGE_ADMIN', 'LODGE_MEMBER'];
    
    // District Admin can only be assigned if the user belongs to the District Grand Lodge
    if (lodge.name === 'District Grand Lodge of Syria-Lebanon') {
      return ['SUPER_ADMIN', 'DISTRICT_ADMIN', 'LODGE_ADMIN', 'LODGE_MEMBER'];
    } else {
      // For other lodges, District Admin is not available
      return ['SUPER_ADMIN', 'LODGE_ADMIN', 'LODGE_MEMBER'];
    }
  };

  const handleAdd = async () => {
    setSubmitting(true);
    setMessage(null);
    setError(null);
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (!token) {
        setError('Authentication required');
        return;
      }

      const res = await fetch(`/api/members/${form._id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          role: form.role,
          status: form.status,
          lodgeId: form.lodgeId
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to add admin');
      } else {
        setMessage('Admin added successfully');
        setShowAddModal(false);
        setForm({ name: '', email: '', role: 'LODGE_ADMIN', status: 'active' });
        fetchAdmins();
      }
    } catch (error) {
      console.error('Error adding admin:', error);
      setError('Failed to add admin');
    }
    setSubmitting(false);
  };

  const handleEdit = async () => {
    setSubmitting(true);
    setMessage(null);
    setError(null);
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (!token) {
        setError('Authentication required');
        return;
      }

      // Prepare the data to send to the role change API
      const roleChangeData = {
        newRole: form.role,
        targetUserId: currentAdmin?._id,
        lodgeId: form.role === 'LODGE_ADMIN' ? form.lodgeId : undefined
      };

      const res = await fetch(`/api/members/${currentAdmin?._id}/role`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(roleChangeData),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to update admin');
      } else {
        setMessage('Admin updated successfully');
        setShowEditModal(false);
        setCurrentAdmin(null);
        setForm({ name: '', email: '', role: 'LODGE_ADMIN', status: 'active', password: '' });
        fetchAdmins();
      }
    } catch (error) {
      console.error('Error updating admin:', error);
      setError('Failed to update admin');
    }
    setSubmitting(false);
  };

  const handleRemoveAdminPrivileges = async (admin: Admin) => {
    setSubmitting(true);
    setMessage(null);
    setError(null);
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (!token) {
        setError('Authentication required');
        return;
      }

      // Change the admin's role back to LODGE_MEMBER
      const res = await fetch(`/api/members/${admin._id}/role`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          newRole: 'LODGE_MEMBER',
          targetUserId: admin._id
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to remove admin privileges');
      } else {
        setMessage('Admin privileges removed successfully');
        console.log('Admin removed successfully, refreshing data...');
        // Force refresh with a small delay to ensure the API has processed the change
        setTimeout(() => {
          fetchAdmins();
          fetchUsers(); // Refresh the users list since this person is now a regular user
        }, 500);
      }
    } catch (error) {
      console.error('Error removing admin privileges:', error);
      setError('Failed to remove admin privileges');
    }
    setSubmitting(false);
  };

  return (
    <div className="w-full max-w-none py-8 px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Manage Admins</h1>
        <div className="flex space-x-2">
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            onClick={() => setShowAddModal(true)}
          >
            Add Admin
          </button>
          <button
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 border border-gray-300"
            onClick={() => {
              setLoading(true);
              fetchAdmins();
              fetchUsers();
            }}
            disabled={loading}
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>
      {loading ? (
        <div className="flex justify-center items-center min-h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-900"></div>
        </div>
      ) : (
        <table className="min-w-full divide-y divide-gray-200 bg-white rounded shadow">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Roles & Memberships</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Primary Lodge</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {admins.map((admin) => (
              <tr key={admin._id}>
                <td className="px-6 py-4 whitespace-nowrap text-gray-900">{admin.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-900">{admin.email}</td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-1">
                    {formatRole(admin).split(', ').map((role, index) => {
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
                <td className="px-6 py-4 whitespace-nowrap text-gray-900">{admin.status}</td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                  {admin.primaryLodge ? getLodgeName(admin.primaryLodge) : 
                   admin.role === 'DISTRICT_ADMIN'
                     ? 'District Grand Lodge of Syria-Lebanon'
                     : admin.role === 'LODGE_ADMIN' && admin.lodge && admin.lodge.name
                       ? admin.lodge.name
                       : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <button
                    className="px-2 py-1 text-blue-600 hover:underline mr-2"
                    onClick={() => {
                      console.log('Edit button clicked for admin:', admin);
                      setCurrentAdmin(admin);
                      const formData = {
                        ...admin,
                        lodgeId: admin.lodgeId || (admin.lodge ? admin.lodge._id : undefined)
                      };
                      console.log('Setting form data:', formData);
                      setForm(formData);
                      setShowEditModal(true);
                    }}
                  >Edit</button>
                  <button
                    className="px-2 py-1 text-red-600 hover:underline"
                    onClick={() => {
                      setAdminToRemove(admin);
                      setShowRemoveModal(true);
                    }}
                  >Remove Admin</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {message && <div className="mb-4 text-green-600">{message}</div>}
      {error && <div className="mb-4 text-red-600">{error}</div>}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-lg font-semibold mb-4">Add Admin</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select User</label>
                <select
                  className="w-full border rounded px-3 py-2 text-gray-900"
                  onChange={(e) => handleUserSelect(e.target.value)}
                  value={form._id || ''}
                >
                  <option value="">-- Select a user --</option>
                  {users.map((user) => (
                    <option key={user._id} value={user._id}>
                      {user.name} ({user.email})
                    </option>
                  ))}
                </select>
              </div>
              {form._id && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Select Lodge</label>
                    <select
                      className="w-full border rounded px-3 py-2 text-gray-900"
                      value={form.lodgeId || ''}
                      onChange={e => setForm(f => ({ ...f, lodgeId: e.target.value }))}
                      required
                    >
                      <option value="">-- Select a lodge --</option>
                      {getUserAvailableLodges(users.find(u => u._id === form._id) || null).map((lodge) => (
                        <option key={lodge._id} value={lodge._id}>
                          {lodge.name} ({lodge.location})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                    <select
                      className="w-full border rounded px-3 py-2 text-gray-900"
                      value={form.role}
                      onChange={e => setForm(f => ({ 
                        ...f, 
                        role: e.target.value, 
                        administeredLodges: e.target.value === 'LODGE_MEMBER' ? [] : f.administeredLodges
                      }))}
                    >
                      {getAvailableRolesForLodge(form.lodgeId).map(role => (
                        <option key={role} value={role}>
                          {role === 'SUPER_ADMIN' ? 'Super Admin' : 
                           role === 'DISTRICT_ADMIN' ? 'District Admin' : 
                           role === 'LODGE_ADMIN' ? 'Lodge Admin' : 
                           role === 'LODGE_MEMBER' ? 'Lodge Member' : role}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                    <select
                      className="w-full border rounded px-3 py-2 text-gray-900"
                      value={form.status}
                      onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </>
              )}
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50"
                disabled={submitting}
              >Cancel</button>
              <button
                onClick={handleAdd}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                disabled={submitting || !form._id || (form.role === 'LODGE_ADMIN' && !form.lodgeId)}
              >{submitting ? 'Adding...' : 'Add'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && currentAdmin && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-lg font-semibold mb-4">Edit Admin</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Lodge</label>
                <select
                  className="w-full border rounded px-3 py-2 text-gray-900"
                  value={form.lodgeId || ''}
                  onChange={e => setForm(f => ({ ...f, lodgeId: e.target.value }))}
                  required
                >
                  <option value="">-- Select a lodge --</option>
                  {getUserAvailableLodges(currentAdmin).map((lodge) => (
                    <option key={lodge._id} value={lodge._id}>
                      {lodge.name} ({lodge.location})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                <select
                  className="w-full border rounded px-3 py-2 text-gray-900"
                  value={form.role}
                  onChange={e => setForm(f => ({ 
                    ...f, 
                    role: e.target.value, 
                    administeredLodges: e.target.value === 'LODGE_MEMBER' ? [] : f.administeredLodges
                  }))}
                >
                  {getAvailableRolesForLodge(form.lodgeId).map(role => (
                    <option key={role} value={role}>
                      {role === 'SUPER_ADMIN' ? 'Super Admin' : 
                       role === 'DISTRICT_ADMIN' ? 'District Admin' : 
                       role === 'LODGE_ADMIN' ? 'Lodge Admin' : 
                       role === 'LODGE_MEMBER' ? 'Lodge Member' : role}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  className="w-full border rounded px-3 py-2 text-gray-900"
                  value={form.status}
                  onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50"
                disabled={submitting}
              >Cancel</button>
              <button
                onClick={handleEdit}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                disabled={submitting || (form.role === 'LODGE_ADMIN' && !form.lodgeId)}
              >{submitting ? 'Saving...' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Remove Admin Modal */}
      {showRemoveModal && adminToRemove && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-lg font-semibold mb-4">Remove Admin Privileges</h2>
            <div className="space-y-4">
              <p className="text-gray-700">
                Are you sure you want to remove admin privileges from <strong>{adminToRemove.name}</strong> ({adminToRemove.email})?
              </p>
              <p className="text-sm text-gray-500">
                This will change their role to "Lodge Member" and remove all admin privileges.
              </p>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowRemoveModal(false);
                  setAdminToRemove(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50"
                disabled={submitting}
              >Cancel</button>
              <button
                onClick={() => {
                  handleRemoveAdminPrivileges(adminToRemove);
                  setShowRemoveModal(false);
                  setAdminToRemove(null);
                }}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                disabled={submitting}
              >{submitting ? 'Removing...' : 'Remove Admin'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 