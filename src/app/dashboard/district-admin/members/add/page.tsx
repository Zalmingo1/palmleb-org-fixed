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
}

const PositionSelect: React.FC<PositionSelectProps> = ({ 
  value, 
  onChange, 
  name, 
  id, 
  required = false,
  className = "mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm font-sans text-gray-900 bg-white"
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
        {positions.map(position => (
          <option key={position} value={position}>
            {formatPositionName(position)}
          </option>
        ))}
      </optgroup>
    ))}
  </select>
);

export default function AddDistrictMemberPage() {
  const router = useRouter();
  const [lodges, setLodges] = useState<Lodge[]>([]);
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
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Fetch district lodges when component mounts
    const fetchLodges = async () => {
      try {
        const token = sessionStorage.getItem('token');
        if (!token) {
          router.push('/login');
          return;
        }

        // Fetch only district lodges
        const response = await fetch('/api/lodges?district=true', {
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
          throw new Error('Failed to fetch district lodges');
        }
        
        const data = await response.json();
        setLodges(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Error fetching district lodges:', err);
        setError('Failed to load district lodges');
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
      lodgeMemberships: [...prev.lodgeMemberships, { lodge: selectedLodge, position: selectedPosition }]
    }));

    setSelectedLodge('');
    setSelectedPosition('MEMBER');
    setError('');
  };

  const handleRemoveLodgeMembership = (lodgeId: string) => {
    setFormData(prev => ({
      ...prev,
      lodgeMemberships: prev.lodgeMemberships.filter(m => m.lodge !== lodgeId)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (emailExists) {
      setError('A member with this email already exists');
      return;
    }

    if (!formData.primaryLodge) {
      setError('Please select a primary lodge');
      return;
    }

    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const token = sessionStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      const memberData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        password: formData.password,
        role: formData.role,
        phone: formData.phone,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        zipCode: formData.zipCode,
        country: formData.country,
        primaryLodge: formData.primaryLodge,
        primaryLodgePosition: formData.primaryLodgePosition,
        lodgeMemberships: formData.lodgeMemberships,
        districtAdmin: true // Flag to indicate this is a district member
      };

      const response = await fetch('/api/members', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(memberData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to create member');
      }

      setSuccess('District member created successfully!');
      
      // Reset form
      setFormData({
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
        primaryLodgePosition: 'MEMBER',
        lodgeMemberships: [],
      });

      // Redirect after a short delay
      setTimeout(() => {
        router.push('/dashboard/district-admin/members');
      }, 2000);

    } catch (err: any) {
      console.error('Error creating member:', err);
      setError(err.message || 'Failed to create member');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getLodgeName = (lodgeId: string) => {
    const lodge = lodges.find(l => l._id === lodgeId);
    return lodge ? `${lodge.name} #${lodge.number}` : 'Unknown Lodge';
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center text-blue-600 hover:text-blue-800 mb-4"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Members
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Add District Member</h1>
          <p className="text-gray-600 mt-2">Create a new member for your district lodges</p>
        </div>

        {/* Error and Success Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">{error}</div>
              </div>
            </div>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">Success</h3>
                <div className="mt-2 text-sm text-green-700">{success}</div>
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white shadow-lg rounded-lg p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Personal Information */}
            <div className="md:col-span-2">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Personal Information</h3>
            </div>

            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                First Name *
              </label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleInputChange}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm text-gray-900 bg-white"
              />
            </div>

            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                Last Name *
              </label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleInputChange}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm text-gray-900 bg-white"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email *
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                className={`mt-1 block w-full rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900 bg-white ${
                  emailExists ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {checkingEmail && (
                <p className="mt-1 text-sm text-gray-500">Checking email availability...</p>
              )}
              {emailExists && (
                <p className="mt-1 text-sm text-red-600">A member with this email already exists</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password *
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                required
                minLength={6}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm text-gray-900 bg-white"
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm text-gray-900 bg-white"
              />
            </div>

            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                Role *
              </label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleInputChange}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm text-gray-900 bg-white"
              >
                <option value="LODGE_MEMBER">Lodge Member</option>
                <option value="LODGE_ADMIN">Lodge Administrator</option>
              </select>
            </div>

            {/* Address Information */}
            <div className="md:col-span-2">
              <h3 className="text-lg font-medium text-gray-900 mb-4 mt-6">Address Information</h3>
            </div>

            <div className="md:col-span-2">
              <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                Street Address
              </label>
              <input
                type="text"
                id="address"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm text-gray-900 bg-white"
              />
            </div>

            <div>
              <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
                City
              </label>
              <input
                type="text"
                id="city"
                name="city"
                value={formData.city}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm text-gray-900 bg-white"
              />
            </div>

            <div>
              <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-1">
                State/Province
              </label>
              <input
                type="text"
                id="state"
                name="state"
                value={formData.state}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm text-gray-900 bg-white"
              />
            </div>

            <div>
              <label htmlFor="zipCode" className="block text-sm font-medium text-gray-700 mb-1">
                ZIP/Postal Code
              </label>
              <input
                type="text"
                id="zipCode"
                name="zipCode"
                value={formData.zipCode}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm text-gray-900 bg-white"
              />
            </div>

            <div>
              <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-1">
                Country
              </label>
              <input
                type="text"
                id="country"
                name="country"
                value={formData.country}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm text-gray-900 bg-white"
              />
            </div>

            {/* Lodge Information */}
            <div className="md:col-span-2">
              <h3 className="text-lg font-medium text-gray-900 mb-4 mt-6">Lodge Information</h3>
            </div>

            <div>
              <label htmlFor="primaryLodge" className="block text-sm font-medium text-gray-700 mb-1">
                Primary Lodge *
              </label>
              <select
                id="primaryLodge"
                name="primaryLodge"
                value={formData.primaryLodge}
                onChange={handleInputChange}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm text-gray-900 bg-white"
              >
                <option value="">Select a lodge</option>
                {lodges.map(lodge => (
                  <option key={lodge._id} value={lodge._id}>
                    {lodge.name} {lodge.number}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="primaryLodgePosition" className="block text-sm font-medium text-gray-700 mb-1">
                Primary Position *
              </label>
              <PositionSelect
                value={formData.primaryLodgePosition}
                onChange={handleInputChange}
                name="primaryLodgePosition"
                id="primaryLodgePosition"
                required
              />
            </div>

            {/* Additional Lodge Memberships */}
            <div className="md:col-span-2">
              <h3 className="text-lg font-medium text-gray-900 mb-4 mt-6">Additional Lodge Memberships</h3>
              <p className="text-sm text-gray-600 mb-4">Add additional lodges this member belongs to</p>
            </div>

            <div className="md:col-span-2">
              <div className="flex space-x-4 mb-4">
                <div className="flex-1">
                  <label htmlFor="selectedLodge" className="block text-sm font-medium text-gray-700 mb-1">
                    Lodge
                  </label>
                  <select
                    id="selectedLodge"
                    value={selectedLodge}
                    onChange={(e) => setSelectedLodge(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm text-gray-900 bg-white"
                  >
                    <option value="">Select a lodge</option>
                    {lodges.map(lodge => (
                      <option key={lodge._id} value={lodge._id}>
                        {lodge.name} #{lodge.number}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex-1">
                  <label htmlFor="selectedPosition" className="block text-sm font-medium text-gray-700 mb-1">
                    Position
                  </label>
                  <PositionSelect
                    value={selectedPosition}
                    onChange={(e) => setSelectedPosition(e.target.value as LodgePosition)}
                    name="selectedPosition"
                    id="selectedPosition"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={handleAddLodgeMembership}
                    disabled={!selectedLodge || !selectedPosition}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>

            {/* Display current lodge memberships */}
            {formData.lodgeMemberships.length > 0 && (
              <div className="md:col-span-2">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Current Lodge Memberships:</h4>
                <div className="space-y-2">
                  {formData.lodgeMemberships.map((membership, index) => (
                    <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded-md">
                      <div>
                        <span className="font-medium">{getLodgeName(membership.lodge)}</span>
                        <span className="text-gray-500 ml-2">- {formatPositionName(membership.position)}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveLodgeMembership(membership.lodge)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="mt-8 flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="bg-gray-300 text-gray-700 px-6 py-2 rounded-md hover:bg-gray-400"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || emailExists}
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Creating...' : 'Create Member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 