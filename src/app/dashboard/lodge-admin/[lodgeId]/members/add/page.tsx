'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { getCurrentUser } from '@/lib/auth/client';

interface Lodge {
  _id: string;
  name: string;
  number: string;
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

interface LodgeMembership {
  lodge: string;
  position: LodgePosition;
}

export default function AddMemberPage({ params }: { params: Promise<{ lodgeId: string }> }) {
  const router = useRouter();
  const { lodgeId } = use(params);
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
    country: '',
    primaryLodge: lodgeId,
    primaryLodgePosition: 'MEMBER' as LodgePosition,
    lodgeMemberships: [] as LodgeMembership[],
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedLodge, setSelectedLodge] = useState('');
  const [selectedPosition, setSelectedPosition] = useState<LodgePosition>('MEMBER');

  useEffect(() => {
    // Fetch lodges when component mounts
    const fetchLodges = async () => {
      try {
        const response = await fetch('/api/lodges', {
          credentials: 'include'
        });
        if (!response.ok) {
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
  }, []);

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

    try {
      const token = sessionStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch('/api/members', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData),
        credentials: 'include'
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create member');
      }

      setSuccess('Member created successfully');
      router.push(`/dashboard/lodge-admin/${lodgeId}/members`);
    } catch (err) {
      console.error('Error creating member:', err);
      setError(err instanceof Error ? err.message : 'Failed to create member');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center text-blue-600 hover:text-blue-800"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-1" />
            Back to Members
          </button>
        </div>

        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h1 className="text-2xl font-semibold text-gray-900 mb-6">Add New Member</h1>

            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            {success && (
              <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
                {success}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Personal Information */}
              <div className="bg-gray-50 p-6 rounded-lg">
                <h2 className="text-xl font-medium text-gray-900 mb-6 tracking-tight">Personal Information</h2>
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
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-masonic-blue focus:ring-masonic-blue sm:text-sm font-sans text-gray-900 bg-white"
                    />
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
                    <label htmlFor="role" className="block text-sm font-medium text-gray-700 tracking-tight">
                      Role *
                    </label>
                    <select
                      name="role"
                      id="role"
                      value={formData.role}
                      onChange={handleInputChange}
                      required
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-masonic-blue focus:ring-masonic-blue sm:text-sm font-sans text-gray-900 bg-white"
                    >
                      <option value="LODGE_MEMBER">Lodge Member</option>
                      <option value="LODGE_ADMIN">Lodge Admin</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Address Information */}
              <div className="bg-gray-50 p-6 rounded-lg">
                <h2 className="text-xl font-medium text-gray-900 mb-6 tracking-tight">Address Information</h2>
                <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label htmlFor="address" className="block text-sm font-medium text-gray-700 tracking-tight">
                      Street Address
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
                      {lodges.map(lodge => (
                        <option key={lodge._id} value={lodge._id}>
                          {lodge.name} ({lodge.number})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="primaryLodgePosition" className="block text-sm font-medium text-gray-700 tracking-tight">
                      Position in Primary Lodge *
                    </label>
                    <select
                      name="primaryLodgePosition"
                      id="primaryLodgePosition"
                      value={formData.primaryLodgePosition}
                      onChange={handleInputChange}
                      required
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-masonic-blue focus:ring-masonic-blue sm:text-sm font-sans text-gray-900 bg-white"
                    >
                      <optgroup label="Elected Officers">
                        <option value="WORSHIPFUL_MASTER">Worshipful Master</option>
                        <option value="SENIOR_WARDEN">Senior Warden</option>
                        <option value="JUNIOR_WARDEN">Junior Warden</option>
                        <option value="TREASURER">Treasurer</option>
                        <option value="SECRETARY">Secretary</option>
                      </optgroup>
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
                      <optgroup label="Other Positions">
                        <option value="MASTER_OF_CEREMONIES">Master of Ceremonies</option>
                        <option value="HISTORIAN">Historian</option>
                        <option value="LODGE_EDUCATION_OFFICER">Lodge Education Officer</option>
                        <option value="ALMONER">Almoner</option>
                        <option value="MEMBER">Member</option>
                      </optgroup>
                    </select>
                  </div>
                </div>
              </div>

              {/* Additional Lodge Memberships */}
              <div className="bg-gray-50 p-6 rounded-lg">
                <h2 className="text-xl font-medium text-gray-900 mb-6 tracking-tight">Additional Lodge Memberships</h2>
                <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
                  <div>
                    <label htmlFor="selectedLodge" className="block text-sm font-medium text-gray-700 tracking-tight">
                      Lodge
                    </label>
                    <select
                      id="selectedLodge"
                      value={selectedLodge}
                      onChange={(e) => setSelectedLodge(e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-masonic-blue focus:ring-masonic-blue sm:text-sm font-sans text-gray-900 bg-white"
                    >
                      <option value="">Select a lodge</option>
                      {lodges.map(lodge => (
                        <option key={lodge._id} value={lodge._id}>
                          {lodge.name} ({lodge.number})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="selectedPosition" className="block text-sm font-medium text-gray-700 tracking-tight">
                      Position
                    </label>
                    <select
                      id="selectedPosition"
                      value={selectedPosition}
                      onChange={(e) => setSelectedPosition(e.target.value as LodgePosition)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-masonic-blue focus:ring-masonic-blue sm:text-sm font-sans text-gray-900 bg-white"
                    >
                      <optgroup label="Elected Officers">
                        <option value="WORSHIPFUL_MASTER">Worshipful Master</option>
                        <option value="SENIOR_WARDEN">Senior Warden</option>
                        <option value="JUNIOR_WARDEN">Junior Warden</option>
                        <option value="TREASURER">Treasurer</option>
                        <option value="SECRETARY">Secretary</option>
                      </optgroup>
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
                      <optgroup label="Other Positions">
                        <option value="MASTER_OF_CEREMONIES">Master of Ceremonies</option>
                        <option value="HISTORIAN">Historian</option>
                        <option value="LODGE_EDUCATION_OFFICER">Lodge Education Officer</option>
                        <option value="ALMONER">Almoner</option>
                        <option value="MEMBER">Member</option>
                      </optgroup>
                    </select>
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
                    <h3 className="text-lg font-medium text-gray-700 mb-4 tracking-tight">Added Lodges:</h3>
                    <ul className="divide-y divide-gray-200">
                      {formData.lodgeMemberships.map((membership) => {
                        const lodge = lodges.find(l => l._id === membership.lodge);
                        return (
                          <li key={membership.lodge} className="py-4 flex justify-between items-center">
                            <span className="tracking-tight">
                              {lodge?.name} ({lodge?.number}) - {membership.position.replace('_', ' ')}
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

              {/* Form Actions */}
              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-masonic-blue"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-masonic-blue hover:bg-masonic-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-masonic-blue"
                >
                  Create Member
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
} 