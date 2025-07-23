'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

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

interface Lodge {
  _id: string;
  name: string;
  number: string;
}

interface LodgeMembership {
  lodge: string; // Lodge ID
  position: LodgePosition;
}



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

export default function AddMemberPage() {
  const router = useRouter();
  const [lodges, setLodges] = useState<Lodge[]>([]);
  const [occupiedPositions, setOccupiedPositions] = useState<string[]>([]);
  const [additionalLodgeOccupiedPositions, setAdditionalLodgeOccupiedPositions] = useState<{[lodgeId: string]: string[]}>({});
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'LODGE_MEMBER',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: '',
    primaryLodge: '',
    primaryLodgePosition: 'MEMBER' as LodgePosition,
    lodgeMemberships: [] as LodgeMembership[],
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedLodge, setSelectedLodge] = useState('');
  const [selectedPosition, setSelectedPosition] = useState<LodgePosition>('MEMBER');
  const [emailExists, setEmailExists] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);

  useEffect(() => {
    // Fetch lodges when component mounts
    const fetchLodges = async () => {
      try {
        const token = sessionStorage.getItem('token');
        if (!token) {
          router.push('/login');
          return;
        }

        const response = await fetch('/api/lodges', {
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
          throw new Error('Failed to fetch lodges');
        }
        
        const data = await response.json();
        setLodges(data);
      } catch (err) {
        console.error('Error fetching lodges:', err);
        setError('Failed to load lodges');
      }
    };

    fetchLodges();
  }, [router]);

  // Check if email exists when email field changes
  useEffect(() => {
    const checkEmailExists = async () => {
      if (!formData.email || formData.email.length < 3) {
        setEmailExists(false);
        return;
      }

      setCheckingEmail(true);
      try {
        const token = sessionStorage.getItem('token');
        if (!token) {
          router.push('/login');
          return;
        }

        const response = await fetch(`/api/members?email=${encodeURIComponent(formData.email)}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setEmailExists(data.length > 0);
        } else {
          setEmailExists(false);
        }
      } catch (err) {
        console.error('Error checking email:', err);
        setEmailExists(false);
      } finally {
        setCheckingEmail(false);
      }
    };

    // Debounce the email check
    const timeoutId = setTimeout(checkEmailExists, 500);
    return () => clearTimeout(timeoutId);
  }, [formData.email, router]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // If primary lodge is changed, fetch occupied positions
    if (name === 'primaryLodge' && value) {
      fetchOccupiedPositions(value);
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

  const handleAddLodgeMembership = () => {
    if (!selectedLodge || !selectedPosition) return;

    // Check if already a member of this lodge
    if (formData.lodgeMemberships.some(m => m.lodge === selectedLodge)) {
      setError('Member is already part of this lodge');
      return;
    }

    setFormData(prev => ({
      ...prev,
      lodgeMemberships: [
        ...prev.lodgeMemberships,
        { lodge: selectedLodge, position: selectedPosition }
      ]
    }));

    // Reset selection
    setSelectedLodge('');
    setSelectedPosition('MEMBER');
  };

  const handleRemoveLodgeMembership = (lodgeId: string) => {
    setFormData(prev => ({
      ...prev,
      lodgeMemberships: prev.lodgeMemberships.filter(m => m.lodge !== lodgeId)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.primaryLodge) {
      setError('Please select a primary lodge');
      return;
    }

    if (!formData.primaryLodgePosition) {
      setError('Please select a position in the primary lodge');
      return;
    }

    if (!formData.firstName || !formData.lastName) {
      setError('Please enter both first and last name');
      return;
    }

    if (emailExists) {
      setError('This email address is already registered. Please use a different email.');
      return;
    }

    try {
      // Get the authentication token
      const token = sessionStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      // Transform form data to match API expectations
      const apiData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        password: formData.password,
        role: 'LODGE_MEMBER',
        phone: formData.phone,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        zipCode: formData.zipCode,
        country: formData.country,
        primaryLodge: formData.primaryLodge,
        primaryLodgePosition: formData.primaryLodgePosition,
        lodgeMemberships: [
          {
            lodge: formData.primaryLodge,
            position: formData.primaryLodgePosition
          },
          ...formData.lodgeMemberships
        ],
        profileImage: '/images/default-avatar.png'
      };

      console.log('Submitting member data:', JSON.stringify(apiData, null, 2));

      const response = await fetch('/api/members', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(apiData),
      });

      const responseData = await response.json();
      console.log('Full response data:', JSON.stringify(responseData, null, 2));

      if (!response.ok) {
        if (response.status === 401) {
          sessionStorage.removeItem('token');
          sessionStorage.removeItem('user');
          router.push('/login');
          return;
        }
        const errorMessage = responseData.details || responseData.error || 'Failed to create member';
        throw new Error(errorMessage);
      }

      setSuccess('Member created successfully!');

      // Navigate back to members list after successful creation
      setTimeout(() => {
        router.push('/dashboard/super-admin/members');
      }, 2000);
    } catch (err: any) {
      console.error('Detailed error:', err);
      setError(err.message || 'Failed to create member. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8 font-sans antialiased">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow sm:rounded-lg">
          <div className="px-6 py-8 sm:p-8">
            <h1 className="text-3xl font-semibold text-gray-900 mb-8 tracking-tight">Add New Member</h1>

            {error && (
              <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-md font-medium">
                {error}
              </div>
            )}

            {success && (
              <div className="mb-6 p-4 bg-green-50 text-green-700 rounded-md font-medium">
                {success}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="space-y-10">
                {/* Basic Information */}
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h2 className="text-xl font-medium text-gray-900 mb-6 tracking-tight">Basic Information</h2>
                  <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
                    <div>
                      <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 tracking-tight">
                        First Name *
                      </label>
                      <input
                        type="text"
                        name="firstName"
                        id="firstName"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        required
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-masonic-blue focus:ring-masonic-blue sm:text-sm font-sans text-gray-900 bg-white"
                      />
                    </div>

                    <div>
                      <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 tracking-tight">
                        Last Name *
                      </label>
                      <input
                        type="text"
                        name="lastName"
                        id="lastName"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        required
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-masonic-blue focus:ring-masonic-blue sm:text-sm font-sans text-gray-900 bg-white"
                      />
                    </div>

                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 tracking-tight">
                        Email *
                      </label>
                      <input
                        type="email"
                        name="email"
                        id="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                        className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm font-sans text-gray-900 bg-white ${
                          emailExists 
                            ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                            : formData.email && !checkingEmail && !emailExists
                            ? 'border-green-300 focus:border-green-500 focus:ring-green-500'
                            : 'border-gray-300 focus:border-masonic-blue focus:ring-masonic-blue'
                        }`}
                      />
                      {checkingEmail && (
                        <p className="mt-1 text-sm text-gray-500">Checking email availability...</p>
                      )}
                      {emailExists && formData.email && (
                        <p className="mt-1 text-sm text-red-600">This email is already registered</p>
                      )}
                      {formData.email && !checkingEmail && !emailExists && (
                        <p className="mt-1 text-sm text-green-600">Email is available</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="password" className="block text-sm font-medium text-gray-700 tracking-tight">
                        Password *
                      </label>
                      <input
                        type="password"
                        name="password"
                        id="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        required
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-masonic-blue focus:ring-masonic-blue sm:text-sm font-sans text-gray-900 bg-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Primary Lodge */}
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h2 className="text-xl font-medium text-gray-900 mb-6 tracking-tight">Primary Lodge</h2>
                  <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
                    <div>
                      <label htmlFor="primaryLodge" className="block text-sm font-medium text-gray-700 tracking-tight">
                        Primary Lodge *
                      </label>
                      <select
                        name="primaryLodge"
                        id="primaryLodge"
                        value={formData.primaryLodge}
                        onChange={handleInputChange}
                        required
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-masonic-blue focus:ring-masonic-blue sm:text-sm font-sans text-gray-900 bg-white"
                      >
                        <option value="">Select a lodge</option>
                        {lodges.map(lodge => (
                          <option key={lodge._id} value={lodge._id}>
                            {lodge.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="primaryLodgePosition" className="block text-sm font-medium text-gray-700 tracking-tight">
                        Position in Primary Lodge *
                      </label>
                      <PositionSelect
                        name="primaryLodgePosition"
                        id="primaryLodgePosition"
                        occupiedPositions={occupiedPositions}
                        lodgeId={formData.primaryLodge}
                        value={formData.primaryLodgePosition}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Additional Lodge Memberships */}
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h2 className="text-xl font-medium text-gray-900 mb-6 tracking-tight">Additional Lodge Memberships</h2>
                  <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
                    <div>
                      <label htmlFor="selectedLodge" className="block text-sm font-medium text-gray-900 tracking-tight">
                        Lodge
                      </label>
                      <select
                        id="selectedLodge"
                        value={selectedLodge}
                        onChange={(e) => {
                          const lodgeId = e.target.value;
                          setSelectedLodge(lodgeId);
                          if (lodgeId) {
                            fetchAdditionalLodgeOccupiedPositions(lodgeId);
                          }
                        }}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-masonic-blue focus:ring-masonic-blue sm:text-sm font-sans text-gray-900 bg-white"
                      >
                        <option value="">Select a lodge</option>
                        {lodges.map(lodge => (
                          <option key={lodge._id} value={lodge._id}>
                            {lodge.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="selectedPosition" className="block text-sm font-medium text-gray-900 tracking-tight">
                        Position
                      </label>
                      <PositionSelect
                        name="selectedPosition"
                        id="selectedPosition"
                        value={selectedPosition}
                        onChange={(e) => setSelectedPosition(e.target.value as LodgePosition)}
                        occupiedPositions={additionalLodgeOccupiedPositions[selectedLodge] || []}
                        lodgeId={selectedLodge}
                      />
                    </div>

                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={handleAddLodgeMembership}
                        className="w-full inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-masonic-blue hover:bg-masonic-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-masonic-blue tracking-tight"
                      >
                        Add Lodge
                      </button>
                    </div>
                  </div>

                  {/* List of added lodge memberships */}
                  {formData.lodgeMemberships.length > 0 && (
                    <div className="mt-8">
                      <h3 className="text-lg font-medium text-gray-900 mb-4 tracking-tight">Added Lodges:</h3>
                      <ul className="divide-y divide-gray-200">
                        {formData.lodgeMemberships.map((membership) => {
                          const lodge = lodges.find(l => l._id === membership.lodge);
                          return (
                            <li key={membership.lodge} className="py-4 flex justify-between items-center">
                              <span className="text-gray-900 tracking-tight">
                                {lodge?.name} - {membership.position.replace('_', ' ')}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleRemoveLodgeMembership(membership.lodge)}
                                className="text-red-600 hover:text-red-800 font-medium tracking-tight"
                              >
                                Remove
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Contact Information */}
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h2 className="text-xl font-medium text-gray-900 mb-6 tracking-tight">Contact Information</h2>
                  <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
                    <div>
                      <label htmlFor="phone" className="block text-sm font-medium text-gray-700 tracking-tight">
                        Phone
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        id="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-masonic-blue focus:ring-masonic-blue sm:text-sm font-sans text-gray-900 bg-white"
                      />
                    </div>

                    <div>
                      <label htmlFor="address" className="block text-sm font-medium text-gray-700 tracking-tight">
                        Address
                      </label>
                      <input
                        type="text"
                        name="address"
                        id="address"
                        value={formData.address}
                        onChange={handleInputChange}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-masonic-blue focus:ring-masonic-blue sm:text-sm font-sans text-gray-900 bg-white"
                      />
                    </div>

                    <div>
                      <label htmlFor="city" className="block text-sm font-medium text-gray-700 tracking-tight">
                        City
                      </label>
                      <input
                        type="text"
                        name="city"
                        id="city"
                        value={formData.city}
                        onChange={handleInputChange}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-masonic-blue focus:ring-masonic-blue sm:text-sm font-sans text-gray-900 bg-white"
                      />
                    </div>

                    <div>
                      <label htmlFor="state" className="block text-sm font-medium text-gray-700 tracking-tight">
                        State/Province
                      </label>
                      <input
                        type="text"
                        name="state"
                        id="state"
                        value={formData.state}
                        onChange={handleInputChange}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-masonic-blue focus:ring-masonic-blue sm:text-sm font-sans text-gray-900 bg-white"
                      />
                    </div>

                    <div>
                      <label htmlFor="zipCode" className="block text-sm font-medium text-gray-700 tracking-tight">
                        ZIP/Postal Code
                      </label>
                      <input
                        type="text"
                        name="zipCode"
                        id="zipCode"
                        value={formData.zipCode}
                        onChange={handleInputChange}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-masonic-blue focus:ring-masonic-blue sm:text-sm font-sans text-gray-900 bg-white"
                      />
                    </div>

                    <div>
                      <label htmlFor="country" className="block text-sm font-medium text-gray-700 tracking-tight">
                        Country
                      </label>
                      <input
                        type="text"
                        name="country"
                        id="country"
                        value={formData.country}
                        onChange={handleInputChange}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-masonic-blue focus:ring-masonic-blue sm:text-sm font-sans text-gray-900 bg-white"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-4 pt-6">
                  <button
                    type="button"
                    onClick={() => router.push('/dashboard/super-admin/members')}
                    className="px-6 py-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-masonic-blue tracking-tight"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-3 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-masonic-blue hover:bg-masonic-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-masonic-blue tracking-tight"
                  >
                    Create Member
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
} 