'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import mongoose from 'mongoose';

// Define role categories and positions
const ROLE_CATEGORIES = {
  ELECTED_OFFICERS: 'Elected Officers',
  APPOINTED_OFFICERS: 'Appointed Officers',
  OTHER_POSITIONS: 'Other Positions'
} as const;

type LodgePosition = 
  | 'WORSHIPFUL_MASTER' | 'SENIOR_WARDEN' | 'JUNIOR_WARDEN' | 'TREASURER' | 'SECRETARY'  // Elected Officers
  | 'SENIOR_DEACON' | 'JUNIOR_DEACON' | 'SENIOR_STEWARD' | 'JUNIOR_STEWARD' | 'CHAPLAIN' | 'MARSHAL' | 'TYLER' | 'MUSICIAN'  // Appointed Officers
  | 'MASTER_OF_CEREMONIES' | 'HISTORIAN' | 'LODGE_EDUCATION_OFFICER' | 'ALMONER' | 'MEMBER';  // Other Positions

const LODGE_POSITIONS: Record<keyof typeof ROLE_CATEGORIES, LodgePosition[]> = {
  ELECTED_OFFICERS: ['WORSHIPFUL_MASTER', 'SENIOR_WARDEN', 'JUNIOR_WARDEN', 'TREASURER', 'SECRETARY'],
  APPOINTED_OFFICERS: ['SENIOR_DEACON', 'JUNIOR_DEACON', 'SENIOR_STEWARD', 'JUNIOR_STEWARD', 'CHAPLAIN', 'MARSHAL', 'TYLER', 'MUSICIAN'],
  OTHER_POSITIONS: ['MASTER_OF_CEREMONIES', 'HISTORIAN', 'LODGE_EDUCATION_OFFICER', 'ALMONER', 'MEMBER']
};

// Helper function to format position display name
const formatPositionName = (position: string) => {
  return position
    .split('_')
    .map(word => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ');
};

interface PositionSelectProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  name: string;
  id: string;
  required?: boolean;
  className?: string;
  occupiedPositions?: string[];
  lodgeId?: string;
}

const PositionSelect: React.FC<PositionSelectProps> = ({ 
  value, 
  onChange, 
  name, 
  id, 
  required = false,
  className = "mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-masonic-blue focus:ring-masonic-blue sm:text-sm font-sans text-gray-900 bg-white",
  occupiedPositions = [],
  lodgeId
}) => (
  <select
    name={name}
    id={id}
    value={value}
    onChange={onChange}
    required={required}
    className={className}
  >
    <option value="">Select a position</option>
    {Object.entries(LODGE_POSITIONS).map(([category, positions]) => (
      <optgroup key={category} label={ROLE_CATEGORIES[category as keyof typeof ROLE_CATEGORIES]}>
        {positions.map(position => {
          const isOccupied = occupiedPositions.includes(position);
          return (
            <option 
              key={position} 
              value={position}
              disabled={isOccupied}
              className={isOccupied ? 'occupied-option' : ''}
            >
              {formatPositionName(position)}
              {isOccupied ? ' (Occupied)' : ''}
            </option>
          );
        })}
      </optgroup>
    ))}
  </select>
);

interface Member {
  _id: string;
  name: string;
  email: string;
  status: 'active' | 'inactive' | 'pending';
  primaryLodgePosition: string;
  lodges: string[];
  primaryLodge: string | null;
  administeredLodges: string[];
  occupation?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  lodgePositions?: { [lodgeId: string]: string };
  lodgeRoles?: { [lodgeId: string]: string };
}

interface Lodge {
  _id: string;
  name: string;
  location: string;
  description?: string;
}

export default function EditMemberPage({ params }: { params: Promise<{ userId: string }> }) {
  const router = useRouter();
  const { userId } = use(params);
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [lodges, setLodges] = useState<Lodge[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    status: 'active',
    primaryLodgePosition: '',
    lodges: [] as string[],
    primaryLodge: '',
    administeredLodges: [] as string[],
    occupation: '',
    city: '',
    state: '',
    zipCode: '',
    country: '',
    lodgePositions: {} as { [lodgeId: string]: string },
    lodgeRoles: {} as { [lodgeId: string]: string }
  });
  const [occupiedPositions, setOccupiedPositions] = useState<string[]>([]);
  const [additionalLodgeOccupiedPositions, setAdditionalLodgeOccupiedPositions] = useState<{[lodgeId: string]: string[]}>({});
  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    // Check if we're in the browser environment
    if (typeof window !== 'undefined') {
      console.log('Session storage available:', !!sessionStorage);
      console.log('Token in session storage:', !!sessionStorage.getItem('token'));
      console.log('User data in session storage:', !!sessionStorage.getItem('user'));
    }
    fetchLodges();
    fetchMember();
  }, [userId]);

  // Process member data when lodges are loaded
  useEffect(() => {
    if (member && lodges.length > 0) {
      console.log('Processing member data with lodges loaded:', member);
      console.log('Available lodges:', lodges);
      console.log('Member lodges array:', member.lodges);
      console.log('Member lodgePositions:', member.lodgePositions);
      
      // Find the lodge ID by name for primaryLodge
      let primaryLodgeId = '';
      if (member.primaryLodge && member.primaryLodge !== 'Unknown Lodge') {
        const primaryLodge = lodges.find(lodge => lodge.name === member.primaryLodge);
        primaryLodgeId = primaryLodge?._id || '';
        console.log('Found primary lodge:', primaryLodge);
        console.log('Primary lodge ID:', primaryLodgeId);
        console.log('Member primaryLodge name:', member.primaryLodge);
        console.log('Looking for lodge with name:', member.primaryLodge);
      }
      
      // The lodges array now contains lodge IDs directly
      const lodgeIds = member.lodges.filter((lodgeId: string) => lodgeId !== '');
      
      console.log('Lodge IDs found:', lodgeIds);
      console.log('Lodge positions being set:', member.lodgePositions || {});
      
      setFormData({
        name: member.name || '',
        email: member.email || '',
        status: member.status || 'active',
        primaryLodgePosition: member.primaryLodgePosition || '',
        lodges: lodgeIds,
        primaryLodge: primaryLodgeId,
        administeredLodges: member.administeredLodges || [],
        occupation: member.occupation || '',
        city: member.city || '',
        state: member.state || '',
        zipCode: member.zipCode || '',
        country: member.country || '',
        lodgePositions: member.lodgePositions || {},
        lodgeRoles: member.lodgeRoles || {}
      });
      
      console.log('Form data set with primaryLodge:', primaryLodgeId);
      console.log('Form data:', {
        name: member.name || '',
        email: member.email || '',
        status: member.status || 'active',
        primaryLodgePosition: member.primaryLodgePosition || '',
        lodges: lodgeIds,
        primaryLodge: primaryLodgeId,
        administeredLodges: member.administeredLodges || [],
        occupation: member.occupation || '',
        city: member.city || '',
        state: member.state || '',
        zipCode: member.zipCode || '',
        country: member.country || '',
        lodgePositions: member.lodgePositions || {}
      });
    }
  }, [member, lodges]);

  const fetchMember = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = sessionStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      console.log('Making API request to:', `/api/members/${userId}`);
      const response = await fetch(`/api/members/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
        
      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Response data:', data);
        
      if (!response.ok) {
        if (response.status === 401) {
          sessionStorage.removeItem('token');
          sessionStorage.removeItem('user');
          router.push('/login');
          return;
        }
        throw new Error(data.error || `Failed to fetch member data: ${response.status}`);
      }

      setMember(data);
    } catch (err) {
      console.error('Error fetching member:', err);
      setError(err instanceof Error ? err.message : 'Failed to load member details');
    } finally {
      setLoading(false);
    }
  };



  const fetchLodges = async () => {
    try {
      const token = sessionStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch(`/api/lodges`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setLodges(data);
      }
    } catch (err) {
      console.error('Error fetching lodges:', err);
    }
  };

  const fetchOccupiedPositions = async (lodgeId: string) => {
    try {
      const token = sessionStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch(`/api/lodges/${lodgeId}/positions`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setOccupiedPositions(data.occupiedPositions || []);
        console.log('Occupied positions for lodge:', lodgeId, data.occupiedPositions);
      } else {
        console.error('Failed to fetch occupied positions');
        setOccupiedPositions([]);
      }
    } catch (err) {
      console.error('Error fetching occupied positions:', err);
      setOccupiedPositions([]);
    }
  };

  const fetchAdditionalLodgeOccupiedPositions = async (lodgeId: string) => {
    try {
      const token = sessionStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch(`/api/lodges/${lodgeId}/positions`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAdditionalLodgeOccupiedPositions(prev => ({
          ...prev,
          [lodgeId]: data.occupiedPositions || []
        }));
        console.log('Occupied positions for additional lodge:', lodgeId, data.occupiedPositions);
      } else {
        console.error('Failed to fetch occupied positions for additional lodge');
        setAdditionalLodgeOccupiedPositions(prev => ({
          ...prev,
          [lodgeId]: []
        }));
      }
    } catch (err) {
      console.error('Error fetching occupied positions for additional lodge:', err);
      setAdditionalLodgeOccupiedPositions(prev => ({
        ...prev,
        [lodgeId]: []
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const token = sessionStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch(`/api/members/${userId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          sessionStorage.removeItem('token');
          sessionStorage.removeItem('user');
          router.push('/login');
          return;
        }
        throw new Error(data.error || 'Failed to update member');
      }

        router.push('/dashboard/super-admin/members');
    } catch (err) {
      console.error('Error updating member:', err);
      setError(err instanceof Error ? err.message : 'Failed to update member');
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    // Validate passwords
    if (passwordData.newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters long');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }

    try {
      const token = sessionStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch(`/api/users/${userId}/change-password`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ newPassword: passwordData.newPassword })
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          sessionStorage.removeItem('token');
          sessionStorage.removeItem('user');
          router.push('/login');
          return;
        }
        throw new Error(data.error || 'Failed to change password');
      }

      setPasswordSuccess('Password changed successfully');
      setPasswordData({ newPassword: '', confirmPassword: '' });
    } catch (err) {
      console.error('Error changing password:', err);
      setPasswordError(err instanceof Error ? err.message : 'Failed to change password');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // If primary lodge is changed, fetch occupied positions
    if (name === 'primaryLodge' && value) {
      fetchOccupiedPositions(value);
    }
  };

  // Helper function to get lodge name by ID
  const getLodgeName = (lodgeId: string) => {
    const lodge = lodges.find(l => l._id === lodgeId);
    return lodge ? lodge.name : 'Unknown Lodge';
  };

  // Helper function to get lodge location by ID
  const getLodgeLocation = (lodgeId: string) => {
    const lodge = lodges.find(l => l._id === lodgeId);
    return lodge ? lodge.location : '';
  };

  const handlePasswordInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
  };



  if (loading) {
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
          Back to Members
        </button>
        
        <h1 className="text-2xl font-semibold text-gray-900 mt-4">Edit Member</h1>
      </div>

      <div className="max-w-2xl space-y-6">
        {/* Member Information Form */}
        <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Member Information</h2>
          <div className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900"
                required
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900"
                required
              />
            </div>

            <div>
              <label htmlFor="occupation" className="block text-sm font-medium text-gray-700">
                Occupation
              </label>
              <input
                type="text"
                id="occupation"
                name="occupation"
                value={formData.occupation}
                onChange={handleInputChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="city" className="block text-sm font-medium text-gray-700">
                  City
                </label>
                <input
                  type="text"
                  id="city"
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900"
                />
              </div>

              <div>
                <label htmlFor="state" className="block text-sm font-medium text-gray-700">
                  State
                </label>
                <input
                  type="text"
                  id="state"
                  name="state"
                  value={formData.state}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="zipCode" className="block text-sm font-medium text-gray-700">
                  ZIP Code
                </label>
                <input
                  type="text"
                  id="zipCode"
                  name="zipCode"
                  value={formData.zipCode}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900"
                />
              </div>

              <div>
                <label htmlFor="country" className="block text-sm font-medium text-gray-700">
                  Country
                </label>
                <input
                  type="text"
                  id="country"
                  name="country"
                  value={formData.country}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900"
                />
              </div>
            </div>

            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                Status
              </label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900"
                required
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="pending">Pending</option>
              </select>
            </div>

            <div>
              <label htmlFor="primaryLodge" className="block text-sm font-medium text-gray-700">
                Main Lodge
              </label>
              <select
                id="primaryLodge"
                name="primaryLodge"
                value={formData.primaryLodge}
                onChange={handleInputChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900"
              >
                <option value="">Select a main lodge</option>
                {lodges.map((lodge) => (
                  <option key={lodge._id} value={lodge._id} className="text-gray-900">
                    {lodge.name} ({lodge.location})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="primaryLodgePosition" className="block text-sm font-medium text-gray-700">
                Primary Lodge Position
              </label>
              <PositionSelect
                name="primaryLodgePosition"
                id="primaryLodgePosition"
                value={formData.primaryLodgePosition}
                onChange={handleInputChange}
                occupiedPositions={occupiedPositions}
                lodgeId={formData.primaryLodge}
                required
              />
            </div>

            {/* Primary Lodge Administrative Role */}
            {formData.primaryLodge && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Administrative Role in Primary Lodge
                </label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="primaryLodgeRole"
                      value="LODGE_MEMBER"
                      checked={formData.lodgeRoles[formData.primaryLodge] === 'LODGE_MEMBER' || !formData.lodgeRoles[formData.primaryLodge]}
                      onChange={(e) => {
                        setFormData(prev => ({
                          ...prev,
                          lodgeRoles: {
                            ...prev.lodgeRoles,
                            [formData.primaryLodge]: e.target.value
                          }
                        }));
                      }}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-900">Lodge Member</span>
                  </label>
                  {(() => {
                    const primaryLodge = lodges.find(l => l._id === formData.primaryLodge);
                    if (primaryLodge && primaryLodge.name === 'District Grand Lodge of Syria-Lebanon') {
                      return (
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="primaryLodgeRole"
                            value="DISTRICT_ADMIN"
                            checked={formData.lodgeRoles[formData.primaryLodge] === 'DISTRICT_ADMIN'}
                            onChange={(e) => {
                              setFormData(prev => ({
                                ...prev,
                                lodgeRoles: {
                                  ...prev.lodgeRoles,
                                  [formData.primaryLodge]: e.target.value
                                }
                              }));
                            }}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                          />
                          <span className="ml-2 text-sm text-gray-900">District Admin</span>
                        </label>
                      );
                    } else {
                      return (
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="primaryLodgeRole"
                            value="LODGE_ADMIN"
                            checked={formData.lodgeRoles[formData.primaryLodge] === 'LODGE_ADMIN'}
                            onChange={(e) => {
                              setFormData(prev => ({
                                ...prev,
                                lodgeRoles: {
                                  ...prev.lodgeRoles,
                                  [formData.primaryLodge]: e.target.value
                                }
                              }));
                            }}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                          />
                          <span className="ml-2 text-sm text-gray-900">Lodge Admin</span>
                        </label>
                      );
                    }
                  })()}
                </div>
                <p className="text-xs text-gray-600 mt-2">
                  {(() => {
                    const primaryLodge = lodges.find(l => l._id === formData.primaryLodge);
                    if (primaryLodge && primaryLodge.name === 'District Grand Lodge of Syria-Lebanon') {
                      return 'District Admin can manage multiple lodges in the district.';
                    } else {
                      return 'Lodge Admin can manage members and activities within this lodge only.';
                    }
                  })()}
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Lodge Memberships & Positions
              </label>
              
              {/* Current Lodge Memberships */}
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Additional Lodge Memberships</h4>
                {formData.lodges.filter(lodgeId => lodgeId !== formData.primaryLodge).length > 0 ? (
                  <div className="space-y-3">
                    {formData.lodges.filter(lodgeId => lodgeId !== formData.primaryLodge).map((lodgeId) => {
                      const lodgeName = getLodgeName(lodgeId);
                      const lodgeLocation = getLodgeLocation(lodgeId);
                      if (lodgeName === 'Unknown Lodge') return null;
                      
                      return (
                        <div key={lodgeId} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex-1">
                              <h5 className="text-sm font-medium text-gray-900">{lodgeName}</h5>
                              <p className="text-xs text-gray-600">{lodgeLocation}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setFormData(prev => {
                                  const newLodgePositions = { ...prev.lodgePositions };
                                  delete newLodgePositions[lodgeId];
                                  return {
                                    ...prev,
                                    lodges: prev.lodges.filter(id => id !== lodgeId),
                                    lodgePositions: newLodgePositions
                                  };
                                });
                              }}
                              className="text-red-600 hover:text-red-800 text-sm font-medium"
                            >
                              Remove
                            </button>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-3">
                                                      <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Position in {lodgeName}
                              </label>
                              <PositionSelect
                                name={`lodgePosition_${lodgeId}`}
                                id={`lodgePosition_${lodgeId}`}
                              value={formData.lodgePositions[lodgeId] || 'LODGE_MEMBER'}
                              onChange={(e) => {
                                setFormData(prev => ({
                                  ...prev,
                                  lodgePositions: {
                                    ...prev.lodgePositions,
                                    [lodgeId]: e.target.value
                                  }
                                }));
                              }}
                                occupiedPositions={additionalLodgeOccupiedPositions[lodgeId] || []}
                                lodgeId={lodgeId}
                              className="block w-full text-sm border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                              />
                            </div>
                            
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-2">
                                Administrative Role in {lodgeName}
                              </label>
                              <div className="space-y-1">
                                <label className="flex items-center">
                                  <input
                                    type="radio"
                                    name={`lodgeRole_${lodgeId}`}
                                    value="LODGE_MEMBER"
                                    checked={formData.lodgeRoles[lodgeId] === 'LODGE_MEMBER' || !formData.lodgeRoles[lodgeId]}
                                    onChange={(e) => {
                                      setFormData(prev => ({
                                        ...prev,
                                        lodgeRoles: {
                                          ...prev.lodgeRoles,
                                          [lodgeId]: e.target.value
                                        }
                                      }));
                                    }}
                                    className="h-3 w-3 text-blue-600 focus:ring-blue-500 border-gray-300"
                                  />
                                  <span className="ml-2 text-xs text-gray-900">Lodge Member</span>
                                </label>
                                {lodgeName === 'District Grand Lodge of Syria-Lebanon' ? (
                                  <label className="flex items-center">
                                    <input
                                      type="radio"
                                      name={`lodgeRole_${lodgeId}`}
                                      value="DISTRICT_ADMIN"
                                      checked={formData.lodgeRoles[lodgeId] === 'DISTRICT_ADMIN'}
                                      onChange={(e) => {
                                        setFormData(prev => ({
                                          ...prev,
                                          lodgeRoles: {
                                            ...prev.lodgeRoles,
                                            [lodgeId]: e.target.value
                                          }
                                        }));
                                      }}
                                      className="h-3 w-3 text-blue-600 focus:ring-blue-500 border-gray-300"
                                    />
                                    <span className="ml-2 text-xs text-gray-900">District Admin</span>
                                  </label>
                                ) : (
                                  <label className="flex items-center">
                                    <input
                                      type="radio"
                                      name={`lodgeRole_${lodgeId}`}
                                      value="LODGE_ADMIN"
                                      checked={formData.lodgeRoles[lodgeId] === 'LODGE_ADMIN'}
                                      onChange={(e) => {
                                        setFormData(prev => ({
                                          ...prev,
                                          lodgeRoles: {
                                            ...prev.lodgeRoles,
                                            [lodgeId]: e.target.value
                                          }
                                        }));
                                      }}
                                      className="h-3 w-3 text-blue-600 focus:ring-blue-500 border-gray-300"
                                    />
                                    <span className="ml-2 text-xs text-gray-900">Lodge Admin</span>
                                  </label>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 italic">No additional lodge memberships.</div>
                )}
              </div>

              {/* Add New Lodge Membership */}
              <div className="border-t border-gray-200 pt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Add Lodge Membership</h4>
                <div className="flex gap-3">
                  <select
                    value=""
                    onChange={(e) => {
                      if (e.target.value) {
                        const lodgeId = e.target.value;
                        if (!formData.lodges.includes(lodgeId)) {
                          setFormData(prev => ({
                            ...prev,
                            lodges: [...prev.lodges, lodgeId],
                            lodgePositions: {
                              ...prev.lodgePositions,
                              [lodgeId]: 'LODGE_MEMBER'
                            }
                          }));
                          // Fetch occupied positions for the new lodge
                          fetchAdditionalLodgeOccupiedPositions(lodgeId);
                        }
                        // Reset the select
                        e.target.value = '';
                      }
                    }}
                    className="flex-1 text-sm border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  >
                    <option value="">Select a lodge to add...</option>
                    {lodges
                      .filter(lodge => !formData.lodges.includes(lodge._id) && lodge._id !== formData.primaryLodge)
                      .map((lodge) => (
                        <option key={lodge._id} value={lodge._id}>
                          {lodge.name} ({lodge.location})
                        </option>
                      ))}
                  </select>
                </div>
                <p className="text-xs text-gray-600 mt-2">
                  Select a lodge from the dropdown to add membership. You can then set the member's position in that lodge.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Save Changes
            </button>
          </div>
        </form>

        {/* Password Change Form */}
        <form onSubmit={handlePasswordChange} className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Change Login Password</h2>
          
          {passwordError && (
            <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
              <span className="block sm:inline">{passwordError}</span>
            </div>
          )}
          
          {passwordSuccess && (
            <div className="mb-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative" role="alert">
              <span className="block sm:inline">{passwordSuccess}</span>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                New Password
              </label>
              <input
                type="password"
                id="newPassword"
                name="newPassword"
                value={passwordData.newPassword}
                onChange={handlePasswordInputChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900"
                placeholder="Enter new password (min 8 characters)"
                required
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirm New Password
              </label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={passwordData.confirmPassword}
                onChange={handlePasswordInputChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900"
                placeholder="Confirm new password"
                required
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="submit"
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Change Password
            </button>
          </div>
        </form>


      </div>
    </div>
  );
} 