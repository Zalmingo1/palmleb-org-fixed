'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { MagnifyingGlassIcon, PencilIcon, UserPlusIcon, XMarkIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';

// Define the Member interface
interface Member {
  _id: string;
  name: string;
  email: string;
  role: string;
  lodges: string[];
  primaryLodge: string;
  created: string;
  status: 'active' | 'inactive';
  administeredLodges?: string[];
  profileImage?: string;
}

// Define the form data interface
interface MemberFormData {
  name: string;
  email: string;
  password: string;
  role: string;
  lodges: string[];
  primaryLodge: string;
}

export default function DistrictMembersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const action = searchParams?.get('action') || null;
  const userId = searchParams?.get('id') || null;
  
  // State for members list
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // State for search
  const [searchQuery, setSearchQuery] = useState('');
  
  // State for form
  const [formData, setFormData] = useState<MemberFormData>({
    name: '',
    email: '',
    password: '',
    role: 'member',
    lodges: ['District Lodge'],
    primaryLodge: 'District Lodge',
  });
  
  // State for form submission
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  
  // State for user role and lodge
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    role: string;
    administeredLodges?: string[];
    primaryLodge: string;
  } | null>(null);
  
  // State for showing the form modal
  const [showForm, setShowForm] = useState(false);
  const [formMode, setFormMode] = useState<'add' | 'edit'>('add');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  
  // Fetch current user data on component mount
  useEffect(() => {
    const userJson = sessionStorage.getItem('user');
    if (userJson) {
      try {
        const userData = JSON.parse(userJson);
        setCurrentUser({
          id: userData._id,
          role: userData.role,
          administeredLodges: userData.administeredLodges || [],
          primaryLodge: userData.primaryLodge || ''
        });
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
    }
  }, []);
  
  // Fetch members on component mount
  useEffect(() => {
    fetchDistrictMembers();
  }, []);
  
  // Handle URL parameters for showing form
  useEffect(() => {
    if (action === 'add') {
      openAddForm();
    } else if (action === 'edit' && userId) {
      const member = members.find(m => m._id === userId);
      if (member) {
        setSelectedMember(member);
        setShowForm(true);
      }
    }
  }, [action, userId, members]);
  
  // Function to fetch district members
  const fetchDistrictMembers = async (query = '') => {
    setIsLoading(true);
    setError(null);

    try {
      // In a real app, this would filter by district lodge
      // For now, we'll fetch all members and filter client-side
      const url = query ? `/api/members?search=${encodeURIComponent(query)}` : '/api/members';

      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        let errorMessage = 'Failed to fetch members';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          errorMessage = `${errorMessage}: ${response.statusText}`;
        }

        throw new Error(errorMessage);
      }

      const data = await response.json();
      
      // Filter for district lodge members only
      // In a real app, this would be done server-side
      const membersData = Array.isArray(data) ? data : data.members || [];
      const districtMembers = membersData.filter((member: Member) => 
        member.lodges.includes('District Lodge') || 
        member.primaryLodge === 'District Lodge'
      );
      
      setMembers(districtMembers);
    } catch (err: any) {
      console.error('Error fetching district members:', err);
      setError(err.message || 'Failed to load district members. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchDistrictMembers(searchQuery);
  };
  
  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  // Open add form
  const openAddForm = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'member',
      lodges: ['District Lodge'],
      primaryLodge: 'District Lodge',
    });
    
    setFormMode('add');
    setSelectedMember(null);
    setFormError(null);
    setFormSuccess(null);
    setShowForm(true);
  };
  
  // Open edit form
  const openEditForm = (member: Member) => {
    setFormData({
      name: member.name,
      email: member.email,
      password: '', // Password is empty when editing
      role: member.role,
      lodges: member.lodges,
      primaryLodge: member.primaryLodge,
    });
    
    setFormMode('edit');
    setSelectedMember(member);
    setFormError(null);
    setFormSuccess(null);
    setShowForm(true);
  };
  
  // Close form
  const closeForm = () => {
    setShowForm(false);
    setFormError(null);
    setFormSuccess(null);
    
    // Reset URL
    router.push('/dashboard/super-admin/district-members');
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setIsSubmitting(true);
    setFormError(null);
    setFormSuccess(null);
    
    try {
      // Ensure District Lodge is included
      if (!formData.lodges.includes('District Lodge')) {
        formData.lodges.push('District Lodge');
      }
      
      // In a real app, this would be an API call
      if (formMode === 'add') {
        // Create new member
        const newMember: Omit<Member, '_id'> = {
          name: formData.name,
          email: formData.email,
          role: formData.role as Member['role'],
          lodges: formData.lodges,
          primaryLodge: formData.primaryLodge,
          created: new Date().toISOString(),
          status: 'active'
        };
        
        // In a real app, this would be a POST request to create the member
        // For demo, just add to the local state
        const memberWithId = { ...newMember, _id: `temp-${Date.now()}` };
        setMembers([...members, memberWithId]);
        
        setFormSuccess(`District member ${formData.name} created successfully.`);
        
        // Reset form
        setFormData({
          name: '',
          email: '',
          password: '',
          role: 'member',
          lodges: ['District Lodge'],
          primaryLodge: 'District Lodge',
        });
      } else {
        // Update existing member
        if (!selectedMember) return;
        
        const updatedMember = {
          ...selectedMember,
          name: formData.name,
          email: formData.email,
          role: formData.role as Member['role'],
          lodges: formData.lodges,
          primaryLodge: formData.primaryLodge
        };
        
        // In a real app, this would be a PUT/PATCH request to update the member
        // For demo, just update the local state
        setMembers(members.map(m => m._id === updatedMember._id ? updatedMember : m));
        
        setFormSuccess(`District member ${formData.name} updated successfully.`);
        
        // Close the form after successful update
        setTimeout(() => {
          setShowForm(false);
        }, 1500);
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      setFormError('An error occurred while submitting the form. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">District Lodge Members</h1>
          <p className="text-gray-600">Manage members of the district lodge</p>
        </div>
        <button
          className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded flex items-center"
          onClick={openAddForm}
        >
          <UserPlusIcon className="h-5 w-5 mr-2" />
          Add District Member
        </button>
      </div>
      
      <div className="mb-6">
        <form onSubmit={handleSearch} className="flex">
          <div className="relative flex-grow">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
              placeholder="Search district members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button
            type="submit"
            className="ml-3 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
          >
            Search
          </button>
        </form>
      </div>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {isLoading ? (
        <div className="text-center py-10">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
          <p className="mt-2 text-gray-600">Loading district members...</p>
        </div>
      ) : members.length === 0 ? (
        <div className="text-center py-10 bg-white shadow rounded-lg">
          <p className="text-gray-600">No district members found.</p>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Member
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Other Lodges
                </th>
                <th scope="col" className="relative px-6 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {members.map((member) => (
                <tr key={member._id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <Image
                          className="h-10 w-10 rounded-full object-cover"
                          src={member.profileImage || '/images/default-profile.png'}
                          alt={member.name}
                          width={40}
                          height={40}
                        />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{member.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{member.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      member.role === 'SUPER_ADMIN' 
                        ? 'bg-purple-100 text-purple-800' 
                        : member.role === 'LODGE_ADMIN'
                          ? 'bg-indigo-100 text-indigo-800'
                          : 'bg-green-100 text-green-800'
                    }`}>
                      {member.role === 'SUPER_ADMIN' 
                        ? 'Super Admin' 
                        : member.role === 'LODGE_ADMIN'
                          ? 'Lodge Admin'
                          : 'Member'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div>
                      {member.lodges
                        .filter(lodge => lodge !== 'District Lodge')
                        .map((lodge, index, array) => (
                          <span key={index}>
                            {lodge}
                            {index < array.length - 1 ? ', ' : ''}
                          </span>
                        ))}
                      {member.lodges.filter(lodge => lodge !== 'District Lodge').length === 0 && (
                        <span className="text-gray-400">None</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => openEditForm(member)}
                      className="text-indigo-600 hover:text-indigo-900 flex items-center inline-flex"
                    >
                      <PencilIcon className="h-4 w-4 mr-1" />
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {/* Member Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                {formMode === 'add' ? 'Add District Member' : 'Edit District Member'}
              </h3>
              <button
                onClick={closeForm}
                className="text-gray-400 hover:text-gray-500"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            {formError && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                {formError}
              </div>
            )}
            
            {formSuccess && (
              <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
                {formSuccess}
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="name">
                  Full Name
                </label>
                <input
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  id="name"
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">
                  Email
                </label>
                <input
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  id="email"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              {formMode === 'add' && (
                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">
                    Password
                  </label>
                  <input
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    id="password"
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                    minLength={6}
                  />
                  <p className="text-gray-600 text-xs italic mt-1">
                    Password must be at least 6 characters long.
                  </p>
                </div>
              )}
              
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="role">
                  Role in District Lodge
                </label>
                <select
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  required
                >
                  <option value="" disabled>-- Select a Role --</option>
                  
                  {/* Administrative Roles */}
                  <optgroup label="Administrative Roles">
                    <option value="SUPER_ADMIN">Super Admin</option>
                    <option value="LODGE_ADMIN">Lodge Admin</option>
                  </optgroup>
                  
                  {/* Elected Officers */}
                  <optgroup label="Elected Officers">
                    <option value="WORSHIPFUL_MASTER">Worshipful Master</option>
                    <option value="SENIOR_WARDEN">Senior Warden</option>
                    <option value="JUNIOR_WARDEN">Junior Warden</option>
                    <option value="TREASURER">Treasurer</option>
                    <option value="SECRETARY">Secretary</option>
                  </optgroup>
                  
                  {/* Appointed Officers */}
                  <optgroup label="Appointed Officers">
                    <option value="SENIOR_DEACON">Senior Deacon</option>
                    <option value="JUNIOR_DEACON">Junior Deacon</option>
                    <option value="SENIOR_STEWARD">Senior Steward</option>
                    <option value="JUNIOR_STEWARD">Junior Steward</option>
                    <option value="CHAPLAIN">Chaplain</option>
                    <option value="MARSHAL">Marshal</option>
                    <option value="TYLER">Tyler</option>
                    <option value="MUSICIAN">Musician</option>
                  </optgroup>
                  
                  {/* Other Positions */}
                  <optgroup label="Other Positions">
                    <option value="MASTER_OF_CEREMONIES">Master of Ceremonies</option>
                    <option value="HISTORIAN">Historian</option>
                    <option value="LODGE_EDUCATION_OFFICER">Lodge Education Officer</option>
                    <option value="ALMONER">Almoner</option>
                  </optgroup>
                  
                  {/* Regular Member */}
                  <optgroup label="Regular Member">
                    <option value="LODGE_MEMBER">Regular Member</option>
                  </optgroup>
                </select>
              </div>
              
              <div className="flex items-center justify-between pt-2">
                <button
                  className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                  type="submit"
                  disabled={isSubmitting}
                >
                  {isSubmitting 
                    ? (formMode === 'add' ? 'Creating...' : 'Updating...') 
                    : (formMode === 'add' ? 'Create Member' : 'Update Member')}
                </button>
                <button
                  className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                  type="button"
                  onClick={closeForm}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
} 