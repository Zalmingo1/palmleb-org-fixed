'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeftIcon, 
  EnvelopeIcon, 
  PhoneIcon, 
  MapPinIcon, 
  CalendarIcon, 
  BuildingOfficeIcon, 
  UserCircleIcon,
  BriefcaseIcon,
  HeartIcon,
  UserIcon
} from '@heroicons/react/24/outline';
import { use } from 'react';

interface Member {
  _id: string;
  name: string;
  email: string;
  status: 'active' | 'inactive';
  occupation?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  primaryLodge: string;
  primaryLodgePosition: string;
  lodges: string[];
  lodgePositions?: { [key: string]: string };
  administeredLodges: string[];
  interests?: string[];
  bio?: string;
  created: string;
  lastLogin?: string;
  profileImage?: string;
  memberSince: string;
}

export default function MemberDetailsPage({ params }: { params: Promise<{ userId: string }> }) {
  const router = useRouter();
  const [member, setMember] = useState<Member | null>(null);
  const [lodges, setLodges] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const resolvedParams = use(params);

  useEffect(() => {
    console.log('User ID from params:', resolvedParams.userId);
    fetchMember();
    fetchLodges();
  }, [resolvedParams.userId]);

  const fetchLodges = async () => {
    try {
      const token = sessionStorage.getItem('token');
      if (!token) return;

      const response = await fetch('/api/lodges', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const lodgesData = await response.json();
        const lodgesMap: { [key: string]: string } = {};
        lodgesData.forEach((lodge: any) => {
          lodgesMap[lodge._id] = lodge.name;
        });
        setLodges(lodgesMap);
      }
    } catch (error) {
      console.error('Error fetching lodges:', error);
    }
  };

  const fetchMember = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = sessionStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      console.log('Fetching member with ID:', resolvedParams.userId);
      const response = await fetch(`/api/members/${resolvedParams.userId}`, {
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

  if (!member) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Not Found!</strong>
          <span className="block sm:inline"> Member not found.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center text-blue-600 hover:text-blue-800"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-1" />
            Back to Members
          </button>
        </div>

        <div className="bg-white shadow rounded-lg overflow-hidden">
          {/* Header Section */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-800 px-6 py-8">
            <div className="flex items-center space-x-6">
              <div className="flex-shrink-0">
                {member.profileImage ? (
                  <img
                    src={member.profileImage}
                    alt={member.name}
                    className="h-24 w-24 rounded-full border-4 border-white"
                  />
                ) : (
                  <UserCircleIcon className="h-24 w-24 text-white opacity-80" />
                )}
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-white">{member.name}</h1>
                <div className="mt-1">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    member.status === 'active' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {member.status.charAt(0).toUpperCase() + member.status.slice(1)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="px-6 py-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Basic Information */}
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-gray-900">Basic Information</h2>
                <div className="space-y-4">
                  <div className="flex items-start">
                    <UserIcon className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-500">Name</p>
                      <p className="text-sm text-gray-900">{member.name}</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <EnvelopeIcon className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-500">Email</p>
                      <p className="text-sm text-gray-900">{member.email}</p>
                    </div>
                  </div>
                  {member.occupation && (
                    <div className="flex items-start">
                      <BriefcaseIcon className="h-5 w-5 text-gray-400 mt-0.5" />
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-500">Occupation</p>
                        <p className="text-sm text-gray-900">{member.occupation}</p>
                      </div>
                    </div>
                  )}
                  {member.phone && (
                    <div className="flex items-start">
                      <PhoneIcon className="h-5 w-5 text-gray-400 mt-0.5" />
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-500">Phone</p>
                        <p className="text-sm text-gray-900">{member.phone}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Address Information */}
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-gray-900">Address Information</h2>
                <div className="space-y-4">
                  {member.address && (
                    <div className="flex items-start">
                      <MapPinIcon className="h-5 w-5 text-gray-400 mt-0.5" />
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-500">Address</p>
                        <p className="text-sm text-gray-900">{member.address}</p>
                        {(member.city || member.state || member.zipCode) && (
                          <p className="text-sm text-gray-900 mt-1">
                            {[member.city, member.state, member.zipCode].filter(Boolean).join(', ')}
                          </p>
                        )}
                        {member.country && (
                          <p className="text-sm text-gray-900">{member.country}</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Lodge Information */}
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-gray-900">Lodge Information</h2>
                <div className="space-y-4">
                  <div className="flex items-start">
                    <BuildingOfficeIcon className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-500">Primary Lodge</p>
                      <p className="text-sm text-gray-900">{member.primaryLodge}</p>
                      <p className="text-sm text-gray-500 mt-1">Position: {member.primaryLodgePosition}</p>
                    </div>
                  </div>
                  {(() => {
                    // Filter out the primary lodge from the lodges array
                    const additionalLodges = member.lodges.filter(lodgeId => {
                      // If primaryLodge is a lodge name, we need to find its ID
                      const primaryLodgeId = lodges && Object.keys(lodges).find(id => lodges[id] === member.primaryLodge);
                      return lodgeId !== primaryLodgeId;
                    });
                    
                    if (additionalLodges.length > 0) {
                      return (
                        <div className="flex items-start">
                          <BuildingOfficeIcon className="h-5 w-5 text-gray-400 mt-0.5" />
                          <div className="ml-3">
                            <p className="text-sm font-medium text-gray-500">Additional Lodge Memberships</p>
                            <ul className="mt-1 space-y-1">
                              {additionalLodges.map((lodgeId, index) => {
                                const lodgeName = lodges[lodgeId] || `Lodge ID: ${lodgeId}`;
                                const position = member.lodgePositions?.[lodgeId];
                                return (
                                  <li key={index} className="text-sm text-gray-900">
                                    {lodgeName}
                                    {position && (
                                      <span className="text-gray-500 ml-2">({position})</span>
                                    )}
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        </div>
                      );
                    } else {
                      return (
                        <div className="flex items-start">
                          <BuildingOfficeIcon className="h-5 w-5 text-gray-400 mt-0.5" />
                          <div className="ml-3">
                            <p className="text-sm font-medium text-gray-500">Additional Lodge Memberships</p>
                            <p className="text-sm text-gray-500 italic">No additional lodge memberships.</p>
                          </div>
                        </div>
                      );
                    }
                  })()}
                </div>
              </div>

              {/* Additional Information */}
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-gray-900">Additional Information</h2>
                <div className="space-y-4">
                  {member.interests && member.interests.length > 0 && (
                    <div className="flex items-start">
                      <HeartIcon className="h-5 w-5 text-gray-400 mt-0.5" />
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-500">Interests</p>
                        <div className="mt-1 flex flex-wrap gap-2">
                          {member.interests.map((interest, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                            >
                              {interest}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  {member.bio && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">Biography</p>
                      <p className="mt-1 text-sm text-gray-600">{member.bio}</p>
                    </div>
                  )}
                  <div className="flex items-start">
                    <CalendarIcon className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-500">Member Since</p>
                      <p className="text-sm text-gray-900">
                        {new Date(member.memberSince).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 