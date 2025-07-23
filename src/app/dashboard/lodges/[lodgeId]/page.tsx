'use client';

import React from 'react';
import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import dynamic from 'next/dynamic';

// Import Leaflet CSS
import 'leaflet/dist/leaflet.css';

// Dynamically import the Map component to avoid SSR issues
const LodgeMap = dynamic(() => import('@/components/LodgeMap'), { ssr: false });

interface Lodge {
  _id: string;
  name: string;
  number: string;
  location: string;
  foundedYear: number;
  description: string;
  logoImage: string;
  backgroundImage: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  events?: Array<{
    title: string;
    date: string;
    description?: string;
    location?: string;
  }>;
  memberDetails?: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    status: string;
    position: string;
    profileImage?: string;
  }>;
}

// Position priority order
const POSITION_PRIORITY: { [key: string]: number } = {
  'Worshipful Master': 1,
  'Senior Warden': 2,
  'Junior Warden': 3,
  'Treasurer': 4,
  'Secretary': 5,
  'Senior Deacon': 6,
  'Junior Deacon': 7,
  'Senior Steward': 8,
  'Junior Steward': 9,
  'Tyler': 10,
  'Chaplain': 11,
  'Organist': 12,
  'Director of Ceremonies': 13,
  'Almoner': 14,
  'Charity Steward': 15,
  'Membership Officer': 16,
  'Mentor': 17,
  'Member': 18
};

// Position categories and their members
type PositionCategory = 'Principal Officers' | 'Deacons' | 'Stewards' | 'Other Officers' | 'Members';

const POSITION_CATEGORIES: Record<PositionCategory, string[]> = {
  'Principal Officers': [
    'WORSHIPFUL_MASTER',
    'SENIOR_WARDEN',
    'JUNIOR_WARDEN',
    'TREASURER',
    'SECRETARY'
  ],
  'Deacons': [
    'SENIOR_DEACON',
    'JUNIOR_DEACON'
  ],
  'Stewards': [
    'SENIOR_STEWARD',
    'JUNIOR_STEWARD'
  ],
  'Other Officers': [
    'TYLER',
    'CHAPLAIN',
    'ORGANIST',
    'DIRECTOR_OF_CEREMONIES',
    'ALMONER',
    'CHARITY_STEWARD',
    'MEMBERSHIP_OFFICER',
    'MARSHAL',
    'MUSICIAN',
    'MASTER_OF_CEREMONIES',
    'HISTORIAN',
    'LODGE_EDUCATION_OFFICER'
  ],
  'Members': [
    'MEMBER'
  ]
};

// Get the category for a position
const getPositionCategory = (position: string): PositionCategory => {
  const pos = position.trim();
  console.log(`getPositionCategory called with position: "${position}" (trimmed: "${pos}")`);
  console.log(`Available positions in Principal Officers:`, POSITION_CATEGORIES['Principal Officers']);
  console.log(`Position "${pos}" is in Principal Officers:`, POSITION_CATEGORIES['Principal Officers'].includes(pos));
  
  for (const [category, positions] of Object.entries(POSITION_CATEGORIES)) {
    if (positions.includes(pos)) {
      console.log(`Found position "${pos}" in category "${category}"`);
      return category as PositionCategory;
    }
  }
  console.log(`Position "${pos}" not found in any category, defaulting to Members`);
  return 'Members';
};

export default function LodgePage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const [lodge, setLodge] = useState<Lodge | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showMembers, setShowMembers] = useState(false);

  useEffect(() => {
    // Get lodgeId from URL params
    const lodgeId = params?.lodgeId;
    
    console.log('Lodge page - Initial params:', {
      params,
      lodgeId,
      rawParams: JSON.stringify(params)
    });
    
    if (!lodgeId || typeof lodgeId !== 'string') {
      console.error('Invalid lodge ID:', lodgeId);
      setError('Invalid lodge ID');
      setIsLoading(false);
      return;
    }

    const fetchLodge = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Get token from localStorage or sessionStorage
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        const headers: Record<string, string> = {
          'Content-Type': 'application/json'
        };
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        
        console.log('Lodge page - Making API request:', {
          url: `/api/lodges/${lodgeId}`,
          headers,
          method: 'GET'
        });

        const response = await fetch(`/api/lodges/${lodgeId}`, { 
          method: 'GET',
          headers,
          cache: 'no-store'
        });
        
        console.log('Lodge page - API response status:', {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('Lodge page - API Error Response:', {
            status: response.status,
            statusText: response.statusText,
            error: errorData
          });
          throw new Error(errorData.error || 'Failed to fetch lodge data');
        }
        
        const data = await response.json();
        console.log('Lodge page - API response data:', {
          id: data._id,
          name: data.name,
          hasLogoImage: !!data.logoImage,
          hasBackgroundImage: !!data.backgroundImage
        });
        
        if (!data || !data._id) {
          console.error('Lodge page - Invalid data received:', data);
          throw new Error('Invalid lodge data received from server');
        }

        console.log('Fetched lodge data:', {
          id: data._id,
          name: data.name,
          logoImage: data.logoImage,
          backgroundImage: data.backgroundImage,
          memberDetails: data.memberDetails,
          events: data.events
        });
        
        // Debug member details
        if (data.memberDetails) {
          console.log('Member details received:', data.memberDetails);
          data.memberDetails.forEach((member: any, index: number) => {
            console.log(`Member ${index + 1}:`, {
              name: member.name,
              position: member.position,
              email: member.email
            });
          });
        }

        // Validate image paths
        if (data.logoImage) {
          const originalLogoPath = data.logoImage;
          // Handle different path formats
          if (data.logoImage.startsWith('http')) {
            // Keep external URLs as is
            data.logoImage = data.logoImage;
          } else if (data.logoImage.startsWith('/')) {
            // Keep absolute paths as is
            data.logoImage = data.logoImage;
          } else if (data.logoImage.includes('uploads/')) {
            // If it already has uploads/, ensure it starts with /
            data.logoImage = data.logoImage.startsWith('/') ? data.logoImage : `/${data.logoImage}`;
          } else {
            // Add uploads/ prefix
            data.logoImage = `/uploads/${data.logoImage}`;
          }
          console.log('Logo path transformation:', {
            original: originalLogoPath,
            transformed: data.logoImage,
            fullPath: `${window.location.origin}${data.logoImage}`
          });
        }
        if (data.backgroundImage && !data.backgroundImage.startsWith('http')) {
          const originalBackgroundPath = data.backgroundImage;
          data.backgroundImage = data.backgroundImage.startsWith('/') ? data.backgroundImage : `/uploads/${data.backgroundImage}`;
          console.log('Background path transformation:', {
            original: originalBackgroundPath,
            transformed: data.backgroundImage,
            fullPath: `${window.location.origin}${data.backgroundImage}`
          });
        }

        console.log('Final processed image paths:', {
          logoImage: data.logoImage,
          backgroundImage: data.backgroundImage
        });

        setLodge(data);
      } catch (err) {
        console.error('Lodge page - Error:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    fetchLodge();
  }, [params?.lodgeId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f0f2f5] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1a365d]"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#f0f2f5] flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!lodge) {
    return (
      <div className="min-h-screen bg-[#f0f2f5] flex items-center justify-center">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
          <p className="text-yellow-600">Lodge not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f0f2f5]">
      {/* Background Image */}
      {lodge.backgroundImage && (
        <div className="relative h-64 w-full">
          <Image
            src={lodge.backgroundImage}
            alt={`${lodge.name} background`}
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-black bg-opacity-50"></div>
        </div>
      )}

      <div className="container mx-auto px-4 py-8">
        {/* Lodge Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center space-x-6">
            {/* Lodge Logo */}
            <div className="flex-shrink-0">
              {lodge.logoImage ? (
                <div className="relative w-24 h-24">
                  <Image
                    src={lodge.logoImage}
                    alt={`${lodge.name} logo`}
                    fill
                    className="object-cover rounded-lg"
                  />
                </div>
              ) : (
                <div className="w-24 h-24 bg-[#1a365d] rounded-lg flex items-center justify-center">
                  <span className="text-3xl font-semibold text-[#d4af37]">
                    {lodge.name.charAt(0)}
                  </span>
                </div>
              )}
            </div>

            {/* Lodge Info */}
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-[#1a365d] mb-2">
                {lodge.name}
              </h1>
              <p className="text-lg text-[#1a365d] mb-2">
                {lodge.number && lodge.number !== 'N/A' ? `Lodge No. ${lodge.number} • ` : ''}{lodge.location}
              </p>
              {lodge.foundedYear && (
                <p className="text-sm text-[#1a365d]">
                  Founded in {lodge.foundedYear}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Lodge Description */}
        {lodge.description && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-xl font-semibold text-[#1a365d] mb-4">About</h2>
            <p className="text-[#1a365d] whitespace-pre-wrap">{lodge.description}</p>
          </div>
        )}

        {/* Location and Map Section */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold text-[#1a365d] mb-4">Location</h2>
          <p className="font-medium text-[#1a365d] mb-4">{lodge.location}</p>
          {lodge.coordinates && (
            <div className="h-96 rounded-lg overflow-hidden">
              <LodgeMap
                location={lodge.location}
                coordinates={lodge.coordinates}
              />
            </div>
          )}
        </div>

        {/* Members Section */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold text-[#1a365d] mb-6">Members</h2>
          
          {Object.keys(POSITION_CATEGORIES).map((category) => {
            const categoryMembers = lodge.memberDetails
              ?.filter(member => {
                const categoryForMember = getPositionCategory(member.position);
                console.log(`Member ${member.name} has position "${member.position}" and is categorized as "${categoryForMember}"`);
                return categoryForMember === category;
              })
              .sort((a, b) => {
                const posA = a.position.trim();
                const posB = b.position.trim();
                const categoryPositions = POSITION_CATEGORIES[category as PositionCategory];
                const priorityA = categoryPositions.indexOf(posA);
                const priorityB = categoryPositions.indexOf(posB);
                return priorityA - priorityB;
              });

            if (!categoryMembers?.length) return null;

            return (
              <div key={category} className="mb-8">
                <h3 className="text-lg font-semibold text-[#1a365d] mb-4">{category}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {categoryMembers.map((member) => (
                    <div key={member.id} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center space-x-4">
                        <div className="relative w-12 h-12">
                          <Image
                            src={member.profileImage || '/images/default-avatar.png'}
                            alt={`${member.name}`}
                            fill
                            className="rounded-full object-cover"
                          />
                        </div>
                        <div>
                          <h3 className="font-medium text-[#1a365d]">{member.name}</h3>
                          <p className="text-sm text-[#1a365d]">{member.position.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Events Section */}
        {lodge.events && lodge.events.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-xl font-semibold text-[#1a365d] mb-4">Upcoming Events</h2>
            <div className="space-y-4">
              {lodge.events.map((event, index) => (
                <div
                  key={index}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <h3 className="font-semibold text-[#1a365d]">{event.title}</h3>
                  <p className="text-sm text-[#1a365d] mt-1">
                    {new Date(event.date).toLocaleDateString()}
                  </p>
                  {event.location && (
                    <p className="text-sm text-[#1a365d] mt-1">
                      Location: {event.location}
                    </p>
                  )}
                  {event.description && (
                    <p className="text-sm text-[#1a365d] mt-2">{event.description}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 