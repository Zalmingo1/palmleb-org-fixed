'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

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
    <option value="">Select a position...</option>
    {[
      'WORSHIPFUL_MASTER',
      'SENIOR_WARDEN',
      'JUNIOR_WARDEN',
      'TREASURER',
      'SECRETARY',
      'SENIOR_DEACON',
      'JUNIOR_DEACON',
      'SENIOR_STEWARD',
      'JUNIOR_STEWARD',
      'CHAPLAIN',
      'MARSHAL',
      'TYLER',
      'MUSICIAN',
      'MASTER_OF_CEREMONIES',
      'HISTORIAN',
      'LODGE_EDUCATION_OFFICER',
      'ALMONER',
      'MEMBER'
    ].map((position) => {
      const isOccupied = occupiedPositions.includes(position);
      const isDisabled = isOccupied && position !== 'MEMBER';
      return (
        <option
          key={position}
          value={position}
          disabled={isDisabled}
          className={isDisabled ? 'text-gray-400' : ''}
        >
          {formatPositionName(position)}{isOccupied && position !== 'MEMBER' ? ' (Occupied)' : ''}
        </option>
      );
    })}
  </select>
);

interface Member {
  _id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  email: string;
  status: 'active' | 'inactive' | 'pending';
  primaryLodgePosition: string;
  lodges: string[];
  primaryLodge: string | null;
  occupation?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  lodgePositions?: { [key: string]: string };
  lodgeRoles?: { [key: string]: string };
}

interface Lodge {
  _id: string;
  name: string;
  location: string;
}

type LodgePosition = 
  | 'WORSHIPFUL_MASTER'
  | 'SENIOR_WARDEN'
  | 'JUNIOR_WARDEN'
  | 'TREASURER'
  | 'SECRETARY'
  | 'SENIOR_DEACON'
  | 'JUNIOR_DEACON'
  | 'SENIOR_STEWARD'
  | 'JUNIOR_STEWARD'
  | 'CHAPLAIN'
  | 'MARSHAL'
  | 'TYLER'
  | 'MUSICIAN'
  | 'MASTER_OF_CEREMONIES'
  | 'HISTORIAN'
  | 'LODGE_EDUCATION_OFFICER'
  | 'ALMONER'
  | 'MEMBER';

export default function EditMemberPage({ params }: { params: Promise<{ userId: string }> }) {
  const router = useRouter();
  const [member, setMember] = useState<Member | null>(null);
  const [lodges, setLodges] = useState<Lodge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [occupiedPositions, setOccupiedPositions] = useState<string[]>([]);
  const [additionalLodgeOccupiedPositions, setAdditionalLodgeOccupiedPositions] = useState<{ [key: string]: string[] }>({});
  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    status: 'active',
    primaryLodgePosition: '',
    lodges: [] as string[],
    primaryLodge: '',
    occupation: '',
    city: '',
    state: '',
    zipCode: '',
    country: '',
    lodgePositions: {} as { [key: string]: string },
    lodgeRoles: {} as { [key: string]: string }
  });

  const fetchLodges = async () => {
    try {
      console.log('Fetching lodges...');
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      console.log('Token available for lodges:', !!token);
      
      // Try the main lodges endpoint first
      let response = await fetch('/api/lodges?district=true', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      console.log('Lodges response status:', response.status);
      console.log('Lodges response ok:', response.ok);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Fetched lodges for district admin:', data);
        setLodges(data);
      } else {
        // If main endpoint fails, try the list endpoint
        console.log('Main lodges endpoint failed, trying list endpoint...');
        response = await fetch('/api/lodges/list', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('Fetched lodges from list endpoint:', data);
          setLodges(data.lodges || data);
        } else {
          console.error('Failed to fetch lodges from both endpoints:', response.status);
        }
      }
    } catch (error) {
      console.error('Error fetching lodges:', error);
    }
  };

  const fetchOccupiedPositions = async (lodgeId: string) => {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const response = await fetch(`/api/lodges/${lodgeId}/positions`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setOccupiedPositions(data.occupiedPositions || []);
      }
    } catch (error) {
      console.error('Error fetching occupied positions:', error);
    }
  };

  const fetchAdditionalLodgeOccupiedPositions = async (lodgeId: string) => {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
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
      }
    } catch (error) {
      console.error('Error fetching additional lodge occupied positions:', error);
    }
  };

  useEffect(() => {
    const fetchMember = async () => {
      try {
        console.log('Fetching member data...');
        const resolvedParams = await params;
        console.log('Resolved params:', resolvedParams);
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        console.log('Token available:', !!token);
        
        const response = await fetch(`/api/members/${resolvedParams.userId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        console.log('Response status:', response.status);
        console.log('Response ok:', response.ok);
        
        if (response.ok) {
          const memberData = await response.json();
          console.log('Member data received:', memberData);
          setMember(memberData);
          
          // The lodges array contains lodge IDs, not names
          const lodgeIds = memberData.lodges || [];
          console.log('Lodge IDs from member data:', lodgeIds);
          console.log('Member primaryLodge:', memberData.primaryLodge);
          
          // Find the primary lodge ID - handle both cases where primaryLodge is a name or ID
          let primaryLodgeId = memberData.primaryLodge;
          
          // If primaryLodge is a lodge name (string), find the corresponding lodge ID
          if (primaryLodgeId && typeof primaryLodgeId === 'string' && !primaryLodgeId.match(/^[0-9a-fA-F]{24}$/)) {
            // This is a lodge name, find the corresponding lodge ID
            const lodge = lodges.find(l => l.name === primaryLodgeId);
            primaryLodgeId = lodge ? lodge._id : null;
          }
          
          // If primaryLodge is not set, use the first lodge in the lodges array
          if (!primaryLodgeId && lodgeIds.length > 0) {
            primaryLodgeId = lodgeIds[0];
          }
          
          const newFormData = {
            name: memberData.name || (memberData.firstName && memberData.lastName ? `${memberData.firstName} ${memberData.lastName}` : ''),
            email: memberData.email || '',
            status: memberData.status || 'active',
            primaryLodgePosition: memberData.primaryLodgePosition || '',
            lodges: lodgeIds,
            primaryLodge: primaryLodgeId,
            occupation: memberData.occupation || '',
            city: memberData.city || '',
            state: memberData.state || '',
            zipCode: memberData.zipCode || '',
            country: memberData.country || '',
            lodgePositions: memberData.lodgePositions || {},
            lodgeRoles: memberData.lodgeRoles || {}
          };
          
          console.log('New form data:', newFormData);
          setFormData(newFormData);
          
          // Fetch occupied positions for primary lodge
          if (primaryLodgeId) {
            fetchOccupiedPositions(primaryLodgeId);
          }
          
          // Fetch occupied positions for additional lodges
          lodgeIds.forEach((lodgeId: string) => {
            if (lodgeId !== primaryLodgeId) {
              console.log('Fetching occupied positions for additional lodge:', lodgeId);
              fetchAdditionalLodgeOccupiedPositions(lodgeId);
            }
          });
        } else {
          setError('Failed to fetch member data');
        }
      } catch (error) {
        console.error('Error fetching member:', error);
        setError('Failed to fetch member data');
      } finally {
        setLoading(false);
      }
    };

    if (lodges.length > 0) {
      fetchMember();
    }
  }, [params, lodges]);

  useEffect(() => {
    fetchLodges();
  }, []);





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
    return lodge ? lodge.location : 'Unknown Location';
  };

  const handlePasswordInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted!');
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    try {
      const resolvedParams = await params;
      console.log('Resolved params:', resolvedParams);
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      console.log('Token available:', !!token);
      console.log('Form data being sent:', formData);
      
      const response = await fetch(`/api/members/${resolvedParams.userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData),
      });

      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);

      if (response.ok) {
        const result = await response.json();
        console.log('Success response:', result);
        setSuccess('Member updated successfully! Changes have been saved.');
        
        // Auto-dismiss success message after 5 seconds
        setTimeout(() => {
          setSuccess(null);
        }, 5000);
      } else {
        const errorData = await response.json();
        console.log('Error response:', errorData);
        setError(errorData.message || 'Failed to update member');
      }
    } catch (error) {
      console.error('Error updating member:', error);
      setError('Failed to update member');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);
    setIsChangingPassword(true);

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('Passwords do not match');
      setIsChangingPassword(false);
      return;
    }

    if (passwordData.newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters long');
      setIsChangingPassword(false);
      return;
    }

    try {
      const resolvedParams = await params;
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const response = await fetch(`/api/members/${resolvedParams.userId}/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          newPassword: passwordData.newPassword
        }),
      });

      if (response.ok) {
        setPasswordSuccess('Password changed successfully!');
        setPasswordData({ newPassword: '', confirmPassword: '' });
        
        // Auto-dismiss success message after 5 seconds
        setTimeout(() => {
          setPasswordSuccess(null);
        }, 5000);
      } else {
        const errorData = await response.json();
        setPasswordError(errorData.message || 'Failed to change password');
      }
    } catch (error) {
      console.error('Error changing password:', error);
      setPasswordError('Failed to change password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading member data...</p>
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
          
          {error && (
            <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span className="block sm:inline font-medium">{error}</span>
                </div>
                <button
                  onClick={() => setError(null)}
                  className="text-red-700 hover:text-red-900"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          )}
          
          {success && (
            <div className="mb-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative" role="alert">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="block sm:inline font-medium">{success}</span>
                </div>
                <button
                  onClick={() => setSuccess(null)}
                  className="text-green-700 hover:text-green-900"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          )}
          
          <div className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-900">
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
              <label htmlFor="email" className="block text-sm font-medium text-gray-900">
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
              <label htmlFor="occupation" className="block text-sm font-medium text-gray-900">
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
                <label htmlFor="city" className="block text-sm font-medium text-gray-900">
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
                <label htmlFor="state" className="block text-sm font-medium text-gray-900">
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
                <label htmlFor="zipCode" className="block text-sm font-medium text-gray-900">
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
                <label htmlFor="country" className="block text-sm font-medium text-gray-900">
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
              <label htmlFor="status" className="block text-sm font-medium text-gray-900">
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
                Primary Lodge
              </label>
              <div className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-gray-50 text-gray-900 sm:text-sm">
                {formData.primaryLodge ? getLodgeName(formData.primaryLodge) : 'No primary lodge set'}
              </div>
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
                {(() => {
                  const additionalLodges = formData.lodges.filter(lodgeId => {
                    // Ensure we're comparing lodge IDs properly
                    const primaryLodgeId = formData.primaryLodge;
                    return lodgeId !== primaryLodgeId;
                  });
                  
                  if (additionalLodges.length > 0) {
                    return (
                      <div className="space-y-3">
                        {additionalLodges.map((lodgeId) => {
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
                    );
                  } else {
                    return <div className="text-sm text-gray-500 italic">No additional lodge memberships.</div>;
                  }
                })()}
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
              disabled={isSubmitting}
              className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                isSubmitting 
                  ? 'bg-blue-400 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isSubmitting ? (
                <div className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </div>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </form>

        {/* Password Change Form */}
        <form onSubmit={handlePasswordChange} className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Change Login Password</h2>
          {passwordError && (
            <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span className="block sm:inline font-medium">{passwordError}</span>
                </div>
                <button
                  onClick={() => setPasswordError(null)}
                  className="text-red-700 hover:text-red-900"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          )}
          {passwordSuccess && (
            <div className="mb-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative" role="alert">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="block sm:inline font-medium">{passwordSuccess}</span>
                </div>
                <button
                  onClick={() => setPasswordSuccess(null)}
                  className="text-green-700 hover:text-green-900"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          )}
          <div className="space-y-4">
            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-gray-900">
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
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-900">
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
              disabled={isChangingPassword}
              className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 ${
                isChangingPassword 
                  ? 'bg-red-400 cursor-not-allowed' 
                  : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {isChangingPassword ? (
                <div className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Changing...
                </div>
              ) : (
                'Change Password'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 